/**
 * The two blobs, as data.
 *
 * WHAT THIS IS NOT: one parameterised blob(). blob.ts argues at length against
 * that and the argument still holds - the companion is not the hero scaled down.
 * Its gyro gain is lower on purpose, its arms drop differently at night, its scarf
 * tail is clipped by its own box, and its sweat figure is the hero's scaled 1.5x
 * rather than the reverse. Folding fifteen measured exceptions into flags on one
 * builder would make the next wrist iteration fight the abstraction.
 *
 * So: two separate row sets, read by two separate call sequences, through shared
 * builders that take explicit geometry. What changes is that the ROWS are now
 * written once instead of the coordinates being typed once per colour pass.
 *
 * THE ONE IDEA WORTH THE FILE: a limb is a line drawn TWICE, once thick in cream
 * and once thin in ink, with a cap ellipse on each pass. The hand-written version
 * typed each line's four coordinates twice - once in the cream block and again in
 * the ink block, separated by up to twenty lines - so a limb could be moved on one
 * pass and not the other, producing an ink core sticking out of a cream sleeve.
 * Here each limb is one row and both passes read it.
 *
 * AND THE GLOVES COME FROM THE SAME ROWS. Every glove was a byte-identical copy of
 * an arm's cream cap ellipse, in a different part of the file, with only the fill
 * changed - four such copies in the hero, two in the companion. Deriving them
 * removes the same class of bug that handing bodyPart and mouthMask the same colour
 * removed: a mitten that no longer sits on its hand cannot be written.
 */

import type { Box } from '../geometry.ts'
import * as G from '../geometry.ts'
import { T } from '../states.ts'

/** A limb: one line, drawn twice, with a cap on each pass. */
export interface Limb {
  line: { startX: number; startY: number; endX: number; endY: number }
  /** The outer cream cap - a hand or a foot. Gloves are drawn from this box. */
  cream: Box
  /** The inner ink cap, inset inside the cream one. */
  ink: Box
}

/** How thick each of a blob's two passes is. */
export interface LimbStroke {
  cream: number
  ink: number
}

// --- The hero ---------------------------------------------------------------

export const HERO_STROKE: LimbStroke = { cream: 8, ink: 4.5 }

/** Both legs, in one part. Always drawn; the arms are pose-dependent. */
export const HERO_LEGS: Limb[] = [
  {
    line: { startX: 38, startY: 112, endX: 34, endY: 124 },
    cream: G.box(22, 117, 24, 15),
    ink: G.box(24, 119, 20, 11),
  },
  {
    line: { startX: 62, startY: 112, endX: 66, endY: 124 },
    cream: G.box(54, 117, 24, 15),
    ink: G.box(56, 119, 20, 11),
  },
]

/**
 * The four arm poses, one Limb each.
 *
 * `leftUp` IS THE ANCHOR FOR EVERY HELD PROP. Its cream cap at (1,26,19,18) puts
 * the hand's centre at group-local (10.5,35), and data/props.ts derives the prop
 * group's own hand position from exactly this row rather than from a number typed
 * into a comment. See the header of face/hero-props.ts.
 */
export const HERO_ARMS = {
  /** Raised, holding whatever the props section draws. The daytime default. */
  leftUp: {
    line: { startX: 22, startY: 70, endX: 11, endY: 40 },
    cream: G.box(1, 26, 19, 18),
    ink: G.box(3, 28, 15, 14),
  },
  /** Hanging, at night when it is not raining. */
  leftDown: {
    line: { startX: 24, startY: 78, endX: 12, endY: 96 },
    cream: G.box(0.5, 93, 19, 18),
    ink: G.box(2.5, 95, 15, 14),
  },
  /** Out to the side, the daytime default. Lands partly under the headset cup. */
  rightOut: {
    line: { startX: 84, startY: 74, endX: 93, endY: 62 },
    cream: G.box(84, 52, 18, 17),
    ink: G.box(86, 54, 14, 13),
  },
  /** Hanging, at night. */
  rightDown: {
    line: { startX: 76, startY: 78, endX: 88, endY: 96 },
    cream: G.box(80.5, 93, 19, 18),
    ink: G.box(82.5, 95, 15, 14),
  },
} as const satisfies Record<string, Limb>

