/**
 * What the face reacts to, named once.
 *
 * WFF has no variables and no way for one Condition to reference another, so
 * every place that reacts to the same fact has to restate the whole predicate.
 * The generated file does, unavoidably. The SOURCE did too, which was the
 * problem: the night window
 *
 *   [HOUR_0_23] >= 23 || 7 > [HOUR_0_23]
 *
 * was typed out NINE times across four modules - six as the whole predicate and
 * three more embedded inside larger ones - as a pre-escaped string literal. So
 * "when does the face think it is night?" was a grep, "is it the same everywhere?"
 * was an eyeball, and moving the boundary an hour was nine coordinated edits with
 * nothing checking them. The storm gate was written five times, the rain gate
 * five, cold twice, gloves twice, UV twice, each heart-rate step twice.
 *
 * Worse than the count: every one of those literals bypassed expr.ts entirely.
 * The closed `Source` union, the `n()` float guard and the comparison helpers all
 * existed and were used by exactly two modules. A typo'd source in a string
 * literal validates - the WFF schema types expressions as xs:string - and does
 * nothing at all on the wrist, which is how an invented [ANIMATION_VALUE] once
 * survived a whole session.
 *
 * Everything here is composed, so a source that does not exist is a compile
 * error, and every threshold below has a name.
 *
 * THE EMITTED STRINGS ARE UNCHANGED. Each predicate reproduces its hand-typed
 * literal byte for byte, which is why adopting this module changed no bytes of
 * watchface.xml. Where a predicate is used inside a larger one, group() is
 * explicit for the reason documented in docs/authoring.md: or() returns a
 * FLAT unparenthesised string, so `and(or(a, b), c)` mis-binds - the bug that put
 * headsets on at every hour of the day. build.ts --equiv is how that gets checked
 * now rather than by reading.
 */

import { and, eq, group, gt, gte, lt, lte, or, src, type Expr } from './expr.ts';
import { evaluate, type Values } from './eval.ts';
// The two meeting windows are imported ONLY by the arm proof at the bottom of this
// file. meetings.ts reads nothing from here, so there is no cycle - and the
// dependency is worth it: those windows are the reason the three older props never
// needed HANDS_FULL, and a proof that says so has to be able to see them.
import { FRIDAY_GAME_ICON, WEDNESDAY_MEETING } from './meetings.ts';

// --- The thresholds ---------------------------------------------------------

/**
 * Every number the face changes its mind at.
 *
 * These were inline in the predicates, which meant the relationships BETWEEN
 * them - freezing is colder than gloves is colder than a scarf; two sweat beads
 * come before three - were invisible and unenforced. The assertions at the
 * bottom of this file are only possible because the numbers have names.
 */
export const T = {
	/** Night runs from 23:00 to 07:00. Both ends, since the window wraps midnight. */
	NIGHT_FROM: 23,
	NIGHT_UNTIL: 7,

	/** Percent chance of precipitation. The rain field and umbrella appear at 50. */
	RAIN_PCT: 50,
	/** A storm: lightning, the burst, and the companion's X-ray. */
	STORM_PCT: 90,

	/** Degrees C. Scarf at 10, gloves at 5, snowflake at 0 - each a subset of the last. */
	SCARF_C: 10,
	GLOVES_C: 5,
	FREEZING_C: 0,
	/** Warm enough for the cocktail, given a clear sky. */
	COCKTAIL_C: 25,

	/** WHO UV index. 3 is the bottom of "moderate", where the shades come out. */
	UV_HIGH: 3,

	/**
	 * Heart rate, bpm. FOUR bands, not three.
	 *
	 * Sweating starts at 100 as DRIPS ALONE - a slow trickle down the cheeks with a
	 * bare forehead, which is what a warm but unremarkable pulse looks like. The
	 * forehead cluster only starts filling at 120, and it fills in three discrete
	 * steps from there: the middle pearl, the outer pair, then all three.
	 */
	PUFFED_BPM: 100,
	SWEAT_ONE_BPM: 120,
	SWEAT_TWO_BPM: 140,
	SWEAT_ALL_BPM: 160,

	/** Percent of the wearer's own step goal. */
	GOAL_PCT: 100,

	/**
	 * WEATHER.CONDITION codes. Only these two are confirmed on hardware: 1 is
	 * clear, 14 is partly cloudy. Everything else falls through to the cloud icon,
	 * which is why there is no exhaustive list here.
	 */
	CLEAR: 1,
	PARTLY_CLOUDY: 14
} as const;

/**
 * The calendar days the face celebrates. ONE ROW PER OCCASION.
 *
 * Separate from `T` above because these are not thresholds: nothing ramps across
 * them and nothing nests inside anything else. What they share with `T` is the
 * reason for existing at all - a bare `eq(MONTH, 10)` in a predicate says which
 * number, not which day, and the two proofs at the bottom of this file can only
 * check "fires on exactly its own days" against a table that states what those
 * days are.
 *
 * `until` IS INCLUSIVE and present only where an occasion spans more than one
 * day. One optional field rather than two shapes, so daysOf() below can expand
 * every row the same way.
 */
