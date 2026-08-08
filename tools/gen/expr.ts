/**
 * Data sources and the expression idioms built on them.
 *
 * WFF expressions are arithmetic-only strings with no variables and no way to
 * reference one expression from another, so the same sub-expression was pasted
 * over and over in the hand-authored file: the precipitation ramp appears 73
 * times verbatim, and the whole-second phase idiom 20 times - four of them
 * inside a single attribute. A one-character drift in any copy is invisible to
 * the validator, to a screenshot and to the eye.
 */

/**
 * Every data source this face is allowed to read. A CLOSED union on purpose.
 *
 * [ANIMATION_VALUE] was invented, passed the validator, and did nothing at all
 * for a whole session - the WFF schema types expressions as xs:string, so
 * nonsense validates. It is not in this list, so `src('ANIMATION_VALUE')` is a
 * compile error rather than a silent no-op on the wrist.
 *
 * There is deliberately no [IS_AMBIENT]: it does not exist. Ambient differences
 * are expressed with <Variant mode="AMBIENT">, not with a condition.
 */
export type Source =
  | 'SECOND' | 'SECOND_MILLISECOND' | 'MINUTE' | 'HOUR_0_23'
  | 'DAY' | 'DAY_OF_WEEK' | 'DAY_OF_WEEK_S'
  | 'HEART_RATE'
  | 'STEP_COUNT' | 'STEP_PERCENT' | 'STEP_GOAL'
  | 'BATTERY_PERCENT' | 'BATTERY_IS_LOW'
  | 'ACCELEROMETER_ANGLE_X' | 'ACCELEROMETER_ANGLE_Y'
  | 'MOON_PHASE_POSITION'
  | 'WEATHER.IS_AVAILABLE' | 'WEATHER.TEMPERATURE' | 'WEATHER.CONDITION'
  | 'WEATHER.IS_DAY' | 'WEATHER.CHANCE_OF_PRECIPITATION' | 'WEATHER.UV_INDEX'

/** Branded so a bare string cannot be passed where an expression is expected. */
export type Expr = string & { readonly __expr: unique symbol }

/**
 * Numbers going INTO an expression string must go through here.
 *
 * Derived constants are computed in floating point - a drop's width growth is
 * w0 * 0.3, and 3.0 * 0.3 is 0.8999999999999999 - and template interpolation
 * would paste all seventeen digits straight into the XML. WFF would parse it
 * and draw the right thing, but the file becomes unreadable and every diff
 * fills with noise. Caught by the semantic differ the first time it happened.
 */
export const n = (v: number): string => {
  if (!Number.isFinite(v)) throw new Error(`not a finite number: ${v}`)
  if (Number.isInteger(v)) return String(v)
  return String(Number(v.toFixed(6)))
}

export const raw = (s: string): Expr => s as Expr
export const src = (s: Source): Expr => `[${s}]` as Expr

// --- Comparison -------------------------------------------------------------
//
// `<`, `<=` and `!=` DO work, verified on the watch - the belief that they did
// not came from reading the XSD's operator enumeration, which is not
// authoritative. The hand-authored file still uses reversed operands in places
// because it was written under the old belief and churning it was not worth the
// risk; new code should just use the natural direction.

/**
 * BOTH OPERANDS may be a literal or an expression.
 *
 * The face is full of reversed comparisons - `7 > [DAY_OF_WEEK]` rather than
 * `[DAY_OF_WEEK] < 7` - written that way under the since-disproved belief that
 * `<` was unavailable. They are not worth churning, so the helpers have to be
 * able to say it in the original direction.
 */
type Operand = number | Expr

const cmp = (op: string) => (a: Operand, b: Operand): Expr =>
  `${typeof a === 'number' ? n(a) : a} ${op} ${typeof b === 'number' ? n(b) : b}` as Expr

export const eq = cmp('==')
export const gte = cmp('&gt;=')
export const gt = cmp('&gt;')
export const lt = cmp('&lt;')
export const lte = cmp('&lt;=')
export const and = (...xs: Expr[]): Expr => xs.join(' &amp;&amp; ') as Expr
export const or = (...xs: Expr[]): Expr => xs.join(' || ') as Expr
export const group = (e: Expr): Expr => `(${e})` as Expr

// --- Ramps ------------------------------------------------------------------

/**
 * 0 below `lo`, 1 above `hi`, linear between. The face's one gating idiom.
 *
 * FADING BEATS GATING for anything driven by a live reading. Both the sweat and
 * the rain originally switched sub-parts on at thresholds, and a real pulse or
 * precipitation figure sitting exactly on the number makes that flicker. Where
 * a threshold survives it is because it was asked for.
 */
export const ramp = (v: Expr, lo: number, hi: number): Expr =>
  `clamp((${v} - ${n(lo)}) / ${n(hi - lo)}, 0, 1)` as Expr

/** The precipitation ramp. ONE binding for what was 73 verbatim copies. */
export const PRECIP = ramp(src('WEATHER.CHANCE_OF_PRECIPITATION'), 50, 100)

/** Per-drop rain gate: density ramps with the forecast, 8 points wide. */
export const precipGate = (from: number): Expr =>
  ramp(src('WEATHER.CHANCE_OF_PRECIPITATION'), from, from + 8)

/** Sweat intensity, from the resting band up to a hard effort. */
export const heartRamp = (lo: number, hi: number): Expr => ramp(src('HEART_RATE'), lo, hi)

// --- Phase ------------------------------------------------------------------

/**
 * Free-running sawtooth, 0..1, `hz` cycles per second.
 *
 * fract() was VERIFIED on hardware and is what made 24 independently-phased
 * rain drops possible - before it, every drop had to share the whole-second
 * sawtooth below and the rain fell in visible ranks.
 */
export const phase = (hz: number, offset: number): Expr =>
  `fract([SECOND_MILLISECOND] * ${n(hz)} + ${n(offset)})` as Expr

/**
 * The OLD whole-second sawtooth, 0..1 over `n` seconds.
 *
 * Deliberately a SEPARATE function from phase() above rather than a special
 * case of it: the sleep Zzz and the sweat drips are still on this formula, and
 * keeping it named means "which parts still use the old timing" is a question
 * the type system can answer instead of a grep.
 */
export const secondPhase = (period: number, plus = 0): Expr => {
  const s = plus ? `([SECOND] + ${n(plus)})` : `[SECOND]`
  return `((${s} % ${n(period)}) + [SECOND_MILLISECOND] - [SECOND]) / ${n(period)}` as Expr
}

/**
 * Triangle over a 0..1 phase, ZERO AT BOTH ENDS.
 *
 * That is the whole point: a sawtooth reset in y happens while alpha is 0, so
 * the element vanishes and reappears at the top instead of visibly snapping.
 * Rises over the first quarter, holds, falls over the last quarter.
 */
export const triangleAlpha = (p: Expr): Expr =>
  `255 * (clamp(4 * ${p}, 0, 1) - clamp(4 * ${p} - 3, 0, 1))` as Expr

/** `base` grows to `base + extra` as the ramp goes 0..1. */
export const grow = (base: number, extra: number, by: Expr): Expr =>
  `${n(base)} + ${n(extra)} * ${by}` as Expr

// --- Gyro -------------------------------------------------------------------

/** Wrist-tilt parallax, clamped before scaling so a sharp turn cannot fling a
 *  blob off the canvas. */
export const tilt = (axis: 'X' | 'Y', gain: number, clamp = 35): Expr =>
  `clamp([ACCELEROMETER_ANGLE_${axis}], -${n(clamp)}, ${n(clamp)}) * ${n(gain)}` as Expr
