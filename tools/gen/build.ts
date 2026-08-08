/**
 * The generator entry point.
 *
 *   node tools/gen/build.ts                 regenerate watchface.xml
 *   node tools/gen/build.ts --check         fail if the committed XML is stale
 *   node tools/gen/build.ts --diff          fail if the face RENDERS differently
 *   node tools/gen/build.ts --snapshot      accept the current rendering as the baseline
 *   node tools/gen/build.ts --selftest      prove the differ can still fail
 *   node tools/gen/build.ts --audit         report remaining duplication
 *
 * HOW THE TWO CHECKS DIFFER, because it matters.
 *
 * --check is about staleness: is watchface.xml what tools/gen currently emits?
 * It compares bytes, and it only ever fires because someone edited the XML by
 * hand or forgot to regenerate.
 *
 * --diff is about behaviour: does the face still draw what it drew before? It
 * compares SEMANTIC MODELS against a committed snapshot, so reflowed markup,
 * reordered attributes and 1.0-vs-1 are invisible while a moved shape, a
 * changed colour or an altered expression is not. When a change to the
 * rendering is intended, --snapshot accepts it and the new baseline lands in
 * the same commit as the change that caused it.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, walk } from './parse.ts'
import { serialize } from './xml.ts'
import { face } from './face.ts'
import { modelOf, diff, report, type ModelEntry } from './model.ts'
import { verifyDerivation } from './palette.ts'
import { extract, summarise } from './extract.ts'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const facePath = resolve(repo, 'watchface/src/main/res/raw/watchface.xml')
const mockBackup = resolve(repo, 'watchface/build/mock-state-backup.xml')

/**
 * The rendering baseline.
 *
 * Replaced a frozen copy of the pre-migration watchface.xml once the migration
 * was done and verified on the wrist. A semantic snapshot answers the same
 * question - "does this still render the same?" - without keeping 260 KB of
 * superseded markup around, and unlike the XML it keeps answering it for every
 * future change rather than only for the migration.
 */
const snapshotPath = resolve(repo, 'tools/gen/face.model.json')

const fail = (msg: string): never => {
  console.error(`\n  ${msg}\n`)
  process.exit(1)
}

/**
 * mock-state rewrites watchface.xml in place, substituting every [SOURCE] for a
 * literal. Regenerating on top of that would discard the mock, and every
 * snapshot taken afterwards would silently be of the un-mocked face. After a
 * capture run a mocked tree is the NORMAL state, so this is not a corner case.
 */
const refuseIfMocked = () => {
  if (existsSync(mockBackup)) {
    fail(
      'A mock is in place - generating now would discard it.\n' +
        '  node tools/mock-state.ts off      then try again.',
    )
  }
}

const readFace = (): string => {
  if (!existsSync(facePath)) fail(`not found: ${facePath}`)
  return readFileSync(facePath, 'utf8')
}

const loadSnapshot = (): ModelEntry[] => {
  if (!existsSync(snapshotPath)) {
    fail(
      `no rendering baseline at ${snapshotPath}\n` +
        '  Create one with: node tools/gen/build.ts --snapshot',
    )
  }
  return JSON.parse(readFileSync(snapshotPath, 'utf8')) as ModelEntry[]
}

/** First differing offset, rendered with enough context to be actionable. */
const firstDiff = (a: string, b: string): string => {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  const line = a.slice(0, i).split('\n').length
  const show = (s: string) => JSON.stringify(s.slice(Math.max(0, i - 60), i + 60))
  return `first difference at byte ${i} (line ${line})\n    original: ${show(a)}\n    emitted:  ${show(b)}`
}

/** The palette ratios must still reproduce the colours that shipped. */
const auditPalette = () => {
  const problems = verifyDerivation()
  if (problems.length) fail(`PALETTE DERIVATION DRIFTED\n\n    ${problems.join('\n    ')}`)
  console.log('  OK         21 derived colours still reproduce from the 7 body hexes')
}

/** Structural checks the WFF schema cannot express. */
const auditStructure = (xml: string) => {
  const { nodes } = parse(xml)

  // A duplicated part name is legal XML and a real hazard: every tool in this
  // repo finds things by name. <Expression> names are a SEPARATE namespace and
  // legitimately collide with the parts they gate - hero_eyes_startled is both
  // the predicate and the part - so they are excluded. Counting them together
  // reported three false positives, and a check that cries wolf gets skipped.
  const parts = new Map<string, number>()
  walk(nodes, (e) => {
    if (e.tag === 'Expression') return
    const n = e.attrs['name']
    if (typeof n === 'string') parts.set(n, (parts.get(n) ?? 0) + 1)
  })
  const dupes = [...parts].filter(([, c]) => c > 1)
  if (dupes.length) {
    fail(`DUPLICATE PART NAMES\n    ${dupes.map(([n, c]) => `${n} x${c}`).join('\n    ')}`)
  }
  console.log(`  OK         ${parts.size} part names, all unique`)
}

const semanticDiff = () => {
  auditPalette()
  const generated = serialize(face())
  auditStructure(generated)

  const before = loadSnapshot()
  const after = modelOf(generated)
  console.log(`  baseline   ${before.length} rendering elements  (face.model.json)`)
  console.log(`  generated  ${after.length} rendering elements`)

  const diffs = diff(before, after)
  if (diffs.length) {
    fail(
      `SEMANTIC DIFF - the face would render differently.\n\n  ${report(diffs)}\n\n` +
        '  If this change is intended: node tools/gen/build.ts --snapshot',
    )
  }
  console.log('  OK         renders the same as the committed baseline\n')
}

