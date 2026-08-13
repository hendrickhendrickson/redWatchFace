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

import { el, type Node } from '../xml.ts';
import { C } from '../palette.ts';
import * as G from '../geometry.ts';
import { AMBIENT_HIDE } from '../crossfade.ts';
import { switchOn, when, whenElse } from '../condition.ts';
import {
	WEARS_HAT,
	WEED,
	COLD,
	GLOVE_COLD,
	HIGH_UV,
	NIGHT,
	PUFFED,
	STORM,
	SWEAT_ALL,
	SWEAT_ONE,
	SWEAT_TWO
} from '../states.ts';
import { byWeekday } from '../weekday.ts';
import { companionPartyHat, companionPumpkin, companionSantaHat } from './costumes.ts';
import {
	COMPANION_DRIP,
	COMPANION_HAND_LIMBS,
	COMPANION_LEAVES,
	COMPANION_LEAVES_WEED,
	COMPANION_WEED_FAN,
	COMPANION_LIMBS,
	COMPANION_STROKE,
	COMPANION_SWEAT
} from '../data/blobs.ts';
import {
	COMPANION_GEOMETRY,
	beadPart,
	bodyPart,
	companionGyro,
	dripGroups,
	glovePart,
	leafPart,
	limbPart,
	mouthMask,
	openMouth,
	partName,
	roundMouth
} from '../blob.ts';

/**
 * The X-ray, for when the bolt strikes: a dark body with a pale skeleton in it.
 *
 * IT SPREADS COMPANION_BODY_RADIUS RATHER THAN RESTATING 22/20, which it used to do
 * two branches away from the living body that uses the same constant. A change to
 * the body's corners would have left the X-ray rounder or squarer than the blob it
 * replaces - visible only during a thunderstorm, and only to someone looking for it.
 */
const skeleton = (): Node =>
	el('PartDraw', { ...G.COMPANION_BOX, name: 'companion_skeleton' }, [
		el('RoundRectangle', { ...G.COMPANION_BODY_SHAPE, ...G.COMPANION_BODY_RADIUS }, [
			el('Fill', { color: C.SKELETON_DARK })
		]),
		el('Ellipse', { x: 12, y: 4, width: 20, height: 19 }, [
			el('Fill', { color: C.SKELETON_LIGHT })
		]),
		el('Ellipse', { x: 15, y: 10, width: 6, height: 7 }, [el('Fill', { color: C.SKELETON_DARK })]),
		el('Ellipse', { x: 23, y: 10, width: 6, height: 7 }, [el('Fill', { color: C.SKELETON_DARK })]),
		el('Ellipse', { x: 20.5, y: 17, width: 3, height: 3 }, [
			el('Fill', { color: C.SKELETON_DARK })
		]),
		el('Rectangle', { x: 17, y: 20, width: 10, height: 1.6 }, [
			el('Fill', { color: C.SKELETON_DARK })
		]),
		el('Line', { startX: 22, startY: 25, endX: 22, endY: 38 }, [
			el('Stroke', { color: C.SKELETON_LIGHT, thickness: 2.2, cap: 'ROUND' })
		]),
		el('Line', { startX: 15, startY: 28, endX: 29, endY: 28 }, [
			el('Stroke', { color: C.SKELETON_LIGHT, thickness: 2, cap: 'ROUND' })
		]),
		el('Line', { startX: 16, startY: 32, endX: 28, endY: 32 }, [
			el('Stroke', { color: C.SKELETON_LIGHT, thickness: 2, cap: 'ROUND' })
		]),
		el('Line', { startX: 18, startY: 36, endX: 26, endY: 36 }, [
			el('Stroke', { color: C.SKELETON_LIGHT, thickness: 2, cap: 'ROUND' })
		])
	]);

/** Awake, or asleep. The lids are two short strokes rather than closed lashes. */
const eyes = (): Node =>
	whenElse(
		'companion_night',
		NIGHT,
		[
			el('PartDraw', { ...G.COMPANION_EYES_CLOSED_BOX, name: 'companion_eyes_closed' }, [
				el('Line', { startX: 2, startY: 6, endX: 11, endY: 6 }, [
					el('Stroke', { color: C.INK, thickness: 2.5, cap: 'ROUND' })
				]),
				el('Line', { startX: 17, startY: 6, endX: 26, endY: 6 }, [
					el('Stroke', { color: C.INK, thickness: 2.5, cap: 'ROUND' })
				])
			])
		],
		[
			el('PartDraw', { ...G.COMPANION_BOX, name: 'companion_eyes_open' }, [
				el('Ellipse', { x: 12, y: 14, width: 5, height: 6 }, [el('Fill', { color: C.INK })]),
				el('Ellipse', { x: 27, y: 14, width: 5, height: 6 }, [el('Fill', { color: C.INK })])
			])
		]
	);

/** Sunglasses: two lenses and a bridge, no frame - there is no room for one. */
const shades = (): Node =>
	when('companion_uv', HIGH_UV, [
		el('PartDraw', { ...G.COMPANION_SHADES_BOX, name: 'companion_shades' }, [
			el(
				'RoundRectangle',
				{ x: 2, y: 2, width: 10, height: 8, cornerRadiusX: 4, cornerRadiusY: 4 },
				[el('Fill', { color: C.SHADES })]
			),
			el(
				'RoundRectangle',
				{ x: 15, y: 2, width: 10, height: 8, cornerRadiusX: 4, cornerRadiusY: 4 },
				[el('Fill', { color: C.SHADES })]
			),
			el('Rectangle', { x: 12, y: 5, width: 3, height: 2 }, [el('Fill', { color: C.SHADES })])
		])
	]);