/**
 * The leaf tuft: three leaves, all in one box, rotated about its centre.
 *
 * The centre leaf is the light green one and carries a vein; the outer two are
 * darker and sit behind it. Order is draw order.
 */
export interface Leaf {
  name: string
  angle: number
  /** The blade. */
  blade: Box
  dark: boolean
  /** The centre leaf's vein, if it has one. */
  vein?: { startX: number; startY: number; endX: number; endY: number }
}

export const HERO_LEAVES: Leaf[] = [
  { name: 'leaf_left', angle: -36, blade: G.box(30, 4, 20, 36), dark: true },
  { name: 'leaf_right', angle: 34, blade: G.box(30, 6, 20, 34), dark: true },
  {
    name: 'leaf_center',
    angle: 0,
    blade: G.box(29, 0, 22, 40),
    dark: false,
    vein: { startX: 40, startY: 36, endX: 40, endY: 8 },
  },
]

// --- The companion ----------------------------------------------------------

export const MINI_STROKE: LimbStroke = { cream: 6.2, ink: 3.2 }

/**
 * All four limbs in one part, unlike the hero.
 *
 * THE COMPANION HAS NO ARM POSES. It keeps the same four limbs day and night,
 * which is one of the measured differences between the two blobs rather than an
 * omission - the hero's arms are what carry props and the umbrella, and the
 * companion carries nothing.
 *
 * THE FIRST ROW'S CREAM CAP STARTS AT x-2, OUTSIDE THE PART BOX, and is clipped
 * flat on its left edge. That is the shipped shape and the observation the whole
 * hero_props restructuring came out of: content left of a part's origin is cut
 * off. See face/hero-props.ts and the clipping note in svg.ts.
 */
export const MINI_LIMBS: Limb[] = [
  {
    line: { startX: 12, startY: 44, endX: 5, endY: 38 },
    cream: G.box(-2, 32, 13, 12),
    ink: G.box(0, 34, 9, 8),
  },
  {
    line: { startX: 48, startY: 44, endX: 56, endY: 37 },
    cream: G.box(50, 30, 13, 12),
    ink: G.box(52, 32, 9, 8),
  },
  {
    line: { startX: 24, startY: 60, endX: 22, endY: 66 },
    cream: G.box(12, 61, 19, 12),
    ink: G.box(14, 63, 15, 8),
  },
  {
    line: { startX: 38, startY: 60, endX: 40, endY: 66 },
    cream: G.box(31, 61, 19, 12),
    ink: G.box(33, 63, 15, 8),
  },
]

/**
 * The step-goal flag's pole, and the hand that holds it.
 *
 * THIS EXISTS BECAUSE THE GRIP WAS LOST ONCE. The pole was authored to be held by
 * `rightOut`'s fist - it runs down x93, the exact centre of that cap, and spans
 * y19..74, bracketing the cap's centre at y60.5 - but nothing said so, so when the
 * salute was removed and the flag became a *branch* of the right-arm switch instead
 * of its own Condition, the arm stopped being drawn in the goal state and the pole
 * floated. Three releases, and the committed screenshot still showed the old grip.
 *
 * Recording the pole here, next to the arm row it depends on, is what makes the
 * relationship checkable. face/blob-hero.ts draws it.
 */
export const GOAL_POLE = { x: 93, top: 19, bottom: 74, thickness: 2.5 }

{
  const cap = HERO_ARMS.rightOut.cream
  const fist = { x: cap.x + cap.width / 2, y: cap.y + cap.height / 2 }
  const problems: string[] = []
  // Half a pixel either way: the pole has to pass through the fist, not near it.
  if (Math.abs(GOAL_POLE.x - fist.x) > 0.5) {
    problems.push(`the pole is at x${GOAL_POLE.x} and the fist at x${fist.x} - it would be held beside the hand`)
  }
  if (fist.y < GOAL_POLE.top || fist.y > GOAL_POLE.bottom) {
    problems.push(
      `the fist is at y${fist.y}, outside the pole's ${GOAL_POLE.top}..${GOAL_POLE.bottom} - ` +
        'the hand would grip empty air',
    )
  }
  if (problems.length) throw new Error(`the step-goal flag is no longer held:\n  ${problems.join('\n  ')}`)
}

