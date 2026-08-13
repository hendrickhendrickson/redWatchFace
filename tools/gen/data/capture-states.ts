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
 * CAPTURE_ORDER is the one place that order is written down, and the number is
 * DERIVED from an entry's position in it - see numberedCaptures(). Insert a
 * state anywhere and the whole sequence renumbers itself; a full sweep writes
 * the new names and prunes the old ones, so the numbering is RECALCULATED EVERY
 * SWEEP rather than maintained.
 *
 * THERE ARE NO LETTER SUFFIXES. The list used to be a list of groups, with a
 * base state numbered and its sub-states lettered off it - '4-cold',
 * '4b-gloves'. That encoded a claim the file name is the wrong place for:
 * whether two reactions are "the same slot" is a judgement, it drifted (the
 * eight calendar states were crammed into one slot purely to avoid renaming the
 * meeting frames), and it made insertion cost depend on where you inserted. A
 * flat run of numbers has one rule and no judgement in it.
 *
 * THE NUMBER IS ZERO-PADDED TO TWO DIGITS because the only thing it does is
 * sort the directory, and unpadded it did not: `ls`, git and GitHub's file
 * listing all sort lexicographically, which put 10-fireworks between 1-baseline
 * and 2-night. Windows Explorer's natural sort was hiding it. The width is
 * fixed at 2 rather than derived from the count - a derived width would renumber
 * every file the day a 100th state is added.
 *
 * THE NUMBER IS FOR THE FILE EXPLORER AND NOTHING ELSE. It is positional, so
 * inserting a state shifts every name after it. Nothing outside this directory
 * may refer to a state by its number: the tools, the docs and the commit
 * messages all use the STATE NAME, which is stable. That is why
 * capture-states.ts --only takes `gloves` rather than `05-gloves`.
 *
 * THE WEEKDAY FRAMES ARE ROWS OF CAPTURE_ORDER LIKE ANY OTHER. They used to be a
 * second list numbered off the end of this one, which worked only while they were
 * last; they sit third now, and a second list cannot express "third" without
 * restating where the first one splits. The seven state NAMES are still derived
 * from fixtures.ts rather than typed here - see WEEKDAY_ENTRIES.
 *
 * capture-states.ts imports numberedCaptures() directly - it is TypeScript now,
 * so there is no PowerShell↔JSON bridge to keep in sync any more.
 */

import { objectKeys } from 'hhson-lib';
import { STATES, weekdayStates } from '../fixtures.ts';

