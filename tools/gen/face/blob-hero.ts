/**
 * The hero blob: the large one, centre-left, wearing today's colour.
 *
 * Draw order matters and is document order - the leaves sit behind the body, the
 * body behind the face, the face behind anything it holds. WFF has no z-index, so
 * moving a call in this list moves the part in the stack.
 *
 * The rows this file reads live in data/blobs.ts; the shared builders are in
 * blob.ts, which also argues why there is no single parameterised blob().
 */

import { el, type Node } from '../xml.ts'
import { C } from '../palette.ts'
import * as G from '../geometry.ts'
import { AMBIENT_HIDE } from '../crossfade.ts'
import { switchOn, when, whenElse } from '../condition.ts'
import {
  COLD, GLOVE_COLD, GOAL_MET, HIGH_UV, NIGHT, NIGHT_AND_DRY, PUFFED, STORM,
  STORM_OR_NIGHT, SWEAT_ALL, SWEAT_TWO,
} from '../states.ts'
import { byWeekday } from '../weekday.ts'
import { HEADSET_WINDOW } from '../meetings.ts'
import {
  HERO_ARMS, HERO_DRIP, HERO_LEAVES, HERO_LEGS, HERO_STROKE, HERO_SWEAT,
} from '../data/blobs.ts'
import {
  HERO_GEOMETRY, beadPart, bodyPart, dripGroups, glovePart, heroGyro, leafPart, limbPart,
  mouthMask, openMouth, partName, roundMouth,
} from '../blob.ts'

const LIMB = G.HERO_LIMB_BOX

/**
 * The step-goal flag. Not a limb - a pole and a pennant, replacing the whole right
 * arm rather than decorating it.
 */
const flag = (): Node =>
  el('PartDraw', { ...LIMB, name: 'hero_flag' }, [
    el('Line', { startX: 93, startY: 19, endX: 93, endY: 74 }, [
      el('Stroke', { color: C.BONE, thickness: 2.5, cap: 'ROUND' }),
    ]),
    el('RoundRectangle', { x: 93, y: 21, width: 12, height: 9, cornerRadiusX: 2, cornerRadiusY: 2 }, [
      el('Fill', { color: C.GREEN }),
    ]),
  ])

/**
 * The right arm: goal flag, night rest, or the daytime "out" pose.
 *
 * THE FLAG IS TESTED AHEAD OF NIGHT REST, so a goal met at 22:58 still shows until
 * the rest branch takes over at 23:00. Ordering does that; there is no negation.
 *
 * USED TO BE TWO NESTED Conditions, the outer one testing SALUTE_BUSY and
 * defaulting into this pair. The salute never fires any more - see meetings.ts - so
 * the wrapper was dead weight: nothing was ever going to reach it from anywhere but
 * its own Default.
 */
const rightArm = (): Node =>
  switchOn(
    [
      { name: 'hero_goal', when: GOAL_MET, then: [flag()] },
      {
        name: 'hero_arm_r_rest',
        when: NIGHT,
        then: [limbPart(LIMB, 'hero_arm_right_down', [HERO_ARMS.rightDown], HERO_STROKE)],
      },
    ],
    [limbPart(LIMB, 'hero_arm_right_out', [HERO_ARMS.rightOut], HERO_STROKE)],
  )

/**
 * The left arm: night rest, or the daytime "up" pose - the hand the coffee cup,
 * cocktail and game controller all anchor against.
 *
 * IT RESTS ONLY WHEN IT IS ALSO DRY, because a hand that has an umbrella to hold up
 * cannot be hanging by its side. That is NIGHT_AND_DRY, and the group() inside it is
 * load-bearing; see states.ts.
 *
 * USED TO BE FOUR WAYS: busy-and-raised, saluting, resting and a Default "up". The
 * middle two only existed for the salute, which no longer fires, and
 * "busy-and-raised" placed its hand at the exact same point the plain "up" Default
 * already does - it existed only to keep that hand in place *instead of* saluting.
 */
const leftArm = (): Node =>
  whenElse(
    'hero_arm_rest',
    NIGHT_AND_DRY,
    [limbPart(LIMB, 'hero_arm_left_down', [HERO_ARMS.leftDown], HERO_STROKE)],
    [limbPart(LIMB, 'hero_arm_left_up', [HERO_ARMS.leftUp], HERO_STROKE)],
  )

