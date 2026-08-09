/**
 * The moon, in the sky between the blobs at night.
 *
 * A LIT DISC WITH A BLACK DISC SLIDING ACROSS IT. The shadow's x is driven by
 * [MOON_PHASE_POSITION], so the phase on screen is the real one.
 *
 * NO GYRO, deliberately. Nothing joins to it, and holding it in the same plane as
 * the clock is what makes it read as sky rather than as another prop stuck to a
 * blob. Distant things moving least is the effect, not a gap in it - see blob.ts.
 *
 * IT SHARES ITS BOX WITH THE SNOWFLAKE (ANCHORS.SKY_MARK) and the two must never
 * both draw. states.ts proves that: MOON_VISIBLE requires the temperature to be
 * above freezing OR the forecast to be missing, which is exactly the complement of
 * freeze-mark.ts's gate.
 */

import { el, type Node } from '../xml.ts'
import { C } from '../palette.ts'
import * as G from '../geometry.ts'
import { AMBIENT_HIDE } from '../crossfade.ts'
import { when } from '../condition.ts'
import { MOON_VISIBLE } from '../states.ts'

export const moonMark = (): Node =>
  when('prop_moon', MOON_VISIBLE, [
    el('Group', { name: 'moon_mark', ...G.ANCHORS.SKY_MARK, alpha: 255 }, [
      el('Variant', AMBIENT_HIDE),
      el('PartDraw', { name: 'moon_disc', x: 0, y: 0, width: 36, height: 36 }, [
        el('Ellipse', { x: 6, y: 6, width: 24, height: 24 }, [
          el('Fill', { color: C.MOON_DISC }),
        ]),
        el('Ellipse', { x: 18, y: 6, width: 24, height: 24 }, [
          el('Transform', { target: 'x', value: '6 + clamp(1.6255 * [MOON_PHASE_POSITION], 0, 24) + clamp(24 - 1.6255 * [MOON_PHASE_POSITION], -24, 0)' }),
          el('Fill', { color: C.BLACK }),
        ]),
      ]),
    ]),
  ])
