/**
 * The hero blob: the large one, centre-left, wearing today's colour.
 *
 * Draw order matters and is document order - the leaves sit behind the body,
 * the body behind the face, the face behind anything it holds. WFF has no
 * z-index, so moving a call in this list moves the part in the stack.
 */

import { el, text, cdata, type Node } from '../xml.ts'
import { C } from '../palette.ts'
import * as G from '../geometry.ts'
import { byWeekday } from '../weekday.ts'
import { HEADSET_WINDOW } from '../meetings.ts'
import { HERO_GEOMETRY, bodyPart, roundMouth, openMouth, mouthMask, partName, heroGyro } from '../blob.ts'
export const blobHero = (): Node =>
  el('Group', { name: 'blob_hero', x: 207, y: 262, width: 106, height: 132, alpha: 255 }, [
    heroGyro(),
    el('Variant', { mode: 'AMBIENT', target: 'alpha', value: 0 }),
    el('PartDraw', { ...G.LEAF_BOX, name: 'leaf_left', pivotX: 0.5, pivotY: 0.5, angle: -36 }, [
      el('Ellipse', { x: 30, y: 4, width: 20, height: 36 }, [
        el('Fill', { color: C.LEAF_DARK }),
      ]),
    ]),
    el('PartDraw', { ...G.LEAF_BOX, name: 'leaf_right', pivotX: 0.5, pivotY: 0.5, angle: 34 }, [
      el('Ellipse', { x: 30, y: 6, width: 20, height: 34 }, [
        el('Fill', { color: C.LEAF_DARK }),
      ]),
    ]),
    el('PartDraw', { ...G.LEAF_BOX, name: 'leaf_center', pivotX: 0.5, pivotY: 0.5, angle: 0 }, [
      el('Ellipse', { x: 29, y: 0, width: 22, height: 40 }, [
        el('Fill', { color: C.GREEN }),
      ]),
      el('Line', { startX: 40, startY: 36, endX: 40, endY: 8 }, [
        el('Stroke', { color: C.LEAF_LIGHT, thickness: 1.6, cap: 'ROUND' }),
      ]),
    ]),
    el('PartDraw', { ...G.HERO_LIMB_BOX, name: 'hero_limbs' }, [
      el('Line', { startX: 38, startY: 112, endX: 34, endY: 124 }, [
        el('Stroke', { color: C.LIMB, thickness: 8, cap: 'ROUND' }),
      ]),
      el('Ellipse', { x: 22, y: 117, width: 24, height: 15 }, [
        el('Fill', { color: C.LIMB }),
      ]),
      el('Line', { startX: 62, startY: 112, endX: 66, endY: 124 }, [
        el('Stroke', { color: C.LIMB, thickness: 8, cap: 'ROUND' }),
      ]),
      el('Ellipse', { x: 54, y: 117, width: 24, height: 15 }, [
        el('Fill', { color: C.LIMB }),
      ]),
      el('Line', { startX: 38, startY: 112, endX: 34, endY: 124 }, [
        el('Stroke', { color: C.INK, thickness: 4.5, cap: 'ROUND' }),
      ]),
      el('Ellipse', { x: 24, y: 119, width: 20, height: 11 }, [
        el('Fill', { color: C.INK }),
      ]),
      el('Line', { startX: 62, startY: 112, endX: 66, endY: 124 }, [
        el('Stroke', { color: C.INK, thickness: 4.5, cap: 'ROUND' }),
      ]),
      el('Ellipse', { x: 56, y: 119, width: 20, height: 11 }, [
        el('Fill', { color: C.INK }),
      ]),
    ]),
    /**
     * The right arm: goal flag, night rest, or the daytime "out" pose.
     *
     * USED TO BE TWO NESTED Conditions, the outer one testing SALUTE_BUSY and
     * defaulting into this pair. The salute never fires any more - see
     * meetings.ts - so the wrapper was dead weight: nothing was ever going to
     * reach it from anywhere but its own Default. Flattened to one Condition,
     * three ways, with the flag ahead of night-rest exactly as before (a
     * flag met at 22:58 still shows until the rest branch takes over at 23:00).
     */
    el('Condition', {}, [
      el('Expressions', {}, [
        el('Expression', { name: 'hero_goal' }, [
          text('[STEP_PERCENT] &gt;= 100 &amp;&amp; 23 &gt; [HOUR_0_23] &amp;&amp; [HOUR_0_23] &gt;= 7'),
        ]),
        el('Expression', { name: 'hero_arm_r_rest' }, [
          text('[HOUR_0_23] &gt;= 23 || 7 &gt; [HOUR_0_23]'),
        ]),
      ]),
      el('Compare', { expression: 'hero_goal' }, [
        el('PartDraw', { ...G.HERO_LIMB_BOX, name: 'hero_flag' }, [
          el('Line', { startX: 93, startY: 19, endX: 93, endY: 74 }, [
            el('Stroke', { color: C.BONE, thickness: 2.5, cap: 'ROUND' }),
          ]),
          el('RoundRectangle', { x: 93, y: 21, width: 12, height: 9, cornerRadiusX: 2, cornerRadiusY: 2 }, [
            el('Fill', { color: C.GREEN }),
          ]),
        ]),
      ]),
      el('Compare', { expression: 'hero_arm_r_rest' }, [
        el('PartDraw', { ...G.HERO_LIMB_BOX, name: 'hero_arm_right_down' }, [
          el('Line', { startX: 76, startY: 78, endX: 88, endY: 96 }, [
            el('Stroke', { color: C.LIMB, thickness: 8, cap: 'ROUND' }),
          ]),
          el('Ellipse', { x: 80.5, y: 93, width: 19, height: 18 }, [
            el('Fill', { color: C.LIMB }),
          ]),
          el('Line', { startX: 76, startY: 78, endX: 88, endY: 96 }, [
            el('Stroke', { color: C.INK, thickness: 4.5, cap: 'ROUND' }),
          ]),
          el('Ellipse', { x: 82.5, y: 95, width: 15, height: 14 }, [
            el('Fill', { color: C.INK }),
          ]),
        ]),
      ]),
      el('Default', {}, [
        el('PartDraw', { ...G.HERO_LIMB_BOX, name: 'hero_arm_right_out' }, [
          el('Line', { startX: 84, startY: 74, endX: 93, endY: 62 }, [
            el('Stroke', { color: C.LIMB, thickness: 8, cap: 'ROUND' }),
          ]),
          el('Ellipse', { x: 84, y: 52, width: 18, height: 17 }, [
            el('Fill', { color: C.LIMB }),
          ]),
          el('Line', { startX: 84, startY: 74, endX: 93, endY: 62 }, [
            el('Stroke', { color: C.INK, thickness: 4.5, cap: 'ROUND' }),
          ]),
          el('Ellipse', { x: 86, y: 54, width: 14, height: 13 }, [
            el('Fill', { color: C.INK }),
          ]),
        ]),
      ]),
    ]),
    /**
     * The left arm: night rest, or the daytime "up" pose - the hand the
     * coffee cup, cocktail and game controller all anchor against.
     *
     * USED TO BE FOUR WAYS: busy-and-raised, saluting, resting and a Default
     * "up". The middle two only existed for the salute, which no longer fires
     * (see meetings.ts), and "busy-and-raised" placed its hand at the exact
     * same point (1,26) the plain "up" Default already does - it existed only
     * to keep that hand in place *instead of* saluting. With nothing left to
     * override, the Default already gives every remaining daytime minute the
     * correct hand position for free.
     */
    el('Condition', {}, [
      el('Expressions', {}, [
        el('Expression', { name: 'hero_arm_rest' }, [
          text('([HOUR_0_23] &gt;= 23 || 7 &gt; [HOUR_0_23]) &amp;&amp; 50 &gt; [WEATHER.CHANCE_OF_PRECIPITATION]'),
        ]),
      ]),
      el('Compare', { expression: 'hero_arm_rest' }, [
        el('PartDraw', { ...G.HERO_LIMB_BOX, name: 'hero_arm_left_down' }, [
          el('Line', { startX: 24, startY: 78, endX: 12, endY: 96 }, [
            el('Stroke', { color: C.LIMB, thickness: 8, cap: 'ROUND' }),
          ]),
          el('Ellipse', { x: 0.5, y: 93, width: 19, height: 18 }, [
            el('Fill', { color: C.LIMB }),
          ]),
          el('Line', { startX: 24, startY: 78, endX: 12, endY: 96 }, [
            el('Stroke', { color: C.INK, thickness: 4.5, cap: 'ROUND' }),
          ]),
          el('Ellipse', { x: 2.5, y: 95, width: 15, height: 14 }, [
            el('Fill', { color: C.INK }),
          ]),
        ]),
      ]),
      el('Default', {}, [
        el('PartDraw', { ...G.HERO_LIMB_BOX, name: 'hero_arm_left_up' }, [
          el('Line', { startX: 22, startY: 70, endX: 11, endY: 40 }, [
            el('Stroke', { color: C.LIMB, thickness: 8, cap: 'ROUND' }),
          ]),
          el('Ellipse', { x: 1, y: 26, width: 19, height: 18 }, [
            el('Fill', { color: C.LIMB }),
          ]),
          el('Line', { startX: 22, startY: 70, endX: 11, endY: 40 }, [
            el('Stroke', { color: C.INK, thickness: 4.5, cap: 'ROUND' }),
          ]),
          el('Ellipse', { x: 3, y: 28, width: 15, height: 14 }, [
            el('Fill', { color: C.INK }),
          ]),
        ]),
      ]),
    ]),
    byWeekday('body', 'hero', (day, body) => [
        bodyPart(HERO_GEOMETRY, partName('hero', 'body', day), body),
      ]),
    el('Condition', {}, [
      el('Expressions', {}, [
        el('Expression', { name: 'hero_eyes_startled' }, [
          text('[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.CHANCE_OF_PRECIPITATION] &gt;= 90'),
        ]),
        el('Expression', { name: 'hero_eyes_shut' }, [
          text('[HOUR_0_23] &gt;= 23 || 7 &gt; [HOUR_0_23]'),
        ]),
      ]),
      el('Compare', { expression: 'hero_eyes_startled' }, [
        el('PartDraw', { ...G.HERO_BOX, name: 'hero_eyes_startled' }, [
          el('Ellipse', { x: 17, y: 20, width: 12, height: 13 }, [
            el('Fill', { color: C.INK }),
          ]),
          el('Ellipse', { x: 41, y: 20, width: 12, height: 13 }, [
            el('Fill', { color: C.INK }),
          ]),
        ]),
      ]),
      el('Compare', { expression: 'hero_eyes_shut' }, [
        el('PartDraw', { ...G.HERO_BOX, name: 'hero_eyes_sleep' }, [
          el('Line', { startX: 15, startY: 26, endX: 31, endY: 26 }, [
            el('Stroke', { color: C.INK, thickness: 3.4, cap: 'ROUND' }),
          ]),
          el('Line', { startX: 41, startY: 26, endX: 57, endY: 26 }, [
            el('Stroke', { color: C.INK, thickness: 3.4, cap: 'ROUND' }),
          ]),
        ]),
      ]),
      el('Default', {}, [
        el('PartDraw', { ...G.HERO_BOX, name: 'hero_eyes_awake' }, [
          el('Arc', { centerX: 23, centerY: 26, width: 17, height: 13, startAngle: 270, endAngle: 450 }, [
            el('Stroke', { color: C.INK, thickness: 3.4, cap: 'ROUND' }),
          ]),
          el('Arc', { centerX: 47, centerY: 26, width: 17, height: 13, startAngle: 270, endAngle: 450 }, [
            el('Stroke', { color: C.INK, thickness: 3.4, cap: 'ROUND' }),
          ]),
        ]),
      ]),
    ]),
    el('Condition', {}, [
      el('Expressions', {}, [
        el('Expression', { name: 'hero_mouth_round' }, [
          text('([WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.CHANCE_OF_PRECIPITATION] &gt;= 90) || [HOUR_0_23] &gt;= 23 || 7 &gt; [HOUR_0_23]'),
        ]),
      ]),
      el('Compare', { expression: 'hero_mouth_round' }, [
        byWeekday('rmouth', 'hero', (day, body) => [
            roundMouth(HERO_GEOMETRY, partName('hero', 'mouth_round', day), body),
          ]),
      ]),
      el('Default', {}, [
        byWeekday('omouth', 'hero', (day, body) => [
            openMouth(HERO_GEOMETRY, partName('hero', 'mouth_open', day), body),
          ]),
        byWeekday('mask', 'hero', (day, body) => [
            mouthMask(HERO_GEOMETRY, partName('hero', 'mouth_mask', day), body),
          ]),
      ]),
    ]),
    el('Condition', {}, [
      el('Expressions', {}, [
        el('Expression', { name: 'hero_cold' }, [
          text('[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.TEMPERATURE] &lt;= 10'),
        ]),
      ]),
      el('Compare', { expression: 'hero_cold' }, [
        el('PartDraw', { name: 'hero_scarf', x: 14, y: 36, width: 72, height: 96 }, [
          el('RoundRectangle', { x: 3, y: 62, width: 66, height: 13, cornerRadiusX: 6, cornerRadiusY: 6 }, [
            el('Fill', { color: C.SCARF }),
          ]),
          el('RoundRectangle', { x: 7, y: 70, width: 10, height: 16, cornerRadiusX: 5, cornerRadiusY: 5 }, [
            el('Fill', { color: C.SCARF }),
          ]),
          el('Line', { startX: 6, startY: 68, endX: 66, endY: 68 }, [
            el('Stroke', { color: C.SCARF_DARK, thickness: 1.6, cap: 'BUTT' }),
          ]),
        ]),
      ]),
    ]),
    el('Condition', {}, [
      el('Expressions', {}, [
        el('Expression', { name: 'hero_cold_hands' }, [
          text('[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.TEMPERATURE] &lt;= 5'),
        ]),
      ]),
      el('Compare', { expression: 'hero_cold_hands' }, [
        el('Condition', {}, [
          el('Expressions', {}, [
            el('Expression', { name: 'hero_glove_r_rest' }, [
              text('[HOUR_0_23] &gt;= 23 || 7 &gt; [HOUR_0_23]'),
            ]),
          ]),
          el('Compare', { expression: 'hero_glove_r_rest' }, [
            el('PartDraw', { ...G.HERO_LIMB_BOX, name: 'hero_glove_right_down' }, [
              el('Ellipse', { x: 80.5, y: 93, width: 19, height: 18 }, [
                el('Fill', { color: C.SCARF }),
              ]),
            ]),
          ]),
          el('Default', {}, [
            el('PartDraw', { ...G.HERO_LIMB_BOX, name: 'hero_glove_right_out' }, [
              el('Ellipse', { x: 84, y: 52, width: 18, height: 17 }, [
                el('Fill', { color: C.SCARF }),
              ]),
            ]),
          ]),
        ]),
        el('Condition', {}, [
          el('Expressions', {}, [
            el('Expression', { name: 'hero_glove_rest' }, [
              text('([HOUR_0_23] &gt;= 23 || 7 &gt; [HOUR_0_23]) &amp;&amp; 50 &gt; [WEATHER.CHANCE_OF_PRECIPITATION]'),
            ]),
          ]),
          el('Compare', { expression: 'hero_glove_rest' }, [
            el('PartDraw', { ...G.HERO_LIMB_BOX, name: 'hero_glove_left_down' }, [
              el('Ellipse', { x: 0.5, y: 93, width: 19, height: 18 }, [
                el('Fill', { color: C.SCARF }),
              ]),
            ]),
          ]),
          el('Default', {}, [
            el('PartDraw', { ...G.HERO_LIMB_BOX, name: 'hero_glove_left_up' }, [
              el('Ellipse', { x: 1, y: 26, width: 19, height: 18 }, [
                el('Fill', { color: C.SCARF }),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),
    el('Condition', {}, [
      el('Expressions', {}, [
        el('Expression', { name: 'hero_uv' }, [
          text('[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.UV_INDEX] &gt;= 6 &amp;&amp; [WEATHER.IS_DAY]'),
        ]),
      ]),
      el('Compare', { expression: 'hero_uv' }, [
        el('PartDraw', { name: 'hero_shades', x: 24, y: 54, width: 50, height: 18 }, [
          el('RoundRectangle', { x: 3, y: 2, width: 20, height: 13, cornerRadiusX: 6, cornerRadiusY: 6 }, [
            el('Fill', { color: C.SHADES }),
          ]),
          el('RoundRectangle', { x: 28, y: 2, width: 20, height: 13, cornerRadiusX: 6, cornerRadiusY: 6 }, [
            el('Fill', { color: C.SHADES }),
          ]),
          el('Rectangle', { x: 23, y: 7, width: 5, height: 3 }, [
            el('Fill', { color: C.SHADES }),
          ]),
          el('Line', { startX: 6, startY: 5, endX: 10, endY: 5 }, [
            el('Stroke', { color: C.SHADES_FRAME, thickness: 1.6, cap: 'ROUND' }),
          ]),
          el('Line', { startX: 31, startY: 5, endX: 35, endY: 5 }, [
            el('Stroke', { color: C.SHADES_FRAME, thickness: 1.6, cap: 'ROUND' }),
          ]),
        ]),
      ]),
    ]),
    el('Condition', {}, [
      el('Expressions', {}, [
        el('Expression', { name: 'hero_puffed' }, [
          text('[HEART_RATE] &gt;= 100'),
        ]),
      ]),
      el('Compare', { expression: 'hero_puffed' }, [
        el('Condition', {}, [
          el('Expressions', {}, [
            el('Expression', { name: 'hero_sweat_all' }, [
              text('[HEART_RATE] &gt;= 150'),
            ]),
            el('Expression', { name: 'hero_sweat_two' }, [
              text('[HEART_RATE] &gt;= 120'),
            ]),
          ]),
          el('Compare', { expression: 'hero_sweat_all' }, [
            el('PartDraw', { ...G.HERO_SWEAT_BOX, name: 'hero_sweat_three' }, [
              el('Ellipse', { x: 0, y: 3, width: 6, height: 7.5 }, [
                el('Fill', { color: C.SWEAT }),
              ]),
              el('Ellipse', { x: 9, y: 0, width: 6, height: 7.5 }, [
                el('Fill', { color: C.SWEAT }),
              ]),
              el('Ellipse', { x: 18, y: 3, width: 6, height: 6 }, [
                el('Fill', { color: C.SWEAT }),
              ]),
            ]),
          ]),
          el('Compare', { expression: 'hero_sweat_two' }, [
            el('PartDraw', { ...G.HERO_SWEAT_BOX, name: 'hero_sweat_pair' }, [
              el('Ellipse', { x: 0, y: 3, width: 6, height: 7.5 }, [
                el('Fill', { color: C.SWEAT }),
              ]),
              el('Ellipse', { x: 18, y: 3, width: 6, height: 6 }, [
                el('Fill', { color: C.SWEAT }),
              ]),
            ]),
          ]),
          el('Default', {}, [
            el('PartDraw', { ...G.HERO_SWEAT_BOX, name: 'hero_sweat_one' }, [
              el('Ellipse', { x: 9, y: 0, width: 6, height: 7.5 }, [
                el('Fill', { color: C.SWEAT }),
              ]),
            ]),
          ]),
        ]),
        el('Group', { ...G.HERO_LIMB_BOX, name: 'hero_drip_a', alpha: 255 }, [
          el('Transform', { target: 'y', value: '(12 + 18 * clamp(([HEART_RATE] - 100) / 100, 0, 1)) * ((([SECOND] % 2) + [SECOND_MILLISECOND] - [SECOND]) / 2)' }),
          el('Transform', { target: 'alpha', value: '255 * (clamp(4 * ((([SECOND] % 2) + [SECOND_MILLISECOND] - [SECOND]) / 2), 0, 1) - clamp(4 * ((([SECOND] % 2) + [SECOND_MILLISECOND] - [SECOND]) / 2) - 3, 0, 1))' }),
          el('PartDraw', { ...G.HERO_LIMB_BOX, name: 'hero_drip_beads_a' }, [
            el('Ellipse', { x: 20, y: 55, width: 5, height: 7 }, [
              el('Fill', { color: C.SWEAT }),
            ]),
            el('Ellipse', { x: 73, y: 55, width: 5, height: 7 }, [
              el('Fill', { color: C.SWEAT }),
            ]),
          ]),
        ]),
        el('Group', { ...G.HERO_LIMB_BOX, name: 'hero_drip_b', alpha: 255 }, [
          el('Transform', { target: 'y', value: '(12 + 18 * clamp(([HEART_RATE] - 100) / 100, 0, 1)) * (((([SECOND] + 1) % 2) + [SECOND_MILLISECOND] - [SECOND]) / 2)' }),
          el('Transform', { target: 'alpha', value: '255 * (clamp(4 * (((([SECOND] + 1) % 2) + [SECOND_MILLISECOND] - [SECOND]) / 2), 0, 1) - clamp(4 * (((([SECOND] + 1) % 2) + [SECOND_MILLISECOND] - [SECOND]) / 2) - 3, 0, 1)) * clamp(([HEART_RATE] - 140) / 20, 0, 1)' }),
          el('PartDraw', { ...G.HERO_LIMB_BOX, name: 'hero_drip_beads_b' }, [
            el('Ellipse', { x: 20, y: 55, width: 5, height: 7 }, [
              el('Fill', { color: C.SWEAT }),
            ]),
            el('Ellipse', { x: 73, y: 55, width: 5, height: 7 }, [
              el('Fill', { color: C.SWEAT }),
            ]),
          ]),
        ]),
      ]),
    ]),
    /**
     * The headset: a band, two ear cups and a boom mic - worn for every
     * digital meeting window in meetings.ts, never for Wednesday's in-person
     * one. Revised 2026-08-08 after the first shoot: the companion's version
     * is SCRAPPED FOR NOW so this one shape can be judged on its own; see the
     * note in blob-companion.ts for why and what to restore later.
     *
     * The cups are a narrow standing oval, not a circle - a circle at this
     * size read as a ball glued to the head rather than a cushion. The band
     * attaches to the OUTER (upper) quarter of each cup, not its centre - a
     * centred attachment made the cups look like they were dangling off the
     * band rather than the band resting on top of them, which is the actual
     * geometry of a real headset.
     *
     * DRAWN LAST ON PURPOSE, after the leaf tuft and the sweat pearls, so it
     * has front-of-everything priority on the two real clashes this shape
     * has: the band's peak sits inside the leaf tuft's own footprint (leaves
     * occupy y0-40) and the band's sides cross the forehead sweat pearls
     * (HERO_SWEAT_BOX, y40-51) on the way down to the cups. Both read as
     * "worn on top of" rather than "cutting through" BECAUSE of the draw
     * order, not despite it - that is what a headband over hair, or over a
     * hot forehead, actually looks like.
     *
     * The right ear cup also lands partly on top of the right arm's default
     * "out" hand (x84-102, y52-69) - left deliberately, since a hand resting
     * up near the ear reads as someone half-adjusting their headset rather
     * than as two props fighting for the same pixels.
     */
    el('Condition', {}, [
      el('Expressions', {}, [
        el('Expression', { name: 'hero_headset' }, [
          text(HEADSET_WINDOW),
        ]),
      ]),
      el('Compare', { expression: 'hero_headset' }, [
        // DRAWN FIRST, so the ear cups below cover where the band meets them.
        // That was always the order; it only became visible once the band
        // stopped being the same colour as the cups.
        el('PartDraw', { ...G.HERO_LIMB_BOX, name: 'hero_headset_band' }, [
          // THE PEAK IS (50,36), WHICH IS THE BODY'S TOPMOST POINT. The arc
          // is rx40/ry26 about (50,62); the head is rx36/ry34 about (50,70).
          // The two touch at the crown and the band clears the head
          // everywhere else - at x30 it runs 2.2px above the outline, at x20
          // 6.4px above - so it reads as resting ON the head rather than
          // cutting a chord through it, which is what the previous 44-high
          // arc did from y40.
          //
          // Endpoints stay at (10,62) and (90,62), the OUTER upper corner of
          // each cup (cups span x8..18 and x82..92, y60..80).
          //
          // C.HEADSET_LIGHT, NOT C.HEADSET. The band's old #2b3a4a sat two
          // shades from the limbs' #23384f, and the arms cross it - so a band
          // over a raised arm vanished into it. The cushion colour is the
          // headset's own light tone, so the accessory still reads as one
          // object while the band separates from everything it overlaps.
          el('Arc', { centerX: 50, centerY: 62, width: 80, height: 52, startAngle: 270, endAngle: 450 }, [
            el('Stroke', { color: C.HEADSET_LIGHT, thickness: 4, cap: 'ROUND' }),
          ]),
        ]),
        el('PartDraw', { ...G.HERO_LIMB_BOX, name: 'hero_headset_cups' }, [
          // 10 wide, not 7 - the second pass over-corrected into a sliver -
          // and moved DOWN 6px to y60..80, which straddles the eyes (y62)
          // and the mouth (y84..94) the way an ear does.
          //
          // THEY NOW OVERLAP THE BODY rather than abutting it. The body's
          // outline at y62 runs x15..85, so a cup at x8..18 buries 3px of
          // itself in the head. The previous cups ended at x13 against a body
          // starting at x14 - a 1px GAP, which is what read as "not
          // attached": at this scale a hairline of black between two shapes
          // separates them completely.
          el('RoundRectangle', { x: 8, y: 60, width: 10, height: 20, cornerRadiusX: 5, cornerRadiusY: 9 }, [
            el('Fill', { color: C.HEADSET }),
          ]),
          el('RoundRectangle', { x: 10.5, y: 63, width: 5, height: 14, cornerRadiusX: 2.5, cornerRadiusY: 6 }, [
            el('Fill', { color: C.HEADSET_LIGHT }),
          ]),
          el('RoundRectangle', { x: 82, y: 60, width: 10, height: 20, cornerRadiusX: 5, cornerRadiusY: 9 }, [
            el('Fill', { color: C.HEADSET }),
          ]),
          el('RoundRectangle', { x: 84.5, y: 63, width: 5, height: 14, cornerRadiusX: 2.5, cornerRadiusY: 6 }, [
            el('Fill', { color: C.HEADSET_LIGHT }),
          ]),
        ]),
        // ONE smooth Arc, not two Lines meeting at a corner. Runs from
        // (86.7,73.1) - inside the right cup's LOWER half - to (67,88), which
        // is level with the open mouth (y84..94) and 7px clear of its right
        // edge (x60). Both ends moved from the previous pass: the boom used
        // to stop at (72,83), above the mouth rather than beside it.
        el('PartDraw', { ...G.HERO_LIMB_BOX, name: 'hero_headset_mic' }, [
          el('Arc', { centerX: 67, centerY: 70, width: 40, height: 36, startAngle: 100, endAngle: 180 }, [
            el('Stroke', { color: C.HEADSET, thickness: 2.2, cap: 'ROUND' }),
          ]),
          el('Ellipse', { x: 64.5, y: 85.5, width: 5, height: 5 }, [
            el('Fill', { color: C.HEADSET }),
          ]),
          el('Ellipse', { x: 65.5, y: 86.5, width: 3, height: 3 }, [
            el('Fill', { color: C.MIC_LED }),
          ]),
        ]),
      ]),
    ]),
  ])
