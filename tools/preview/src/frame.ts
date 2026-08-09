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
 */

import { objectEntries, objectKeys } from 'hhson-lib';
import { face } from '../../gen/face.ts';
import { renderSvg, type RenderOpts } from '../../gen/svg.ts';
import { BASE, LIVE_SOURCES, STATES, valuesFor, type NumericSource } from '../../gen/fixtures.ts';
import { GYRO_CLAMP } from '../../gen/geometry.ts';
import { clockValues, weekdayLabel } from './clock.ts';

const TREE = face();

/** Every state the preview can show, in the order capture-states.ps1 shoots them. */
export const STATE_NAMES: string[] = objectKeys(STATES);

/**
 * Which sources the preview drives itself rather than taking from the state.
 *
 * THE SAME FOUR mock-state.ts LEAVES LIVE, and for the same reason: a frozen
 * accelerometer means no parallax and a frozen clock means no drift. Both features
 * were once reported as broken purely because they were judged on a build that had
 * pinned their inputs to constants. Sharing the list means the preview and the mock
 * cannot drift about which four those are.
 */
export const DRIVEN: readonly NumericSource[] = LIVE_SOURCES;

export type Controls = {
	state: string;
	/** Seconds since midnight; drives the clock sources and the time text. */
	secondsOfDay: number;
	/** Wrist tilt, in degrees, as <Gyro> reads it. */
	tiltX: number;
	tiltY: number;
	/** 0 = interactive, 1 = ambient. Anything between scrubs the transition. */
	ambient: number;
	/** Which direction the scrubbed transition is going. */
	toAmbient: boolean;
};

export const DEFAULTS: Controls = {
	state: 'baseline',
	secondsOfDay: 19 * 3600 + 12 * 60,
	tiltX: 0,
	tiltY: 0,
	ambient: 0,
	toAmbient: true
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

export const build = (c: Controls): Frame => {
	const clock = clockValues(c.secondsOfDay);
	const values = valuesFor(c.state, {
		...clock.values,
		ACCELEROMETER_ANGLE_X: c.tiltX,
		ACCELEROMETER_ANGLE_Y: c.tiltY
	});
	const display = {
		time: clock.time,
		weekday: weekdayLabel(values.DAY_OF_WEEK)
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

/** Which sources a state actually changes, so the readout can highlight them. */
export const changedBy = (state: string): Set<string> => {
	const delta = STATES[state] ?? {};
	return new Set(
		objectEntries(delta)
			.filter(([, v]) => typeof v === 'number')
			.map(([k]) => k)
	);
};

export const SOURCE_NAMES = objectKeys(BASE);