export const HOLIDAY = {
	NEW_YEAR: { month: 1, day: 1 },
	/** 20 April. */
	WEED: { month: 4, day: 20 },
	/** Tag der Arbeit. */
	LABOUR: { month: 5, day: 1 },
	/** May the Fourth. Three days after Labour Day, and the proofs check the gap. */
	FORCE: { month: 5, day: 4 },
	/** Tag der Deutschen Einheit. */
	REUNIFICATION: { month: 10, day: 3 },
	HALLOWEEN: { month: 10, day: 31 },
	BIRTHDAY: { month: 12, day: 19 },
	/** Heiligabend through the second Christmas day - all three are the holiday here. */
	CHRISTMAS: { month: 12, day: 24, until: 26 }
} as const;

/** One row of HOLIDAY, as the composer and the proofs read it. */
export type Window = { readonly month: number; readonly day: number; readonly until?: number };

// --- Sources, once ----------------------------------------------------------

const HOUR = src('HOUR_0_23');
const DAY = src('DAY');
const MONTH = src('MONTH');
const TEMP = src('WEATHER.TEMPERATURE');
const PRECIP_PCT = src('WEATHER.CHANCE_OF_PRECIPITATION');
const HAVE_WEATHER = src('WEATHER.IS_AVAILABLE');
const IS_DAY = src('WEATHER.IS_DAY');
const CONDITION = src('WEATHER.CONDITION');
const UV = src('WEATHER.UV_INDEX');
const BPM = src('HEART_RATE');

// --- Time of day ------------------------------------------------------------

/**
 * Night: 23:00 to 07:00. NINE sites before this existed.
 *
 * REVERSED OPERANDS on the second half - `7 > [HOUR]` rather than
 * `[HOUR] < 7` - which is how it was written, under the since-disproved belief
 * that `<` was unavailable in WFF. It is kept because churning it would change
 * the emitted string for no gain; expr.ts's comparison helpers take both
 * operands for exactly this reason.
 *
 * A FLAT or-CHAIN, deliberately unparenthesised, because that is what the nine
 * sites contain. Anything combining it with and() must wrap it in group() -
 * see NIGHT_AND_DRY and MOON_VISIBLE below.
 */
export const NIGHT: Expr = or(gte(HOUR, T.NIGHT_FROM), gt(T.NIGHT_UNTIL, HOUR));

/**
 * The waking hours, as the step-goal flag states them.
 *
 * NOT written as a negation of NIGHT, because the emitted string is not one: the
 * flag says `23 > [HOUR] && [HOUR] >= 7`. It is nevertheless exactly NIGHT's
 * complement, and the assertion at the bottom of this file proves that for all
 * 24 hours rather than trusting the reading.
 */
export const DAYTIME: Expr = and(gt(T.NIGHT_FROM, HOUR), gte(HOUR, T.NIGHT_UNTIL));

// --- The calendar -----------------------------------------------------------

/**
 * "Is it this day?", from a HOLIDAY row.
 *
 * A FLAT and-CHAIN, and no group() anywhere: there is no or() in here for a
 * neighbouring || to mis-associate with, and and() binds no looser than its own
 * comparisons. That is the one thing that makes these composable into a larger
 * predicate without parentheses - unlike NIGHT, whose or-chain needs group()
 * everywhere it appears (see NIGHT_AND_DRY).
 *
 * The single-day form emits exactly what NEW_YEAR's two eq() calls did when they
 * were written out here, which is why adopting this helper changed no bytes.
 */
const onDate = (window: Window): Expr =>
	window.until === undefined
		? and(eq(MONTH, window.month), eq(DAY, window.day))
		: and(eq(MONTH, window.month), gte(DAY, window.day), lte(DAY, window.until));

/**
 * The small hours of New Year's Day: 1 January, 00:00 to 04:00. The fireworks.
 *
 * THE ONLY CELEBRATION WITH AN HOUR CLAUSE. Fireworks at four in the afternoon
 * would be nonsense; a Christmas tree at four in the afternoon is not, so the six
 * below run all day. That asymmetry is load-bearing in the proofs at the bottom of
 * this file, which evaluate the calendar at 02:00 precisely so this one is at its
 * WIDEST - disjointness there implies disjointness at every other hour.
 *
 * The window widened once already, from `HOUR_0_23 == 0` to `HOUR_0_23 &lt; 4`.
 */
export const NEW_YEAR: Expr = and(onDate(HOLIDAY.NEW_YEAR), lt(HOUR, 4));