/** Which limbs are hands, and so get mittens when it is cold enough. */
export const MINI_HAND_LIMBS = [0, 1] as const

export const MINI_LEAVES: Leaf[] = [
  { name: 'mini_leaf_left', angle: -26, blade: G.box(19, 6, 11, 18), dark: true },
  { name: 'mini_leaf_right', angle: 20, blade: G.box(18, 4, 12, 20), dark: false },
]

// --- Sweat ------------------------------------------------------------------

/**
 * The forehead cluster, as one table per blob plus the subsets each branch shows.
 *
 * THREE DISCRETE STEPS, and the SUBSETS ARE THE SAME FOR BOTH BLOBS: one bead is
 * the middle of the three, two are the outer pair, three are all of them. Written
 * out, that was six literal blocks per blob encoding one 3-row table and three
 * index sets - and the middle bead's coordinates appeared twice per blob, in the
 * "three" block and again in the "one" block.
 *
 * The companion's figure is the hero's scaled to suit the larger head relative to
 * its body, not the other way round; see blob.ts.
 */
export interface SweatFigure {
  beads: Box[]
  /** Indices into `beads`, per branch. Shared by both blobs by design. */
  three: number[]
  two: number[]
  one: number[]
}

const SUBSETS = { three: [0, 1, 2], two: [0, 2], one: [1] }

export const HERO_SWEAT: SweatFigure = {
  beads: [G.box(0, 3, 6, 7.5), G.box(9, 0, 6, 7.5), G.box(18, 3, 6, 6)],
  ...SUBSETS,
}

export const MINI_SWEAT: SweatFigure = {
  beads: [G.box(0, 2, 4, 5), G.box(6, 0, 4, 5), G.box(12, 2, 4, 4)],
  ...SUBSETS,
}

/**
 * The drips: two out-of-phase groups of beads sliding down the cheeks.
 *
 * `fall` and `fallExtra` are the distance at the sweat gate and how much further
 * it slides at double that heart rate - the hero's 12 growing to 30, the
 * companion's 4 to 10.
 *
 * `secondFrom`/`secondTo` FADE THE SECOND DRIP IN LATE, so a resting-but-warm
 * wearer gets one trickle rather than two. It brackets the all-three-beads
 * threshold, which is why it is expressed against T.SWEAT_ALL_BPM instead of as
 * two more loose numbers.
 */
export interface DripFigure {
  beads: Box[]
  fall: number
  fallExtra: number
  secondFrom: number
  secondTo: number
}

const SECOND_DRIP = { secondFrom: T.SWEAT_ALL_BPM - 10, secondTo: T.SWEAT_ALL_BPM + 10 }

export const HERO_DRIP: DripFigure = {
  beads: [G.box(20, 55, 5, 7), G.box(73, 55, 5, 7)],
  fall: 12,
  fallExtra: 18,
  ...SECOND_DRIP,
}

export const MINI_DRIP: DripFigure = {
  beads: [G.box(12, 37, 3.5, 4.5), G.box(44.5, 37, 3.5, 4.5)],
  fall: 4,
  fallExtra: 6,
  ...SECOND_DRIP,
}

/**
 * How far the drip amplitude ramp reaches above the gate.
 *
 * The fall grows from `fall` to `fall + fallExtra` as the heart rate goes from the
 * sweat gate to this much above it. 100 over 100 is one doubling, which is what
 * the authored expression encoded.
 */
export const DRIP_RAMP_SPAN = 100

/** Build-time proof that the two drip figures agree about their late fade. */
if (HERO_DRIP.secondFrom !== MINI_DRIP.secondFrom || HERO_DRIP.secondTo !== MINI_DRIP.secondTo) {
  throw new Error('the two blobs disagree about when the second drip appears')
}
