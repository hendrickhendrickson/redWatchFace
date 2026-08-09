/**
 * Weekday + day of month, ambient copy. "Sat 1"
 *
 * One colour, no chip, NORMAL rather than BOLD: ambient drops the day's hue
 * along with everything else that costs lit pixels.
 *
 * IT REUSES THE INTERACTIVE COPY'S BOXES. It used to be a single centred
 * "%s %d", which put its weekday about 16px to the right of the interactive
 * one - so during the wake transition, where both copies are briefly drawn,
 * you saw two dates side by side rather than one fading into the other. The
 * clock never had that problem because its two copies were always congruent.
 * See crossfade.ts for why the overlap cannot simply be removed.
 *
 * THE CHIP IS WHY THE GAP EXISTS, so ambient draws it too - as an outline.
 * Sharing the interactive boxes means inheriting the 31px gap between the
 * weekday and the day number, which is sized for a chip; without one it just
 * reads as a typographic mistake. Outlined rather than filled: it keeps the
 * pixel budget close to the old single-string version, it is the cheaper shape
 * for burn-in, and it fades into the filled chip on a shared boundary.
 */

import { el, type Node } from '../xml.ts';
import { C } from '../palette.ts';
import { FADE_IN } from '../crossfade.ts';
import * as G from '../geometry.ts';
import {
	CHIP_OUTLINE_RADIUS,
	CHIP_STROKE,
	DATE_GROUP,
	dayGlyph,
	weekdayGlyph
} from './date-common.ts';

export const dateAmbient = (): Node =>
	el('Group', { name: 'date_ambient', ...DATE_GROUP, alpha: 0 }, [
		el('Variant', FADE_IN),
		el('PartDraw', { ...G.DATE_CHIP_BOX, name: 'date_ambient_chip' }, [
			el('RoundRectangle', { ...G.DATE_CHIP_OUTLINE_SHAPE, ...CHIP_OUTLINE_RADIUS }, [
				el('Stroke', { color: C.ICE, thickness: CHIP_STROKE })
			])
		]),
		weekdayGlyph('date_ambient_weekday', 'NORMAL', C.ICE),
		dayGlyph('date_ambient_day', 'NORMAL', C.ICE)
	]);
