/**
 * The order docs/states/ and capture-states.ts show the named states in, and
 * the file-name numbering that order implies.
 *
 * USED TO BE TYPED TWICE, when the capture sweep was still capture-states.ps1:
 * it hand-wrote every file name, including the sub-state letter - '3b-uv',
 * '8c-drenched', '10d-wednesday-coffee' - as a string literal in a PowerShell
 * array, with nothing checking that the letters were sequential or that the
 * state named still existed in STATES. Inserting a state meant renumbering
 * every entry after it by hand.
 *
 * CAPTURE_GROUPS is the one place that order is written down. The number and
 * letter are DERIVED from a group's position and an entry's position within
 * it - see numberedCaptures() - so a slot can be inserted, removed or
 * reordered without touching any file name but its own. Letters start at
 * 'b', not 'a': the first entry in a group IS the unlettered form, so 'a'
 * would be a synonym for no letter rather than a second sub-state.
 *
 * capture-states.ts imports numberedCaptures() and WEEKDAY_CAPTURES directly -
 * both are TypeScript now, so there is no PowerShell↔JSON bridge to keep in
 * sync any more.
 */

import { objectKeys } from 'hhson-lib';
import { STATES, weekdayStates } from '../fixtures.ts';

/** One state, as the capture sweep shows it. */
export type CaptureEntry = {
	/** The name mock-state.ts and STATES know it by. */
	state: string;
	/** The file's slug, when it differs from `state` - 'goal' ships as '9-step-goal'. */
	slug?: string;
	/** Caption under the thumbnail on the contact sheet. */
	label: string;
};

/**
 * One element per numbered slot. A slot with more than one entry is a base
 * state plus its sub-states.
 */
export const CAPTURE_GROUPS: ReadonlyArray<readonly CaptureEntry[]> = [
	[{ state: 'baseline', label: 'baseline' }],
	[{ state: 'night', label: '23:00 to 07:00' }],
	[
		{ state: 'sunny', label: 'sunny 25 deg, UV 8: shades + cocktail' },
		{ state: 'uv', label: 'UV 8 at 14 deg: shades only' }
	],
	[
		{ state: 'cold', label: 'cold 10 deg: scarf' },
		{ state: 'gloves', label: 'cold 5 deg: + gloves' }
	],
	[{ state: 'freezing', label: 'freezing 0 deg: + snowflake' }],
	[{ state: 'rainy', label: 'rain 50%: umbrella + falling rain' }],
	[{ state: 'thunderstorm', label: 'storm 90%: bolt + startled' }],
	[
		{ state: 'sweating', label: 'heart rate 100: one pearl, drip starts' },
		{ state: 'puffing', label: 'heart rate 135: outer pair of pearls' },
		{ state: 'drenched', label: 'heart rate 200: three pearls, full ramp' }
	],
	// Strictly a mark rather than a state, like the snowflake and the moon - but
	// unlike those two it appears in NO other snapshot, so leaving it out of the
	// sweep meant the only record that it exists was the XML. If a reaction
	// cannot be seen in docs/states, assume it will be believed missing.
	[{ state: 'goal', slug: 'step-goal', label: 'step goal met: flag' }],
	// THE MEETING SCHEDULE - a clock reaction like night, so it keeps its place in
	// the numbered set. It is the first slot to need TWO DIGITS. Replaces the old
	// salute/salutebusy/salutefri/fridrink block - see meetings.ts for why the
	// salute itself no longer exists.
	[
		{ state: 'headset', label: 'digital standup 09:05-09:20: headset' },
		{
			state: 'headsetfri',
			slug: 'friday-headset',
			label: 'Fri 15:00-15:30: game time, headset only'
		},
		{
			state: 'fricontroller',
			slug: 'friday-controller',
			label: 'Fri 15:30-16:00: controller replaces it'
		},
		{
			state: 'wedcoffee',
			slug: 'wednesday-coffee',
			label: 'Wed 10:30-10:45: in-person, coffee cup'
		}
	]
];

for (const group of CAPTURE_GROUPS) {
	for (const entry of group) {
		if (!(entry.state in STATES)) {
			throw new Error(`capture state "${entry.state}" is not in STATES (tools/gen/fixtures.ts)`);
		}
	}
}

/** A capture group entry, numbered. */
export type NumberedCapture = { file: string; mock: string; label: string };

/** CAPTURE_GROUPS, flattened to file names - '3-sunny', '3b-uv', and so on. */
export const numberedCaptures = (): NumberedCapture[] => {
	const out: NumberedCapture[] = [];
	CAPTURE_GROUPS.forEach((group, g) => {
		group.forEach((entry, i) => {
			const letter = i === 0 ? '' : String.fromCharCode('a'.charCodeAt(0) + i);
			out.push({
				file: `${g + 1}${letter}-${entry.slug ?? entry.state}`,
				mock: entry.state,
				label: entry.label
			});
		});
	});
	return out;
};

/**
 * Caption per weekday state. Not derived: these name the hero/companion hue
 * pairing in English, and that naming exists nowhere else - palette.ts stores
 * the pair as hex, not as a colour name. The same call chips.ts and props.ts
 * make about numbers that are a measured departure rather than a consequence.
 */
const WEEKDAY_CAPTION: Partial<Record<string, string>> = {
	monday: 'Mon: red hero, yellow companion',
	tuesday: 'Tue: yellow hero, lime green companion',
	wednesday: 'Wed: lime green hero, medium blue companion',
	thursday: 'Thu: medium blue hero, orange companion',
	friday: 'Fri: orange hero, blueish grey companion',
	saturday: 'Sat: blueish grey hero, purple companion',
	sunday: 'Sun: purple hero, red companion'
};

/**
 * One frame per weekday, prefixed 'w-' rather than numbered: a THEME
 * dimension, not a reaction, so it sits outside CAPTURE_GROUPS.
 *
 * THE STATE NAMES COME FROM fixtures.ts, not a copy typed here - weekdayStates()
 * is what STATES itself spreads in, so a weekday state renamed there cannot
 * leave this list pointing at a name that no longer exists.
 */
export const WEEKDAY_CAPTURES: NumberedCapture[] = objectKeys(weekdayStates()).map((state) => {
	const label = WEEKDAY_CAPTION[state];
	if (label === undefined) {
		throw new Error(`no caption in WEEKDAY_CAPTION for weekday state "${state}"`);
	}
	return { file: `w-${state}`, mock: state, label };
});
