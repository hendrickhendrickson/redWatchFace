/**
 * The seven-way weekday fan-out, written once.
 *
 * WFF has no variables and no way to reference an expression from another
 * Condition, so every place that needs the day's colour has to restate the
 * whole seven-way choice. The hand-authored file did that ELEVEN times - hero
 * body, hero round mouth, hero open mouth, hero mouth mask, the companion's
 * four equivalents, and the date row's chip, weekday and day - at 45 to 70
 * lines each.
 *
 * The masks were the dangerous ones. An open mouth is a dark ellipse whose top
 * half is repainted in the body colour, so a body/mask mismatch shows up as a
 * dark bar across a face on exactly one weekday - a bug that is invisible six
 * days a week, invisible to the validator, and invisible to any screenshot that
 * was not taken on the wrong day. Here the body and its mask are handed the
 * same value, so it cannot be written.
 */

import { el, type Node } from './xml.ts';
import { HERO, COMPANION, DAY_OF_WEEK, WEEKDAYS, type Hex, type Weekday } from './palette.ts';

/**
 * MONDAY IS THE DEFAULT, deliberately.
 *
 * Six Compares plus a Default cover seven days with no gap, and making Monday
 * the fallback means the brand red is what shows if [DAY_OF_WEEK] ever reports
 * something unexpected - a 0, or an unavailable source. The other six are
 * listed in calendar order rather than in [DAY_OF_WEEK] order because that is
 * the order a person checks them in.
 */
const COMPARED: Weekday[] = ['tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const DEFAULT_DAY: Weekday = 'mon';

/** Which blob a site belongs to. The companion always wears TOMORROW's colour. */
export type Wearer = 'hero' | 'companion';

export const colourFor = (wearer: Wearer, d: Weekday): Hex =>
	wearer === 'hero' ? HERO[d] : COMPANION(d);

/**
 * Build a seven-way weekday Condition.
 *
 * `exprPrefix` is the name stem for the six <Expression> elements. It has to
 * stay unique per site because WFF expression names are scoped to their own
 * Condition but are still easier to read when they do not collide - the
 * original file used body, rmouth, omouth, mask, their companion equivalents,
 * and date.
 *
 * `build` receives the day and the colour that day's wearer shows, and returns
 * the parts to draw. It is called seven times: six inside Compares, once inside
 * the Default.
 */
export function byWeekday(
	exprPrefix: string,
	wearer: Wearer,
	build: (day: Weekday, colour: Hex) => Node[]
): Node {
	return el('Condition', {}, [
		el(
			'Expressions',
			{},
			COMPARED.map((d) =>
				el('Expression', { name: `${exprPrefix}_${d}` }, [
					{ k: 'text', text: `[DAY_OF_WEEK] == ${DAY_OF_WEEK[d]}` }
				])
			)
		),
		...COMPARED.map((d) =>
			el('Compare', { expression: `${exprPrefix}_${d}` }, build(d, colourFor(wearer, d)))
		),
		el('Default', {}, build(DEFAULT_DAY, colourFor(wearer, DEFAULT_DAY)))
	]);
}

/** Every weekday, in the order the Condition emits them. Useful for audits. */
export const emittedOrder: Weekday[] = [...COMPARED, DEFAULT_DAY];

/** Sanity: the seven days must be exactly the palette's seven. */
if (new Set([...COMPARED, DEFAULT_DAY]).size !== WEEKDAYS.length) {
	throw new Error('weekday fan-out does not cover the palette exactly');
}
