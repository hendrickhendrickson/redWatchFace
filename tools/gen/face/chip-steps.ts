/**
 * The step chip: a footprint, and a count.
 *
 * THE FOOTPRINT IS FIVE SHAPES tilted 25 degrees as a whole - a sole built from an
 * ellipse, a narrower ellipse, two rectangles and a heel - rather than one outline,
 * because WFF has no path primitive. The tilt is on the Part, so the five stay
 * registered to each other whatever it changes to.
 *
 * THREE COLUMNS, NOT FIVE. The five shapes share three widths between them, two of
 * them twice, and each pair had its x and width typed independently - so the sole
 * could narrow on one shape and not its partner. data/chips.ts names the columns
 * and asserts the sole does not kink or widen toward the heel.
 *
 * NO Condition HERE. A step count of zero is a true and useful reading, unlike a
 * heart rate of zero, so there is nothing to gate.
 */

import { el, type Node } from '../xml.ts'
import { C } from '../palette.ts'
import * as G from '../geometry.ts'
import { AMBIENT_HIDE } from '../crossfade.ts'
import { chipValue } from '../chip.ts'
import { FOOTPRINT_BOX, FOOTPRINT_SHAPES, TEXT_X } from '../data/chips.ts'

const CHIP = G.ANCHORS.CHIP_STEPS

export const chipSteps = (): Node =>
  el('Group', { name: 'chip_steps', ...CHIP, alpha: 255 }, [
    el('Variant', AMBIENT_HIDE),
    el('PartDraw', { name: 'steps_icon', ...FOOTPRINT_BOX }, [
      ...FOOTPRINT_SHAPES.map((s) => el(s.tag, { ...s.box }, [el('Fill', { color: C.LIMB })])),
    ]),
    chipValue(CHIP, { name: 'steps_value', x: TEXT_X.STEPS, colour: C.CREAM, text: '%d', source: 'STEP_COUNT' }),
  ])
