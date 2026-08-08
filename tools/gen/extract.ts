/**
 * Finds the repetition worth naming, so the emitter can reference constants
 * instead of re-typing literals.
 *
 * This is the measurement behind the whole migration: with comments stripped the
 * face holds 3737 numeric literals drawn from only 313 distinct values, and the
 * hero's body box alone is typed out 31 times. Nothing here decides what a
 * constant MEANS - that is a human job and happens when the prose moves across -
 * it only finds what repeats often enough that a name will pay for itself.
 */

import { parse, walk } from './parse.ts'
import type { Element } from './xml.ts'

export interface BoxUse {
  key: string
  x: string
  y: string
  width: string
  height: string
  count: number
  tags: string[]
}

export interface Repeat {
  value: string
  count: number
  where: string[]
}

const BOX_KEYS = ['x', 'y', 'width', 'height'] as const

export interface Extraction {
  boxes: BoxUse[]
  colours: Repeat[]
  expressions: Repeat[]
  /** Every distinct numeric literal and how often it appears. */
  numbers: Repeat[]
}

export function extract(xml: string, minCount = 3): Extraction {
  const { nodes } = parse(xml)

  const boxes = new Map<string, BoxUse>()
  const colours = new Map<string, Repeat>()
  const expressions = new Map<string, Repeat>()
  const numbers = new Map<string, Repeat>()

  const bump = (m: Map<string, Repeat>, value: string, where: string) => {
    const cur = m.get(value)
    if (cur) {
      cur.count++
      if (cur.where.length < 6) cur.where.push(where)
    } else {
      m.set(value, { value, count: 1, where: [where] })
    }
  }

  walk(nodes, (e: Element) => {
    const name = typeof e.attrs['name'] === 'string' ? String(e.attrs['name']) : e.tag

    // Boxes: the x/y/width/height quadruple, which is what actually repeats.
    if (BOX_KEYS.every((k) => e.attrs[k] !== undefined)) {
      const vals = BOX_KEYS.map((k) => String(e.attrs[k]))
      const key = vals.join(',')
      const cur = boxes.get(key)
      if (cur) {
        cur.count++
        if (!cur.tags.includes(e.tag)) cur.tags.push(e.tag)
      } else {
        boxes.set(key, {
          key,
          x: vals[0]!,
          y: vals[1]!,
          width: vals[2]!,
          height: vals[3]!,
          count: 1,
          tags: [e.tag],
        })
      }
    }

    for (const [k, v] of Object.entries(e.attrs)) {
      if (v === undefined) continue
      const s = String(v)

      if (/^#[0-9a-fA-F]{6,8}$/.test(s)) bump(colours, s.toLowerCase(), name)

      // Anything containing a data source is an expression, wherever it sits -
      // Transform/@value, Gyro/@x, an Expression body. Whitespace-normalised so
      // a wrapped copy and a one-line copy are recognised as the same idiom.
      if (s.includes('[')) bump(expressions, s.replace(/\s+/g, ' ').trim(), name)

      if (/^-?\d+(\.\d+)?$/.test(s)) bump(numbers, s, `${name}@${k}`)
    }
  })

  // Expression bodies live as text, not attributes.
  const textExprs = xml.matchAll(/<Expression name="([^"]+)">([\s\S]*?)<\/Expression>/g)
  for (const m of textExprs) bump(expressions, m[2]!.replace(/\s+/g, ' ').trim(), m[1]!)

  const byCount = <T extends { count: number }>(a: T, b: T) => b.count - a.count

  return {
    boxes: [...boxes.values()].filter((b) => b.count >= minCount).sort(byCount),
    colours: [...colours.values()].sort(byCount),
    expressions: [...expressions.values()].filter((e) => e.count >= 2).sort(byCount),
    numbers: [...numbers.values()].sort(byCount),
  }
}

/** Console summary, for deciding what deserves a name. */
export function summarise(x: Extraction): string {
  const lines: string[] = []
  lines.push(`  boxes repeated >=3x: ${x.boxes.length}`)
  for (const b of x.boxes.slice(0, 12)) {
    lines.push(`    ${String(b.count).padStart(3)}x  x=${b.x} y=${b.y} w=${b.width} h=${b.height}   ${b.tags.join(',')}`)
  }
  lines.push(`  distinct colours: ${x.colours.length}`)
  for (const c of x.colours.slice(0, 8)) {
    lines.push(`    ${String(c.count).padStart(3)}x  ${c.value}   ${c.where.slice(0, 3).join(', ')}`)
  }
  lines.push(`  expressions repeated >=2x: ${x.expressions.length}`)
  for (const e of x.expressions.slice(0, 10)) {
    lines.push(`    ${String(e.count).padStart(3)}x  ${e.value.slice(0, 78)}`)
  }
  const total = x.numbers.reduce((s, n) => s + n.count, 0)
  lines.push(`  numeric literals: ${total} total, ${x.numbers.length} distinct`)
  return lines.join('\n')
}
