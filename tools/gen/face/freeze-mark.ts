/**
 * The snowflake, in the sky between the blobs when it is freezing.
 *
 * SIX-FOLD SYMMETRIC, and that is now how it is built rather than a property of
 * fifteen hand-written Lines. data/weather.ts holds a centre, six arm angles and
 * two radii; the three axes and twelve barbs come out of them and reproduce every
 * authored coordinate to the last decimal. The symmetry used to exist nowhere but
 * in the numbers, which meant a snowflake with one arm 1px short was a legal edit.
 *
 * NO GYRO, same reasoning as the moon: it reads as sky, not as a prop.
 *
 * IT SHARES ITS BOX WITH THE MOON (ANCHORS.SKY_MARK) and states.ts proves the two
 * can never both draw.
 */

import { el, type Node } from '../xml.ts'
import { C } from '../palette.ts'
import * as G from '../geometry.ts'
import { AMBIENT_HIDE } from '../crossfade.ts'
import { when } from '../condition.ts'
import { FREEZING } from '../states.ts'
import { FLAKE, FLAKE_AXES, FLAKE_BARBS, type Seg } from '../data/weather.ts'

const spar = (s: Seg, thickness: number): Node =>
  el('Line', { ...s }, [el('Stroke', { color: C.SNOWFLAKE, thickness, cap: 'ROUND' })])

export const freezeMark = (): Node =>
  when('prop_freezing', FREEZING, [
    el('Group', { name: 'freeze_mark', ...G.ANCHORS.SKY_MARK, alpha: 255 }, [
      el('Variant', AMBIENT_HIDE),
      el('PartDraw', { name: 'snowflake', ...G.at(2 * FLAKE.centre, 2 * FLAKE.centre) }, [
        ...FLAKE_AXES.map((s) => spar(s, FLAKE.axis.thickness)),
        ...FLAKE_BARBS.map((s) => spar(s, FLAKE.barb.thickness)),
      ]),
    ]),
  ])
