/**
 * The time. Drawn twice, because WFF cannot animate a font weight.
 *
 * BOTH COPIES ARE THE SAME STRING AT THE SAME ORIGIN, differing only in weight
 * and colour. That congruence is load-bearing, not incidental: the two are
 * simultaneously visible for part of the wake transition, and it is only
 * because the LIGHT stems sit inside the BOLD ones that the overlap reads as a
 * weight morph instead of as doubled text. See crossfade.ts.
 */

import { el, type Node } from '../xml.ts';
import { C } from '../palette.ts';
import { FADE_IN, FADE_OUT } from '../crossfade.ts';
import { FONT_FAMILY, SIZE } from '../type.ts';
import * as G from '../geometry.ts';

/**
 * TWO DIFFERENT THINGS ARE BOTH CALLED SYNC_TO_DEVICE and only one of them is
 * below. `hourFormat` takes it to mean "follow the wearer's 12/24-hour setting",
 * which is a locale preference and has nothing to do with type; the FONT's
 * `family` takes it to mean "use whatever face the watch ships". They are
 * unrelated settings that happen to share a token, so only the second comes from
 * type.ts - substituting FONT_FAMILY here would read as if the clock's hour format
 * were a typographic decision.
 */
const TIME = {
	format: 'hh:mm',
	hourFormat: 'SYNC_TO_DEVICE',
	align: 'CENTER',
	x: 0,
	y: 68,
	width: 450,
	height: 120
} as const;

/**
 * Kept as a local bag rather than built with type.ts's font(), because these two
 * copies spread it as `{ ...FONT, weight, color }` - which emits family, size,
 * SLANT, weight, color, a different attribute order from the chips. See the note
 * on font() in type.ts.
 */
const FONT = { family: FONT_FAMILY, size: SIZE.CLOCK, slant: 'NORMAL' } as const;

export const clock = (): Node =>
	el('DigitalClock', { ...G.CANVAS }, [
		el('TimeText', { ...TIME, alpha: 255 }, [
			el('Variant', FADE_OUT),
			el('Font', { ...FONT, weight: 'BOLD', color: C.CREAM })
		]),
		el('TimeText', { ...TIME, alpha: 0 }, [
			el('Variant', FADE_IN),
			el('Font', { ...FONT, weight: 'LIGHT', color: C.WHITE })
		])
	]);
