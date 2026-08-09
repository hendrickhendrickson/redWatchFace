/**
 * The named states the face is looked at in, and the source values each one sets.
 *
 * LIFTED OUT OF tools/mock-state.ts, which owned this table when it was the only
 * consumer. It now has three, and they must not be allowed to disagree:
 *
 *   mock-state.ts     patches watchface.xml so a screenshot is deterministic
 *   gen/eval.ts       evaluates expressions over these values to prove two
 *                     expressions agree (build.ts --equiv)
 *   tools/preview     renders a state in the browser
 *
 * The screenshots in docs/states/ are named after these states, and so are the
 * buttons in the preview - so a state added here shows up in all three places at
 * once, and a value changed here cannot make the preview and the contact sheet
 * disagree about what "cold" means.
 *
 * WHAT STAYED IN mock-state.ts: everything that knows about MARKUP - the Template
 * swaps, the clock block, the leftover scan. Those are coupled to the
 * serialiser's formatting on purpose. This file is only values.
 */

import { objectKeys } from 'hhson-lib';
import type { Source } from './expr.ts';
import { DAY_OF_WEEK, WEEKDAYS, type Weekday } from './palette.ts';

/**
 * Every source that gets a numeric literal.
 *
 * TYPED AGAINST THE FACE'S OWN SOURCE UNION. `Source` is the closed list in
 * expr.ts that the generator builds expressions from, so adding a source there
 * without adding a value below is a COMPILE error, and mocking something the face
 * cannot read is too. That used to be a runtime discovery: the leftover scan in
 * mock-state.ts would catch it, but only on the next capture run, and only if
 * someone read the abort message.
 *
 * DAY_OF_WEEK_S is excluded because it is a string - see TEMPLATE_SWAPS in
 * mock-state.ts.
 */
export type NumericSource = Exclude<Source, 'DAY_OF_WEEK_S'>;

/**
 * Is this string one of the sources that takes a numeric literal?
 *
 * A predicate rather than a `k in BASE` test, because `in` narrows the OBJECT, not the string -
 * so a caller checking membership still had to assert the key type afterwards. This narrows the
 * thing the caller actually holds. See /hhson-typescript on predicates.
 */
export const isNumericSource = (name: string): name is NumericSource => name in BASE;

/** Values shared by every state - the "good day" the preview is shot on. */
export const BASE: Record<NumericSource, number> = {
	DAY: 19,
	// Monday, so the base "good day" is the brand red and every non-weekday frame
	// keeps the colour the face has always had. 1 = SUNDAY, measured on the watch.
	DAY_OF_WEEK: DAY_OF_WEEK.mon,
	HOUR_0_23: 19,
	// Only the meeting windows in meetings.ts read minutes, but it has to be here
	// regardless: the leftover scan treats any source it cannot substitute as a
	// live one, which is exactly the failure it exists to catch.
	MINUTE: 12,
	HEART_RATE: 88,
	STEP_COUNT: 1912,
	STEP_PERCENT: 19,
	STEP_GOAL: 10000,
	BATTERY_PERCENT: 88,
	BATTERY_IS_LOW: 0,
	'WEATHER.IS_AVAILABLE': 1,
	'WEATHER.TEMPERATURE': 19,
	'WEATHER.CONDITION': 1,
	'WEATHER.IS_DAY': 1,
	'WEATHER.CHANCE_OF_PRECIPITATION': 0,
	// Moderate (3-5 on the WHO scale), deliberately BELOW the >= 6 the shades fire
	// at, so the base "good day" is not wearing sunglasses.
	'WEATHER.UV_INDEX': 4,
	MOON_PHASE_POSITION: 19.79,
	// Flat wrist, so parallax sits at rest and does not blur the comparison
	// between snapshots.
	ACCELEROMETER_ANGLE_X: 0,
	ACCELEROMETER_ANGLE_Y: 0,
	// Freezes the Zzz drift. NOT arbitrary: the drift phase is
	// p = (([SECOND] % 3) + [SECOND_MILLISECOND] - [SECOND]) / 3, and alpha is a
	// triangle over p that is ZERO at both ends. Second 1.0 puts the hero at
	// p = 1/3 and the companion - a second out of phase - at p = 2/3, the same
	// height on the way down. Both land on alpha 170, so the z's are equally
	// legible in a still. Second 0 would render them invisible.
	SECOND: 1,
	SECOND_MILLISECOND: 1.0
};

