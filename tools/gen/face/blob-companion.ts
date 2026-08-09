/**
 * The companion blob: the small one, wearing TOMORROW's colour.
 *
 * It is not the hero scaled down. Its gyro gain is lower on purpose so the pair
 * read as sitting at different depths, its arms do not change pose at all, and its
 * scarf tail is clipped by its own box. Those differences are measured, not
 * incidental - see blob.ts for why there is no single parameterised builder, and
 * data/blobs.ts for the rows this file reads.
 *
 * Draw order is document order. WFF has no z-index, so moving a call in this list
 * moves the part in the stack.
 */

import { el, type Node } from '../xml.ts'
import { C } from '../palette.ts'
import * as G from '../geometry.ts'
import { AMBIENT_HIDE } from '../crossfade.ts'
import { switchOn, when, whenElse } from '../condition.ts'
import { COLD, GLOVE_COLD, HIGH_UV, NIGHT, PUFFED, STORM, SWEAT_ALL, SWEAT_TWO } from '../states.ts'
import { byWeekday } from '../weekday.ts'
import {
  MINI_DRIP, MINI_HAND_LIMBS, MINI_LEAVES, MINI_LIMBS, MINI_STROKE, MINI_SWEAT,
} from '../data/blobs.ts'
import {
  COMPANION_GEOMETRY, beadPart, bodyPart, companionGyro, dripGroups, glovePart, leafPart,
  limbPart, mouthMask, openMouth, partName, roundMouth,
} from '../blob.ts'

/**
 * The X-ray, for when the bolt strikes: a dark body with a pale skeleton in it.
 *
 * IT SPREADS MINI_BODY_RADIUS RATHER THAN RESTATING 22/20, which it used to do two
 * branches away from the living body that uses the same constant. A change to the
 * body's corners would have left the X-ray rounder or squarer than the blob it
 * replaces - visible only during a thunderstorm, and only to someone looking for it.
 */
const skeleton = (): Node =>
  el('PartDraw', { ...G.MINI_BOX, name: 'mini_skeleton' }, [
    el('RoundRectangle', { ...G.MINI_BODY_SHAPE, ...G.MINI_BODY_RADIUS }, [
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
  ])

/** Awake, or asleep. The lids are two short strokes rather than closed lashes. */
const eyes = (): Node =>
  whenElse(
    'mini_night',
    NIGHT,
    [
      el('PartDraw', { ...G.MINI_EYES_CLOSED_BOX, name: 'mini_eyes_closed' }, [
        el('Line', { startX: 2, startY: 6, endX: 11, endY: 6 }, [
          el('Stroke', { color: C.INK, thickness: 2.5, cap: 'ROUND' }),
        ]),
        el('Line', { startX: 17, startY: 6, endX: 26, endY: 6 }, [
          el('Stroke', { color: C.INK, thickness: 2.5, cap: 'ROUND' }),
        ]),
      ]),
    ],
    [
      el('PartDraw', { ...G.MINI_BOX, name: 'mini_eyes_open' }, [
        el('Ellipse', { x: 12, y: 14, width: 5, height: 6 }, [
          el('Fill', { color: C.INK }),
        ]),
        el('Ellipse', { x: 27, y: 14, width: 5, height: 6 }, [
          el('Fill', { color: C.INK }),
        ]),
      ]),
    ],
  )

/** Sunglasses: two lenses and a bridge, no frame - there is no room for one. */
const shades = (): Node =>
  when('mini_uv', HIGH_UV, [
    el('PartDraw', { ...G.MINI_SHADES_BOX, name: 'mini_shades' }, [
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
  ])

/** A band across the neck and a tail hanging off it. The tail is clipped; see
 *  MINI_SCARF_BOX. */
const scarf = (): Node =>
  when('mini_cold', COLD, [
    el('PartDraw', { ...G.MINI_SCARF_BOX, name: 'mini_scarf' }, [
      el('RoundRectangle', { x: 2, y: 33, width: 40, height: 9, cornerRadiusX: 4.5, cornerRadiusY: 4.5 }, [
        el('Fill', { color: C.SCARF }),
      ]),
      el('RoundRectangle', { x: 30, y: 39, width: 7, height: 12, cornerRadiusX: 3.5, cornerRadiusY: 3.5 }, [
        el('Fill', { color: C.SCARF }),
      ]),
    ]),
  ])

/** Forehead pearls in three steps, plus the two drips. */
const sweat = (): Node =>
  when('mini_puffed', PUFFED, [
    switchOn(
      [
        {
          name: 'mini_sweat_all',
          when: SWEAT_ALL,
          then: [beadPart(G.MINI_SWEAT_BOX, 'mini_sweat_three', MINI_SWEAT, MINI_SWEAT.three)],
        },
        {
          name: 'mini_sweat_two',
          when: SWEAT_TWO,
          then: [beadPart(G.MINI_SWEAT_BOX, 'mini_sweat_pair', MINI_SWEAT, MINI_SWEAT.two)],
        },
      ],
      [beadPart(G.MINI_SWEAT_BOX, 'mini_sweat_one', MINI_SWEAT, MINI_SWEAT.one)],
    ),
    ...dripGroups(G.MINI_LIMB_BOX, 'mini', MINI_DRIP),
  ])

export const blobCompanion = (): Node =>
  el('Group', { name: 'blob_companion', ...G.ANCHORS.COMPANION, alpha: 255 }, [
    companionGyro(),
    el('Variant', AMBIENT_HIDE),
    ...MINI_LEAVES.map((leaf) => leafPart(G.MINI_LEAF_BOX, leaf)),
    limbPart(G.MINI_LIMB_BOX, 'mini_limbs', MINI_LIMBS, MINI_STROKE),
    whenElse('mini_zapped', STORM, [skeleton()], [
      el('Group', { ...G.MINI_LIMB_BOX, name: 'mini_alive', alpha: 255 }, [
        byWeekday('mini', 'companion', (day, body) => [
          bodyPart(COMPANION_GEOMETRY, partName('mini', 'body', day), body),
        ]),
        whenElse(
          'mini_mouth_night',
          NIGHT,
          [
            byWeekday('minirmouth', 'companion', (day, body) => [
              roundMouth(COMPANION_GEOMETRY, partName('mini', 'mouth_sleep', day), body),
            ]),
          ],
          [
            byWeekday('miniomouth', 'companion', (day, body) => [
              openMouth(COMPANION_GEOMETRY, partName('mini', 'mouth_open', day), body),
            ]),
            byWeekday('minimask', 'companion', (day, body) => [
              mouthMask(COMPANION_GEOMETRY, partName('mini', 'mouth_mask', day), body),
            ]),
          ],
        ),
        eyes(),
        shades(),
        scarf(),
        when('mini_cold_hands', GLOVE_COLD, [
          glovePart(G.MINI_LIMB_BOX, 'mini_gloves', MINI_HAND_LIMBS.map((i) => MINI_LIMBS[i]!)),
        ]),
        sweat(),
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
  ])
