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
 * explicit for the reason documented in docs/authoring-strategy.md: or() returns a
 * FLAT unparenthesised string, so `and(or(a, b), c)` mis-binds - the bug that put
 * headsets on at every hour of the day. build.ts --equiv is how that gets checked
 * now rather than by reading.
 */

import {
  and, eq, group, gt, gte, lte, or, src, type Expr,
} from './expr.ts'
import { evaluate } from './eval.ts'

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

  /** WHO UV index. 6 is the bottom of "high", where the shades come out. */
  UV_HIGH: 6,

  /** Heart rate, bpm. The sweat cluster fills in three discrete steps. */
  PUFFED_BPM: 100,
  SWEAT_TWO_BPM: 120,
  SWEAT_ALL_BPM: 150,

  /** Percent of the wearer's own step goal. */
  GOAL_PCT: 100,

  /**
   * WEATHER.CONDITION codes. Only these two are confirmed on hardware: 1 is
   * clear, 14 is partly cloudy. Everything else falls through to the cloud icon,
   * which is why there is no exhaustive list here.
   */
  CLEAR: 1,
  PARTLY_CLOUDY: 14,
} as const

// --- Sources, once ----------------------------------------------------------

const HOUR = src('HOUR_0_23')
const TEMP = src('WEATHER.TEMPERATURE')
const PRECIP_PCT = src('WEATHER.CHANCE_OF_PRECIPITATION')
const HAVE_WEATHER = src('WEATHER.IS_AVAILABLE')
const IS_DAY = src('WEATHER.IS_DAY')
const CONDITION = src('WEATHER.CONDITION')
const UV = src('WEATHER.UV_INDEX')
const BPM = src('HEART_RATE')

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
export const NIGHT: Expr = or(gte(HOUR, T.NIGHT_FROM), gt(T.NIGHT_UNTIL, HOUR))

/**
 * The waking hours, as the step-goal flag states them.
 *
 * NOT written as a negation of NIGHT, because the emitted string is not one: the
 * flag says `23 > [HOUR] && [HOUR] >= 7`. It is nevertheless exactly NIGHT's
 * complement, and the assertion at the bottom of this file proves that for all
 * 24 hours rather than trusting the reading.
 */
export const DAYTIME: Expr = and(gt(T.NIGHT_FROM, HOUR), gte(HOUR, T.NIGHT_UNTIL))

// --- Weather ----------------------------------------------------------------

/** Is there a forecast at all? Everything below this line has to survive "no". */
export const HAVE_FORECAST: Expr = HAVE_WEATHER

/** Rain likely enough to draw the field and put the umbrella up. */
export const RAIN_LIKELY: Expr = and(HAVE_WEATHER, gte(PRECIP_PCT, T.RAIN_PCT))

/**
 * Dry, as the two "resting arm" predicates state it.
 *
 * NOT `!RAIN_LIKELY`: it omits the availability check on purpose, because a
 * missing forecast reads as 0 and 0 is dry. Reversed operands again, as authored.
 */
export const DRY: Expr = gt(T.RAIN_PCT, PRECIP_PCT)

/** A storm. Lightning, the burst, startled eyes, and the companion's X-ray. */
export const STORM: Expr = and(HAVE_WEATHER, gte(PRECIP_PCT, T.STORM_PCT))

/** Rain, as the weather CHIP states it - already inside a HAVE_FORECAST branch. */
export const RAIN_ICON: Expr = gte(PRECIP_PCT, T.RAIN_PCT)

/** Clear sky, and the sun is up. */
export const CLEAR_DAY: Expr = and(eq(CONDITION, T.CLEAR), IS_DAY)
/** Clear sky at night - the moon icon. Reached only after CLEAR_DAY has failed. */
export const CLEAR_NIGHT: Expr = eq(CONDITION, T.CLEAR)
export const PARTLY_CLOUDY: Expr = eq(CONDITION, T.PARTLY_CLOUDY)

/** Cold enough for a scarf. */
export const COLD: Expr = and(HAVE_WEATHER, lte(TEMP, T.SCARF_C))
/** Cold enough for gloves as well. A SUBSET of COLD - see the assertions. */
export const GLOVE_COLD: Expr = and(HAVE_WEATHER, lte(TEMP, T.GLOVES_C))
/** Freezing: the snowflake. A subset of GLOVE_COLD in turn. */
export const FREEZING: Expr = and(HAVE_WEATHER, lte(TEMP, T.FREEZING_C))

/** Strong sun, and daylight to go with it. The sunglasses. */
export const HIGH_UV: Expr = and(HAVE_WEATHER, gte(UV, T.UV_HIGH), IS_DAY)

