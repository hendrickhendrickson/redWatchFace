/**
 * The time. Drawn twice, because WFF cannot animate a font weight.
 *
 * BOTH COPIES ARE THE SAME STRING AT THE SAME ORIGIN, differing only in weight
 * and colour. That congruence is load-bearing, not incidental: the two are
 * simultaneously visible for part of the wake transition, and it is only
 * because the LIGHT stems sit inside the BOLD ones that the overlap reads as a
 * weight morph instead of as doubled text. See crossfade.ts.
 */

import { el, type Node } from '../xml.ts'
import { C } from '../palette.ts'
import { FADE_IN, FADE_OUT } from '../crossfade.ts'
import * as G from '../geometry.ts'

const TIME = {
  format: 'hh:mm', hourFormat: 'SYNC_TO_DEVICE', align: 'CENTER',
  x: 0, y: 68, width: 450, height: 120,
} as const

const FONT = { family: 'SYNC_TO_DEVICE', size: 100, slant: 'NORMAL' } as const

export const clock = (): Node =>
  el('DigitalClock', { ...G.CANVAS }, [
    el('TimeText', { ...TIME, alpha: 255 }, [
      el('Variant', FADE_OUT),
      el('Font', { ...FONT, weight: 'BOLD', color: C.CREAM }),
    ]),
    el('TimeText', { ...TIME, alpha: 0 }, [
      el('Variant', FADE_IN),
      el('Font', { ...FONT, weight: 'LIGHT', color: C.WHITE }),
    ]),
  ])