/** 20 April. Both blobs' leaf tufts fan out into a cannabis leaf. */
export const WEED: Expr = onDate(HOLIDAY.WEED);
/** 1 May, Tag der Arbeit. The hero takes a hammer, the companion a sickle. */
export const LABOUR_DAY: Expr = onDate(HOLIDAY.LABOUR);
/** 4 May. The hero draws a lightsaber and its eyes narrow. */
export const FORCE: Expr = onDate(HOLIDAY.FORCE);
/** 3 October, Tag der Deutschen Einheit. The tricolour, on the step-goal pole. */
export const REUNIFICATION: Expr = onDate(HOLIDAY.REUNIFICATION);
/** 31 October. The hero wears a sheet, the companion a pumpkin. */
export const HALLOWEEN: Expr = onDate(HOLIDAY.HALLOWEEN);
/** 19 December. Cake, party hats and confetti. */
export const BIRTHDAY: Expr = onDate(HOLIDAY.BIRTHDAY);
/** 24 to 26 December, inclusive - the one occasion spanning more than a day. */
export const CHRISTMAS: Expr = onDate(HOLIDAY.CHRISTMAS);

// --- Weather ----------------------------------------------------------------

/** Is there a forecast at all? Everything below this line has to survive "no". */
export const HAVE_FORECAST: Expr = HAVE_WEATHER;

/** Rain likely enough to draw the field and put the umbrella up. */
export const RAIN_LIKELY: Expr = and(HAVE_WEATHER, gte(PRECIP_PCT, T.RAIN_PCT));

/**
 * Dry, as the two "resting arm" predicates state it.
 *
 * NOT `!RAIN_LIKELY`: it omits the availability check on purpose, because a
 * missing forecast reads as 0 and 0 is dry. Reversed operands again, as authored.
 */
export const DRY: Expr = gt(T.RAIN_PCT, PRECIP_PCT);

/** A storm. Lightning, the burst, startled eyes, and the companion's X-ray. */
export const STORM: Expr = and(HAVE_WEATHER, gte(PRECIP_PCT, T.STORM_PCT));

/** Rain, as the weather CHIP states it - already inside a HAVE_FORECAST branch. */
export const RAIN_ICON: Expr = gte(PRECIP_PCT, T.RAIN_PCT);

/** Clear sky, and the sun is up. */
export const CLEAR_DAY: Expr = and(eq(CONDITION, T.CLEAR), IS_DAY);
/** Clear sky at night - the moon icon. Reached only after CLEAR_DAY has failed. */
export const CLEAR_NIGHT: Expr = eq(CONDITION, T.CLEAR);
export const PARTLY_CLOUDY: Expr = eq(CONDITION, T.PARTLY_CLOUDY);

/** Cold enough for a scarf. */
export const COLD: Expr = and(HAVE_WEATHER, lte(TEMP, T.SCARF_C));
/** Cold enough for gloves as well. A SUBSET of COLD - see the assertions. */
export const GLOVE_COLD: Expr = and(HAVE_WEATHER, lte(TEMP, T.GLOVES_C));
/** Freezing: the snowflake. A subset of GLOVE_COLD in turn. */
export const FREEZING: Expr = and(HAVE_WEATHER, lte(TEMP, T.FREEZING_C));

/** Strong sun, and daylight to go with it. The sunglasses. */
export const HIGH_UV: Expr = and(HAVE_WEATHER, gte(UV, T.UV_HIGH), IS_DAY);

/** Warm, clear and daytime: the cocktail. */
export const HOT_AND_SUNNY: Expr = and(
	HAVE_WEATHER,
	gte(TEMP, T.COCKTAIL_C),
	eq(CONDITION, T.CLEAR),
	IS_DAY
);

// --- Body -------------------------------------------------------------------

/** Working hard enough to sweat at all - the drips, with nothing on the forehead yet. */
export const PUFFED: Expr = gte(BPM, T.PUFFED_BPM);
/** The first bead on the forehead: the middle one, alone. */
export const SWEAT_ONE: Expr = gte(BPM, T.SWEAT_ONE_BPM);
/** Two beads on the forehead - the outer pair, REPLACING the middle one. */
export const SWEAT_TWO: Expr = gte(BPM, T.SWEAT_TWO_BPM);
/** All three. */
export const SWEAT_ALL: Expr = gte(BPM, T.SWEAT_ALL_BPM);
/** Is there a reading? A chest strap that has not synced reports 0, not null. */
export const HEART_RATE_VALID: Expr = gt(BPM, 0);

/** The step goal met, during waking hours - the little flag. */
export const GOAL_MET: Expr = and(gte(src('STEP_PERCENT'), T.GOAL_PCT), DAYTIME);

/** The battery's own low flag, rather than a percentage this face chooses. */
export const BATTERY_LOW: Expr = src('BATTERY_IS_LOW');

// --- Composites -------------------------------------------------------------
//
// These are the predicates that embed another one. group() around every nested
// or-chain is load-bearing, not decoration.

/**
 * Resting, and not in the rain - the arm and glove poses that hold an umbrella
 * otherwise.
 *
 * group(NIGHT) IS REQUIRED. NIGHT is a flat `a || b`, and `a || b && c` binds as
 * `a || (b && c)`, which would drop the arm at 23:00 regardless of the rain and
 * keep it down at 06:00 only when dry. That is the documented mis-binding class.
 */
