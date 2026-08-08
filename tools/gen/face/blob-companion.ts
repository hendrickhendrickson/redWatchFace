/**
 * The companion blob: the small one, wearing TOMORROW's colour.
 *
 * It is not the hero scaled down. Its gyro gain is lower on purpose so the pair
 * read as sitting at different depths, its arms drop differently at night, and
 * its scarf tail overshoots its box. Those differences are measured, not
 * incidental - see blob.ts for why there is no single parameterised builder.
 */

import { el, text, cdata, type Node } from '../xml.ts'
import { C } from '../palette.ts'
import * as G from '../geometry.ts'
import { byWeekday } from '../weekday.ts'
import { COMPANION_GEOMETRY, bodyPart, roundMouth, openMouth, mouthMask, partName, companionGyro } from '../blob.ts'
export const blobCompanion = (): Node =>
  el('Group', { name: 'blob_companion', x: 143, y: 322, width: 62, height: 72, alpha: 255 }, [
    companionGyro(),
    el('Variant', { mode: 'AMBIENT', target: 'alpha', value: 0 }),
    el('PartDraw', { name: 'mini_leaf_left', x: 6, y: 0, width: 48, height: 48, pivotX: 0.5, pivotY: 0.5, angle: -26 }, [
      el('Ellipse', { x: 19, y: 6, width: 11, height: 18 }, [
        el('Fill', { color: C.LEAF_DARK }),
      ]),
    ]),
    el('PartDraw', { name: 'mini_leaf_right', x: 6, y: 0, width: 48, height: 48, pivotX: 0.5, pivotY: 0.5, angle: 20 }, [
      el('Ellipse', { x: 18, y: 4, width: 12, height: 20 }, [
        el('Fill', { color: C.GREEN }),
      ]),
    ]),
    el('PartDraw', { ...G.MINI_LIMB_BOX, name: 'mini_limbs' }, [
      el('Line', { startX: 12, startY: 44, endX: 5, endY: 38 }, [
        el('Stroke', { color: C.LIMB, thickness: 6.2, cap: 'ROUND' }),
      ]),
      el('Ellipse', { x: -2, y: 32, width: 13, height: 12 }, [
        el('Fill', { color: C.LIMB }),
      ]),
      el('Line', { startX: 48, startY: 44, endX: 56, endY: 37 }, [
        el('Stroke', { color: C.LIMB, thickness: 6.2, cap: 'ROUND' }),
      ]),
      el('Ellipse', { x: 50, y: 30, width: 13, height: 12 }, [
        el('Fill', { color: C.LIMB }),
      ]),
      el('Line', { startX: 24, startY: 60, endX: 22, endY: 66 }, [
        el('Stroke', { color: C.LIMB, thickness: 6.2, cap: 'ROUND' }),
      ]),
      el('Ellipse', { x: 12, y: 61, width: 19, height: 12 }, [
        el('Fill', { color: C.LIMB }),
      ]),
      el('Line', { startX: 38, startY: 60, endX: 40, endY: 66 }, [
        el('Stroke', { color: C.LIMB, thickness: 6.2, cap: 'ROUND' }),
      ]),
      el('Ellipse', { x: 31, y: 61, width: 19, height: 12 }, [
        el('Fill', { color: C.LIMB }),
      ]),
      el('Line', { startX: 12, startY: 44, endX: 5, endY: 38 }, [
        el('Stroke', { color: C.INK, thickness: 3.2, cap: 'ROUND' }),
      ]),
      el('Ellipse', { x: 0, y: 34, width: 9, height: 8 }, [
        el('Fill', { color: C.INK }),
      ]),
      el('Line', { startX: 48, startY: 44, endX: 56, endY: 37 }, [
        el('Stroke', { color: C.INK, thickness: 3.2, cap: 'ROUND' }),
      ]),
      el('Ellipse', { x: 52, y: 32, width: 9, height: 8 }, [
        el('Fill', { color: C.INK }),
      ]),
      el('Line', { startX: 24, startY: 60, endX: 22, endY: 66 }, [
        el('Stroke', { color: C.INK, thickness: 3.2, cap: 'ROUND' }),
      ]),
      el('Ellipse', { x: 14, y: 63, width: 15, height: 8 }, [
        el('Fill', { color: C.INK }),
      ]),
      el('Line', { startX: 38, startY: 60, endX: 40, endY: 66 }, [
        el('Stroke', { color: C.INK, thickness: 3.2, cap: 'ROUND' }),
      ]),
      el('Ellipse', { x: 33, y: 63, width: 15, height: 8 }, [
        el('Fill', { color: C.INK }),
      ]),
    ]),
    el('Condition', {}, [
      el('Expressions', {}, [
        el('Expression', { name: 'mini_zapped' }, [
          text('[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.CHANCE_OF_PRECIPITATION] &gt;= 90'),
        ]),
      ]),
      el('Compare', { expression: 'mini_zapped' }, [
        el('PartDraw', { ...G.MINI_BOX, name: 'mini_skeleton' }, [
          el('RoundRectangle', { ...G.MINI_BODY_SHAPE, cornerRadiusX: 22, cornerRadiusY: 20 }, [
            el('Fill', { color: C.SKELETON_DARK }),
          ]),
          el('Ellipse', { x: 12, y: 4, width: 20, height: 19 }, [
            el('Fill', { color: C.SKELETON_LIGHT }),
          ]),
          el('Ellipse', { x: 15, y: 10, width: 6, height: 7 }, [
            el('Fill', { color: C.SKELETON_DARK }),
          ]),
          el('Ellipse', { x: 23, y: 10, width: 6, height: 7 }, [
            el('Fill', { color: C.SKELETON_DARK }),
          ]),
          el('Ellipse', { x: 20.5, y: 17, width: 3, height: 3 }, [
            el('Fill', { color: C.SKELETON_DARK }),
          ]),
          el('Rectangle', { x: 17, y: 20, width: 10, height: 1.6 }, [
            el('Fill', { color: C.SKELETON_DARK }),
          ]),
          el('Line', { startX: 22, startY: 25, endX: 22, endY: 38 }, [
            el('Stroke', { color: C.SKELETON_LIGHT, thickness: 2.2, cap: 'ROUND' }),
          ]),
          el('Line', { startX: 15, startY: 28, endX: 29, endY: 28 }, [
            el('Stroke', { color: C.SKELETON_LIGHT, thickness: 2, cap: 'ROUND' }),
          ]),
          el('Line', { startX: 16, startY: 32, endX: 28, endY: 32 }, [
            el('Stroke', { color: C.SKELETON_LIGHT, thickness: 2, cap: 'ROUND' }),
          ]),
          el('Line', { startX: 18, startY: 36, endX: 26, endY: 36 }, [
            el('Stroke', { color: C.SKELETON_LIGHT, thickness: 2, cap: 'ROUND' }),
          ]),
        ]),
      ]),
      el('Default', {}, [
        el('Group', { ...G.MINI_LIMB_BOX, name: 'mini_alive', alpha: 255 }, [
          byWeekday('mini', 'companion', (day, body) => [
        bodyPart(COMPANION_GEOMETRY, partName('mini', 'body', day), body),
      ]),
          el('Condition', {}, [
            el('Expressions', {}, [
              el('Expression', { name: 'mini_mouth_night' }, [
                text('[HOUR_0_23] &gt;= 23 || 7 &gt; [HOUR_0_23]'),
              ]),
            ]),
            el('Compare', { expression: 'mini_mouth_night' }, [
              byWeekday('minirmouth', 'companion', (day, body) => [
            roundMouth(COMPANION_GEOMETRY, partName('mini', 'mouth_sleep', day), body),
          ]),
            ]),
            el('Default', {}, [
              byWeekday('miniomouth', 'companion', (day, body) => [
            openMouth(COMPANION_GEOMETRY, partName('mini', 'mouth_open', day), body),
          ]),
              byWeekday('minimask', 'companion', (day, body) => [
            mouthMask(COMPANION_GEOMETRY, partName('mini', 'mouth_mask', day), body),
          ]),
            ]),
          ]),
          el('Condition', {}, [
            el('Expressions', {}, [
              el('Expression', { name: 'mini_night' }, [
                text('[HOUR_0_23] &gt;= 23 || 7 &gt; [HOUR_0_23]'),
              ]),
            ]),
            el('Compare', { expression: 'mini_night' }, [
              el('PartDraw', { name: 'mini_eyes_closed', x: 16, y: 32, width: 28, height: 12 }, [
                el('Line', { startX: 2, startY: 6, endX: 11, endY: 6 }, [
                  el('Stroke', { color: C.INK, thickness: 2.5, cap: 'ROUND' }),
                ]),
                el('Line', { startX: 17, startY: 6, endX: 26, endY: 6 }, [
                  el('Stroke', { color: C.INK, thickness: 2.5, cap: 'ROUND' }),
                ]),
              ]),
            ]),
            el('Default', {}, [
              el('PartDraw', { ...G.MINI_BOX, name: 'mini_eyes_open' }, [
                el('Ellipse', { x: 12, y: 14, width: 5, height: 6 }, [
                  el('Fill', { color: C.INK }),
                ]),
                el('Ellipse', { x: 27, y: 14, width: 5, height: 6 }, [
                  el('Fill', { color: C.INK }),
                ]),
              ]),
            ]),
          ]),
          el('Condition', {}, [
            el('Expressions', {}, [
              el('Expression', { name: 'mini_uv' }, [
                text('[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.UV_INDEX] &gt;= 6 &amp;&amp; [WEATHER.IS_DAY]'),
              ]),
            ]),
            el('Compare', { expression: 'mini_uv' }, [
              el('PartDraw', { name: 'mini_shades', x: 16, y: 31, width: 28, height: 12 }, [
                el('RoundRectangle', { x: 2, y: 2, width: 10, height: 8, cornerRadiusX: 4, cornerRadiusY: 4 }, [
                  el('Fill', { color: C.SHADES }),
                ]),
                el('RoundRectangle', { x: 15, y: 2, width: 10, height: 8, cornerRadiusX: 4, cornerRadiusY: 4 }, [
                  el('Fill', { color: C.SHADES }),
                ]),
                el('Rectangle', { x: 12, y: 5, width: 3, height: 2 }, [
                  el('Fill', { color: C.SHADES }),
                ]),
              ]),
            ]),
          ]),
          el('Condition', {}, [
            el('Expressions', {}, [
              el('Expression', { name: 'mini_cold' }, [
                text('[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.TEMPERATURE] &lt;= 10'),
              ]),
            ]),
            el('Compare', { expression: 'mini_cold' }, [
              el('PartDraw', { name: 'mini_scarf', x: 8, y: 20, width: 44, height: 40 }, [
                el('RoundRectangle', { x: 2, y: 33, width: 40, height: 9, cornerRadiusX: 4.5, cornerRadiusY: 4.5 }, [
                  el('Fill', { color: C.SCARF }),
                ]),
                el('RoundRectangle', { x: 30, y: 39, width: 7, height: 12, cornerRadiusX: 3.5, cornerRadiusY: 3.5 }, [
                  el('Fill', { color: C.SCARF }),
                ]),
              ]),
            ]),
          ]),
          el('Condition', {}, [
            el('Expressions', {}, [
              el('Expression', { name: 'mini_cold_hands' }, [
                text('[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.TEMPERATURE] &lt;= 5'),
              ]),
            ]),
            el('Compare', { expression: 'mini_cold_hands' }, [
              el('PartDraw', { ...G.MINI_LIMB_BOX, name: 'mini_gloves' }, [
                el('Ellipse', { x: -2, y: 32, width: 13, height: 12 }, [
                  el('Fill', { color: C.SCARF }),
                ]),
                el('Ellipse', { x: 50, y: 30, width: 13, height: 12 }, [
                  el('Fill', { color: C.SCARF }),
                ]),
              ]),
            ]),
          ]),
          el('Condition', {}, [
            el('Expressions', {}, [
              el('Expression', { name: 'mini_puffed' }, [
                text('[HEART_RATE] &gt;= 100'),
              ]),
            ]),
            el('Compare', { expression: 'mini_puffed' }, [
              el('Condition', {}, [
                el('Expressions', {}, [
                  el('Expression', { name: 'mini_sweat_all' }, [
                    text('[HEART_RATE] &gt;= 150'),
                  ]),
                  el('Expression', { name: 'mini_sweat_two' }, [
                    text('[HEART_RATE] &gt;= 120'),
                  ]),
                ]),
                el('Compare', { expression: 'mini_sweat_all' }, [
                  el('PartDraw', { ...G.MINI_SWEAT_BOX, name: 'mini_sweat_three' }, [
                    el('Ellipse', { x: 0, y: 2, width: 4, height: 5 }, [
                      el('Fill', { color: C.SWEAT }),
                    ]),
                    el('Ellipse', { x: 6, y: 0, width: 4, height: 5 }, [
                      el('Fill', { color: C.SWEAT }),
                    ]),
                    el('Ellipse', { x: 12, y: 2, width: 4, height: 4 }, [
                      el('Fill', { color: C.SWEAT }),
                    ]),
                  ]),
                ]),
                el('Compare', { expression: 'mini_sweat_two' }, [
                  el('PartDraw', { ...G.MINI_SWEAT_BOX, name: 'mini_sweat_pair' }, [
                    el('Ellipse', { x: 0, y: 2, width: 4, height: 5 }, [
                      el('Fill', { color: C.SWEAT }),
                    ]),
                    el('Ellipse', { x: 12, y: 2, width: 4, height: 4 }, [
                      el('Fill', { color: C.SWEAT }),
                    ]),
                  ]),
                ]),
                el('Default', {}, [
                  el('PartDraw', { ...G.MINI_SWEAT_BOX, name: 'mini_sweat_one' }, [
                    el('Ellipse', { x: 6, y: 0, width: 4, height: 5 }, [
                      el('Fill', { color: C.SWEAT }),
                    ]),
                  ]),
                ]),
              ]),
              el('Group', { ...G.MINI_LIMB_BOX, name: 'mini_drip_a', alpha: 255 }, [
                el('Transform', { target: 'y', value: '(4 + 6 * clamp(([HEART_RATE] - 100) / 100, 0, 1)) * ((([SECOND] % 2) + [SECOND_MILLISECOND] - [SECOND]) / 2)' }),
                el('Transform', { target: 'alpha', value: '255 * (clamp(4 * ((([SECOND] % 2) + [SECOND_MILLISECOND] - [SECOND]) / 2), 0, 1) - clamp(4 * ((([SECOND] % 2) + [SECOND_MILLISECOND] - [SECOND]) / 2) - 3, 0, 1))' }),
                el('PartDraw', { ...G.MINI_LIMB_BOX, name: 'mini_drip_beads_a' }, [
                  el('Ellipse', { x: 12, y: 37, width: 3.5, height: 4.5 }, [
                    el('Fill', { color: C.SWEAT }),
                  ]),
                  el('Ellipse', { x: 44.5, y: 37, width: 3.5, height: 4.5 }, [
                    el('Fill', { color: C.SWEAT }),
                  ]),
                ]),
              ]),
              el('Group', { ...G.MINI_LIMB_BOX, name: 'mini_drip_b', alpha: 255 }, [
                el('Transform', { target: 'y', value: '(4 + 6 * clamp(([HEART_RATE] - 100) / 100, 0, 1)) * (((([SECOND] + 1) % 2) + [SECOND_MILLISECOND] - [SECOND]) / 2)' }),
                el('Transform', { target: 'alpha', value: '255 * (clamp(4 * (((([SECOND] + 1) % 2) + [SECOND_MILLISECOND] - [SECOND]) / 2), 0, 1) - clamp(4 * (((([SECOND] + 1) % 2) + [SECOND_MILLISECOND] - [SECOND]) / 2) - 3, 0, 1)) * clamp(([HEART_RATE] - 140) / 20, 0, 1)' }),
                el('PartDraw', { ...G.MINI_LIMB_BOX, name: 'mini_drip_beads_b' }, [
                  el('Ellipse', { x: 12, y: 37, width: 3.5, height: 4.5 }, [
                    el('Fill', { color: C.SWEAT }),
                  ]),
                  el('Ellipse', { x: 44.5, y: 37, width: 3.5, height: 4.5 }, [
                    el('Fill', { color: C.SWEAT }),
                  ]),
                ]),
              ]),
            ]),
          ]),
          // The companion's headset is SCRAPPED FOR NOW, 2026-08-08, after the
          // first shoot made both blobs' headsets hard to judge at once. The
          // hero's is being revised alone; once that shape is settled, this
          // is where its cut-down companion version comes back - cups and a
          // band, same as before, still without the boom mic (the 44x42 body
          // has far less clearance than the hero's 72x80, and at this scale a
          // diagonal boom line read as noise rather than a mic). See the note
          // on the headset Condition in blob-hero.ts.
        ]),
      ]),
    ]),
  ])
