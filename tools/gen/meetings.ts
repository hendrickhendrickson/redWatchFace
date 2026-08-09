/**
 * The blob's weekly meeting schedule - the windows behind the headset, the
 * Wednesday coffee cup and the Friday game controller.
 *
 *   Mon, Tue, Thu, Fri   09:05-09:20  digital standup - headset
 *   Mon, Tue, Thu        16:00-16:30  digital standup - headset
 *   Wednesday            10:30-10:45  IN-PERSON standup - no headset, coffee cup
 *   Friday               15:00-16:00  digital "game time" - headset throughout,
 *                                     a game controller for the back half
 *
 * WEDNESDAY IS DELIBERATELY ABSENT from the two digital windows above: it is
 * the one office day, and its only standup is the in-person 10:30-10:45 slot,
 * which gets no headset at all. Getting this wrong reintroduces exactly the
 * bug this module used to be about - a hand-copied window silently disagreeing
 * with itself - just one level up, at the level of "which days" rather than
 * "which minutes".
 *
 * THIS FILE REPLACES salute.ts. The hand-to-the-brow gesture it defined no
 * longer has anywhere to fire: every window that used to salute now either
 * wears a headset (both digital windows, and Friday) or holds a coffee cup
 * (Wednesday) instead. The busy-hand test that used to decide which arm
 * saluted (`HANDS_FULL` / `SALUTE_BUSY`) goes with it - nothing here raises an
 * arm, so there is nothing left to route between two of them. See
 * blob-hero.ts for how the arm Conditions collapsed once the salute branch
 * was removed from both of them.
 *
 * WFF cannot reference an expression from another Condition, so - exactly as
 * before - each window is restated at every site that reacts to it. What is
 * still true is that it is restated FROM one place, so the copies cannot
 * disagree with each other even though the schema gives no way to stop them
 * being separate strings in the output.
 */

import { src, gte, gt, eq, and, or, group, type Expr } from './expr.ts';

const DOW = src('DAY_OF_WEEK');
const HOUR = src('HOUR_0_23');
const MIN = src('MINUTE');

/**
 * [DAY_OF_WEEK] is 1 = SUNDAY, so Monday is 2 and Friday is 6 - see the note
 * on the same constant in palette.ts. Written as an explicit OR of `==`
 * rather than a range-with-a-hole, because "which days" is exactly the fact
 * a reader needs at a glance and a range-minus-Wednesday makes them do the
 * arithmetic themselves.
 *
 * GROUPED, NOT LEFT BARE. `or()` joins its arguments with a flat `||`, and
 * `&&` binds tighter than `||` with no parentheses of its own - so an
 * ungrouped `A || B || C || D` pasted straight into `and(days, eq(HOUR,9),
 * ...)` parses as `A || B || (D && HOUR==9 && ...)`, which is "Monday and
 * Tuesday, unconditionally, any hour, any minute". Caught by evaluating the
 * real expression at midnight rather than by reading it - exactly the class
 * of bug group() exists to make impossible.
 */
const MON_TUE_THU_FRI = group(or(eq(DOW, 2), eq(DOW, 3), eq(DOW, 5), eq(DOW, 6)));
const MON_TUE_THU = group(or(eq(DOW, 2), eq(DOW, 3), eq(DOW, 5)));

/** 09:05-09:20 - every digital-standup day, i.e. every weekday except Wednesday. */
const MORNING_STANDUP = and(MON_TUE_THU_FRI, eq(HOUR, 9), gte(MIN, 5), gt(20, MIN));

/** 16:00-16:30 - Mon, Tue, Thu only. Friday's afternoon is game time instead;
 *  Wednesday's is the in-person slot and has no digital counterpart at all. */
const AFTERNOON_STANDUP = and(MON_TUE_THU, eq(HOUR, 16), gt(30, MIN));

/**
 * Friday's whole game-time hour, 15:00-16:00. The headset stays on for all of
 * it - unlike the old salute/drink pair, there is no pose change at :30, only
 * the controller appearing in the second half (`FRIDAY_GAME_ICON` below).
 */
const FRIDAY_GAME = and(eq(DOW, 6), eq(HOUR, 15));

/** The controller half of Friday's game time, 15:30-16:00 - the same clock
 *  boundary the old Friday drink used, kept because the call itself still
 *  splits into "just arrived" and "actually playing" at that point. */
export const FRIDAY_GAME_ICON: Expr = and(eq(DOW, 6), eq(HOUR, 15), gte(MIN, 30));

/**
 * Every window that puts a headset on both blobs. Three copies in the
 * generated XML - one per blob, since <Gyro> and everything else about an
 * accessory group is not inherited between siblings either.
 */
export const HEADSET_WINDOW: Expr = or(
	group(MORNING_STANDUP),
	group(AFTERNOON_STANDUP),
	group(FRIDAY_GAME)
);

/**
 * Wednesday's in-person standup, 10:30-10:45. The only meeting window that
 * does NOT get a headset - see the coffee cup in blob-hero.ts instead.
 */
export const WEDNESDAY_MEETING: Expr = and(eq(DOW, 4), eq(HOUR, 10), gte(MIN, 30), gt(45, MIN));
