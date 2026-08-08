/**
 * The semantic model of a face, and a differ over it.
 *
 * WHY THIS EXISTS. The migration is a pure refactor: the generated XML may look
 * nothing like the hand-authored file, but it must RENDER identically. Byte
 * comparison cannot express that - it fires on every reflowed attribute - and
 * the WFF validator cannot either, since Transform/@target, Variant/@target and
 * every expression are xs:string, so it will happily pass markup that draws
 * something else entirely.
 *
 * So: reduce a face to the things that actually reach the screen - element
 * order (which IS draw order in WFF), tag, attributes, text - normalise away
 * everything that does not (comments, whitespace, attribute order, 1.0 vs 1),
 * and compare. An empty diff is the migration's acceptance test, and it is
 * strictly stronger than reading the XML.
 *
 * WHAT IT DELIBERATELY DOES NOT NORMALISE: `name`. Names do not render, but in
 * a pure refactor they should not move either, and every other tool in this
 * repo - mock-state.ts, the capture scripts, the audits - finds things by name.
 * A rename is worth seeing.
 */

import { parse } from './parse.ts'
import type { Element, Node } from './xml.ts'

export interface ModelEntry {
  /** Structural path, for locating a difference in either file. */
  path: string
  tag: string
  attrs: Record<string, string>
  text?: string
}

/**
 * Canonical form of an attribute value.
 *
 * Numbers collapse so 1.0, 1 and 1.000 compare equal - the hand-authored file
 * writes trailing .0 in places for readability and the generator has no reason
 * to reproduce that. Everything else is whitespace-normalised, which is what
 * makes a wrapped multi-line expression compare equal to the same expression on
 * one line.
 */
const canonNumber = (t: string): string => {
  const v = Number(t)
  if (!Number.isFinite(v)) return t
  return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(6)))
}

const canon = (v: string): string => {
  const t = v.trim().replace(/\s+/g, ' ')
  if (/^-?\d+(\.\d+)?$/.test(t)) return canonNumber(t)

  // Numeric literals INSIDE an expression are still numbers: `* 1.0` and `* 1`
  // multiply by the same thing, and `80.0 + 28.0` and `80 + 28` add the same.
  // The hand-authored file wrote trailing .0 in places for readability, so
  // without this every generated expression looks changed when none of them
  // computes anything different. Only applied to strings that are expressions,
  // so a version or an id in some other attribute is left alone.
  if (t.includes('[') || /[+\-*/]/.test(t)) {
    return t.replace(/\d+\.\d+/g, (m) => canonNumber(m))
  }
  return t
}

/** Flatten a parsed tree into document-order entries, dropping non-rendering nodes. */
export function model(nodes: Node[]): ModelEntry[] {
  const out: ModelEntry[] = []

  const visit = (ns: Node[], prefix: string) => {
    // Index siblings per tag so a path stays stable when comments move around.
    const seen = new Map<string, number>()
    for (const n of ns) {
      if (n.k !== 'el') continue
      const i = seen.get(n.tag) ?? 0
      seen.set(n.tag, i + 1)

      const name = n.attrs['name']
      const label = typeof name === 'string' ? `${n.tag}[${name}]` : `${n.tag}[${i}]`
      const path = prefix ? `${prefix}/${label}` : label

      const attrs: Record<string, string> = {}
      for (const [k, v] of Object.entries(n.attrs)) {
        if (v === undefined) continue
        attrs[k] = canon(String(v))
      }

      // Direct text content, e.g. an <Expression> body or a <Text> run.
      const direct = n.children
        .filter((c) => c.k === 'text' || c.k === 'cdata')
        .map((c) => (c.k === 'text' || c.k === 'cdata' ? c.text : ''))
        .join('')
        .trim()
        .replace(/\s+/g, ' ')

      const entry: ModelEntry = { path, tag: n.tag, attrs }
      if (direct) entry.text = direct
      out.push(entry)

      visit(n.children, path)
    }
  }

  visit(nodes, '')
  return out
}

export const modelOf = (xml: string): ModelEntry[] => model(parse(xml).nodes)

export interface Difference {
  index: number
  kind: 'missing' | 'added' | 'tag' | 'attr' | 'text'
  path: string
  detail: string
}

/** Compare two models in document order. Order matters: it is WFF's z-order. */
export function diff(a: ModelEntry[], b: ModelEntry[]): Difference[] {
  const diffs: Difference[] = []
  const n = Math.max(a.length, b.length)

  for (let i = 0; i < n; i++) {
    const x = a[i]
    const y = b[i]

    if (!x) {
      diffs.push({ index: i, kind: 'added', path: y!.path, detail: `extra <${y!.tag}>` })
      continue
    }
    if (!y) {
      diffs.push({ index: i, kind: 'missing', path: x.path, detail: `missing <${x.tag}>` })
      continue
    }
    if (x.tag !== y.tag) {
      diffs.push({ index: i, kind: 'tag', path: x.path, detail: `<${x.tag}> became <${y.tag}>` })
      // Past this point the two are out of step; keep going, the first few
      // differences are what matter and a wall of noise helps nobody.
      continue
    }

    const keys = new Set([...Object.keys(x.attrs), ...Object.keys(y.attrs)])
    for (const k of keys) {
      const xv = x.attrs[k]
      const yv = y.attrs[k]
      if (xv !== yv) {
        diffs.push({
          index: i,
          kind: 'attr',
          path: x.path,
          detail: `@${k}: ${xv === undefined ? '(absent)' : JSON.stringify(xv)} -> ${
            yv === undefined ? '(absent)' : JSON.stringify(yv)
          }`,
        })
      }
    }

    if ((x.text ?? '') !== (y.text ?? '')) {
      diffs.push({
        index: i,
        kind: 'text',
        path: x.path,
        detail: `text: ${JSON.stringify(x.text ?? '')} -> ${JSON.stringify(y.text ?? '')}`,
      })
    }
  }

  return diffs
}

/** Human-readable report. Empty string when the two are semantically identical. */
export function report(diffs: Difference[], limit = 40): string {
  if (diffs.length === 0) return ''
  const lines = diffs.slice(0, limit).map((d) => `    ${d.path}\n      ${d.detail}`)
  const more = diffs.length > limit ? `\n    ... and ${diffs.length - limit} more` : ''
  return `${diffs.length} semantic difference(s):\n${lines.join('\n')}${more}`
}
