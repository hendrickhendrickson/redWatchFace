/**
 * The parts both blobs are made of.
 *
 * DELIBERATELY NOT ONE PARAMETERISED blob(). The two blobs look like the same
 * thing at two scales and they are not: the companion's gyro gain is lower on
 * purpose so the pair read as sitting at different depths, its arms drop
 * differently at night, its scarf tail overshoots its box, and its sweat figure
 * is the hero's scaled 1.5x to suit the larger head rather than the other way
 * round. Folding roughly fifteen measured, hardware-tuned exceptions into flags
 * on a single builder would make the next wrist iteration fight the
 * abstraction. So: shared primitives that take explicit geometry, and two
 * separate call sequences that stay readable as two different blobs.
 */

import { el, type Node } from './xml.ts'
import { C, mouth, type Hex, type Weekday } from './palette.ts'
import { grow, group, heartRamp, secondPhase, tilt, triangleAlpha } from './expr.ts'
import * as G from './geometry.ts'
import { T } from './states.ts'
import {
  DRIP_RAMP_SPAN,
  type DripFigure,
  type Leaf,
  type Limb,
  type LimbStroke,
  type SweatFigure,
} from './data/blobs.ts'

export interface BlobGeometry {
  /** The body box, which every weekday part is positioned against. */
  box: G.Box
  bodyShape: G.Box
  bodyRadius: { cornerRadiusX: number; cornerRadiusY: number }
  mouthRound: G.Box
  mouthOpen: G.Box
  mouthMask: G.Box
}

export const HERO_GEOMETRY: BlobGeometry = {
  box: G.HERO_BOX,
  bodyShape: G.HERO_BODY_SHAPE,
  bodyRadius: G.HERO_BODY_RADIUS,
  mouthRound: G.HERO_MOUTH_ROUND,
  mouthOpen: G.HERO_MOUTH_OPEN,
  mouthMask: G.HERO_MOUTH_MASK,
}

export const COMPANION_GEOMETRY: BlobGeometry = {
  box: G.MINI_BOX,
  bodyShape: G.MINI_BODY_SHAPE,
  bodyRadius: G.MINI_BODY_RADIUS,
  mouthRound: G.MINI_MOUTH_ROUND,
  mouthOpen: G.MINI_MOUTH_OPEN,
  mouthMask: G.MINI_MOUTH_MASK,
}

/** The body: a rounded rectangle in the day's colour. */
export const bodyPart = (g: BlobGeometry, name: string, colour: Hex): Node =>
  el('PartDraw', { ...g.box, name }, [
    el('RoundRectangle', { ...g.bodyShape, ...g.bodyRadius }, [el('Fill', { color: colour })]),
  ])

/** The resting mouth: a small dark circle, derived from the body colour. */
export const roundMouth = (g: BlobGeometry, name: string, body: Hex): Node =>
  el('PartDraw', { ...g.box, name }, [
    el('Ellipse', { ...g.mouthRound }, [el('Fill', { color: mouth(body) })]),
  ])

/** The open mouth: a larger dark ellipse, same derivation. */
export const openMouth = (g: BlobGeometry, name: string, body: Hex): Node =>
  el('PartDraw', { ...g.box, name }, [
    el('Ellipse', { ...g.mouthOpen }, [el('Fill', { color: mouth(body) })]),
  ])

/**
 * The mask that repaints the open mouth's top half in the BODY colour, turning
 * a full ellipse into a smile.
 *
 * It takes the same `body` value the body part does, which is the whole reason
 * this exists as a function: in the XML these were two independent seven-way
 * tables, and a mismatch drew a dark bar across the face on exactly one
 * weekday.
 */
export const mouthMask = (g: BlobGeometry, name: string, body: Hex): Node =>
  el('PartDraw', { ...g.box, name }, [
    el('Rectangle', { ...g.mouthMask }, [el('Fill', { color: body })]),
  ])

/** Name helper so the eight weekday sites cannot drift in their conventions. */
export const partName = (prefix: string, part: string, day: Weekday): string =>
  `${prefix}_${part}_${day}`

// --- Limbs ------------------------------------------------------------------

/**
 * A limb is one line drawn TWICE: thick in cream, then thin in ink over the top,
 * with a cap ellipse on each pass.
 *
 * BOTH COLOUR PASSES COME FROM THE SAME ROW, which is the whole reason this exists.
 * The hand-written version typed each line's four coordinates twice, in two blocks
 * up to twenty lines apart, so a limb could be moved on one pass and not the other -
 * an ink core protruding from a cream sleeve, invisible in the source.
 *
 * ALL CREAM PASSES FIRST, THEN ALL INK, not cream-then-ink per limb. That is the
 * authored draw order and it matters where limbs overlap: the companion's four
 * limbs are one part, and interleaving the passes would let one limb's cream sleeve
 * paint over a neighbour's ink core.
 */
export const limbs = (rows: readonly Limb[], t: LimbStroke): Node[] => [
  ...rows.flatMap((r) => [
    el('Line', { ...r.line }, [el('Stroke', { color: C.LIMB, thickness: t.cream, cap: 'ROUND' })]),
    el('Ellipse', { ...r.cream }, [el('Fill', { color: C.LIMB })]),
  ]),
  ...rows.flatMap((r) => [
    el('Line', { ...r.line }, [el('Stroke', { color: C.INK, thickness: t.ink, cap: 'ROUND' })]),
    el('Ellipse', { ...r.ink }, [el('Fill', { color: C.INK })]),
  ]),
]