export const NIGHT_AND_DRY: Expr = and(group(NIGHT), DRY);

/** Startled by a storm, or asleep - either way the mouth is a small circle. */
export const STORM_OR_NIGHT: Expr = or(group(STORM), NIGHT);

/**
 * The moon: night, and not freezing.
 *
 * The second half is `temperature > 0 OR no forecast`, so a watch with no weather
 * data still gets a moon rather than nothing. freeze-mark.ts draws the snowflake
 * in the same 36x36 box, and these two must be mutually exclusive or they overlap.
 */
export const MOON_VISIBLE: Expr = and(
	group(NIGHT),
	group(or(gt(TEMP, T.FREEZING_C), eq(HAVE_WEATHER, 0)))
);

/**
 * Everything the hero's RAISED LEFT FIST is holding that is not already
 * daylight-only. The arm switch tests this ahead of its resting pose.
 *
 * WITHOUT THIS, A CELEBRATION PROP FLOATS. Every prop that existed before the
 * calendar states - the Wednesday cup, the Friday controller, the warm-day
 * cocktail - is gated on something that implies daytime, and the left arm only
 * drops on NIGHT_AND_DRY, so the hand was always there to hold them. A birthday
 * is a whole day, cake included at 23:30 on a dry night, and at that moment the
 * arm rests and the cake hangs in mid-air beside it. That is not hypothetical:
 * it is exactly what happened to the step-goal pole for three releases, and the
 * proof at the bottom of this file is what makes it impossible rather than
 * unlikely. Anything added to hero-props.ts belongs in here.
 *
 * THE COCKTAIL IS IN HERE, AND IT PREDATES THE CALENDAR. It was left out at
 * first on the reasoning that HOT_AND_SUNNY already contains WEATHER.IS_DAY, so
 * the arm could not be resting - and the proof at the bottom of this file
 * immediately disproved it. WEATHER.IS_DAY IS NOT THE CLOCK: it is the forecast's
 * opinion, and NIGHT is [HOUR_0_23]. The two disagree wherever the sun does not
 * follow office hours - a high-latitude summer, or simply a stale forecast - and
 * at 00:35 with IS_DAY still reporting 1 the face drew a cocktail beside a
 * lowered arm. Rare, silent, and exactly the floating-pole bug again.
 *
 * The two meeting props stay out: their windows are 09:05, 10:30 and 15:00, which
 * are clock times, so the guarantee there is real. The proof checks that too.
 */
export const HANDS_FULL: Expr = or(
	group(BIRTHDAY),
	group(LABOUR_DAY),
	group(FORCE),
	group(HOT_AND_SUNNY)
);

/**
 * Everything hanging off the pole in the hero's RIGHT hand.
 *
 * GOAL_MET has always implied DAYTIME, so the right arm's "out" pose - the one
 * whose fist the pole passes through - was guaranteed. REUNIFICATION carries no such
 * guarantee, so the same floating-pole bug reappears at 02:00 on 3 October
 * unless the arm tests this first. See flag() in face/blob-hero.ts, which
 * dispatches on the two in the same order.
 */
export const HOLDS_POLE: Expr = or(group(GOAL_MET), group(REUNIFICATION));

/**
 * Every occasion the blobs wear a hat on, and therefore have no visible hair.
 *
 * THE LEAF TUFT IS THE HAIR, and a hat sits on top of it. That works for a Santa
 * hat's brim, which is 46 wide and covers the crown the tuft grows out of, and it
 * does not work at all for a cone: a party hat rising out of a five-blade fan reads
 * as a hat balanced on a bush. So on these two days the tuft is not drawn, which is
 * a THIRD branch of the tuft switch rather than an extra Condition wrapped round it.
 *
 * Named for the reason rather than for the dates, so the next hat is one entry here
 * and nothing else - the same call HANDS_FULL makes about the next prop.
 */
export const WEARS_HAT: Expr = or(group(BIRTHDAY), group(CHRISTMAS));

/**
 * When each arm is actually allowed to hang: at rest, AND holding nothing.
 *
 * `== 0` IS THE NEGATION, and it is the one place this face negates anything.
 * Everywhere else priority is expressed by Compare order - the coffee cup beats
 * the cocktail purely by being listed first, with no "and not coffee" anywhere -
 * and that idiom works because the branches DRAW DIFFERENT THINGS. Here they do
 * not: "holding something" and "the ordinary daytime default" are the same arm in
 * the same pose, so ordering them would mean emitting that pose twice under two
 * part names, in a face whose parts must all be uniquely named. Negating the rest
 * condition keeps two branches, two names and one copy of each pose.
 *
 * The `group()` around each is load-bearing: HANDS_FULL and HOLDS_POLE are both
 * flat or-chains, and `a || b == 0` parses as `a || (b == 0)` - which is true
 * almost always, and would drop the arm through everything. eq(HAVE_WEATHER, 0)
 * in MOON_VISIBLE is the same idiom against a source that is already a single term.
 */
