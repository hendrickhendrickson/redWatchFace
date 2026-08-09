/**
 * The heart-rate chip: a heart, and a number.
 *
 * THE HEART IS TWO LOBES AND A ROTATED SQUARE, not a path. WFF has no path
 * primitive, so the point is a 45-degree square whose upper corners are hidden
 * behind the two lobe circles.
 *
 * A ZERO READING IS NOT A HEART RATE. The sensor reports 0 when it has no
 * contact, so a bare number would show "0 bpm" on a wrist that simply is not
 * being read. HEART_RATE_VALID gates that into a dimmed placeholder.
 */

import { el, cdata, type Node } from '../xml.ts'
import { C } from '../palette.ts'
import * as G from '../geometry.ts'
import { AMBIENT_HIDE } from '../crossfade.ts'
import { whenElse } from '../condition.ts'
import { HEART_RATE_VALID } from '../states.ts'
import { SIZE, font } from '../type.ts'

export const chipHeartRate = (): Node =>
  el('Group', { name: 'chip_heart_rate', ...G.ANCHORS.CHIP_HEART_RATE, alpha: 255 }, [
    el('Variant', AMBIENT_HIDE),
    el('PartDraw', { name: 'hr_icon_lobes', x: 0, y: 8, width: 22, height: 13 }, [
      el('Ellipse', { x: 0, y: 0, width: 13, height: 13 }, [
        el('Fill', { color: C.CORAL }),
      ]),
      el('Ellipse', { x: 9, y: 0, width: 13, height: 13 }, [
        el('Fill', { color: C.CORAL }),
      ]),
    ]),
    el('PartDraw', { name: 'hr_icon_point', x: 2, y: 10, width: 18, height: 18, pivotX: 0.5, pivotY: 0.5, angle: 45 }, [
      el('Rectangle', { x: 2.5, y: 2.5, width: 13, height: 13 }, [
        el('Fill', { color: C.CORAL }),
      ]),
    ]),
    whenElse(
      'hr_valid',
      HEART_RATE_VALID,
      [
        el('PartText', { name: 'hr_value', x: 28, y: 0, width: 42, height: 36 }, [
          el('Text', { align: 'START' }, [
            el('Font', font(SIZE.CHIP, 'BOLD', C.CREAM), [
              el('Template', {}, [
                cdata('%.0f'),
                el('Parameter', { expression: '[HEART_RATE]' }),
              ]),
            ]),
          ]),
        ]),
      ],
      [
        el('PartText', { name: 'hr_placeholder', x: 28, y: 0, width: 42, height: 36 }, [
          el('Text', { align: 'START' }, [
            el('Font', font(SIZE.CHIP, 'BOLD', C.HR_PLACEHOLDER), [
              cdata('--'),
            ]),
          ]),
        ]),
      ],
    ),
  ])
