/**
 * The sleep z's, drifting up from each blob at night.
 *
 * TWO NEAR-IDENTICAL TRIOS, one per blob, differing in scale, position, drift
 * distance and phase - the companion is a second out of step so the two sets do not
 * pulse together, and its z's grow right-to-left where the hero's grow
 * left-to-right. data/zzz.ts holds both as rows and asserts the differences that
 * matter: the phases stay apart, the sizes climb, and no glyph outgrows its box.
 *
 * THE ALPHA CURVE IS driftAlpha, NOT triangleAlpha. It peaks at the midpoint of the
 * drift and is zero at both ends, where triangleAlpha holds at full for the middle
 * half. A z is most legible halfway up its arc and should be fading before it
 * arrives, so nothing piles up at the top; a rain drop wants the opposite. Both
 * curves are tabulated in expr.ts.
 *
 * Each trio repeats its own blob's Gyro gain, since both are top-level siblings.
 */

import { el, cdata, type Node } from '../xml.ts'
import * as G from '../geometry.ts'
import { AMBIENT_HIDE } from '../crossfade.ts'
import { when } from '../condition.ts'
import { NIGHT } from '../states.ts'
import { drift, driftAlpha, group, secondPhase } from '../expr.ts'
import { font } from '../type.ts'
import { heroGyro, companionGyro } from '../blob.ts'
import { ZZZ_SETS, type Zed, type ZzzSet } from '../data/zzz.ts'

const GYRO = { hero: heroGyro, companion: companionGyro }

const zed = (part: string, z: Zed): Node =>
  el('PartText', { name: `${part}_${z.tier}`, ...z.box }, [
    el('Text', { align: 'START' }, [
      el('Font', font(z.size, 'BOLD', z.colour, 'ITALIC'), [cdata('z')]),
    ]),
  ])

/**
 * One trio: the anchored group, its Gyro, and the drifting group inside it.
 *
 * THE DRIFT AND THE FADE SHARE ONE PHASE EXPRESSION. They were two hand-written
 * strings per trio that had to agree about the period and the offset, and disagreeing
 * would have faded a z out somewhere other than the top of its arc.
 */
const trio = (s: ZzzSet): Node => {
  const p = group(secondPhase(s.period, s.offset))
  return el('Group', { name: s.group, ...s.anchor, alpha: 255 }, [
    GYRO[s.gyro](),
    el('Variant', AMBIENT_HIDE),
    el('Group', { name: `${s.group}_drift`, ...G.at(s.anchor.width, s.anchor.height), alpha: 255 }, [
      el('Transform', { target: 'y', value: drift(s.rise, p) }),
      el('Transform', { target: 'alpha', value: driftAlpha(p) }),
      ...s.zeds.map((z) => zed(s.part, z)),
    ]),
  ])
}

export const sleepZzz = (): Node => when('prop_night', NIGHT, ZZZ_SETS.map(trio))
