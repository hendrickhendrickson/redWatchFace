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

import { objectEntries, objectKeys } from 'hhson-lib';
import { parse } from './parse.ts';
import { isTextNode, type Node } from './xml.ts';

export type ModelEntry = {
	/** Structural path, for locating a difference in either file. */
	path: string;
	tag: string;
	/** Partial: the key is whatever the markup carried, so a lookup by name can miss. */
	attrs: Partial<Record<string, string>>;
	text?: string;
};

/**
 * Is this parsed JSON actually a model?
 *
 * face.model.json is written by `--snapshot` and committed, so it is not hostile input - but it
 * IS a file, and `JSON.parse` hands back `any`. Without this the first sign of a truncated or
 * hand-edited baseline is a diff claiming a thousand elements changed, which reads as a broken
 * generator rather than a broken file.
 *
 * Structural, not exhaustive: it checks the fields `diff` actually reads. `text` is optional and
 * `attrs` values are checked as a whole rather than per key, which is enough to tell a model from
 * anything else that might end up in that path.
 */
export const isModel = (parsed: unknown): parsed is ModelEntry[] =>
	Array.isArray(parsed) &&
	parsed.every(
		(entry: unknown) =>
			typeof entry === 'object' &&
			entry !== null &&
			'path' in entry &&
			typeof entry.path === 'string' &&
			'tag' in entry &&
			typeof entry.tag === 'string' &&
			'attrs' in entry &&
			typeof entry.attrs === 'object' &&
			entry.attrs !== null
	);

/**
 * Canonical form of an attribute value.
 *
 * Numbers collapse so 1.0, 1 and 1.000 compare equal - the hand-authored file
 * writes trailing .0 in places for readability and the generator has no reason
 * to reproduce that. Everything else is whitespace-normalised, which is what
 * makes a wrapped multi-line expression compare equal to the same expression on
 * one line.
 */
const canonNumber = (literal: string): string => {
	const value = Number(literal);
	if (!Number.isFinite(value)) {
		return literal;
	}
	return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
};

const canon = (raw: string): string => {
	const trimmed = raw.trim().replace(/\s+/g, ' ');
	if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
		return canonNumber(trimmed);
	}

	// Numeric literals INSIDE an expression are still numbers: `* 1.0` and `* 1`
	// multiply by the same thing, and `80.0 + 28.0` and `80 + 28` add the same.
	// The hand-authored file wrote trailing .0 in places for readability, so
	// without this every generated expression looks changed when none of them
	// computes anything different. Only applied to strings that are expressions,
	// so a version or an id in some other attribute is left alone.
	if (trimmed.includes('[') || /[+\-*/]/.test(trimmed)) {
		return trimmed.replace(/\d+\.\d+/g, (literal) => canonNumber(literal));
	}
	return trimmed;
};

/** Flatten a parsed tree into document-order entries, dropping non-rendering nodes. */
export function model(nodes: Node[]): ModelEntry[] {
	const out: ModelEntry[] = [];

	const visit = (nodes: Node[], prefix: string) => {
		// Index siblings per tag so a path stays stable when comments move around.
		const seen = new Map<string, number>();
		for (const node of nodes) {
			if (node.k !== 'el') {
				continue;
			}
			const index = seen.get(node.tag) ?? 0;
			seen.set(node.tag, index + 1);

			const name = node.attrs['name'];
			const label = typeof name === 'string' ? `${node.tag}[${name}]` : `${node.tag}[${index}]`;
			const path = prefix === '' ? label : `${prefix}/${label}`;

			const attrs: Partial<Record<string, string>> = {};
			for (const [key, value] of objectEntries(node.attrs)) {
				if (value === undefined) {
					continue;
				}
				attrs[key] = canon(String(value));
			}

			// Direct text content, e.g. an <Expression> body or a <Text> run.
			const direct = node.children
				.filter(isTextNode)
				.map((child) => child.text)
				.join('')
				.trim()
				.replace(/\s+/g, ' ');

			const entry: ModelEntry = { path, tag: node.tag, attrs };
			if (direct !== '') {
				entry.text = direct;
			}
			out.push(entry);

			visit(node.children, path);
		}
	};

	visit(nodes, '');
	return out;
}

export const modelOf = (xml: string): ModelEntry[] => model(parse(xml).nodes);

export type Difference = {
	index: number;
	kind: 'missing' | 'added' | 'tag' | 'attr' | 'text';
	path: string;
	detail: string;
};

/** Compare two models in document order. Order matters: it is WFF's z-order. */
export function diff(a: ModelEntry[], b: ModelEntry[]): Difference[] {
	const diffs: Difference[] = [];
	const n = Math.max(a.length, b.length);

	for (let i = 0; i < n; i++) {
		// `at`, not `a[i]`: n is the LONGER of the two lengths, so one of these two reads is
		// off the end whenever the models differ in size - which is the case the two checks
		// below report as added or missing.
		const x = a.at(i);
		const y = b.at(i);

		if (x === undefined) {
			if (y === undefined) {
				continue;
			}
			diffs.push({ index: i, kind: 'added', path: y.path, detail: `extra <${y.tag}>` });
			continue;
		}
		if (y === undefined) {
			diffs.push({ index: i, kind: 'missing', path: x.path, detail: `missing <${x.tag}>` });
			continue;
		}
		if (x.tag !== y.tag) {
			diffs.push({ index: i, kind: 'tag', path: x.path, detail: `<${x.tag}> became <${y.tag}>` });
			// Past this point the two are out of step; keep going, the first few
			// differences are what matter and a wall of noise helps nobody.
			continue;
		}

		const keys = new Set([...objectKeys(x.attrs), ...objectKeys(y.attrs)]);
		for (const key of keys) {
			const before = x.attrs[key];
			const after = y.attrs[key];
			if (before !== after) {
				diffs.push({
					index: i,
					kind: 'attr',
					path: x.path,
					detail: `@${key}: ${before === undefined ? '(absent)' : JSON.stringify(before)} -> ${
						after === undefined ? '(absent)' : JSON.stringify(after)
					}`
				});
			}
		}

		if ((x.text ?? '') !== (y.text ?? '')) {
			diffs.push({
				index: i,
				kind: 'text',
				path: x.path,
				detail: `text: ${JSON.stringify(x.text ?? '')} -> ${JSON.stringify(y.text ?? '')}`
			});
		}
	}

	return diffs;
}

/** Human-readable report. Empty string when the two are semantically identical. */
export function report(diffs: Difference[], limit = 40): string {
	if (diffs.length === 0) {
		return '';
	}
	const lines = diffs
		.slice(0, limit)
		.map((difference) => `    ${difference.path}\n      ${difference.detail}`);
	const more = diffs.length > limit ? `\n    ... and ${diffs.length - limit} more` : '';
	return `${diffs.length} semantic difference(s):\n${lines.join('\n')}${more}`;
}
