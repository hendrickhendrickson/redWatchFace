/**
 * The flash behind the companion when the bolt strikes.
 *
 * Twelve spokes from one centre at 30 degree steps, with IRREGULAR radii - they run
 * 35.9 to 50 rather than sitting on a circle, which is what stops it reading as a
 * gear. The radii stay measured in data/weather.ts for exactly that reason; what
 * changed is that they are twelve radii now rather than twenty-four endpoint
 * coordinates with the angles implicit in them, so the irregularity is visible.
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
import { BURST, BURST_HUB, BURST_SPOKES } from '../data/weather.ts'

export const companionBurst = (): Node =>
  when('zap_burst', STORM, [
    el('Group', { name: 'companion_burst', ...G.ANCHORS.COMPANION_BURST, alpha: 255 }, [
      companionGyro(),
      el('Variant', AMBIENT_HIDE),
      el('PartDraw', { name: 'burst', ...G.at(2 * BURST.centre, 2 * BURST.centre) }, [
        el('Ellipse', { ...BURST_HUB }, [el('Fill', { color: C.BURST })]),
        ...BURST_SPOKES.map((s) =>
          el('Line', { ...s }, [
            el('Stroke', { color: C.BURST, thickness: BURST.thickness, cap: 'SQUARE' }),
          ]),
        ),
      ]),
    ]),
  ])