export const RIGHT_ARM_RESTS: Expr = and(group(NIGHT), eq(group(HOLDS_POLE), 0));
/** NIGHT_AND_DRY has already grouped its own or-chain, so it needs no second one. */
export const LEFT_ARM_RESTS: Expr = and(NIGHT_AND_DRY, eq(group(HANDS_FULL), 0));

// --- The emitted form, pinned -----------------------------------------------

/**
 * What each predicate emitted when it was hand-typed in tools/gen/face/.
 *
 * A RESTATEMENT THAT SOMETHING CHECKS, which is the only kind palette.ts allows
 * (see its note on SHIPPED, the fixture of 21 derived hexes it verifies the same
 * way). The literals below are the ones this module replaced, and
 * verifyPredicates() proves every predicate still produces its own.
 *
 * WHY KEEP THEM AT ALL, having just deleted them. Because the composition helpers
 * are shared and the emitted string is load-bearing: `and` joining on a different
 * spacing, or `or` gaining parentheses, would change 40 expressions at once. That
 * shows up here as "NIGHT no longer matches", naming the cause, instead of as a
 * 40-entry semantic diff naming the symptom. It is also the evidence that
 * adopting this module changed no bytes.
 *
 * These are FROZEN. They are not a second source of truth to edit in step - a
 * deliberate change to a predicate means changing the literal here too, in the
 * same commit, and the diff showing both is the review.
 */
const SHIPPED: Array<[string, Expr, string]> = [
	['NIGHT', NIGHT, '[HOUR_0_23] &gt;= 23 || 7 &gt; [HOUR_0_23]'],
	['DAYTIME', DAYTIME, '23 &gt; [HOUR_0_23] &amp;&amp; [HOUR_0_23] &gt;= 7'],
	['HAVE_FORECAST', HAVE_FORECAST, '[WEATHER.IS_AVAILABLE]'],
	[
		'RAIN_LIKELY',
		RAIN_LIKELY,
		'[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.CHANCE_OF_PRECIPITATION] &gt;= 50'
	],
	['DRY', DRY, '50 &gt; [WEATHER.CHANCE_OF_PRECIPITATION]'],
	['STORM', STORM, '[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.CHANCE_OF_PRECIPITATION] &gt;= 90'],
	['RAIN_ICON', RAIN_ICON, '[WEATHER.CHANCE_OF_PRECIPITATION] &gt;= 50'],
	['CLEAR_DAY', CLEAR_DAY, '[WEATHER.CONDITION] == 1 &amp;&amp; [WEATHER.IS_DAY]'],
	['CLEAR_NIGHT', CLEAR_NIGHT, '[WEATHER.CONDITION] == 1'],
	['PARTLY_CLOUDY', PARTLY_CLOUDY, '[WEATHER.CONDITION] == 14'],
	['COLD', COLD, '[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.TEMPERATURE] &lt;= 10'],
	['GLOVE_COLD', GLOVE_COLD, '[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.TEMPERATURE] &lt;= 5'],
	['FREEZING', FREEZING, '[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.TEMPERATURE] &lt;= 0'],
	[
		'HIGH_UV',
		HIGH_UV,
		'[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.UV_INDEX] &gt;= 3 &amp;&amp; [WEATHER.IS_DAY]'
	],
	[
		'HOT_AND_SUNNY',
		HOT_AND_SUNNY,
		'[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.TEMPERATURE] &gt;= 25 &amp;&amp; [WEATHER.CONDITION] == 1 &amp;&amp; [WEATHER.IS_DAY]'
	],
	['PUFFED', PUFFED, '[HEART_RATE] &gt;= 100'],
	['SWEAT_ONE', SWEAT_ONE, '[HEART_RATE] &gt;= 120'],
	['SWEAT_TWO', SWEAT_TWO, '[HEART_RATE] &gt;= 140'],
	['SWEAT_ALL', SWEAT_ALL, '[HEART_RATE] &gt;= 160'],
	['HEART_RATE_VALID', HEART_RATE_VALID, '[HEART_RATE] &gt; 0'],
	[
		'GOAL_MET',
		GOAL_MET,
		'[STEP_PERCENT] &gt;= 100 &amp;&amp; 23 &gt; [HOUR_0_23] &amp;&amp; [HOUR_0_23] &gt;= 7'
	],
	['BATTERY_LOW', BATTERY_LOW, '[BATTERY_IS_LOW]'],
	[
		'NIGHT_AND_DRY',
		NIGHT_AND_DRY,
		'([HOUR_0_23] &gt;= 23 || 7 &gt; [HOUR_0_23]) &amp;&amp; 50 &gt; [WEATHER.CHANCE_OF_PRECIPITATION]'
	],
	[
		'STORM_OR_NIGHT',
		STORM_OR_NIGHT,
		'([WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.CHANCE_OF_PRECIPITATION] &gt;= 90) || [HOUR_0_23] &gt;= 23 || 7 &gt; [HOUR_0_23]'
	],
	[
		'MOON_VISIBLE',
		MOON_VISIBLE,
		'([HOUR_0_23] &gt;= 23 || 7 &gt; [HOUR_0_23]) &amp;&amp; ([WEATHER.TEMPERATURE] &gt; 0 || [WEATHER.IS_AVAILABLE] == 0)'
	]
];

