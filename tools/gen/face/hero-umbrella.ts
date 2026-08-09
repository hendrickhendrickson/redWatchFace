/**
 * The umbrella the hero holds up in the rain.
 *
 * A TOP-LEVEL SIBLING of the hero, repeating its Gyro gain BY HAND AND NOT
 * OPTIONALLY: without it the hero's fist slid off the shaft by up to 16px across a
 * full tilt sweep, which is the observation that produced the note in blob.ts.
 *
 * The shaft's hook is an Arc rather than two lines, so the curve stays a curve at
 * any scale.
 */

import { el, type Node } from '../xml.ts'
import { C } from '../palette.ts'
import * as G from '../geometry.ts'
import { AMBIENT_HIDE } from '../crossfade.ts'
import { when } from '../condition.ts'
import { RAIN_LIKELY } from '../states.ts'
import { heroGyro } from '../blob.ts'

export const heroUmbrella = (): Node =>
  when('prop_wet', RAIN_LIKELY, [
    el('Group', { name: 'hero_umbrella', ...G.ANCHORS.HERO_UMBRELLA, alpha: 255 }, [
      heroGyro(),
      el('Variant', AMBIENT_HIDE),
      el('PartDraw', { name: 'umbrella_shaft', x: 0, y: 0, width: 164, height: 70 }, [
        el('Line', { startX: 80, startY: 18, endX: 80, endY: 38 }, [
          el('Stroke', { color: C.BONE, thickness: 3, cap: 'ROUND' }),
        ]),
        el('Line', { startX: 80, startY: 56, endX: 80, endY: 60 }, [
          el('Stroke', { color: C.BONE, thickness: 3, cap: 'ROUND' }),
        ]),
        el('Arc', { centerX: 74, centerY: 60, width: 12, height: 12, startAngle: 90, endAngle: 270 }, [
          el('Stroke', { color: C.BONE, thickness: 3, cap: 'ROUND' }),
        ]),
      ]),
      el('PartDraw', { name: 'umbrella_canopy', x: 0, y: 0, width: 164, height: 30 }, [
        el('RoundRectangle', { x: 0, y: 12, width: 160, height: 10, cornerRadiusX: 4, cornerRadiusY: 4 }, [
          el('Fill', { color: C.TEAL }),
        ]),
        el('Ellipse', { x: 0, y: 9, width: 45, height: 13 }, [
          el('Fill', { color: C.TEAL }),
        ]),
        el('Ellipse', { x: 38, y: 1, width: 45, height: 21 }, [
          el('Fill', { color: C.TEAL }),
        ]),
        el('Ellipse', { x: 77, y: 1, width: 45, height: 21 }, [
          el('Fill', { color: C.TEAL }),
        ]),
        el('Ellipse', { x: 115, y: 9, width: 45, height: 13 }, [
          el('Fill', { color: C.TEAL }),
        ]),
        el('Line', { startX: 39, startY: 13, endX: 39, endY: 21 }, [
          el('Stroke', { color: C.TEAL_DARK, thickness: 1.8, cap: 'BUTT' }),
        ]),
        el('Line', { startX: 80, startY: 13, endX: 80, endY: 21 }, [
          el('Stroke', { color: C.TEAL_DARK, thickness: 1.8, cap: 'BUTT' }),
        ]),
        el('Line', { startX: 120, startY: 13, endX: 120, endY: 21 }, [
          el('Stroke', { color: C.TEAL_DARK, thickness: 1.8, cap: 'BUTT' }),
        ]),
      ]),
    ]),
  ])
