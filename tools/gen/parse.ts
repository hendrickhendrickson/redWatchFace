/**
 * A parser for the exact subset of XML watchface.xml uses, keeping every byte.
 *
 * Not a general XML parser and not trying to be. What it must do is lose
 * NOTHING: whitespace between elements, comment formatting, CRLF endings and
 * attribute wrapping are all preserved as raw source on the node, because the
 * migration is gated on serialising the file back byte-for-byte.
 *
 * The tree it produces is the migration's work list. `raw` is set on every node
 * it parses; converting a region to TypeScript means building nodes WITHOUT
 * `raw`, which is what routes them through the formatter. So "how much of the
 * file is still legacy" is exactly "how many nodes still carry raw".
 */

import type { Attrs, Element, Node } from './xml.ts'

export interface ParseResult {
  nodes: Node[]
  /** Every element, in document order. Convenience for audits. */
  elements: Element[]
}

const isNameChar = (c: string) => /[A-Za-z0-9_.:-]/.test(c)

export function parse(src: string): ParseResult {
  let i = 0
  const elements: Element[] = []

  const readAttrs = (s: string): Attrs => {
    const attrs: Attrs = {}
    const re = /([A-Za-z_][A-Za-z0-9_.:-]*)\s*=\s*"([^"]*)"/g
    let m: RegExpExecArray | null
    while ((m = re.exec(s)) !== null) attrs[m[1] as string] = m[2] as string
    return attrs
  }

  const parseNodes = (stopTag: string | null): Node[] => {
    const out: Node[] = []

    while (i < src.length) {
      // Closing tag for our parent.
      if (src.startsWith('</', i)) {
        if (stopTag === null) throw new Error(`unexpected </ at ${i}`)
        const gt = src.indexOf('>', i)
        if (gt === -1) throw new Error(`unterminated close tag at ${i}`)
        const name = src.slice(i + 2, gt).trim()
        if (name !== stopTag) throw new Error(`expected </${stopTag}> but found </${name}> at ${i}`)
        i = gt + 1
        return out
      }

      if (src.startsWith('<!--', i)) {
        const end = src.indexOf('-->', i)
        if (end === -1) throw new Error(`unterminated comment at ${i}`)
        const raw = src.slice(i, end + 3)
        out.push({ k: 'comment', text: raw.slice(4, -3), raw })
        i = end + 3
        continue
      }

      if (src.startsWith('<![CDATA[', i)) {
        const end = src.indexOf(']]>', i)
        if (end === -1) throw new Error(`unterminated CDATA at ${i}`)
        const raw = src.slice(i, end + 3)
        out.push({ k: 'cdata', text: raw.slice(9, -3), raw })
        i = end + 3
        continue
      }

      if (src.startsWith('<?', i)) {
        const end = src.indexOf('?>', i)
        if (end === -1) throw new Error(`unterminated declaration at ${i}`)
        const raw = src.slice(i, end + 2)
        out.push({ k: 'decl', text: raw, raw })
        i = end + 2
        continue
      }

      if (src[i] === '<' && isNameChar(src[i + 1] ?? '')) {
        const start = i
        const gt = findTagEnd(src, i)
        const head = src.slice(i, gt + 1)
        const selfClosing = head.endsWith('/>')
        const tagMatch = /^<([A-Za-z_][A-Za-z0-9_.:-]*)/.exec(head)
        if (!tagMatch) throw new Error(`bad tag at ${i}`)
        const tag = tagMatch[1] as string
        const attrs = readAttrs(head.slice(tag.length + 1, selfClosing ? -2 : -1))
        i = gt + 1

        const children = selfClosing ? [] : parseNodes(tag)
        const node: Element = {
          k: 'el',
          tag,
          attrs,
          children,
          raw: src.slice(start, i),
        }
        elements.push(node)
        out.push(node)
        continue
      }

      // Text run up to the next markup.
      const next = src.indexOf('<', i)
      const end = next === -1 ? src.length : next
      if (end > i) {
        const raw = src.slice(i, end)
        out.push({ k: 'text', text: raw, raw })
        i = end
      } else if (next === i) {
        // A lone '<' that is not markup. Should not happen in this file.
        throw new Error(`unparseable '<' at ${i}`)
      }
    }

    if (stopTag !== null) throw new Error(`unterminated <${stopTag}>`)
    return out
  }

  const nodes = parseNodes(null)
  return { nodes, elements }
}

/**
 * Find the '>' that ends a tag, skipping any inside quoted attribute values.
 * WFF expressions contain &gt; escaped, but a raw '>' inside quotes is legal
 * XML and cheap to survive, so do it properly rather than indexOf('>').
 */
function findTagEnd(src: string, from: number): number {
  let inQuote = false
  for (let j = from; j < src.length; j++) {
    const c = src[j]
    if (c === '"') inQuote = !inQuote
    else if (c === '>' && !inQuote) return j
  }
  throw new Error(`unterminated tag at ${from}`)
}

/** Walk every element in the tree, depth-first, document order. */
export function walk(nodes: Node[], fn: (e: Element, parents: Element[]) => void): void {
  const rec = (ns: Node[], parents: Element[]) => {
    for (const n of ns) {
      if (n.k !== 'el') continue
      fn(n, parents)
      rec(n.children, [...parents, n])
    }
  }
  rec(nodes, [])
}
