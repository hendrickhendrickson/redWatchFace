/**
 * The date, for the preview.
 *
 * WHY A REAL DATE. WFF has no YEAR source - DAY, MONTH and DAY_OF_WEEK are three
 * independent numeric sources, and nothing on the face ties them to a real
 * calendar. But a previewer with a date PICKER needs one anyway, because a picker
 * has to show a real year to be usable - and once it has one, deriving DAY_OF_WEEK
 * from it for real removes an entire class of "which weekday is the 19th of
 * December" bugs, the same reason clock.ts derives HOUR_0_23 and the clock text
 * from one scrubbable value instead of carrying them separately.
 *
 * A LOADED PRESET THEREFORE NEVER CARRIES ITS OWN WEEKDAY. fixtures.ts's holiday
 * states all leave weekday at BASE's 'Mon' - correct there, because a
 * calendar-less snapshot state has nothing to compute it from - but here the
 * picker's year is real, so a preset's day/month are run back through actual
 * calendar math instead of trusting the state table's arbitrary weekday.
 */

import { DAY_OF_WEEK, type Weekday } from '../../gen/palette.ts';
import type { NumericSource } from '../../gen/fixtures.ts';
import { weekdayLabel } from './clock.ts';

/** Date#getDay() order (0 = Sunday), so it indexes straight into DAY_OF_WEEK. */
const JS_DAY_ORDER: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const parse = (iso: string): Date => {
	const [year, month, day] = iso.split('-').map(Number);
	return new Date(year, month - 1, day);
};

/** DAY, MONTH and DAY_OF_WEEK for a picker date, plus the label DAY_OF_WEEK_S renders. */
export const dateValues = (
	iso: string
): { values: Partial<Record<NumericSource, number>>; weekday: string } => {
	const date = parse(iso);
	const dayOfWeek = DAY_OF_WEEK[JS_DAY_ORDER[date.getDay()]];
	return {
		values: { DAY: date.getDate(), MONTH: date.getMonth() + 1, DAY_OF_WEEK: dayOfWeek },
		weekday: weekdayLabel(dayOfWeek)
	};
};

/** Swap in a new day/month, keeping the picker's own year - for loading a preset. */
export const withDayMonth = (iso: string, day: number, month: number): string => {
	const [year] = iso.split('-');
	return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};