const snapshot = () => {
  const generated = serialize(face())
  const entries = modelOf(generated)
  // ONE ELEMENT PER LINE. Pretty-printing this costs 100 KB and turns a
  // one-shape change into a 30-line diff; a single line makes it unreviewable
  // in the other direction. One object per line means `git diff` on the
  // baseline reads as "these elements changed", which is exactly the question.
  const body = entries.map((e) => `  ${JSON.stringify(e)}`).join(',\n')
  writeFileSync(snapshotPath, `[\n${body}\n]\n`, 'utf8')
  console.log(`  wrote ${snapshotPath}`)
  console.log(`  ${entries.length} rendering elements are now the baseline\n`)
}

/**
 * Prove the differ can fail.
 *
 * --check once shipped in a state where it could not: it compared the
 * generator's output against its own input, so it passed on a hand-edited file.
 * A safety net nobody has watched fail is not a safety net. This mutates the
 * generated XML in ways that WOULD change the rendering and asserts each is
 * caught. It runs in a second and it stays.
 */
const selftest = () => {
  const generated = serialize(face())
  const base = modelOf(generated)
  let failures = 0

  // Mutate MARKUP, never prose. The first version of this replaced '#ee4e43'
  // and '- 50) / 50', both of which occurred first inside comments, so the
  // mutations landed in prose, the differ correctly ignored them, and the test
  // reported the differ as broken. Stripping comments first makes "did the
  // mutation apply" mean what it looks like it means.
  const markup = generated.replace(/<!--[\s\S]*?-->/g, '')

  const control = diff(base, modelOf(markup))
  if (control.length === 0) console.log('  ok    all comments stripped -> correctly ignored')
  else {
    console.log(`  FAIL  comment-only change reported ${control.length} diff(s)`)
    failures++
  }

  const cases: Array<[string, (s: string) => string]> = [
    ['a colour changes', (s) => s.replace('color="#ee4e43"', 'color="#ee4e44"')],
    ['a shape moves 1px', (s) => s.replace('x="14" y="36" width="72" height="80"', 'x="15" y="36" width="72" height="80"')],
    ['an expression changes', (s) => s.replace('[DAY_OF_WEEK] == 3', '[DAY_OF_WEEK] == 4')],
    ['a ramp threshold changes', (s) => s.replace(/value="([^"]*?)- 50\) \/ 50/, 'value="$1- 40) / 50')],
    ['an element is dropped', (s) => s.replace('<Fill color="#7fb6d9" />', '')],
    ['a part is renamed', (s) => s.replace('name="hero_body_mon"', 'name="hero_body_monday"')],
    ["a transform target is typo'd", (s) => s.replace('target="alpha"', 'target="alhpa"')],
  ]

  for (const [label, mutate] of cases) {
    const mutated = mutate(markup)
    if (mutated === markup) {
      console.log(`  FAIL  ${label} - mutation did not apply, fixture drifted`)
      failures++
      continue
    }
    const d = diff(base, modelOf(mutated))
    if (d.length === 0) {
      console.log(`  FAIL  ${label} - NOT DETECTED`)
      failures++
    } else {
      console.log(`  ok    ${label} -> ${d.length} diff(s), first: ${d[0]!.detail.slice(0, 56)}`)
    }
  }

  // Formatting churn the generator produces, which must stay invisible.
  const cosmetic = markup.replace(/width="72"/g, 'width="72.0"')
  const cd = diff(base, modelOf(cosmetic))
  if (cd.length === 0) console.log('  ok    72 -> 72.0 correctly ignored')
  else {
    console.log(`  FAIL  cosmetic-only change reported ${cd.length} diff(s)`)
    failures++
  }

  if (failures) fail(`${failures} self-test failure(s) - the differ cannot be trusted.`)
  console.log('\n  OK  the differ detects rendering changes and ignores cosmetic ones\n')
}

/**
 * What is still typed out more than once.
 *
 * Not a gate - repetition in the OUTPUT is unavoidable, since WFF has no
 * variables and that is the whole reason this generator exists. It reports on
 * the generated XML so that a box or an expression that has quietly grown a
 * dozen copies becomes a candidate for a name in geometry.ts or expr.ts.
 */
const audit = () => {
  auditPalette()
  const generated = serialize(face())
  auditStructure(generated)
  console.log()
  console.log(summarise(extract(generated)))
  console.log()
}

const generate = (checkOnly: boolean) => {
  refuseIfMocked()
  const src = readFace()
  // NOTE the asymmetry, it is the whole point: the tree comes from face(),
  // never from the file being checked. An earlier version parsed `src` here, so
  // output equalled input by construction and --check could not fail.
  const out = serialize(face())

  if (checkOnly) {
    if (out !== src) {
      fail(
        `watchface.xml is out of date with tools/gen.\n    ${firstDiff(src, out)}\n\n` +
          '  Run: node tools/gen/build.ts',
      )
    }
    console.log('  OK  watchface.xml is up to date.\n')
    return
  }

  if (out === src) {
    console.log('  OK  watchface.xml unchanged.\n')
    return
  }
  writeFileSync(facePath, out, 'utf8')
  console.log(`  wrote ${facePath}\n`)
}

const arg = process.argv[2]
if (arg === '--selftest') selftest()
else if (arg === '--diff') semanticDiff()
else if (arg === '--snapshot') snapshot()
else if (arg === '--audit') audit()
else if (arg === '--check') generate(true)
else if (arg === undefined) generate(false)
else fail(`unknown argument: ${arg}\n  usage: build.ts [--check|--diff|--snapshot|--selftest|--audit]`)


