/**
 * The ambient cross-fade, shared by the clock and both date copies.
 *
 * WFF cannot change a font weight, so anything that looks different in ambient
 * is drawn TWICE - one copy visible interactive, one visible ambient - and the
 * two are cross-faded with <Variant target="alpha">.
 *
 * THE ASYMMETRY THAT MATTERS. A <Variant> declares the AMBIENT value of an
 * attribute plus a window; the SAME window is used in both directions, with the
 * attribute animating toward whichever value the destination mode wants. That
 * makes a gap in one direction and an overlap in the other, unavoidably:
 *
 *   going ambient        out copy falls [0, 0.45], in copy rises [0.50, 1.00]
 *                        -> 0.05 with neither drawn: a clean hand-over
 *   going interactive    out copy rises [0, 0.45], in copy falls [0.50, 1.00]
 *                        -> the in copy is still at full alpha while the out
 *                           copy comes back up: both drawn, around mid-window
 *
 * You cannot gap both directions. Gapping the way in requires the in copy's
 * window to precede the out copy's; gapping the way out requires the reverse.
 * One pair of windows, so pick one - and the overlap is the cheaper one to
 * spend, PROVIDED the two copies are congruent.
 *
 * CONGRUENCE IS THE REAL REQUIREMENT, not the timing. The clock's two copies
 * are the same string at the same origin in two weights, so the LIGHT stems sit
 * inside the BOLD ones and the overlap reads as a weight morph rather than as
 * two texts. That is why the clock's overlap has never been reported as a
 * defect while the date's was the first thing seen on the wrist: the date's
 * ambient copy was laid out differently from its interactive copy, so its
 * overlap had nothing to hide behind. See date-ambient.ts.
 *
 * EASE_IN OUT, EASE_OUT IN. Hold, then leave quickly; arrive quickly, then
 * settle. Both curves push their steep section into the middle of the
 * transition, which is where the other copy is absent (going ambient) or where
 * the overlap wants to be shortest (going interactive).
 *
 * startOffset + duration MUST BE <= 1.0. Above it the offset is SILENTLY
 * IGNORED and both copies fade across the whole transition - the v1 smear,
 * back, with nothing reporting it. 0.50 + 0.50 sits exactly at the limit.
 */

import type { Attrs } from './xml.ts'

/**
 * The copy that is visible interactive: alpha 255 -> 0.
 *
 * Duration is deliberately SHORTER than the in copy's offset, by 0.05.
 */
export const FADE_OUT: Attrs = {
  mode: 'AMBIENT',
  target: 'alpha',
  value: 0,
  duration: 0.45,
  startOffset: 0,
  interpolation: 'EASE_IN',
}

/**
 * The copy that is visible ambient: alpha 0 -> 255.
 *
 * The literals are strings so the emitted attribute keeps its trailing zero and
 * reads as a pair with 0.45 above. The differ normalises numbers inside
 * expressions, so this is presentation only.
 */
export const FADE_IN: Attrs = {
  mode: 'AMBIENT',
  target: 'alpha',
  value: 255,
  duration: '0.50',
  startOffset: '0.50',
  interpolation: 'EASE_OUT',
}

const num = (v: string | number | undefined): number => Number(v)

/**
 * Build-time proof of the one property WFF will not check and the eye cannot
 * see until it is on a wrist for 200ms.
 */
if (num(FADE_OUT.startOffset) + num(FADE_OUT.duration) > 1) {
  throw new Error('FADE_OUT: startOffset + duration > 1.0, offset would be ignored')
}
if (num(FADE_IN.startOffset) + num(FADE_IN.duration) > 1) {
  throw new Error('FADE_IN: startOffset + duration > 1.0, offset would be ignored')
}
if (num(FADE_OUT.duration) > num(FADE_IN.startOffset)) {
  throw new Error('the fade windows overlap going into ambient: both copies would be drawn')
}
