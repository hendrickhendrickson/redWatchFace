/**
 * Freezes the face at a chosen set of readings so preview.png can be shot
 * deterministically, then puts it back.
 *
 *   node tools/preview-mock.mjs on
 *   ./gradlew :watchface:installDebug
 *   ... take the screenshot ...
 *   node tools/preview-mock.mjs off
 *   ./gradlew :watchface:installDebug        # <- do not skip this
 *
 *   node tools/preview-mock.mjs status
 *
 * WHY THIS EXISTS
 * preview.png is what the watch face picker shows, so it wants to look like a
 * good day rather than like whatever the sky and your pulse were doing when
 * the screenshot happened. Almost none of that is settable from the host: the
 * watch is a production build so the clock cannot be set, weather cannot be
 * faked at all, and heart rate and step count have no synthetic providers on
 * this image. Only battery is settable, and only via dumpsys.
 *
 * So instead of driving the watch, this rewrites the face to hardcode the
 * values, builds that, screenshots it, and restores. The same trick as
 * tools/debug-triggers.mjs, and it shares that script's two hard-won rules:
 * the backup lives under watchface/build/ because aapt rejects a resource
 * filename containing a dot, and every substitution asserts its own hit count
 * so an edit to watchface.xml fails here loudly instead of silently producing
 * a preview with one wrong value.
 *
 * DO NOT COMMIT A BUILD WITH THIS ON. `status` tells you which way round the
 * working tree is; `git diff` on watchface.xml is the other check.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const face = resolve(repo, 'watchface/src/main/res/raw/watchface.xml')
const backup = resolve(repo, 'watchface/build/preview-mock-backup.xml')

/** The readings the preview should show. */
const MOCK = {
  time: '19:12',
  weekday: 'Mon',
  day: '19',
  temperature: '19',
  heartRate: '88',
  steps: '1912',
  batteryPercent: 88,
}

/**
 * Every <Expression> in the scene, forced to a constant.
 *
 * Keyed by NAME, not by expression body. Matching the body would mean
 * repeating all the substring-ordering pain that debug-triggers.mjs documents
 * - several of these expressions contain others as substrings - whereas the
 * name attribute is unique by construction, since Compare/@expression is a
 * keyref onto it.
 *
 * The face is pinned to its BASELINE state: no reaction is firing, both blobs
 * are awake and unaccessorised. The weather chip is the one exception - it is
 * forced to "available, clear, daytime" so the preview gets a sun rather than
 * the dashes it would show if weather happened to be out.
 *
 * Note hero_sunny/mini_sunny are 0 even though the icon says sun: the blobs'
 * shades need >= 25 degrees and the mock is 19, so shades would contradict the
 * temperature on screen.
 */
const EXPRESSIONS = {
  // Weather chip: available, clear sky, daytime -> sun icon.
  wx_have: '1',
  wx_wet: '0',
  wx_sun: '1',
  wx_moon: '0',
  wx_partly: '0',

  // Stats: show a real heart rate, and not the low-battery styling.
  hr_valid: '1',
  battery_low: '0',

  // Hero blob: baseline.
  hero_arm_rest: '0',
  hero_eyes_startled: '0',
  hero_eyes_shut: '0',
  hero_mouth_shocked: '0',
  hero_asleep: '0',
  hero_cold: '0',
  hero_glove_rest: '0',
  hero_sunny: '0',
  hero_puffed: '0',

  // Companion blob: baseline.
  mini_zapped: '0',
  mini_mouth_night: '0',
  mini_night: '0',
  mini_sunny: '0',
  mini_cold: '0',
  mini_puffed: '0',

  // Free-standing props: none of them.
  zap_burst: '0',
  prop_wet: '0',
  prop_storm: '0',
  prop_freezing: '0',
  prop_night: '0',
}

/**
 * Data-bound <Template> blocks, replaced with literal text.
 *
 * A Template needs at least one Parameter (the schema enforces it), so these
 * cannot just have their Parameter removed - the whole Template is replaced by
 * bare CDATA, which is how static text has to be written as Font content.
 */
const TEMPLATES = [
  [`<Template><![CDATA[%s]]><Parameter expression="[DAY_OF_WEEK_S]" /></Template>`, `<![CDATA[${MOCK.weekday}]]>`, 2],
  [`<Template><![CDATA[%d]]><Parameter expression="[DAY]" /></Template>`, `<![CDATA[${MOCK.day}]]>`, 2],
  [`<Template><![CDATA[%d°]]><Parameter expression="[WEATHER.TEMPERATURE]" /></Template>`, `<![CDATA[${MOCK.temperature}°]]>`, 1],
  [`<Template><![CDATA[%.0f]]><Parameter expression="[HEART_RATE]" /></Template>`, `<![CDATA[${MOCK.heartRate}]]>`, 1],
  [`<Template><![CDATA[%d]]><Parameter expression="[STEP_COUNT]" /></Template>`, `<![CDATA[${MOCK.steps}]]>`, 1],
  [`<Template><![CDATA[%d%%]]><Parameter expression="[BATTERY_PERCENT]" /></Template>`, `<![CDATA[${MOCK.batteryPercent}%]]>`, 2],
  // The gauge fill is a Transform, not a Template. Keep the arithmetic
  // identical to the real one so the bar length matches the number.
  [`<Transform target="width" value="1 + [BATTERY_PERCENT] * 0.145" />`, `<Transform target="width" value="1 + ${MOCK.batteryPercent} * 0.145" />`, 2],
]