/** Warm, clear and daytime: the cocktail. */
export const HOT_AND_SUNNY: Expr =
  and(HAVE_WEATHER, gte(TEMP, T.COCKTAIL_C), eq(CONDITION, T.CLEAR), IS_DAY)

// --- Body -------------------------------------------------------------------

/** Working hard enough to sweat at all. */
export const PUFFED: Expr = gte(BPM, T.PUFFED_BPM)
/** Two beads on the forehead. */
export const SWEAT_TWO: Expr = gte(BPM, T.SWEAT_TWO_BPM)
/** All three. */
export const SWEAT_ALL: Expr = gte(BPM, T.SWEAT_ALL_BPM)
/** Is there a reading? A chest strap that has not synced reports 0, not null. */
export const HEART_RATE_VALID: Expr = gt(BPM, 0)

/** The step goal met, during waking hours - the little flag. */
export const GOAL_MET: Expr = and(gte(src('STEP_PERCENT'), T.GOAL_PCT), DAYTIME)

/** The battery's own low flag, rather than a percentage this face chooses. */
export const BATTERY_LOW: Expr = src('BATTERY_IS_LOW')

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
export const NIGHT_AND_DRY: Expr = and(group(NIGHT), DRY)

/** Startled by a storm, or asleep - either way the mouth is a small circle. */
export const STORM_OR_NIGHT: Expr = or(group(STORM), NIGHT)

/**
 * The moon: night, and not freezing.
 *
 * The second half is `temperature > 0 OR no forecast`, so a watch with no weather
 * data still gets a moon rather than nothing. freeze-mark.ts draws the snowflake
 * in the same 36x36 box, and these two must be mutually exclusive or they overlap.
 */
export const MOON_VISIBLE: Expr = and(group(NIGHT), group(or(gt(TEMP, T.FREEZING_C), eq(HAVE_WEATHER, 0))))

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
  ['RAIN_LIKELY', RAIN_LIKELY, '[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.CHANCE_OF_PRECIPITATION] &gt;= 50'],
  ['DRY', DRY, '50 &gt; [WEATHER.CHANCE_OF_PRECIPITATION]'],
  ['STORM', STORM, '[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.CHANCE_OF_PRECIPITATION] &gt;= 90'],
  ['RAIN_ICON', RAIN_ICON, '[WEATHER.CHANCE_OF_PRECIPITATION] &gt;= 50'],
  ['CLEAR_DAY', CLEAR_DAY, '[WEATHER.CONDITION] == 1 &amp;&amp; [WEATHER.IS_DAY]'],
  ['CLEAR_NIGHT', CLEAR_NIGHT, '[WEATHER.CONDITION] == 1'],
  ['PARTLY_CLOUDY', PARTLY_CLOUDY, '[WEATHER.CONDITION] == 14'],
  ['COLD', COLD, '[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.TEMPERATURE] &lt;= 10'],
  ['GLOVE_COLD', GLOVE_COLD, '[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.TEMPERATURE] &lt;= 5'],
  ['FREEZING', FREEZING, '[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.TEMPERATURE] &lt;= 0'],
  ['HIGH_UV', HIGH_UV, '[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.UV_INDEX] &gt;= 6 &amp;&amp; [WEATHER.IS_DAY]'],
  ['HOT_AND_SUNNY', HOT_AND_SUNNY, '[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.TEMPERATURE] &gt;= 25 &amp;&amp; [WEATHER.CONDITION] == 1 &amp;&amp; [WEATHER.IS_DAY]'],
  ['PUFFED', PUFFED, '[HEART_RATE] &gt;= 100'],
  ['SWEAT_TWO', SWEAT_TWO, '[HEART_RATE] &gt;= 120'],
  ['SWEAT_ALL', SWEAT_ALL, '[HEART_RATE] &gt;= 150'],
  ['HEART_RATE_VALID', HEART_RATE_VALID, '[HEART_RATE] &gt; 0'],
  ['GOAL_MET', GOAL_MET, '[STEP_PERCENT] &gt;= 100 &amp;&amp; 23 &gt; [HOUR_0_23] &amp;&amp; [HOUR_0_23] &gt;= 7'],
  ['BATTERY_LOW', BATTERY_LOW, '[BATTERY_IS_LOW]'],
  ['NIGHT_AND_DRY', NIGHT_AND_DRY, '([HOUR_0_23] &gt;= 23 || 7 &gt; [HOUR_0_23]) &amp;&amp; 50 &gt; [WEATHER.CHANCE_OF_PRECIPITATION]'],
  ['STORM_OR_NIGHT', STORM_OR_NIGHT, '([WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.CHANCE_OF_PRECIPITATION] &gt;= 90) || [HOUR_0_23] &gt;= 23 || 7 &gt; [HOUR_0_23]'],
  ['MOON_VISIBLE', MOON_VISIBLE, '([HOUR_0_23] &gt;= 23 || 7 &gt; [HOUR_0_23]) &amp;&amp; ([WEATHER.TEMPERATURE] &gt; 0 || [WEATHER.IS_AVAILABLE] == 0)'],
]

