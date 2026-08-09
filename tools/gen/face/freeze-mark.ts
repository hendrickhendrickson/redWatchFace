/**
 * The snowflake, in the sky between the blobs when it is freezing.
 *
 * SIX-FOLD SYMMETRIC and currently written out as fifteen separate Lines. It
 * decomposes - three axes through the centre plus twelve barbs - and Step 5 of the
 * refactor derives it in data/weather.ts. It is left literal here so that this
 * commit changes no bytes.
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

export const freezeMark = (): Node =>
  when('prop_freezing', FREEZING, [
    el('Group', { name: 'freeze_mark', ...G.ANCHORS.SKY_MARK, alpha: 255 }, [
      el('Variant', AMBIENT_HIDE),
      el('PartDraw', { name: 'snowflake', x: 0, y: 0, width: 36, height: 36 }, [
        el('Line', { startX: 18, startY: 3, endX: 18, endY: 33 }, [
          el('Stroke', { color: C.SNOWFLAKE, thickness: 2.6, cap: 'ROUND' }),
        ]),
        el('Line', { startX: 5.01, startY: 10.5, endX: 30.99, endY: 25.5 }, [
          el('Stroke', { color: C.SNOWFLAKE, thickness: 2.6, cap: 'ROUND' }),
        ]),
        el('Line', { startX: 5.01, startY: 25.5, endX: 30.99, endY: 10.5 }, [
          el('Stroke', { color: C.SNOWFLAKE, thickness: 2.6, cap: 'ROUND' }),
        ]),
        el('Line', { startX: 18, startY: 9, endX: 14.17, endY: 5.79 }, [
          el('Stroke', { color: C.SNOWFLAKE, thickness: 2, cap: 'ROUND' }),
        ]),
        el('Line', { startX: 18, startY: 9, endX: 21.83, endY: 5.79 }, [
          el('Stroke', { color: C.SNOWFLAKE, thickness: 2, cap: 'ROUND' }),
        ]),
        el('Line', { startX: 18, startY: 27, endX: 14.17, endY: 30.21 }, [
          el('Stroke', { color: C.SNOWFLAKE, thickness: 2, cap: 'ROUND' }),
        ]),
        el('Line', { startX: 18, startY: 27, endX: 21.83, endY: 30.21 }, [
          el('Stroke', { color: C.SNOWFLAKE, thickness: 2, cap: 'ROUND' }),
        ]),
        el('Line', { startX: 25.79, startY: 13.5, endX: 26.66, endY: 8.58 }, [
          el('Stroke', { color: C.SNOWFLAKE, thickness: 2, cap: 'ROUND' }),
        ]),
        el('Line', { startX: 25.79, startY: 13.5, endX: 30.49, endY: 15.21 }, [
          el('Stroke', { color: C.SNOWFLAKE, thickness: 2, cap: 'ROUND' }),
        ]),
        el('Line', { startX: 25.79, startY: 22.5, endX: 30.49, endY: 20.79 }, [
          el('Stroke', { color: C.SNOWFLAKE, thickness: 2, cap: 'ROUND' }),
        ]),
        el('Line', { startX: 25.79, startY: 22.5, endX: 26.66, endY: 27.42 }, [
          el('Stroke', { color: C.SNOWFLAKE, thickness: 2, cap: 'ROUND' }),
        ]),
        el('Line', { startX: 10.21, startY: 13.5, endX: 9.34, endY: 8.58 }, [
          el('Stroke', { color: C.SNOWFLAKE, thickness: 2, cap: 'ROUND' }),
        ]),
        el('Line', { startX: 10.21, startY: 13.5, endX: 5.51, endY: 15.21 }, [
          el('Stroke', { color: C.SNOWFLAKE, thickness: 2, cap: 'ROUND' }),
        ]),
        el('Line', { startX: 10.21, startY: 22.5, endX: 5.51, endY: 20.79 }, [
          el('Stroke', { color: C.SNOWFLAKE, thickness: 2, cap: 'ROUND' }),
        ]),
        el('Line', { startX: 10.21, startY: 22.5, endX: 9.34, endY: 27.42 }, [
          el('Stroke', { color: C.SNOWFLAKE, thickness: 2, cap: 'ROUND' }),
        ]),
      ]),
    ]),
  ])
