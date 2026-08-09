/**
 * The bolt that strikes beside the companion in a storm.
 *
 * A TOP-LEVEL SIBLING of the companion, not a child of it, because it is gated by
 * its own Condition - which is also why it has to repeat the companion's Gyro gain
 * by hand. See blob.ts.
 */

import { el, type Node } from '../xml.ts'
import { C } from '../palette.ts'
import * as G from '../geometry.ts'
import { AMBIENT_HIDE } from '../crossfade.ts'
import { when } from '../condition.ts'
import { STORM } from '../states.ts'
import { companionGyro } from '../blob.ts'

export const lightning = (): Node =>
  when('prop_storm', STORM, [
    el('Group', { name: 'companion_lightning', ...G.ANCHORS.COMPANION_LIGHTNING, alpha: 255 }, [
      companionGyro(),
      el('Variant', AMBIENT_HIDE),
      el('PartDraw', { name: 'bolt', x: 0, y: 0, width: 56, height: 68 }, [
        el('Line', { startX: 22, startY: 0, endX: 38, endY: 28 }, [
          el('Stroke', { color: C.BOLT, thickness: 6, cap: 'SQUARE' }),
        ]),
        el('Line', { startX: 38, startY: 28, endX: 24, endY: 32 }, [
          el('Stroke', { color: C.BOLT, thickness: 6, cap: 'SQUARE' }),
        ]),
        el('Line', { startX: 24, startY: 32, endX: 42, endY: 64 }, [
          el('Stroke', { color: C.BOLT, thickness: 6, cap: 'SQUARE' }),
        ]),
      ]),
    ]),
  ])