/** One state, as the capture sweep shows it. */
export type CaptureEntry = {
	/** The name mock-state.ts and STATES know it by. */
	state: string;
	/** The file's slug, when it differs from `state` - 'goal' ships as '14-step-goal'. */
	slug?: string;
	/** Caption under the thumbnail on the contact sheet. */
	label: string;
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
 * One entry per weekday, spread into CAPTURE_ORDER below.
 *
 * THE STATE NAMES COME FROM fixtures.ts, not a copy typed here - weekdayStates()
 * is what STATES itself spreads in, so a weekday state renamed there cannot leave
 * this list pointing at a name that no longer exists. Only the captions are
 * written out, and a weekday without one is an error rather than a blank.
 */
const WEEKDAY_ENTRIES: readonly CaptureEntry[] = objectKeys(weekdayStates()).map((state) => {
	const label = WEEKDAY_CAPTION[state];
	if (label === undefined) {
		throw new Error(`no caption in WEEKDAY_CAPTION for weekday state "${state}"`);
	}
	return { state, label };
});

/**
 * Every named state, in the order docs/states/ should read. Blank lines and
 * comments group them for a reader; nothing in the file names does.
 */
export const CAPTURE_ORDER: readonly CaptureEntry[] = [
	{ state: 'baseline', label: 'baseline' },

	// Night, three times over. The frames differ by MOON_PHASE_POSITION and
	// nothing else - see the note beside MOON_AT in fixtures.ts for why the moon
	// is the one element that needs a frame per value rather than one per gate.
	{ state: 'nighthalf', slug: 'night-half-moon', label: '23:00 to 07:00: half moon' },
	{ state: 'nightfull', slug: 'night-full-moon', label: '23:00 to 07:00: full moon' },
	{ state: 'nightnew', slug: 'night-new-moon', label: '23:00 to 07:00: new moon' },

	// The weekday palette. Third rather than last: it is the dimension every other
	// frame below holds fixed at Monday, so it reads as part of the setup rather
	// than as an appendix.
	...WEEKDAY_ENTRIES,

	// Weather, coldest reaction last.
	{ state: 'sunny', label: 'sunny 25 deg: cocktail only' },
	{ state: 'uv', label: 'UV 8 at 14 deg: shades only' },
	{ state: 'cold', label: 'cold 10 deg: scarf' },
	{ state: 'gloves', label: 'cold 5 deg: + gloves' },
	{ state: 'freezing', label: 'freezing 0 deg: + snowflake' },
	{ state: 'rainy', label: 'rain 50%: umbrella + falling rain' },
	{ state: 'thunderstorm', label: 'storm 90%: bolt + startled' },

	// The pulse ladder, one frame per pearl.
	{ state: 'sweating', label: 'heart rate 100: drips start, forehead bare' },
	{ state: 'puffing', label: 'heart rate 120: the middle pearl' },
	{ state: 'flushed', label: 'heart rate 140: the outer pair' },
	{ state: 'soaked', label: 'heart rate 160: all three pearls' },
	// `drenched` (200bpm) has no frame here, the same call `downpour` gets: it
	// adds no pearl the 160 frame does not already show, and what it does add -
	// the fastest, furthest drip - is motion, which a still cannot hold. It is in
	// cycle-states.ts instead.

	// Strictly a mark rather than a state, like the snowflake and the moon - but
	// unlike those two it appears in NO other snapshot, so leaving it out of the
	// sweep meant the only record that it exists was the XML. If a reaction
	// cannot be seen in docs/states, assume it will be believed missing.
	{ state: 'goal', slug: 'step-goal', label: 'step goal met: flag' },

	// The calendar, in the order the year runs.
	{ state: 'fireworks', label: 'New Year 00:00-04:00: fireworks' },
	{ state: 'weed', label: '20 Apr: the leaf tufts fan out' },
	{ state: 'labour', label: '1 May: hammer and sickle, crossing' },
	{ state: 'force', label: '4 May: two lightsabers, and a glare' },
	{ state: 'reunification', label: '3 Oct: the tricolour, flying right' },
	{ state: 'halloween', label: '31 Oct: ghost and pumpkin' },
	{ state: 'birthday', label: '19 Dec: cake, party hats, confetti' },
	{ state: 'christmas', label: '24-26 Dec: Santa hats and a tree' },

	// The meeting schedule - a clock reaction like night, so it keeps its place
	// in the numbered set. Replaces the old salute/salutebusy/salutefri/fridrink
	// block - see meetings.ts for why the salute itself no longer exists.
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
	{ state: 'wedcoffee', slug: 'wednesday-coffee', label: 'Wed 10:30-10:45: in-person, coffee cup' }
];

for (const entry of CAPTURE_ORDER) {
	if (!(entry.state in STATES)) {
		throw new Error(`capture state "${entry.state}" is not in STATES (tools/gen/fixtures.ts)`);
	}
}

/** The ambient frame's slug. Sorts first, and is a display mode rather than a state. */
export const AMBIENT_FILE = '00-ambient';

/** A capture entry, numbered. */
export type NumberedCapture = { file: string; mock: string; label: string };

/**
 * The one place a capture's file name is spelled. Zero-based index in, the
 * one-based padded name out.
 *
 * ONE CALLER NOW. It had two while the weekday frames were numbered off the end
 * of CAPTURE_ORDER by a second expression, which is exactly the arrangement that
 * could pad, offset or separate differently from the first; they are rows of
 * CAPTURE_ORDER itself now, so there is one sequence and one place it is spelled.
 */
const numberedFile = (index: number, slug: string): string =>
	`${String(index + 1).padStart(2, '0')}-${slug}`;

/** CAPTURE_ORDER, resolved to file names - '01-baseline', '02-night-half-moon', and so on. */
export const numberedCaptures = (): NumberedCapture[] =>
	CAPTURE_ORDER.map((entry, i) => ({
		file: numberedFile(i, entry.slug ?? entry.state),
		mock: entry.state,
		label: entry.label
	}));