/** What the mocked clock and date read. Not sources - they replace Templates. */
export type Display = {
	time: string;
	weekday: string;
};

export const BASE_DISPLAY: Display = { time: '19:12', weekday: 'Mon' };

export type StateDelta = Partial<Record<NumericSource, number>> & Partial<Display>;

/**
 * A table of states by name.
 *
 * `Partial` because the key type is `string`, which is infinite: a lookup by a name nobody
 * defined is a miss, and the type has to say so. Every consumer here takes a state name off a
 * command line or a URL, so the miss is the normal case rather than the exotic one - see
 * /hhson-typescript.
 */
export type StateTable = Partial<Record<string, StateDelta>>;

/**
 * Sources left LIVE by `mock-state.ts on <state> --live`.
 *
 * A frozen accelerometer means no parallax and a frozen clock means no drift,
 * which is right for a snapshot and wrong when the build is going on a wrist to
 * be looked at. Both features were once reported as broken purely because they
 * were judged on a mock build that had pinned their inputs to constants.
 *
 * The preview drives these four from its own controls, so it wants them live too.
 */
export const LIVE_SOURCES: NumericSource[] = [
	'ACCELEROMETER_ANGLE_X',
	'ACCELEROMETER_ANGLE_Y',
	'SECOND',
	'SECOND_MILLISECOND'
];

/** Short weekday label, matching what [DAY_OF_WEEK_S] renders on the watch. */
const LABEL: Record<Weekday, string> = {
	mon: 'Mon',
	tue: 'Tue',
	wed: 'Wed',
	thu: 'Thu',
	fri: 'Fri',
	sat: 'Sat',
	sun: 'Sun'
};

/**
 * One state per weekday.
 *
 * DERIVED FROM THE FACE'S OWN DAY_OF_WEEK MAP rather than restating 1..7 here.
 * The mapping is 1 = Sunday (Java/ICU, measured on the watch, not ISO 8601), and
 * getting it wrong shifts every colour by a day - which looks exactly like a
 * correct implementation six days out of seven. It is now impossible for these
 * frames and the face to disagree about which number Tuesday is.
 *
 * Each also sets the weekday string and a matching day-of-month so nothing on
 * screen contradicts anything else: a frame reading "Tue 18" in yellow is
 * internally consistent, where DAY_OF_WEEK=3 with the base "Mon 19" would show a
 * yellow blob next to the word Monday.
 */
export const weekdayStates = (): StateTable => {
	const out: StateTable = {};
	const dayOfMonth: Record<Weekday, number> = {
		mon: 17,
		tue: 18,
		wed: 19,
		thu: 20,
		fri: 21,
		sat: 22,
		sun: 23
	};
	const longName: Record<Weekday, string> = {
		mon: 'monday',
		tue: 'tuesday',
		wed: 'wednesday',
		thu: 'thursday',
		fri: 'friday',
		sat: 'saturday',
		sun: 'sunday'
	};
	for (const d of WEEKDAYS) {
		out[longName[d]] = { DAY_OF_WEEK: DAY_OF_WEEK[d], weekday: LABEL[d], DAY: dayOfMonth[d] };
	}
	return out;
};

/**
 * Per state, ONLY the values that state is about. Everything else stays at BASE,
 * which is the point: the snapshots differ by exactly one idea each.
 *
 * Ordering matches docs/states/ numbering.
 */
