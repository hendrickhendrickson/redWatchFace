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
import { CHIP_RADIUS, DATE_GROUP, dayGlyph, weekdayGlyph } from './date-common.ts';

export const dateInteractive = (): Node =>
	el('Group', { name: 'date_interactive', ...DATE_GROUP, alpha: 255 }, [
		el('Variant', FADE_OUT),
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