/** A limb part: the box, the name, and the two passes inside it. */
export const limbPart = (box: G.Box, name: string, rows: readonly Limb[], t: LimbStroke): Node =>
  el('PartDraw', { ...box, name }, limbs(rows, t))

/**
 * Mittens, drawn from the SAME rows the hands are.
 *
 * Every glove in the face was a byte-identical copy of an arm's cream cap, sitting
 * in a different part of the file with only the fill changed - four such copies in
 * the hero, two in the companion. A glove that no longer sits on its hand was one
 * careless edit away and nothing would have reported it. Now it cannot be written.
 */
export const glovePart = (box: G.Box, name: string, hands: readonly Limb[]): Node =>
  el('PartDraw', { ...box, name }, hands.map((h) => el('Ellipse', { ...h.cream }, [el('Fill', { color: C.SCARF })])))

// --- The leaf tuft ----------------------------------------------------------

/** One leaf, rotated about the centre of the shared tuft box. */
export const leafPart = (box: G.Box, leaf: Leaf): Node =>
  el('PartDraw', { ...box, name: leaf.name, pivotX: 0.5, pivotY: 0.5, angle: leaf.angle }, [
    el('Ellipse', { ...leaf.blade }, [el('Fill', { color: leaf.dark ? C.LEAF_DARK : C.GREEN })]),
    ...(leaf.vein
      ? [el('Line', { ...leaf.vein }, [el('Stroke', { color: C.LEAF_LIGHT, thickness: 1.6, cap: 'ROUND' })])]
      : []),
  ])

// --- Sweat ------------------------------------------------------------------

/**
 * One branch of the forehead cluster: the beads this branch shows, by index.
 *
 * The subset is indices into the figure's own table, so the middle bead has one
 * definition instead of appearing in both the "all three" and the "just one" block.
 */
export const beadPart = (box: G.Box, name: string, fig: SweatFigure, pick: readonly number[]): Node =>
  el('PartDraw', { ...box, name }, pick.map((i) => {
    const b = fig.beads[i]
    if (b === undefined) throw new Error(`${name}: no bead ${i} in a table of ${fig.beads.length}`)
    return el('Ellipse', { ...b }, [el('Fill', { color: C.SWEAT })])
  }))

/**
 * The two drip groups, sliding down the cheeks a second out of phase.
 *
 * FOUR HAND-WRITTEN EXPRESSIONS PER BLOB became four compositions. Each was a
 * single attribute several hundred characters long, restating the whole-second
 * sawtooth four times inside itself and burying the numbers 4, 6, 100, 2, 255, 3,
 * 140 and 20 where no reader would find them - and the same eight again in the
 * hero with 12 and 18 instead. expr.ts had every one of those idioms already.
 *
 * THE SECOND DRIP CARRIES AN EXTRA GATE so it fades in late, bracketing the
 * all-three-beads threshold: a warm but resting wearer gets one trickle, not two.
 */
export const dripGroups = (box: G.Box, prefix: string, d: DripFigure): Node[] => {
  const amplitude = grow(d.fall, d.fallExtra, heartRamp(T.PUFFED_BPM, T.PUFFED_BPM + DRIP_RAMP_SPAN))
  const beads = (name: string) =>
    el('PartDraw', { ...box, name }, d.beads.map((b) => el('Ellipse', { ...b }, [el('Fill', { color: C.SWEAT })])))

  return ['a', 'b'].map((tag, i) => {
    const p = group(secondPhase(2, i))
    const alpha = i === 0
      ? triangleAlpha(p)
      : `${triangleAlpha(p)} * ${heartRamp(d.secondFrom, d.secondTo)}`
    return el('Group', { ...box, name: `${prefix}_drip_${tag}`, alpha: 255 }, [
      el('Transform', { target: 'y', value: `(${amplitude}) * ${p}` }),
      el('Transform', { target: 'alpha', value: alpha }),
      beads(`${prefix}_drip_beads_${tag}`),
    ])
  })
}

/**
 * Wrist-tilt parallax for a blob and everything that has to move with it.
 *
 * <Gyro> IS NOT INHERITED BY SIBLINGS. The umbrella, the burst, the bolt and
 * both sets of z's are top-level siblings of the blob groups - they have to be,
 * since each is gated by its own Condition - so they inherit nothing, and
 * without their own Gyro the hero's fist slid off the umbrella shaft by up to
 * 16px across a full tilt sweep.
 *
 * So the gain is genuinely repeated in the output, seven times. What has
 * changed is that it is now repeated FROM ONE PLACE: this used to mean
 * hand-editing every accessory that tracks a blob, and the duplication was
 * found by walking the element tree rather than by reading it, because a <Gyro>
 * behind a twelve-line comment is easy to miss and easy to regex wrong.
 *
 * freeze_mark and moon_mark deliberately have NO Gyro: nothing joins to them,
 * and holding them in the same plane as the clock is what makes them read as
 * sky. Distant things moving least is the effect, not a gap in it.
 */
export const gyro = (gain: { x: number; y: number }): Node =>
  el('Gyro', {
    x: tilt('X', gain.x, G.GYRO_CLAMP),
    y: tilt('Y', gain.y, G.GYRO_CLAMP),
  })

/** The hero and everything that tracks it. */
export const heroGyro = (): Node => gyro(G.GYRO_HERO)

/**
 * The companion and everything that tracks it.
 *
 * A LOWER GAIN THAN THE HERO, on purpose. The pair read as sitting at different
 * depths rather than as one flat layer sliding about; matching them would lose
 * the effect entirely.
 */
export const companionGyro = (): Node => gyro(G.GYRO_COMPANION)
