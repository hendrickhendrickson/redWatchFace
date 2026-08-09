/**
 * The node tree watchface.xml is built from, and the serialiser that writes it.
 *
 * THE ONE IDEA IN THIS FILE: every node can carry the exact source text it came
 * from (`raw`). The serialiser emits that text verbatim unless the node was
 * built in TypeScript rather than parsed.
 *
 * That is what makes an incremental migration possible at all. The hand-authored
 * file is not machine-regular enough to pretty-print back: it has 128 elements
 * with their children inline on one line, 61 hand-aligned wrapped attribute
 * lines, one element at an odd indent depth, and CRLF endings. A formatter that
 * tried to reproduce all of that would be a formatter nobody could trust, and
 * the whole migration is gated on byte-identical output.
 *
 * So the formatter is never asked to reproduce the old file. It only has to
 * format the regions that have actually been converted to TypeScript, and those
 * are reviewed one commit at a time against a zero-line diff.
 */

export type Attrs = Record<string, string | number | undefined>

export interface Element {
  k: 'el'
  tag: string
  /** Insertion order is emission order. WFF cares about draw order, not names. */
  attrs: Attrs
  children: Node[]
  /** Verbatim source, when this node was parsed rather than constructed. */
  raw?: string
  /** Force children onto one line, matching the file's inline primitives. */
  inline?: boolean
}

export type Node =
  | Element
  | { k: 'comment'; text: string; raw?: string }
  | { k: 'text'; text: string; raw?: string }
  | { k: 'cdata'; text: string; raw?: string }
  | { k: 'decl'; text: string; raw?: string }

export const el = (tag: string, attrs: Attrs = {}, children: Node[] = []): Element =>
  ({ k: 'el', tag, attrs, children })

export const comment = (text: string): Node => ({ k: 'comment', text })
export const text = (t: string): Node => ({ k: 'text', text: t })
export const cdata = (t: string): Node => ({ k: 'cdata', text: t })

/**
 * Escaping for attribute values.
 *
 * NOT a general XML escaper on purpose. WFF expressions are full of `<`, `>`
 * and `&&`, and the hand-authored file writes them as `&lt;`, `&gt;` and `&amp;&amp;`
 * inside attributes. Anything that re-escapes an already-escaped expression
 * silently changes the expression, and the validator will not notice because
 * the whole type is xs:string.
 */
export const attr = (v: string | number): string => {
  if (typeof v === 'number') return fmt(v)
  return v
    .replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Number formatting.
 *
 * MUST NOT normalise 1.0 to 1. The file writes some values with a trailing .0
 * deliberately - the rain fall distances read as "80.0 + 28.0" so the pair is
 * visibly a base and an extra rather than two unrelated integers - and a
 * migration gated on byte-identity dies on exactly this. Anything that needs a
 * specific textual form carries a string, not a number.
 */
export const fmt = (n: number): string => {
  if (!Number.isFinite(n)) throw new Error(`not a finite number: ${n}`)
  if (Number.isInteger(n)) return String(n)
  // Kill float noise (0.1+0.2) without touching authored precision.
  const s = n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')
  return s
}

const INDENT = '  '

/**
 * LF, NOT CRLF - and this was a real bug for at least one release.
 *
 * The serialiser emitted CRLF because the hand-authored file had it and the
 * migration was gated on byte-identical output. That reason expired when the
 * migration landed and the frozen original was deleted; the CRLF stayed, and it
 * quietly broke the staleness gate.
 *
 * `core.autocrlf` is `input` here, so git normalises CRLF to LF on the way in and
 * writes LF back out on checkout. Every committed blob is therefore pure LF -
 * verified across 1.2.0 and every commit since, 2189 LF lines and not one CR. But
 * the generator wrote CRLF into the working tree. So --check compared a CRLF tree
 * against a CRLF render and passed, right up until anything touched the file:
 *
 *   fresh clone, checkout, rebase, git stash pop
 *     -> tree becomes LF -> --check fails at byte 38, on line 1
 *
 * That takes `validateWatchFaceXml` with it, since it dependsOn the staleness
 * check - so on a fresh clone the Gradle verification reported the XML stale
 * before it ever reached the schema. Regenerating "fixed" it and re-armed it.
 *
 * LF is also simply correct here: XML is line-ending agnostic, the APK has been
 * built from LF blobs for a release already, and every other file in the repo is
 * LF. Nothing is gained by being the exception.
 */
export const EOL = '\n'

const openTag = (e: Element, selfClose: boolean): string => {
  const parts = [e.tag]
  for (const [k, v] of Object.entries(e.attrs)) {
    if (v === undefined) continue
    parts.push(`${k}="${attr(v)}"`)
  }
  return `<${parts.join(' ')}${selfClose ? ' />' : '>'}`
}

const serializeNode = (n: Node, depth: number): string => {
  if (n.raw !== undefined) return n.raw

  const pad = INDENT.repeat(depth)

  switch (n.k) {
    case 'decl':
      return n.text
    case 'text':
      return n.text
    case 'cdata':
      return `<![CDATA[${n.text}]]>`
    case 'comment': {
      const lines = n.text.split(/\r?\n/)
      if (lines.length === 1) return `${pad}<!-- ${n.text.trim()} -->`
      // Re-indent a block comment to this depth, preserving relative shape.
      const body = lines.map((l, i) => (i === 0 ? l.trim() : `${pad}     ${l.trim()}`))
      return `${pad}<!-- ${body.join(EOL)} -->`
    }
    case 'el': {
      const kids = n.children.filter((c) => !(c.k === 'text' && c.text.trim() === ''))
      if (kids.length === 0) return `${pad}${openTag(n, true)}`

      // ANY element with text or CDATA content renders inline.
      //
      // Two reasons, and both were found the hard way. First, <Expression> and
      // <Text> carry their value as text, and indenting that value onto its own
      // line puts leading and trailing whitespace inside it; the differ
      // normalises whitespace and the validator types it as xs:string, so
      // nothing would catch it before the wrist. Second, <Template> is mixed
      // content - CDATA plus Parameter elements - and tools/mock-state.ts
      // matches the whole Template as one exact string when it swaps in literal
      // text for a screenshot. Splitting it across lines broke that, loudly.
      const hasText = kids.some((c) => c.k === 'text' || c.k === 'cdata')
      if (n.inline || hasText) {
        const inner = kids.map((c) => serializeNode(c, 0).trim()).join('')
        return `${pad}${openTag(n, false)}${inner}</${n.tag}>`
      }

      const inner = kids.map((c) => serializeNode(c, depth + 1)).join(EOL)
      return `${pad}${openTag(n, false)}${EOL}${inner}${EOL}${pad}</${n.tag}>`
    }
  }
}

/** Serialise a document's top-level nodes. */
export const serialize = (nodes: Node[]): string =>
  nodes.map((n) => serializeNode(n, 0)).join('')

export { serializeNode }