export const STATES: StateTable = {
	ambient: {},
	baseline: {},
	night: { time: '23:12', HOUR_0_23: 23, 'WEATHER.IS_DAY': 0, 'WEATHER.UV_INDEX': 0 },
	// The full summer day: warm, clear AND strong sun, so both halves of the old
	// sunny state fire - shades and cocktail together, which is what a real 25
	// degree cloudless afternoon looks like.
	sunny: { 'WEATHER.TEMPERATURE': 25, 'WEATHER.UV_INDEX': 8 },
	// High UV WITHOUT the warm clear day: 14 degrees, partly cloudy (code 14, the
	// one non-clear code confirmed on hardware). Shades, no drink. This frame is
	// what proves the split - a bright cold spring afternoon.
	uv: { 'WEATHER.UV_INDEX': 8, 'WEATHER.TEMPERATURE': 14, 'WEATHER.CONDITION': 14 },
	// Scarf weather. Exactly ON the threshold, and deliberately ABOVE the glove
	// threshold, so this frame shows the scarf alone.
	cold: { 'WEATHER.TEMPERATURE': 10 },
	gloves: { 'WEATHER.TEMPERATURE': 5 },
	freezing: { 'WEATHER.TEMPERATURE': 0 },
	// 50 is exactly ON the umbrella/rain gate, and since density, drop size and
	// speed all scale with CHANCE_OF_PRECIPITATION, this is the LIGHTEST rain the
	// face can show - about 7 of the 24 drops. Deliberate: it is the bottom of the
	// ramp, and thunderstorm at 90% is near the top.
	rainy: { 'WEATHER.CHANCE_OF_PRECIPITATION': 50, 'WEATHER.CONDITION': 12 },
	thunderstorm: { 'WEATHER.CHANCE_OF_PRECIPITATION': 90, 'WEATHER.CONDITION': 12 },
	// The top of the rain ramp: all 24 drops, largest and fastest. No docs frame
	// of its own - rainy and thunderstorm bracket the range - but it is in
	// cycle-states.ps1, because the whole point of the ramp is how it moves.
	downpour: { 'WEATHER.CHANCE_OF_PRECIPITATION': 100, 'WEATHER.CONDITION': 12 },
	// The sweat frames BRACKET the ramp rather than sampling its middle: 100 is
	// exactly on the gate, where the drip is shortest and slowest with one bead
	// per cheek, and 200 is the ceiling. Anything between is a linear blend.
	//
	// THREE frames, not two, because the forehead cluster fills in three discrete
	// steps and the middle one is only reachable between 120 and 149. The drips
	// are continuous and would be documented by the ends alone; the pearls are
	// not. 135 sits mid-band so the frame cannot be read as a boundary case.
	//
	// To look at a point inside the ramp, override rather than adding a state:
	//   node tools/mock-state.ts on sweating --set=HEART_RATE=150 --live
	sweating: { HEART_RATE: 100 },
	puffing: { HEART_RATE: 135 },
	drenched: { HEART_RATE: 200 },
	// STEP_PERCENT is what the trigger reads, against the wearer's own STEP_GOAL,
	// so 100 means "goal met" regardless of what that goal is; STEP_COUNT is only
	// there so the digits on screen agree with it. Ten thousand exactly, not
	// 10240 - and landing ON the threshold tests the >= boundary.
	goal: { STEP_COUNT: 10000, STEP_PERCENT: 100 },

	// ---- the meeting schedule -----------------------------------------------
	//
	//   Mon, Tue, Thu, Fri   09:05-09:20  digital standup       - headset
	//   Mon, Tue, Thu        16:00-16:30  digital standup       - headset
	//   Wednesday            10:30-10:45  IN-PERSON standup     - coffee cup
	//   Friday               15:00-16:00  digital "game time"   - headset,
	//                                     controller from 15:30
	//
	// Replaces the old salute/salutebusy/salutefri/fridrink block. The salute
	// itself is gone - see meetings.ts - so there is no pose left that needs a
	// "which arm" mechanism, and no `busy` state to demonstrate one with.
	//
	// THE HEADSET LOOKS THE SAME in the morning and afternoon windows, so
	// `headset` documents it once, on the base Monday morning, exactly the way
	// `salute` used to. The Friday states are not repeats of that: one shows
	// game time before the controller appears, the other after.
	//
	// Times sit INSIDE each window, so no frame can be read as a boundary case.
	headset: { time: '09:12', HOUR_0_23: 9, MINUTE: 12 },
	headsetfri: {
		DAY_OF_WEEK: DAY_OF_WEEK.fri,
		weekday: 'Fri',
		DAY: 21,
		time: '15:15',
		HOUR_0_23: 15,
		MINUTE: 15
	},
	fricontroller: {
		DAY_OF_WEEK: DAY_OF_WEEK.fri,
		weekday: 'Fri',
		DAY: 21,
		time: '15:45',
		HOUR_0_23: 15,
		MINUTE: 45
	},
	wedcoffee: {
		DAY_OF_WEEK: DAY_OF_WEEK.wed,
		weekday: 'Wed',
		DAY: 19,
		time: '10:35',
		HOUR_0_23: 10,
		MINUTE: 35
	},
	// The one remaining "mechanism" state, in the same spirit `salutebusy` used
	// to be: proves the coffee cup wins the same fist a hot, sunny cocktail
	// trigger would otherwise want, because its Compare is listed first. No
	// docs frame of its own - same call as `downpour` - since the point is the
	// priority order, not a new pose.
	wedcoffeehot: {
		DAY_OF_WEEK: DAY_OF_WEEK.wed,
		weekday: 'Wed',
		DAY: 19,
		time: '10:35',
		HOUR_0_23: 10,
		MINUTE: 35,
		'WEATHER.TEMPERATURE': 25
	},

	...weekdayStates()
};