/** Every predicate still emits the string it emitted when it was a literal. */
export const verifyPredicates = (): string[] =>
	SHIPPED.filter(([, composed, shipped]) => composed !== shipped).map(
		([name, composed, shipped]) => `${name}\n      is:      ${composed}\n      shipped: ${shipped}`
	);

/** How many predicates are pinned. Reported by --diff so the number is visible. */
export const PREDICATE_COUNT = SHIPPED.length;

// --- Build-time proofs ------------------------------------------------------
//
// The relationships between these predicates are what a reader assumes and what
// nothing checked. They are cheap to prove now that the evaluator exists, and
// every one of them was an assumption someone could have broken by editing a
// single number above.

/** Values that make a predicate's OTHER inputs irrelevant. */
const at = (over: Values): Values => ({
	HOUR_0_23: 12,
	// August the 19th - a day no celebration claims, so every proof below that is
	// not ABOUT the calendar is unaffected by the calendar. evaluate() throws on a
	// source it has no value for, so these two have to be here at all once any
	// predicate reads them.
	MONTH: 8,
	DAY: 19,
	'WEATHER.IS_AVAILABLE': 1,
	'WEATHER.TEMPERATURE': 19,
	'WEATHER.CHANCE_OF_PRECIPITATION': 0,
	'WEATHER.CONDITION': 1,
	'WEATHER.IS_DAY': 1,
	'WEATHER.UV_INDEX': 4,
	HEART_RATE: 88,
	STEP_PERCENT: 19,
	BATTERY_IS_LOW: 0,
	...over
});

/**
 * The sweat cluster fills in order, so its four gates must be ordered - and the
 * drip gate has to stay below all of them, or a pearl would appear on a forehead
 * that is not sweating yet.
 *
 * `T` is `as const`, so TypeScript knows the literal values and can decide these
 * comparisons statically - which is why no-unnecessary-condition calls them always-true. That is
 * the guarantee holding, not the check being pointless: it exists to fire the moment someone
 * edits a threshold above, and after such an edit the rule reports "always false" instead, which
 * catches it one step earlier than the throw does. Both ends are wanted, so the guard stays and
 * the rule is silenced by the line, never by the file. See /hhson-typescript.
 *
 * TWO STATEMENTS RATHER THAN ONE four-term chain, because "silenced by the line" is
 * literal: eslint reports each comparison at its own line, and a chain long enough for
 * prettier to break leaves all but the first uncovered by a disable-next-line. Each half
 * fits on one line, and the split buys a more specific message on the way out.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- statically decidable against the `as const` thresholds; see the note above
if (!(T.PUFFED_BPM < T.SWEAT_ONE_BPM && T.SWEAT_ONE_BPM < T.SWEAT_TWO_BPM)) {
	throw new Error('the sweat gates are out of order: a forehead pearl before the first drip');
}
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- statically decidable against the `as const` thresholds; see the note above
if (!(T.SWEAT_TWO_BPM < T.SWEAT_ALL_BPM)) {
	throw new Error('the sweat gates are out of order: three beads before two');
}

/**
 * Cold, gloves and freezing NEST. mock-state.ts relies on this: it sets the
 * temperature and lets the real Conditions sort themselves out, and a snowflake
 * over two blobs wearing no scarves is a state the watch cannot be in.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- statically decidable against the `as const` thresholds; see the note above the sweat check
if (!(T.FREEZING_C < T.GLOVES_C && T.GLOVES_C < T.SCARF_C)) {
	throw new Error('the cold thresholds do not nest: freezing must be colder than gloves');
}
for (const t of [T.FREEZING_C, T.FREEZING_C - 1, -20]) {
	if (
		!evaluate(COLD, at({ 'WEATHER.TEMPERATURE': t })) ||
		!evaluate(GLOVE_COLD, at({ 'WEATHER.TEMPERATURE': t }))
	) {
		throw new Error(`freezing at ${t}C does not imply gloves and a scarf`);
	}
}

/** A storm is also rain: the umbrella must be up when the bolt strikes. */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- statically decidable against the `as const` thresholds; see the note above the sweat check
if (T.RAIN_PCT > T.STORM_PCT) {
	throw new Error('a storm must be at least as wet as rain');
}
for (const p of [T.STORM_PCT, 95, 100]) {
	if (!evaluate(RAIN_LIKELY, at({ 'WEATHER.CHANCE_OF_PRECIPITATION': p }))) {
		throw new Error(`a storm at ${p}% does not imply rain - the umbrella would be down`);
	}
}

