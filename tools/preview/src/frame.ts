/**
 * One frame: controls in, SVG out.
 *
 * THE TREE IS BUILT ONCE. `face()` is pure and its result does not depend on any
 * source value - every condition and every animation lives INSIDE the tree as an
 * expression, because WFF has no other way to express them. So the whole per-frame
 * cost is evaluating those expressions, which is what svg.ts's AST cache is for.
 *
 * IT IMPORTS face.ts AND NEVER build.ts. build.ts has CLI side effects at load: it
 * parses argv and writes files. Importing it from a browser app would be a mistake
 * that only shows up as something unexpected happening to watchface.xml.
 *
 * CONTROLS ARE RAW SOURCES, NOT A NAMED STATE. Every field below is a data point
 * the face can actually read - time, date, heart rate, weather, ... - so a preset
 * is something you LOAD (`loadPreset`, copying a STATES entry's resolved values in),
 * not something you stay bound to. Whatever a state doesn't set (Christmas, the
 * sweat bands, the weekday colour) still follows automatically, because those are
 * predicates baked into the tree over these same raw values - not something this
 * file has to compute.
 */

import { objectKeys } from 'hhson-lib';
import { face } from '../../gen/face.ts';
import { renderSvg, type RenderOpts } from '../../gen/svg.ts';
import {
	BASE,
	BASE_DISPLAY,
	CANDIDATES,
	LIVE_SOURCES,
	STATES,
	valuesFor,
	type NumericSource
} from '../../gen/fixtures.ts';
import { GYRO_CLAMP } from '../../gen/geometry.ts';
import { clockValues, weekdayLabel } from './clock.ts';
import { dateValues, withDayMonth } from './calendar.ts';

const TREE = face();

/** Every state the preview can load, in the order capture-states.ts shoots them. */
export const STATE_NAMES: string[] = objectKeys(STATES);

/**
 * Which sources the preview drives itself rather than exposing a control for.
 *
 * THE SAME FOUR mock-state.ts LEAVES LIVE, and for the same reason: a frozen
 * accelerometer means no parallax and a frozen clock means no drift. Sharing the
 * list means the preview and the mock cannot drift about which four those are.
 */
export const DRIVEN: readonly NumericSource[] = LIVE_SOURCES;

export type Controls = {
	/** ISO date (yyyy-mm-dd), the preview's own date picker. Drives DAY/MONTH. */
	dateISO: string;
	/**
	 * DAY_OF_WEEK, independent of dateISO. Set two ways: the date picker's own
	 * onchange recomputes it from a real calendar (calendar.ts's dateValues), and
	 * loadPreset copies it straight from the preset - never both at once. See
	 * loadPreset's own comment for why a preset cannot go through the calendar.
	 */
	dayOfWeek: number;
	/** Seconds since midnight; drives the clock sources and the time text. */
	secondsOfDay: number;
	/** Wrist tilt, in degrees, as <Gyro> reads it. */
	tiltX: number;
	tiltY: number;
	/** 0 = interactive, 1 = ambient. Anything between scrubs the transition. */
	ambient: number;
	/** Which direction the scrubbed transition is going. */
	toAmbient: boolean;
	/** Every other data point - heart rate, weather, steps, ... - see FIELD_SPECS. */
	fields: Partial<Record<NumericSource, number>>;
};

/**
 * The tilt range the controls should offer.
 *
 * <Gyro> clamps its input before scaling it, so beyond this there is nothing more
 * to see - which is worth knowing while dragging, and is why the pad is bounded by
 * the face's own constant instead of a round number.
 */
export const TILT_RANGE = GYRO_CLAMP;

export type Frame = {
	svg: string;
	/** What the face is actually reading, for the readout panel. */
	values: Record<NumericSource, number>;
	display: { time: string; weekday: string };
};

const range = (key: NumericSource, step = 1): { min: number; max: number; step: number } => {
	const candidates = CANDIDATES[key];
	return { min: Math.min(...candidates), max: Math.max(...candidates), step };
};

export type FieldSpec = { key: NumericSource; label: string } & (
	| ({ kind: 'slider' } & ReturnType<typeof range>)
	| { kind: 'number'; min?: number; step?: number }
	| { kind: 'toggle' }
	| { kind: 'select'; options: { value: number; label: string }[] }
);