/**
 * Sources that are NOT substituted by mock-state.ts.
 *
 * DAY_OF_WEEK_S is a string, so it cannot become a numeric literal; its whole
 * Template is swapped for static text instead.
 *
 * This used to also list ANIMATION_VALUE, on the belief that <Animation> fed it
 * a 0..1 ramp at render time. No such source exists. Exempting it here is what
 * let an invented source survive the leftover scan - the one check that could
 * have caught it, switched off by hand. Nothing goes in this set unless it is a
 * real source that genuinely cannot be expressed as a numeric literal.
 */
export const NOT_A_VALUE = new Set<string>(['DAY_OF_WEEK_S']);

/** The numeric values a named state resolves to, BASE filled in behind it. */
export const valuesFor = (
	state: string,
	overrides: Partial<Record<NumericSource, number>> = {}
): Record<NumericSource, number> => {
	const delta = STATES[state];
	if (delta === undefined) {
		throw new Error(`unknown state "${state}". One of: ${objectKeys(STATES).join(', ')}`);
	}
	// Driven from BASE's keys rather than the delta's. A StateDelta also carries `time` and
	// `weekday`, which are display strings rather than sources, and iterating the delta meant
	// sorting them back out by `typeof value === 'number'` - which narrows the VALUE and tells
	// the compiler nothing about the KEY, so the result needed an assertion to claim it covered
	// every NumericSource. Reading the sources by name instead makes that claim true rather than
	// asserted: BASE is total over NumericSource, so `out` is too.
	const out: Record<NumericSource, number> = { ...BASE };
	for (const source of objectKeys(BASE)) {
		const value = delta[source];
		if (value !== undefined) {
			out[source] = value;
		}
	}
	return { ...out, ...overrides };
};

/**
 * Every value of every source that an expression could plausibly turn on: both
 * sides of each threshold the face gates at, plus the far ends of each range.
 *
 * THE BOUNDARIES ARE THE WHOLE POINT. `>= 7` and `> 7` agree on every integer
 * except exactly 7, so a grid that samples 3 and 9 "proves" a changed operator
 * harmless. Every threshold in the face therefore appears here with its
 * neighbour: 6/7/8 for the night window, 99/100 for the sweat gate, 4/5 and
 * 10/11 for gloves and scarf, 89/90 for the storm, 5/6 for UV, -1/0/1 for
 * freezing.
 */
