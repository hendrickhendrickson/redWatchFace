/**
 * The step chip: a footprint, and a count.
 *
 * THE FOOTPRINT IS FIVE SHAPES tilted 25 degrees as a whole - a sole built from an
 * ellipse, a narrower ellipse, two rectangles and a heel - rather than one outline,
 * because WFF has no path primitive. The tilt is on the Part, so the five stay
 * registered to each other whatever it changes to.
 *
 * NO Condition HERE. A step count of zero is a true and useful reading, unlike a
 * heart rate of zero, so there is nothing to gate.
 */

import { el, cdata, type Node } from '../xml.ts'
import { C } from '../palette.ts'
import * as G from '../geometry.ts'
import { AMBIENT_HIDE } from '../crossfade.ts'
import { SIZE, font } from '../type.ts'

export const chipSteps = (): Node =>
  el('Group', { name: 'chip_steps', ...G.ANCHORS.CHIP_STEPS, alpha: 255 }, [
    el('Variant', AMBIENT_HIDE),
    el('PartDraw', { name: 'steps_icon', x: 0, y: 1, width: 28, height: 34, pivotX: 0.5, pivotY: 0.5, angle: -25 }, [
      el('Ellipse', { x: 7.5, y: 4.5, width: 11, height: 13 }, [
        el('Fill', { color: C.LIMB }),
      ]),
      el('Ellipse', { x: 9.25, y: 11, width: 7.5, height: 9 }, [
        el('Fill', { color: C.LIMB }),
      ]),
      el('Rectangle', { x: 9.25, y: 15.5, width: 7.5, height: 4 }, [
        el('Fill', { color: C.LIMB }),
      ]),
      el('Rectangle', { x: 10.5, y: 21.5, width: 7, height: 3.5 }, [
        el('Fill', { color: C.LIMB }),
      ]),
      el('Ellipse', { x: 10.5, y: 22, width: 7, height: 6.5 }, [
        el('Fill', { color: C.LIMB }),
      ]),
    ]),
    el('PartText', { name: 'steps_value', x: 28, y: 0, width: 70, height: 36 }, [
      el('Text', { align: 'START' }, [
        el('Font', font(SIZE.CHIP, 'BOLD', C.CREAM), [
          el('Template', {}, [
            cdata('%d'),
            el('Parameter', { expression: '[STEP_COUNT]' }),
          ]),
        ]),
      ]),
    ]),
  ])