/**
 * Startled by a storm, asleep, or awake.
 *
 * AWAKE IS TWO ARCS, not two dots: an upward-bowed line reads as a contented squint
 * where a filled ellipse reads as a stare. Startled swaps in the wide open version,
 * which is the only time this face shows a full round pupil.
 */
const eyes = (): Node =>
  switchOn(
    [
      {
        name: 'hero_eyes_startled',
        when: STORM,
        then: [
          el('PartDraw', { ...G.HERO_BOX, name: 'hero_eyes_startled' }, [
            el('Ellipse', { x: 17, y: 20, width: 12, height: 13 }, [el('Fill', { color: C.INK })]),
            el('Ellipse', { x: 41, y: 20, width: 12, height: 13 }, [el('Fill', { color: C.INK })]),
          ]),
        ],
      },
      {
        name: 'hero_eyes_shut',
        when: NIGHT,
        then: [
          el('PartDraw', { ...G.HERO_BOX, name: 'hero_eyes_sleep' }, [
            el('Line', { startX: 15, startY: 26, endX: 31, endY: 26 }, [
              el('Stroke', { color: C.INK, thickness: 3.4, cap: 'ROUND' }),
            ]),
            el('Line', { startX: 41, startY: 26, endX: 57, endY: 26 }, [
              el('Stroke', { color: C.INK, thickness: 3.4, cap: 'ROUND' }),
            ]),
          ]),
        ],
      },
    ],
    [
      el('PartDraw', { ...G.HERO_BOX, name: 'hero_eyes_awake' }, [
        el('Arc', { centerX: 23, centerY: 26, width: 17, height: 13, startAngle: 270, endAngle: 450 }, [
          el('Stroke', { color: C.INK, thickness: 3.4, cap: 'ROUND' }),
        ]),
        el('Arc', { centerX: 47, centerY: 26, width: 17, height: 13, startAngle: 270, endAngle: 450 }, [
          el('Stroke', { color: C.INK, thickness: 3.4, cap: 'ROUND' }),
        ]),
      ]),
    ],
  )

/** A small circle when startled or asleep, otherwise the open smile plus its mask. */
const mouth = (): Node =>
  whenElse(
    'hero_mouth_round',
    STORM_OR_NIGHT,
    [
      byWeekday('rmouth', 'hero', (day, body) => [
        roundMouth(HERO_GEOMETRY, partName('hero', 'mouth_round', day), body),
      ]),
    ],
    [
      byWeekday('omouth', 'hero', (day, body) => [
        openMouth(HERO_GEOMETRY, partName('hero', 'mouth_open', day), body),
      ]),
      byWeekday('mask', 'hero', (day, body) => [
        mouthMask(HERO_GEOMETRY, partName('hero', 'mouth_mask', day), body),
      ]),
    ],
  )

