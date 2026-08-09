/**
 * The flash behind the companion when the bolt strikes.
 *
 * Twelve rays from one centre at 30 degree steps, with IRREGULAR radii - they run
 * roughly 36 to 50 rather than sitting on a circle, which is what stops it reading
 * as a gear. So the endpoints stay tabulated in data/weather.ts rather than being
 * computed from an angle; see the note there.
 *
 * A top-level sibling of the companion, repeating its Gyro gain. See blob.ts.
 */

import { el, type Node } from '../xml.ts'
import { C } from '../palette.ts'
import * as G from '../geometry.ts'
import { AMBIENT_HIDE } from '../crossfade.ts'
import { when } from '../condition.ts'
import { STORM } from '../states.ts'
import { companionGyro } from '../blob.ts'

export const companionBurst = (): Node =>
  when('zap_burst', STORM, [
    el('Group', { name: 'companion_burst', ...G.ANCHORS.COMPANION_BURST, alpha: 255 }, [
      companionGyro(),
      el('Variant', AMBIENT_HIDE),
      el('PartDraw', { name: 'burst', x: 0, y: 0, width: 104, height: 104 }, [
        el('Ellipse', { x: 37, y: 37, width: 30, height: 30 }, [
          el('Fill', { color: C.BURST }),
        ]),
        el('Line', { startX: 52, startY: 52, endX: 52, endY: 2 }, [
          el('Stroke', { color: C.BURST, thickness: 9, cap: 'SQUARE' }),
        ]),
        el('Line', { startX: 52, startY: 52, endX: 70, endY: 21 }, [
          el('Stroke', { color: C.BURST, thickness: 9, cap: 'SQUARE' }),
        ]),
        el('Line', { startX: 52, startY: 52, endX: 88, endY: 31 }, [
          el('Stroke', { color: C.BURST, thickness: 9, cap: 'SQUARE' }),
        ]),
        el('Line', { startX: 52, startY: 52, endX: 88, endY: 52 }, [
          el('Stroke', { color: C.BURST, thickness: 9, cap: 'SQUARE' }),
        ]),
        el('Line', { startX: 52, startY: 52, endX: 95, endY: 77 }, [
          el('Stroke', { color: C.BURST, thickness: 9, cap: 'SQUARE' }),
        ]),
        el('Line', { startX: 52, startY: 52, endX: 70, endY: 83 }, [
          el('Stroke', { color: C.BURST, thickness: 9, cap: 'SQUARE' }),
        ]),
        el('Line', { startX: 52, startY: 52, endX: 52, endY: 102 }, [
          el('Stroke', { color: C.BURST, thickness: 9, cap: 'SQUARE' }),
        ]),
        el('Line', { startX: 52, startY: 52, endX: 34, endY: 83 }, [
          el('Stroke', { color: C.BURST, thickness: 9, cap: 'SQUARE' }),
        ]),
        el('Line', { startX: 52, startY: 52, endX: 9, endY: 77 }, [
          el('Stroke', { color: C.BURST, thickness: 9, cap: 'SQUARE' }),
        ]),
        el('Line', { startX: 52, startY: 52, endX: 16, endY: 52 }, [
          el('Stroke', { color: C.BURST, thickness: 9, cap: 'SQUARE' }),
        ]),
        el('Line', { startX: 52, startY: 52, endX: 9, endY: 27 }, [
          el('Stroke', { color: C.BURST, thickness: 9, cap: 'SQUARE' }),
        ]),
        el('Line', { startX: 52, startY: 52, endX: 34, endY: 21 }, [
          el('Stroke', { color: C.BURST, thickness: 9, cap: 'SQUARE' }),
        ]),
      ]),
    ]),
  ])