/** Every predicate still emits the string it emitted when it was a literal. */
export const verifyPredicates = (): string[] =>
  SHIPPED.filter(([, composed, shipped]) => composed !== shipped)
    .map(([name, composed, shipped]) => `${name}\n      is:      ${composed}\n      shipped: ${shipped}`)

/** How many predicates are pinned. Reported by --diff so the number is visible. */
export const PREDICATE_COUNT = SHIPPED.length

// --- Build-time proofs ------------------------------------------------------
//
// The relationships between these predicates are what a reader assumes and what
// nothing checked. They are cheap to prove now that the evaluator exists, and
// every one of them was an assumption someone could have broken by editing a
// single number above.

/** Values that make a predicate's OTHER inputs irrelevant. */
const at = (over: Record<string, number>): Record<string, number> => ({
  HOUR_0_23: 12,
  'WEATHER.IS_AVAILABLE': 1,
  'WEATHER.TEMPERATURE': 19,
  'WEATHER.CHANCE_OF_PRECIPITATION': 0,
  'WEATHER.CONDITION': 1,
  'WEATHER.IS_DAY': 1,
  'WEATHER.UV_INDEX': 4,
  HEART_RATE: 88,
  STEP_PERCENT: 19,
  BATTERY_IS_LOW: 0,
  ...over,
})

/** The sweat cluster fills in order, so its three gates must be ordered. */
if (!(T.PUFFED_BPM < T.SWEAT_TWO_BPM && T.SWEAT_TWO_BPM < T.SWEAT_ALL_BPM)) {
  throw new Error('the sweat thresholds are out of order: three beads before one')
}

/**
 * Cold, gloves and freezing NEST. mock-state.ts relies on this: it sets the
 * temperature and lets the real Conditions sort themselves out, and a snowflake
 * over two blobs wearing no scarves is a state the watch cannot be in.
 */
if (!(T.FREEZING_C < T.GLOVES_C && T.GLOVES_C < T.SCARF_C)) {
  throw new Error('the cold thresholds do not nest: freezing must be colder than gloves')
}
for (const t of [T.FREEZING_C, T.FREEZING_C - 1, -20]) {
  if (!evaluate(COLD, at({ 'WEATHER.TEMPERATURE': t })) || !evaluate(GLOVE_COLD, at({ 'WEATHER.TEMPERATURE': t }))) {
    throw new Error(`freezing at ${t}C does not imply gloves and a scarf`)
  }
}

/** A storm is also rain: the umbrella must be up when the bolt strikes. */
if (T.RAIN_PCT > T.STORM_PCT) throw new Error('a storm must be at least as wet as rain')
for (const p of [T.STORM_PCT, 95, 100]) {
  if (!evaluate(RAIN_LIKELY, at({ 'WEATHER.CHANCE_OF_PRECIPITATION': p }))) {
    throw new Error(`a storm at ${p}% does not imply rain - the umbrella would be down`)
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
for (let h = 0; h < 24; h++) {
  const night = evaluate(NIGHT, at({ HOUR_0_23: h }))
  const day = evaluate(DAYTIME, at({ HOUR_0_23: h }))
  if (night === day) {
    throw new Error(`hour ${h} is ${night ? 'both' : 'neither'} night nor daytime`)
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
  for (const t of [-20, -1, 0, 1, 19]) {
    const v = at({ 'WEATHER.IS_AVAILABLE': avail, 'WEATHER.TEMPERATURE': t, HOUR_0_23: 2 })
    if (evaluate(MOON_VISIBLE, v) && evaluate(FREEZING, v)) {
      throw new Error(`moon and snowflake both draw at ${t}C, forecast=${avail}`)
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
  const flat = and(NIGHT, DRY)
  const wet = at({ HOUR_0_23: 23, 'WEATHER.CHANCE_OF_PRECIPITATION': 90 })
  if (evaluate(flat, wet) === evaluate(NIGHT_AND_DRY, wet)) {
    throw new Error('group(NIGHT) has stopped mattering in NIGHT_AND_DRY - check expr.ts or()')
  }
}