/** Every data point besides date, time and tilt - one control per source. */
export const FIELD_SPECS: FieldSpec[] = [
	{ key: 'HEART_RATE', label: 'Heart rate', kind: 'slider', ...range('HEART_RATE') },
	{ key: 'STEP_COUNT', label: 'Step count', kind: 'number', min: 0, step: 100 },
	{ key: 'STEP_GOAL', label: 'Step goal', kind: 'number', min: 0, step: 500 },
	{ key: 'BATTERY_PERCENT', label: 'Battery', kind: 'slider', ...range('BATTERY_PERCENT') },
	{ key: 'BATTERY_IS_LOW', label: 'Battery low', kind: 'toggle' },
	{ key: 'WEATHER.IS_AVAILABLE', label: 'Weather available', kind: 'toggle' },
	{
		key: 'WEATHER.TEMPERATURE',
		label: 'Temperature',
		kind: 'slider',
		...range('WEATHER.TEMPERATURE')
	},
	{
		key: 'WEATHER.CONDITION',
		label: 'Condition',
		kind: 'select',
		options: [
			{ value: 1, label: 'Clear' },
			{ value: 12, label: 'Rain' },
			{ value: 14, label: 'Partly cloudy' }
		]
	},
	{ key: 'WEATHER.IS_DAY', label: 'Daylight', kind: 'toggle' },
	{
		key: 'WEATHER.CHANCE_OF_PRECIPITATION',
		label: 'Chance of rain',
		kind: 'slider',
		...range('WEATHER.CHANCE_OF_PRECIPITATION')
	},
	{ key: 'WEATHER.UV_INDEX', label: 'UV index', kind: 'slider', ...range('WEATHER.UV_INDEX') },
	{
		key: 'MOON_PHASE_POSITION',
		label: 'Moon phase',
		kind: 'slider',
		...range('MOON_PHASE_POSITION', 0.1)
	}
];

export const DEFAULTS: Controls = {
	dateISO: '2011-12-19',
	dayOfWeek: BASE.DAY_OF_WEEK,
	secondsOfDay: 19 * 3600 + 12 * 60,
	tiltX: 0,
	tiltY: 0,
	ambient: 0,
	toAmbient: true,
	fields: FIELD_SPECS.reduce<Partial<Record<NumericSource, number>>>((fields, spec) => {
		fields[spec.key] = BASE[spec.key];
		return fields;
	}, {})
};

/** Layer c.fields, then the date, then the clock, then tilt, on top of BASE. */
const resolveValues = (c: Controls): Record<NumericSource, number> => {
	const values: Record<NumericSource, number> = { ...BASE };
	const apply = (overrides: Partial<Record<NumericSource, number>>): void => {
		for (const key of objectKeys(overrides)) {
			const value = overrides[key];
			if (value !== undefined) {
				values[key] = value;
			}
		}
	};
	apply(c.fields);
	// Not a control - STEP_PERCENT is what STEP_COUNT/STEP_GOAL already imply, and a
	// separate slider for it could say something the other two disagreed with.
	values.STEP_PERCENT = Math.round((values.STEP_COUNT / values.STEP_GOAL) * 100);
	apply(dateValues(c.dateISO).values);
	values.DAY_OF_WEEK = c.dayOfWeek;
	apply(clockValues(c.secondsOfDay).values);
	values.ACCELEROMETER_ANGLE_X = c.tiltX;
	values.ACCELEROMETER_ANGLE_Y = c.tiltY;
	return values;
};

export const build = (c: Controls): Frame => {
	const values = resolveValues(c);
	const display = {
		time: clockValues(c.secondsOfDay).time,
		weekday: weekdayLabel(c.dayOfWeek)
	};

	/**
	 * A whole number of either mode renders that mode outright; anything between
	 * scrubs. Passing `transition` at t=0 or t=1 would also work, but going through
	 * the plain path means the static frames the preview shows are produced by
	 * exactly the same code the --svg CLI uses, so a disagreement between the two
	 * cannot come from the transition machinery.
	 */
	const opts: RenderOpts =
		c.ambient <= 0
			? { values, display }
			: c.ambient >= 1
				? { values, display, ambient: true }
				: { values, display, transition: { t: c.ambient, toAmbient: c.toAmbient } };

	return { svg: renderSvg(TREE, opts), values, display };
};

