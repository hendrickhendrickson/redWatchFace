/**
 * Weekday + day of month, interactive copy. "Sat 1"
 *
 * The day number sits on a rounded chip, the way the stock Wear OS face draws
 * it. That forced a single "%s %d" PartText to split into two: the chip has to
 * be a fixed box and WFF has no content-driven layout to hang it off the end of
 * the weekday. See DATE_* in geometry.ts for why the centring is an estimate.
 *
 * THE ROW TAKES THE DAY'S HUE, AND ONLY ITS HUE. It briefly carried the full
 * body colour - a filled swatch with near-black digits - and that was far too
 * loud for a 26px row under a 100px clock. The chip and text ratios are lifted
 * off the retired fixed slate and ice blue, so only the hue moves.
 */

import { el, type Node } from '../xml.ts';
import { dateChip, dateText } from '../palette.ts';
import { FADE_OUT } from '../crossfade.ts';
import * as G from '../geometry.ts';
import { byWeekday } from '../weekday.ts';
import { launch } from '../launch.ts';
import { CHIP_RADIUS, DATE_GROUP, dayGlyph, weekdayGlyph } from './date-common.ts';

export const dateInteractive = (): Node =>
	el('Group', { name: 'date_interactive', ...DATE_GROUP, alpha: 255 }, [
		el('Variant', FADE_OUT),
		// ⚠ THE TAP REGION IS DATE_GROUP, WHICH IS THE WHOLE 450x80 TOP BAND, not the
		// ~90px the row actually draws in. The seven weekday copies each carry their own
		// boxes inside a Condition, so there is no single element with the row's real
		// bounds to hang this off; narrowing DATE_GROUP would clip the glyphs. Nothing
		// else is drawn above y=80, so the cost is a wide dead-looking target rather
		// than a stolen tap - but it is untested against the top-edge system gesture.
		//
		// The ambient copy deliberately has none: in ambient the first tap wakes the
		// watch rather than reaching the face at all. See docs/device.md.
		launch('CALENDAR'),
		byWeekday('date', 'hero', (day, body) => [
			el('PartDraw', { ...G.DATE_CHIP_BOX, name: `date_chip_${day}` }, [
				el('RoundRectangle', { ...G.DATE_CHIP_SHAPE, ...CHIP_RADIUS }, [
					el('Fill', { color: dateChip(body) })
				])
			]),
			weekdayGlyph(`date_weekday_${day}`, 'BOLD', dateText(body)),
			dayGlyph(`date_day_${day}`, 'BOLD', dateText(body))
		])
	]);
