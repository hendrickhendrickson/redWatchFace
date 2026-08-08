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
import { mouth, type Hex, type Weekday } from './palette.ts'
import { tilt } from './expr.ts'
import * as G from './geometry.ts'

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