/** A band across the neck and a tail hanging off it. The tail is clipped; see
 *  COMPANION_SCARF_BOX. */
const scarf = (): Node =>
	when('companion_cold', COLD, [
		el('PartDraw', { ...G.COMPANION_SCARF_BOX, name: 'companion_scarf' }, [
			el(
				'RoundRectangle',
				{ x: 2, y: 33, width: 40, height: 9, cornerRadiusX: 4.5, cornerRadiusY: 4.5 },
				[el('Fill', { color: C.SCARF })]
			),
			el(
				'RoundRectangle',
				{ x: 30, y: 39, width: 7, height: 12, cornerRadiusX: 3.5, cornerRadiusY: 3.5 },
				[el('Fill', { color: C.SCARF })]
			)
		])
	]);

/** The drips, from 100bpm, plus forehead pearls in three steps from 120 - see blob-hero.ts. */
const sweat = (): Node =>
	when('companion_puffed', PUFFED, [
		switchOn([
			{
				name: 'companion_sweat_all',
				when: SWEAT_ALL,
				then: [
					beadPart(
						G.COMPANION_SWEAT_BOX,
						'companion_sweat_three',
						COMPANION_SWEAT,
						COMPANION_SWEAT.three
					)
				]
			},
			{
				name: 'companion_sweat_two',
				when: SWEAT_TWO,
				then: [
					beadPart(
						G.COMPANION_SWEAT_BOX,
						'companion_sweat_pair',
						COMPANION_SWEAT,
						COMPANION_SWEAT.two
					)
				]
			},
			{
				name: 'companion_sweat_any',
				when: SWEAT_ONE,
				then: [
					beadPart(
						G.COMPANION_SWEAT_BOX,
						'companion_sweat_one',
						COMPANION_SWEAT,
						COMPANION_SWEAT.one
					)
				]
			}
		]),
		...dripGroups(G.COMPANION_LIMB_BOX, 'companion', COMPANION_DRIP)
	]);

export const blobCompanion = (): Node =>
	el('Group', { name: 'blob_companion', ...G.ANCHORS.COMPANION, alpha: 255 }, [
		companionGyro(),
		el('Variant', AMBIENT_HIDE),
		// The tuft: the 20 April fan - three blades rather than the hero's five, see
		// COMPANION_WEED_FAN for why this one drops a pair - nothing under a hat, or
		// the ordinary hair. Same three-way switch the hero's tuft makes.
		switchOn(
			[
				{
					name: 'companion_weed',
					when: WEED,
					then: COMPANION_LEAVES_WEED.map((leaf) =>
						leafPart(G.COMPANION_LEAF_BOX, leaf, COMPANION_WEED_FAN.pivot)
					)
				},
				{ name: 'companion_hatted', when: WEARS_HAT, then: [] }
			],
			COMPANION_LEAVES.map((leaf) => leafPart(G.COMPANION_LEAF_BOX, leaf))
		),
		limbPart(G.COMPANION_LIMB_BOX, 'companion_limbs', COMPANION_LIMBS, COMPANION_STROKE),
		whenElse(
			'companion_zapped',
			STORM,
			[skeleton()],
			[
				el('Group', { ...G.COMPANION_LIMB_BOX, name: 'companion_alive', alpha: 255 }, [
					byWeekday('companion_body', 'companion', (day, body) => [
						bodyPart(COMPANION_GEOMETRY, partName('companion', 'body', day), body)
					]),
					whenElse(
						'companion_mouth_night',
						NIGHT,
						[
							byWeekday('companion_rmouth', 'companion', (day, body) => [
								roundMouth(COMPANION_GEOMETRY, partName('companion', 'mouth_sleep', day), body)
							])
						],
						[
							byWeekday('companion_omouth', 'companion', (day, body) => [
								openMouth(COMPANION_GEOMETRY, partName('companion', 'mouth_open', day), body)
							]),
							byWeekday('companion_mask', 'companion', (day, body) => [
								mouthMask(COMPANION_GEOMETRY, partName('companion', 'mouth_mask', day), body)
							])
						]
					),
					eyes(),
					// Same placement rule as the hero's sheet: over the body and face,
					// under anything that would be worn on top of a costume.
					companionPumpkin(G.COMPANION_LIMB_BOX),
					shades(),
					scarf(),
					when('companion_cold_hands', GLOVE_COLD, [
						glovePart(
							G.COMPANION_LIMB_BOX,
							'companion_gloves',
							COMPANION_HAND_LIMBS.map((i) => COMPANION_LIMBS[i])
						)
					]),
					sweat(),
					// Last on the companion for the same reason it is last on the hero.
					// It sits INSIDE companion_alive, so a storm X-ray on Christmas Day
					// shows a skeleton and no hat - which is right: the hat is on the body
					// the lightning just replaced.
					companionSantaHat(G.COMPANION_LIMB_BOX),
					companionPartyHat(G.COMPANION_LIMB_BOX)
					// The companion's headset is SCRAPPED FOR NOW, 2026-08-08, after the
					// first shoot made both blobs' headsets hard to judge at once. The
					// hero's is being revised alone; once that shape is settled, this
					// is where its cut-down companion version comes back - cups and a
					// band, same as before, still without the boom mic (the 44x42 body
					// has far less clearance than the hero's 72x80, and at this scale a
					// diagonal boom line read as noise rather than a mic). See the note
					// on the headset Condition in blob-hero.ts.
				])
			]
		)
	]);