/**
 * The clock is the one thing that cannot be done by substituting a value.
 *
 * TimeText renders the system clock and has no literal mode, and its <Font> is
 * a restricted definition that accepts no child elements at all, so it cannot
 * even hold a Transform. The whole <DigitalClock> block is therefore swapped
 * for a PartText at the same box with the same font.
 *
 * Matched by regex from the opening tag to the closing tag rather than by
 * exact text, so comments inside the block can change without breaking this.
 */
const CLOCK_RE = /<DigitalClock\b[\s\S]*?<\/DigitalClock>/
const CLOCK_MOCK = `<PartText name="mock_time" x="0" y="68" width="450" height="120">
      <Text align="CENTER">
        <Font family="SYNC_TO_DEVICE" size="100" weight="BOLD" slant="NORMAL" color="#fff6e8"><![CDATA[${MOCK.time}]]></Font>
      </Text>
    </PartText>`

const cmd = process.argv[2] ?? 'status'

if (cmd === 'status') {
  const patched = existsSync(backup)
  console.log(patched ? 'PREVIEW MOCK is IN PLACE (backup exists)' : 'real values (clean)')
  if (patched) console.log(`  backup: ${backup}`)
  process.exit(0)
}

if (cmd === 'on') {
  if (existsSync(backup)) {
    console.error('Already mocked - run "off" first, or delete the backup if you are sure:')
    console.error(`  ${backup}`)
    process.exit(1)
  }

  let s = readFileSync(face, 'utf8')
  const fail = (msg) => {
    console.error(`ABORT: ${msg}`)
    console.error('watchface.xml has changed. Update tools/preview-mock.mjs.')
    process.exit(1)
  }

  // 1. Expressions, by name.
  for (const [name, value] of Object.entries(EXPRESSIONS)) {
    const re = new RegExp(`(<Expression name="${name}">)[\\s\\S]*?(</Expression>)`, 'g')
    const hits = s.match(re)
    if (!hits || hits.length !== 1) fail(`expected 1 <Expression name="${name}">, found ${hits ? hits.length : 0}`)
    s = s.replace(re, `$1${value}$2`)
  }

  // Any expression NOT in the table is a new trigger that would still read
  // live data and could fire in the preview. Refuse rather than guess.
  const declared = [...s.matchAll(/<Expression name="([^"]+)">/g)].map((m) => m[1])
  const unknown = declared.filter((n) => !(n in EXPRESSIONS))
  if (unknown.length) fail(`unhandled expression(s): ${unknown.join(', ')}`)

  // 2. Value templates.
  for (const [from, to, count] of TEMPLATES) {
    const found = s.split(from).length - 1
    if (found !== count) fail(`expected ${count} of:\n  ${from}\nfound ${found}`)
    s = s.split(from).join(to)
  }

  // 3. The clock.
  if (!CLOCK_RE.test(s)) fail('no <DigitalClock> block found')
  s = s.replace(CLOCK_RE, CLOCK_MOCK)

  mkdirSync(dirname(backup), { recursive: true })
  writeFileSync(backup, readFileSync(face))
  writeFileSync(face, s)

  console.log('Preview mock in place:')
  console.log(`   ${MOCK.time}  ${MOCK.weekday} ${MOCK.day}`)
  console.log(`   ${MOCK.temperature}° sunny`)
  console.log(`   ${MOCK.heartRate} bpm · ${MOCK.steps} steps · ${MOCK.batteryPercent}%`)
  console.log('   blobs pinned to baseline')
  console.log('\nNow:  ./gradlew :watchface:installDebug   then screenshot')
  console.log('AFTERWARDS:  node tools/preview-mock.mjs off   AND REINSTALL.')
  process.exit(0)
}

if (cmd === 'off') {
  if (!existsSync(backup)) {
    console.error('No backup found - nothing to restore. Values are presumably already real.')
    process.exit(1)
  }
  writeFileSync(face, readFileSync(backup))
  rmSync(backup)
  console.log('Real values restored. REINSTALL so the watch stops showing the mock:')
  console.log('  ./gradlew :watchface:installDebug')
  process.exit(0)
}

console.error(`Unknown command "${cmd}". Use: on | off | status`)
process.exit(1)
