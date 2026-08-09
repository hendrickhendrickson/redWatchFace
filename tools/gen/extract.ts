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

import { objectEntries } from 'hhson-lib';
import { parse, walk } from './parse.ts';
import type { Element } from './xml.ts';

export type BoxUse = {
	key: string;
	x: string;
	y: string;
	width: string;
	height: string;
	count: number;
	tags: string[];
};

export type Repeat = {
	value: string;
	count: number;
	where: string[];
};

const BOX_KEYS = ['x', 'y', 'width', 'height'] as const;

export type Extraction = {
	boxes: BoxUse[];
	colours: Repeat[];
	expressions: Repeat[];
	/** Every distinct numeric literal and how often it appears. */
	numbers: Repeat[];
};

export function extract(xml: string, minCount = 3): Extraction {
	const { nodes } = parse(xml);

	const boxes = new Map<string, BoxUse>();
	const colours = new Map<string, Repeat>();
	const expressions = new Map<string, Repeat>();
	const numbers = new Map<string, Repeat>();

	const bump = (target: Map<string, Repeat>, value: string, where: string) => {
		const existing = target.get(value);
		if (existing) {
			existing.count++;
			if (existing.where.length < 6) {
				existing.where.push(where);
			}
		} else {
			target.set(value, { value, count: 1, where: [where] });
		}
	};

	walk(nodes, (element: Element) => {
		const nameAttr = element.attrs['name'];
		const name = typeof nameAttr === 'string' ? nameAttr : element.tag;

		// Boxes: the x/y/width/height quadruple, which is what actually repeats.
		if (BOX_KEYS.every((boxKey) => element.attrs[boxKey] !== undefined)) {
			const vals = BOX_KEYS.map((boxKey) => String(element.attrs[boxKey]));
			const key = vals.join(',');
			const existing = boxes.get(key);
			if (existing) {
				existing.count++;
				if (!existing.tags.includes(element.tag)) {
					existing.tags.push(element.tag);
				}
			} else {
				boxes.set(key, {
					key,
					x: vals[0],
					y: vals[1],
					width: vals[2],
					height: vals[3],
					count: 1,
					tags: [element.tag]
				});
			}
		}

		for (const [attrKey, attrValue] of objectEntries(element.attrs)) {
			if (attrValue === undefined) {
				continue;
			}
			const str = String(attrValue);

			if (/^#[0-9a-fA-F]{6,8}$/.test(str)) {
				bump(colours, str.toLowerCase(), name);
			}

			// Anything containing a data source is an expression, wherever it sits -
			// Transform/@value, Gyro/@x, an Expression body. Whitespace-normalised so
			// a wrapped copy and a one-line copy are recognised as the same idiom.
			if (str.includes('[')) {
				bump(expressions, str.replace(/\s+/g, ' ').trim(), name);
			}

			if (/^-?\d+(\.\d+)?$/.test(str)) {
				bump(numbers, str, `${name}@${attrKey}`);
			}
		}
	});

	// Expression bodies live as text, not attributes.
	const textExprs = xml.matchAll(/<Expression name="([^"]+)">([\s\S]*?)<\/Expression>/g);
	for (const match of textExprs) {
		bump(expressions, match[2].replace(/\s+/g, ' ').trim(), match[1]);
	}

	const byCount = <T extends { count: number }>(left: T, right: T) => right.count - left.count;

	return {
		boxes: [...boxes.values()].filter((box) => box.count >= minCount).sort(byCount),
		colours: [...colours.values()].sort(byCount),
		expressions: [...expressions.values()].filter((expr) => expr.count >= 2).sort(byCount),
		numbers: [...numbers.values()].sort(byCount)
	};
}

/** Console summary, for deciding what deserves a name. */
export function summarise(extraction: Extraction): string {
	const lines: string[] = [];
	lines.push(`  boxes repeated >=3x: ${extraction.boxes.length}`);
	for (const box of extraction.boxes.slice(0, 12)) {
		lines.push(
			`    ${String(box.count).padStart(3)}x  x=${box.x} y=${box.y} w=${box.width} h=${box.height}   ${box.tags.join(',')}`
		);
	}
	lines.push(`  distinct colours: ${extraction.colours.length}`);
	for (const colour of extraction.colours.slice(0, 8)) {
		lines.push(
			`    ${String(colour.count).padStart(3)}x  ${colour.value}   ${colour.where.slice(0, 3).join(', ')}`
		);
	}
	lines.push(`  expressions repeated >=2x: ${extraction.expressions.length}`);
	for (const expr of extraction.expressions.slice(0, 10)) {
		lines.push(`    ${String(expr.count).padStart(3)}x  ${expr.value.slice(0, 78)}`);
	}
	const total = extraction.numbers.reduce((sum, entry) => sum + entry.count, 0);
	lines.push(`  numeric literals: ${total} total, ${extraction.numbers.length} distinct`);
	return lines.join('\n');
}