/** A band round the neck, a tail hanging down, and a seam line across the band. */
const scarf = (): Node =>
  when('hero_cold', COLD, [
    el('PartDraw', { ...G.HERO_SCARF_BOX, name: 'hero_scarf' }, [
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
  ])

/**
 * Mittens, one per arm, each following its own arm's pose.
 *
 * FOUR SEPARATE PARTS BECAUSE THE TWO ARMS ARE GATED DIFFERENTLY: the right rests
 * on NIGHT alone, the left needs NIGHT_AND_DRY, so a glove per arm has to repeat its
 * arm's own condition. What has changed is that each cap now comes from the same row
 * the hand does, so a mitten cannot end up somewhere its hand is not.
 */
const gloves = (): Node =>
  when('hero_cold_hands', GLOVE_COLD, [
    whenElse(
      'hero_glove_r_rest',
      NIGHT,
      [glovePart(LIMB, 'hero_glove_right_down', [HERO_ARMS.rightDown])],
      [glovePart(LIMB, 'hero_glove_right_out', [HERO_ARMS.rightOut])],
    ),
    whenElse(
      'hero_glove_rest',
      NIGHT_AND_DRY,
      [glovePart(LIMB, 'hero_glove_left_down', [HERO_ARMS.leftDown])],
      [glovePart(LIMB, 'hero_glove_left_up', [HERO_ARMS.leftUp])],
    ),
  ])

/** Sunglasses: two lenses, a bridge, and a hinge stroke on each side. */
const shades = (): Node =>
  when('hero_uv', HIGH_UV, [
    el('PartDraw', { ...G.HERO_SHADES_BOX, name: 'hero_shades' }, [
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
  ])

/** Forehead pearls in three steps, plus the two drips. */
const sweat = (): Node =>
  when('hero_puffed', PUFFED, [
    switchOn(
      [
        {
          name: 'hero_sweat_all',
          when: SWEAT_ALL,
          then: [beadPart(G.HERO_SWEAT_BOX, 'hero_sweat_three', HERO_SWEAT, HERO_SWEAT.three)],
        },
        {
          name: 'hero_sweat_two',
          when: SWEAT_TWO,
          then: [beadPart(G.HERO_SWEAT_BOX, 'hero_sweat_pair', HERO_SWEAT, HERO_SWEAT.two)],
        },
      ],
      [beadPart(G.HERO_SWEAT_BOX, 'hero_sweat_one', HERO_SWEAT, HERO_SWEAT.one)],
    ),
    ...dripGroups(LIMB, 'hero', HERO_DRIP),
  ])

/**
 * The headset: a band, two ear cups and a boom mic - worn for every digital meeting
 * window in meetings.ts, never for Wednesday's in-person one. Revised 2026-08-08
 * after the first shoot: the companion's version is SCRAPPED FOR NOW so this one
 * shape can be judged on its own; see the note in blob-companion.ts.
 *
 * The cups are a narrow standing oval, not a circle - a circle at this size read as
 * a ball glued to the head rather than a cushion. The band attaches to the OUTER
 * (upper) quarter of each cup, not its centre - a centred attachment made the cups
 * look like they were dangling off the band rather than the band resting on top of
 * them, which is the actual geometry of a real headset.
 *
 * DRAWN LAST ON PURPOSE, after the leaf tuft and the sweat pearls, so it has
 * front-of-everything priority on the two real clashes this shape has: the band's
 * peak sits inside the leaf tuft's own footprint (leaves occupy y0-40) and the
 * band's sides cross the forehead sweat pearls (HERO_SWEAT_BOX, y40-51) on the way
 * down to the cups. Both read as "worn on top of" rather than "cutting through"
 * BECAUSE of the draw order, not despite it - that is what a headband over hair, or
 * over a hot forehead, actually looks like.
 *
 * The right ear cup also lands partly on top of the right arm's default "out" hand
 * (x84-102, y52-69) - left deliberately, since a hand resting up near the ear reads
 * as someone half-adjusting their headset rather than as two props fighting for the
 * same pixels.
 *
 * EVERY NUMBER BELOW IS A ONE-OFF, measured against the head it sits on, and none
 * of it repeats. It stays literal for that reason: a table of one row is a table
 * nobody needs.
 */
const headset = (): Node =>
  when('hero_headset', HEADSET_WINDOW, [
    // DRAWN FIRST, so the ear cups below cover where the band meets them.
    // That was always the order; it only became visible once the band
    // stopped being the same colour as the cups.
    el('PartDraw', { ...LIMB, name: 'hero_headset_band' }, [
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
    el('PartDraw', { ...LIMB, name: 'hero_headset_cups' }, [
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
    el('PartDraw', { ...LIMB, name: 'hero_headset_mic' }, [
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
  ])

export const blobHero = (): Node =>
  el('Group', { name: 'blob_hero', ...G.ANCHORS.HERO, alpha: 255 }, [
    heroGyro(),
    el('Variant', AMBIENT_HIDE),
    ...HERO_LEAVES.map((leaf) => leafPart(G.LEAF_BOX, leaf)),
    limbPart(LIMB, 'hero_limbs', HERO_LEGS, HERO_STROKE),
    rightArm(),
    leftArm(),
    byWeekday('body', 'hero', (day, body) => [
      bodyPart(HERO_GEOMETRY, partName('hero', 'body', day), body),
    ]),
    eyes(),
    mouth(),
    scarf(),
    gloves(),
    shades(),
    sweat(),
    headset(),
  ])