const CANDIDATES: Record<NumericSource, number[]> = {
	DAY: [1, 19, 31],
	DAY_OF_WEEK: [1, 2, 3, 4, 5, 6, 7],
	// The meeting windows read hours and minutes together, so both carry every
	// edge of every window from meetings.ts as well as the night boundaries.
	HOUR_0_23: [0, 6, 7, 8, 9, 10, 15, 16, 17, 22, 23],
	MINUTE: [0, 4, 5, 12, 19, 20, 21, 29, 30, 35, 44, 45, 46, 59],
	HEART_RATE: [0, 88, 99, 100, 119, 120, 139, 140, 149, 150, 200, 220],
	STEP_COUNT: [0, 1912, 10000],
	STEP_PERCENT: [0, 19, 99, 100, 140],
	STEP_GOAL: [10000],
	BATTERY_PERCENT: [0, 7, 15, 50, 88, 100],
	BATTERY_IS_LOW: [0, 1],
	'WEATHER.IS_AVAILABLE': [0, 1],
	'WEATHER.TEMPERATURE': [-20, -1, 0, 1, 4, 5, 6, 10, 11, 19, 24, 25, 26, 40],
	'WEATHER.CONDITION': [1, 12, 14],
	'WEATHER.IS_DAY': [0, 1],
	'WEATHER.CHANCE_OF_PRECIPITATION': [0, 19, 20, 28, 49, 50, 51, 75, 89, 90, 92, 100],
	'WEATHER.UV_INDEX': [0, 4, 5, 6, 7, 11],
	MOON_PHASE_POSITION: [0, 7.38, 14.77, 22.15, 29.53],
	// Beyond the +-35 clamp in both directions, since the parallax gains clamp
	// before they scale.
	ACCELEROMETER_ANGLE_X: [-90, -36, -35, -10, 0, 10, 35, 36, 90],
	ACCELEROMETER_ANGLE_Y: [-90, -36, -35, -10, 0, 10, 35, 36, 90],
	SECOND: [0, 1, 2, 3, 4, 5],
	// Filled in from SECOND - see below, these two are not independent.
	SECOND_MILLISECOND: [0]
};

/** The fractional parts SECOND_MILLISECOND is sampled at, within its second. */
const SUB_SECOND = [0, 0.25, 0.5, 0.75, 0.99];

/**
 * A seeded linear congruential generator. Numeric Recipes' constants.
 *
 * DETERMINISTIC ON PURPOSE. A check that samples differently on each run
 * "passes" until the day it does not, and then cannot be reproduced from the
 * failure message. Same seed, same grid, every run and every machine.
 */
const lcg = (seed: number) => {
	let s = seed >>> 0;
	return () => {
		s = (Math.imul(1664525, s) + 1013904223) >>> 0;
		return s / 0x100000000;
	};
};

/**
 * The value sets an expression is checked over by build.ts --equiv.
 *
 * THREE BLOCKS, and the third is the one that earns its keep.
 *
 * 1. Every named state, straight from STATES - so a state added above widens the
 *    grid for free, and nothing can be "proved equivalent" only on the good day
 *    it was authored against.
 *
 * 2. One-factor sweeps: each source walked through every value in CANDIDATES
 *    with everything else at BASE. This is what catches a moved threshold.
 *
 * 3. COMBINATIONS, sampled. Blocks 1 and 2 vary one thing at a time, and the
 *    most dangerous class of change in this codebase does not show up that way.
 *    Rewriting a predicate through and()/or() can mis-bind - the documented bug
 *    that put headsets on at every hour of the day - and
 *    `a || b && c` differs from `(a || b) && c` only when `a` is true AND `c` is
 *    false. Two factors at once. A one-factor grid reports that as equivalent,
 *    which it did, on the first version of this function, for exactly that
 *    expression.
 */
export const EVAL_GRID = (): Array<Record<NumericSource, number>> => {
	const rows = objectKeys(STATES).map((s) => valuesFor(s));
	const keys = objectKeys(CANDIDATES);

	// 2. One factor at a time.
	for (const k of keys) {
		if (k === 'SECOND' || k === 'SECOND_MILLISECOND') {
			continue;
		}
		for (const v of CANDIDATES[k]) {
			rows.push(valuesFor('baseline', { [k]: v }));
		}
	}
	// The two clock sources are not independent: every phase idiom in the face is
	// built on `[SECOND_MILLISECOND] - [SECOND]`, so a row where the millisecond
	// reading is not inside its own second is not a state the watch can be in.
	for (const s of CANDIDATES.SECOND) {
		for (const f of SUB_SECOND) {
			rows.push(valuesFor('baseline', { SECOND: s, SECOND_MILLISECOND: s + f }));
		}
	}

	// 3. Combinations.
	const rand = lcg(0x5eed);
	const pick = <T>(xs: T[]): T => xs[Math.floor(rand() * xs.length)];
	for (let i = 0; i < 600; i++) {
		const row: Partial<Record<NumericSource, number>> = {};
		for (const k of keys) {
			row[k] = pick(CANDIDATES[k]);
		}
		const sec = pick(CANDIDATES.SECOND);
		row.SECOND = sec;
		row.SECOND_MILLISECOND = sec + pick(SUB_SECOND);
		rows.push(valuesFor('baseline', row));
	}

	return rows;
};
