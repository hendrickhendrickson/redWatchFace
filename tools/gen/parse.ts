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

import type { Attrs, Element, Node } from './xml.ts';

export type ParseResult = {
	nodes: Node[];
	/** Every element, in document order. Convenience for audits. */
	elements: Element[];
};

const isNameChar = (char: string) => /[A-Za-z0-9_.:-]/.test(char);

export function parse(src: string): ParseResult {
	let pos = 0;
	const elements: Element[] = [];

	const readAttrs = (head: string): Attrs => {
		const attrs: Attrs = {};
		const attrPattern = /([A-Za-z_][A-Za-z0-9_.:-]*)\s*=\s*"([^"]*)"/g;
		let match: RegExpExecArray | null;
		while ((match = attrPattern.exec(head)) !== null) {
			attrs[match[1]] = match[2];
		}
		return attrs;
	};

	const parseNodes = (stopTag: string | null): Node[] => {
		const out: Node[] = [];

		while (pos < src.length) {
			// Closing tag for our parent.
			if (src.startsWith('</', pos)) {
				if (stopTag === null) {
					throw new Error(`unexpected </ at ${pos}`);
				}
				const closeAt = src.indexOf('>', pos);
				if (closeAt === -1) {
					throw new Error(`unterminated close tag at ${pos}`);
				}
				const name = src.slice(pos + 2, closeAt).trim();
				if (name !== stopTag) {
					throw new Error(`expected </${stopTag}> but found </${name}> at ${pos}`);
				}
				pos = closeAt + 1;
				return out;
			}

			if (src.startsWith('<!--', pos)) {
				const end = src.indexOf('-->', pos);
				if (end === -1) {
					throw new Error(`unterminated comment at ${pos}`);
				}
				const raw = src.slice(pos, end + 3);
				out.push({ k: 'comment', text: raw.slice(4, -3), raw });
				pos = end + 3;
				continue;
			}

			if (src.startsWith('<![CDATA[', pos)) {
				const end = src.indexOf(']]>', pos);
				if (end === -1) {
					throw new Error(`unterminated CDATA at ${pos}`);
				}
				const raw = src.slice(pos, end + 3);
				out.push({ k: 'cdata', text: raw.slice(9, -3), raw });
				pos = end + 3;
				continue;
			}

			if (src.startsWith('<?', pos)) {
				const end = src.indexOf('?>', pos);
				if (end === -1) {
					throw new Error(`unterminated declaration at ${pos}`);
				}
				const raw = src.slice(pos, end + 2);
				out.push({ k: 'decl', text: raw, raw });
				pos = end + 2;
				continue;
			}

			if (src[pos] === '<' && isNameChar(src[pos + 1] ?? '')) {
				const start = pos;
				const closeAt = findTagEnd(src, pos);
				const head = src.slice(pos, closeAt + 1);
				const selfClosing = head.endsWith('/>');
				const tagMatch = /^<([A-Za-z_][A-Za-z0-9_.:-]*)/.exec(head);
				if (!tagMatch) {
					throw new Error(`bad tag at ${pos}`);
				}
				const tag = tagMatch[1];
				const attrs = readAttrs(head.slice(tag.length + 1, selfClosing ? -2 : -1));
				pos = closeAt + 1;

				const children = selfClosing ? [] : parseNodes(tag);
				const node: Element = {
					k: 'el',
					tag,
					attrs,
					children,
					raw: src.slice(start, pos)
				};
				elements.push(node);
				out.push(node);
				continue;
			}

			// Text run up to the next markup.
			const next = src.indexOf('<', pos);
			const end = next === -1 ? src.length : next;
			if (end > pos) {
				const raw = src.slice(pos, end);
				out.push({ k: 'text', text: raw, raw });
				pos = end;
			} else if (next === pos) {
				// A lone '<' that is not markup. Should not happen in this file.
				throw new Error(`unparseable '<' at ${pos}`);
			}
		}

		if (stopTag !== null) {
			throw new Error(`unterminated <${stopTag}>`);
		}
		return out;
	};

	const nodes = parseNodes(null);
	return { nodes, elements };
}

/**
 * Find the '>' that ends a tag, skipping any inside quoted attribute values.
 * WFF expressions contain &gt; escaped, but a raw '>' inside quotes is legal
 * XML and cheap to survive, so do it properly rather than indexOf('>').
 */
function findTagEnd(src: string, from: number): number {
	let inQuote = false;
	for (let pos = from; pos < src.length; pos++) {
		const char = src[pos];
		if (char === '"') {
			inQuote = !inQuote;
		} else if (char === '>' && !inQuote) {
			return pos;
		}
	}
	throw new Error(`unterminated tag at ${from}`);
}

/** Walk every element in the tree, depth-first, document order. */
export function walk(nodes: Node[], fn: (element: Element, parents: Element[]) => void): void {
	const recurse = (children: Node[], parents: Element[]) => {
		for (const node of children) {
			if (node.k !== 'el') {
				continue;
			}
			fn(node, parents);
			recurse(node.children, [...parents, node]);
		}
	};
	recurse(nodes, []);
}