/**
 * Load a named STATES preset into raw controls.
 *
 * DAY_OF_WEEK COMES STRAIGHT FROM THE PRESET, not from running its day/month
 * through the date picker's calendar math. Every meeting window - the headset,
 * the coffee cup, the Friday controller - gates on a specific DAY_OF_WEEK, and a
 * preset's day/month has no real year behind it, so recomputing it would land on
 * whatever weekday that day/month happens to fall on in the picker's own year,
 * almost never the one the preset means to test. See calendar.ts for the picker's
 * own derivation, used only when the picker itself is edited by hand.
 *
 * SECONDS_OF_DAY CARRIES resolved.SECOND_MILLISECOND, NOT JUST THE MINUTE. A
 * state never overrides SECOND/SECOND_MILLISECOND, so `resolved` always has
 * BASE's own 1.0 here - but dropping it and landing on the bare minute (:00)
 * put every preset load right on secondPhase()'s zero-phase instant, the one
 * moment every whole-second animation in the tree is invisible (see BASE's own
 * comment on SECOND in fixtures.ts). Adding it back is what makes SECOND come
 * out of resolveValues() the same way any other resolved field does - loaded
 * FROM the preset, not clobbered by a clock computation that never saw it.
 *
 * AMBIENT IS LOADED UNCONDITIONALLY, not merged in only when a preset sets it.
 * The mode control is itself a preset value, defaulting to interactive same as
 * every StateDelta that leaves it unset - so loading any state but `ambient`
 * must put the mode BACK to interactive, not leave whatever the buttons were
 * last clicked to.
 */
export const loadPreset = (c: Controls, state: string): Controls => {
	const resolved = valuesFor(state, {});
	const fields: Partial<Record<NumericSource, number>> = {};
	for (const spec of FIELD_SPECS) {
		fields[spec.key] = resolved[spec.key];
	}
	return {
		...c,
		dateISO: withDayMonth(c.dateISO, resolved.DAY, resolved.MONTH),
		dayOfWeek: resolved.DAY_OF_WEEK,
		secondsOfDay: resolved.HOUR_0_23 * 3600 + resolved.MINUTE * 60 + resolved.SECOND_MILLISECOND,
		fields,
		ambient: STATES[state]?.ambient === true ? 1 : 0
	};
};

/**
 * One small, independent render per preset, for the gallery.
 *
 * COMPUTED ONCE, LIKE TREE. Frozen at a flat tilt and a whole second so the gallery
 * "only uses their mocked state" - it must not move when the live controls do,
 * since its whole point is to stay a stable picture of what a click will load.
 */
export const GALLERY: { name: string; svg: string }[] = STATE_NAMES.map((name, index) => {
	const values = valuesFor(name, {
		ACCELEROMETER_ANGLE_X: 0,
		ACCELEROMETER_ANGLE_Y: 0,
		SECOND: 0,
		SECOND_MILLISECOND: 0
	});
	const delta = STATES[name] ?? {};
	const display = {
		time: delta.time ?? BASE_DISPLAY.time,
		weekday: delta.weekday ?? BASE_DISPLAY.weekday
	};
	// Every thumbnail sits on the same page as the live stage (which renders with no
	// prefix at all) and as every other thumbnail, so each needs its OWN clip id
	// namespace - see RenderOpts.idPrefix.
	//
	// `ambient` state renders its thumbnail through the same AMBIENT variant loading
	// it applies to the live stage - otherwise the one preset whose whole point is
	// the ambient look would show the interactive face in the gallery.
	return {
		name,
		svg: renderSvg(TREE, {
			values,
			display,
			idPrefix: `g${index}_`,
			ambient: delta.ambient === true
		})
	};
});

/** Which sources currently differ from BASE, so the readout can highlight them. */
export const changedFrom = (values: Record<NumericSource, number>): Set<NumericSource> =>
	new Set(objectKeys(BASE).filter((key) => values[key] !== BASE[key]));

export const SOURCE_NAMES = objectKeys(BASE);
