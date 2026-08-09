/**
 * The sleep z's, drifting up from each blob at night.
 *
 * TWO NEAR-IDENTICAL TRIOS, one per blob, differing in scale, position, drift
 * distance and phase - the companion is a second out of step so the two sets do
 * not pulse together. Step 6 of the refactor tabulates them in data/zzz.ts; they
 * are written out here so this commit changes no bytes.
 *
 * THE ALPHA CURVE IS driftAlpha, NOT triangleAlpha. It peaks at the midpoint of
 * the drift and is zero at both ends, where triangleAlpha holds at full for the
 * middle half. A z is most legible halfway up its arc and should be fading before
 * it arrives, so nothing piles up at the top; a rain drop wants the opposite. Both
 * curves are tabulated in expr.ts.
 *
 * Each trio repeats its own blob's Gyro gain, since both are top-level siblings.
 */

import { el, cdata, type Node } from '../xml.ts'
import { C } from '../palette.ts'
import * as G from '../geometry.ts'
import { AMBIENT_HIDE } from '../crossfade.ts'
import { when } from '../condition.ts'
import { NIGHT } from '../states.ts'
import { drift, driftAlpha, group, secondPhase } from '../expr.ts'
import { FONT_FAMILY } from '../type.ts'
import { heroGyro, companionGyro } from '../blob.ts'

/** The hero's drift phase, and the companion's, a second behind it. */
const HERO_PHASE = group(secondPhase(3))
const MINI_PHASE = group(secondPhase(3, 1))

export const sleepZzz = (): Node =>
  when('prop_night', NIGHT, [
    el('Group', { name: 'sleep_zzz', ...G.ANCHORS.SLEEP_ZZZ, alpha: 255 }, [
      heroGyro(),
      el('Variant', AMBIENT_HIDE),
      el('Group', { name: 'sleep_zzz_drift', x: 0, y: 0, width: 64, height: 55, alpha: 255 }, [
        el('Transform', { target: 'y', value: drift(14, HERO_PHASE) }),
        el('Transform', { target: 'alpha', value: driftAlpha(HERO_PHASE) }),
        el('PartText', { name: 'zzz_small', x: 0, y: 32, width: 16, height: 18 }, [
          el('Text', { align: 'START' }, [
            el('Font', { family: FONT_FAMILY, size: 13, weight: 'BOLD', slant: 'ITALIC', color: C.ZZZ_SMALL }, [
              cdata('z'),
            ]),
          ]),
        ]),
        el('PartText', { name: 'zzz_mid', x: 17, y: 18, width: 20, height: 22 }, [
          el('Text', { align: 'START' }, [
            el('Font', { family: FONT_FAMILY, size: 18, weight: 'BOLD', slant: 'ITALIC', color: C.ZZZ_MID }, [
              cdata('z'),
            ]),
          ]),
        ]),
        el('PartText', { name: 'zzz_big', x: 35, y: 2, width: 26, height: 28 }, [
          el('Text', { align: 'START' }, [
            el('Font', { family: FONT_FAMILY, size: 24, weight: 'BOLD', slant: 'ITALIC', color: C.ICE }, [
              cdata('z'),
            ]),
          ]),
        ]),
      ]),
    ]),
    el('Group', { name: 'mini_sleep_zzz', ...G.ANCHORS.MINI_SLEEP_ZZZ, alpha: 255 }, [
      companionGyro(),
      el('Variant', AMBIENT_HIDE),
      el('Group', { name: 'mini_sleep_zzz_drift', x: 0, y: 0, width: 46, height: 44, alpha: 255 }, [
        el('Transform', { target: 'y', value: drift(9, MINI_PHASE) }),
        el('Transform', { target: 'alpha', value: driftAlpha(MINI_PHASE) }),
        el('PartText', { name: 'mini_zzz_small', x: 32, y: 28, width: 12, height: 14 }, [
          el('Text', { align: 'START' }, [
            el('Font', { family: FONT_FAMILY, size: 9, weight: 'BOLD', slant: 'ITALIC', color: C.ZZZ_SMALL }, [
              cdata('z'),
            ]),
          ]),
        ]),
        el('PartText', { name: 'mini_zzz_mid', x: 17, y: 14, width: 15, height: 17 }, [
          el('Text', { align: 'START' }, [
            el('Font', { family: FONT_FAMILY, size: 12, weight: 'BOLD', slant: 'ITALIC', color: C.ZZZ_MID }, [
              cdata('z'),
            ]),
          ]),
        ]),
        el('PartText', { name: 'mini_zzz_big', x: 0, y: 0, width: 18, height: 20 }, [
          el('Text', { align: 'START' }, [
            el('Font', { family: FONT_FAMILY, size: 15, weight: 'BOLD', slant: 'ITALIC', color: C.ICE }, [
              cdata('z'),
            ]),
          ]),
        ]),
      ]),
    ]),
  ])