/**
 * NIGHT and DAYTIME partition the clock.
 *
 * They are written as two unrelated expressions - one a flat or-chain with
 * reversed operands, the other an and-chain - so that they are complements is a
 * claim, not a fact on the page. Checked at every hour, because the window wraps
 * midnight and an off-by-one at 23 or 7 is invisible for most of the day.
 */
for (let hour = 0; hour < 24; hour++) {
	const night = evaluate(NIGHT, at({ HOUR_0_23: hour }));
	const day = evaluate(DAYTIME, at({ HOUR_0_23: hour }));
	if (night === day) {
		throw new Error(`hour ${hour} is ${night ? 'both' : 'neither'} night nor daytime`);
	}
}

/**
 * The snowflake and the moon share one 36x36 box and must never both draw.
 *
 * This is the assertion that would have caught a moon behind a snowflake, and it
 * is checked across the temperature range AND the "no forecast" case, because
 * MOON_VISIBLE's second clause exists specifically to handle the latter.
 */
for (const avail of [0, 1]) {
	for (const temp of [-20, -1, 0, 1, 19]) {
		const values = at({
			'WEATHER.IS_AVAILABLE': avail,
			'WEATHER.TEMPERATURE': temp,
			HOUR_0_23: 2
		});
		if (evaluate(MOON_VISIBLE, values) && evaluate(FREEZING, values)) {
			throw new Error(`moon and snowflake both draw at ${temp}C, forecast=${avail}`);
		}
	}
}

/**
 * group() is doing something in NIGHT_AND_DRY.
 *
 * If someone drops it, the expression still validates, still renders, and is
 * wrong only between 23:00 and 07:00 in the rain. This proves the parentheses
 * change the answer, which is the whole reason they are typed.
 */
{
	const flat = and(NIGHT, DRY);
	const wet = at({ HOUR_0_23: 23, 'WEATHER.CHANCE_OF_PRECIPITATION': 90 });
	if (evaluate(flat, wet) === evaluate(NIGHT_AND_DRY, wet)) {
		throw new Error('group(NIGHT) has stopped mattering in NIGHT_AND_DRY - check expr.ts or()');
	}
}

// --- The calendar, proved ---------------------------------------------------

/**
 * Every celebration, beside the window it claims to cover.
 *
 * EXPORTED so fixtures.ts can check the other way round - that the states which
 * are NOT about the calendar do not accidentally land on one of these days. A
 * second list of the same seven dates over there would be a restatement nothing
 * checks; this is the list itself.
 */
export const CELEBRATIONS: Array<[string, Expr, Window]> = [
	['NEW_YEAR', NEW_YEAR, HOLIDAY.NEW_YEAR],
	['WEED', WEED, HOLIDAY.WEED],
	['LABOUR_DAY', LABOUR_DAY, HOLIDAY.LABOUR],
	['FORCE', FORCE, HOLIDAY.FORCE],
	['REUNIFICATION', REUNIFICATION, HOLIDAY.REUNIFICATION],
	['HALLOWEEN', HALLOWEEN, HOLIDAY.HALLOWEEN],
	['BIRTHDAY', BIRTHDAY, HOLIDAY.BIRTHDAY],
	['CHRISTMAS', CHRISTMAS, HOLIDAY.CHRISTMAS]
];

/** The days a window covers. `until` is inclusive; absent means a single day. */
const daysOf = (window: Window): number[] => {
	const out: number[] = [];
	for (let day = window.day; day <= (window.until ?? window.day); day++) {
		out.push(day);
	}
	return out;
};

/**
 * EVERY DAY OF THE YEAR, against every celebration. Two claims at once.
 *
 * DISJOINTNESS: no calendar day belongs to two occasions. Nothing else enforces
 * that - the seven predicates are seven independent expressions and the face
 * draws each one's costume additively, so an overlap would put a pumpkin inside a
 * ghost with no error anywhere. It happens to be obvious from the table today,
 * which is the point: it is obvious now, and it is a two-character edit away from
 * not being, and the failure is invisible for 364 days a year.
 *
 * COVERAGE: each predicate fires on exactly the days its row names, and on no
 * others. This is the check that catches a mis-bound and/or - the documented bug
 * class that put headsets on at every hour of the day - because a mis-binding
 * shows up here as a predicate firing across a whole month rather than on one day.
 *
 * AT 02:00, deliberately. NEW_YEAR is the one row carrying an hour clause, and 2
 * is inside it, so this grid tests it at its WIDEST. A pair that is disjoint when
 * one of them is at its widest is disjoint at every other hour too.
 */
