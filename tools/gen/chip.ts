/**
 * The parts the four chips are made of.
 *
 * Peer of blob.ts: shared builders that take explicit geometry, with the rows they
 * read living in data/chips.ts. The one thing worth extracting here is the value
 * text, which had its five-element structure written out six times.
 */

import { el, cdata, type Node } from './xml.ts';
import type { Box } from './geometry.ts';
import { src } from './expr.ts';
import { SIZE, font } from './type.ts';
import { valueBox, type ChipValue } from './data/chips.ts';

/**
 * A chip's number, or its placeholder.
 *
 * THE BOX IS DERIVED FROM THE CHIP, which is what makes the heart rate's value and
 * placeholder one call instead of two identical boxes. They must be the same box:
 * if they were not, the reading would jump sideways the moment the sensor lost
 * contact, which is exactly when nobody is looking at it closely enough to notice.
 *
 * A TEMPLATE ONLY WHEN THERE IS SOMETHING TO INTERPOLATE. `--` and `--°` are
 * literals; wrapping them in a Template with no Parameter would validate and emit
 * a format string with nothing to format.
 */
export const chipValue = (chip: Box, v: ChipValue): Node =>
	el('PartText', { name: v.name, ...valueBox(chip, v.x) }, [
		el('Text', { align: v.align ?? 'START' }, [
			el('Font', font(SIZE.CHIP, v.weight ?? 'BOLD', v.colour), [
				v.source === undefined
					? cdata(v.text)
					: el('Template', {}, [cdata(v.text), el('Parameter', { expression: src(v.source) })])
			])
		])
	]);
