/**
 * The heart-rate chip: a heart, and a number.
 *
 * THE HEART IS TWO LOBES AND A ROTATED SQUARE, not a path. WFF has no path
 * primitive, so the point is a 45-degree square whose upper corners are hidden
 * behind the two lobe circles - which data/chips.ts asserts, since it is the one
 * property that stops the three shapes reading as a diamond parked under two
 * circles.
 *
 * A ZERO READING IS NOT A HEART RATE. The sensor reports 0 when it has no
 * contact, so a bare number would show "0 bpm" on a wrist that simply is not
 * being read. HEART_RATE_VALID gates that into a dimmed placeholder.
 */

import { el, type Node } from '../xml.ts'
import { C } from '../palette.ts'
import * as G from '../geometry.ts'
import { AMBIENT_HIDE } from '../crossfade.ts'
import { whenElse } from '../condition.ts'
import { HEART_RATE_VALID } from '../states.ts'
import { chipValue } from '../chip.ts'
import {
  HEART_LOBES, HEART_LOBES_BOX, HEART_POINT, HEART_POINT_BOX, TEXT_X,
} from '../data/chips.ts'

const CHIP = G.ANCHORS.CHIP_HEART_RATE
const coral = [el('Fill', { color: C.CORAL })]

export const chipHeartRate = (): Node =>
  el('Group', { name: 'chip_heart_rate', ...CHIP, alpha: 255 }, [
    el('Variant', AMBIENT_HIDE),
    el('PartDraw', { name: 'hr_icon_lobes', ...HEART_LOBES_BOX }, [
      ...HEART_LOBES.map((l) => el('Ellipse', { ...l }, coral)),
    ]),
    el('PartDraw', { name: 'hr_icon_point', ...HEART_POINT_BOX }, [
      el('Rectangle', { ...HEART_POINT }, coral),
    ]),
    // The value and the placeholder MUST share a box, or the reading jumps
    // sideways the moment the sensor loses contact. One derivation, two colours.
    whenElse(
      'hr_valid',
      HEART_RATE_VALID,
      [chipValue(CHIP, { name: 'hr_value', x: TEXT_X.HEART_RATE, colour: C.CREAM, text: '%.0f', source: 'HEART_RATE' })],
      [chipValue(CHIP, { name: 'hr_placeholder', x: TEXT_X.HEART_RATE, colour: C.HR_PLACEHOLDER, text: '--' })],
    ),
  ])