for (let month = 1; month <= 12; month++) {
	for (let day = 1; day <= 31; day++) {
		const values = at({ MONTH: month, DAY: day, HOUR_0_23: 2 });
		const firing = CELEBRATIONS.filter(([, pred]) => evaluate(pred, values)).map(([name]) => name);
		const want = CELEBRATIONS.filter(
			([, , window]) => window.month === month && daysOf(window).includes(day)
		).map(([name]) => name);

		if (firing.length > 1) {
			throw new Error(
				`${firing.join(' and ')} both fire on ${day}.${month} - two costumes at once`
			);
		}
		if (firing.join(',') !== want.join(',')) {
			throw new Error(
				`on ${day}.${month} the face celebrates [${firing.join(',')}], but HOLIDAY says ` +
					`[${want.join(',')}] - a predicate no longer matches its own window`
			);
		}
	}
}

/**
 * THE HOUR CLAUSE IS ON NEW_YEAR ALONE.
 *
 * The grid above runs at 02:00, where that clause is satisfied, so on its own it
 * would pass just as happily if every celebration had picked one up. This is the
 * other half: at midday on its own day, the fireworks are off and the other six
 * are on.
 */
for (const [name, pred, window] of CELEBRATIONS) {
	const fires = evaluate(pred, at({ MONTH: window.month, DAY: window.day, HOUR_0_23: 12 })) !== 0;
	if (fires === (name === 'NEW_YEAR')) {
		throw new Error(
			name === 'NEW_YEAR'
				? 'NEW_YEAR now fires at midday - the fireworks have lost their hour clause'
				: `${name} does not fire at midday on its own day - it has grown an hour clause`
		);
	}
}

/**
 * NOTHING GOES IN A FIST WITHOUT AN ARM UNDER IT.
 *
 * The two arm switches in face/blob-hero.ts test HANDS_FULL and HOLDS_POLE ahead
 * of their resting poses, so as long as every held thing is inside one of those
 * two, the hand is there. This proves the "as long as" - and it is the assertion
 * that fires when a seventh celebration is given a prop and not added to
 * HANDS_FULL, which is precisely the edit that would reintroduce the floating
 * step-goal pole.
 *
 * THE WEATHER HAS TO VARY, and getting that wrong made this proof useless once
 * already. The first version pinned the temperature at T.COCKTAIL_C on a clear
 * day so that HOT_AND_SUNNY would be exercised - which made HOT_AND_SUNNY true in
 * EVERY row, and HANDS_FULL is a disjunction, so it was true in every row too. The
 * check passed happily with BIRTHDAY deleted from HANDS_FULL. Mutation testing is
 * what found that: two deliberate breakages went unreported. A row where the
 * cocktail is NOT out is the row that can see any other prop.
 */
for (const [name, held, rests, arm] of [
	['BIRTHDAY', BIRTHDAY, LEFT_ARM_RESTS, 'left'],
	['LABOUR_DAY', LABOUR_DAY, LEFT_ARM_RESTS, 'left'],
	['FORCE', FORCE, LEFT_ARM_RESTS, 'left'],
	// The three props that predate the calendar. They are deliberately NOT in
	// HANDS_FULL - each is gated on a window or a forecast that already implies
	// daylight - so this is the check that the "already implies" is still true. Move
	// the Wednesday standup to 23:00 and it fires here rather than on a wrist.
	['WEDNESDAY_MEETING', WEDNESDAY_MEETING, LEFT_ARM_RESTS, 'left'],
	['FRIDAY_GAME_ICON', FRIDAY_GAME_ICON, LEFT_ARM_RESTS, 'left'],
	['HOT_AND_SUNNY', HOT_AND_SUNNY, LEFT_ARM_RESTS, 'left'],
	['GOAL_MET', GOAL_MET, RIGHT_ARM_RESTS, 'right'],
	['REUNIFICATION', REUNIFICATION, RIGHT_ARM_RESTS, 'right']
] as const) {
	// Every hour of every celebration day, on each weekday, WITH AND WITHOUT the
	// weather that brings the cocktail out - the whole space in which an all-day
	// prop can collide with a resting arm.
	for (const [, , window] of CELEBRATIONS) {
		for (let hour = 0; hour < 24; hour++) {
			for (let dow = 1; dow <= 7; dow++) {
				for (const temp of [T.COCKTAIL_C, T.COCKTAIL_C - 10]) {
					const values = at({
						MONTH: window.month,
						DAY: window.day,
						HOUR_0_23: hour,
						DAY_OF_WEEK: dow,
						MINUTE: 35,
						STEP_PERCENT: T.GOAL_PCT,
						'WEATHER.TEMPERATURE': temp,
						'WEATHER.CHANCE_OF_PRECIPITATION': 0
					});
					if (evaluate(held, values) && evaluate(rests, values)) {
						throw new Error(
							`${name} puts something in the ${arm} hand at ${hour}:35 on ` +
								`${window.day}.${window.month} at ${temp}C, and the ${arm} arm is resting - the ` +
								'prop would float in mid-air beside it, exactly as the step-goal pole did'
						);
					}
				}
			}
		}
	}
}
