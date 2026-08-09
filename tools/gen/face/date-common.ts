/**
 * What the two date copies MUST agree on.
 *
 * The interactive and ambient dates are separate elements cross-faded against
 * each other, and for part of the wake transition both are drawn. Any
 * difference in where a glyph lands therefore shows up as doubled text rather
 * than as a fade - so the box geometry and the group box live here, in one
 * place, and neither copy gets to state them itself.
 *
 * The two are still allowed to differ in the ways that are the POINT of having
 * two copies: weight, colour, and whether the chip is drawn.
 */

import { el, cdata, type Node } from '../xml.ts';
import { FONT_FAMILY, SIZE } from '../type.ts';
import * as G from '../geometry.ts';

/** The row's group box. Both copies, so the fade is over the same area. */
export const DATE_GROUP = { x: 0, y: 0, width: 450, height: 80 };

/**
 * Same family and size in both modes; only the weight moves.
 *
 * A local bag rather than type.ts's font(), for the same reason clock.ts keeps
 * one: the two date copies spread it as `{ ...DATE_FONT, weight, color }`, which
 * puts slant before weight. See the note on font() in type.ts.
 */
export const DATE_FONT = { family: FONT_FAMILY, size: SIZE.DATE, slant: 'NORMAL' } as const;

/**
 * The chip's corners. Filled interactive, outlined ambient - so both copies
 * need them, and they have to agree or the shape visibly changes mid-fade.
 */
export const CHIP_RADIUS = { cornerRadiusX: 11, cornerRadiusY: 11 };

/** Inset by CHIP_STROKE / 2. See DATE_CHIP_OUTLINE_SHAPE in geometry.ts. */
export const CHIP_OUTLINE_RADIUS = { cornerRadiusX: 10, cornerRadiusY: 10 };

/** 2 design px, so ~1.9 on the watch. Thin enough to stay a hairline. */
export const CHIP_STROKE = 2;

/**
 * A PartText whose content is one templated source, e.g. "%s" <- [DAY_OF_WEEK_S].
 *
 * The weekday and the day number are SEPARATE parts in both modes. The ambient
 * copy could have been one "%s %d" - it was - but then its weekday sat about
 * 16px right of the interactive one, because a single centred string
 * distributes its own inter-word space while the interactive layout has to pin
 * the number over a fixed chip. Two parts in both modes means the glyphs
 * coincide, which is what lets the overlap read as a fade.
 *
 * It also stops the ambient row shifting horizontally between the 1st and the
 * 31st, which the single-string version did.
 */
const glyph = (
	box: G.Box,
	align: 'START' | 'CENTER' | 'END',
	name: string,
	weight: 'BOLD' | 'NORMAL',
	colour: string,
	template: string,
	expression: string
): Node =>
	el('PartText', { ...box, name }, [
		el('Text', { align }, [
			el('Font', { ...DATE_FONT, weight, color: colour }, [
				el('Template', {}, [cdata(template), el('Parameter', { expression })])
			])
		])
	]);

/**
 * The weekday. END-ALIGNED, which is the whole point of it having its own
 * builder.
 *
 * Centred, the word grew symmetrically about x 198, so the gap to the chip was
 * a function of how wide the abbreviation happened to be - "Wed" is about 13px
 * wider than "Fri" at this size, so the gap breathed by ~6px either side of
 * nominal as the week went by, and next to a hard chip edge that is visible.
 *
 * WFF HAS NO TEXT-WIDTH SOURCE, so a row that is both centred as a unit AND
 * evenly spaced is not expressible: Part* boxes are authoring-time integers and
 * textLength() counts CHARACTERS, which is no help at all here since all seven
 * English abbreviations are three of them. One of the two has to give.
 *
 * Pinning the right edge is the one to keep. A constant gap is judged against
 * the chip a few pixels away; the row's centre is judged against nothing, and
 * it now wanders by ~6px instead of the gap doing so. The nominal centring is
 * unchanged - a 44px word still spans 176..273, centre 224.5, the canvas
 * centre.
 */
export const weekdayGlyph = (name: string, weight: 'BOLD' | 'NORMAL', colour: string): Node =>
	glyph(G.DATE_WEEKDAY_BOX, 'END', name, weight, colour, '%s', '[DAY_OF_WEEK_S]');

/** The day number, centred on the chip. Stays CENTER: 1 and 31 both sit on it. */
export const dayGlyph = (name: string, weight: 'BOLD' | 'NORMAL', colour: string): Node =>
	glyph(G.DATE_DAY_BOX, 'CENTER', name, weight, colour, '%d', '[DAY]');
