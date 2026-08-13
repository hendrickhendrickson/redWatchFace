/**
 * Whatever the companion is holding. Today that is one thing: the 1 May sickle.
 *
 * WHY THIS SECTION EXISTS AT ALL, given that "the companion carries nothing" was
 * a stated difference between the two blobs rather than an omission. It carried
 * nothing because nothing had ever been put in its hand; when the hammer went
 * into the hero's fist the sickle had to go somewhere, and the companion's own
 * group cannot hold it.
 *
 * THE COMPANION'S GROUP IS EXACTLY AS WIDE AS ITS LIMBS - 62 - and the hand that
 * takes the sickle sits at group-local x56.5. A 24-wide blade centred there runs
 * to x68.5, and content past a part's edge is not drawn and not reported. That is
 * the same wall face/hero-props.ts hit from the other side, and the companion
 * already demonstrates it in the shipped face: COMPANION_LIMBS[0] draws its cream
 * cap from x-2 and the cap arrives flat-sided.
 *
 * So this is hero-props.ts one blob down, and deliberately so: a sibling of the
 * blob rather than a child, positioned in ABSOLUTE canvas coordinates, with
 * companionGyro() repeated by hand. THE GYRO IS NOT OPTIONAL - <Gyro> is not
 * inherited between siblings, and the hero's props slide up to 16px off the fist
 * across a tilt sweep without it. The companion's gain is lower than the hero's on
 * purpose, so this must be companionGyro() and not heroGyro().
 *
 * DRAW ORDER: registered immediately after blobCompanion() in face/index.ts, so
 * the sickle paints over the blob holding it - the same relationship heroProps
 * has with the hero, for the same reason. A held object is nearer the viewer.
 *
 * NO ARM SWITCH, unlike the hero's side. The companion's four limbs are identical
 * day and night, so there is no pose in which this hand is not there - which is
 * why the sickle needs no equivalent of HANDS_FULL, and why states.ts proves that
 * predicate over the hero's arms alone.
 */

import { el, type Node } from '../xml.ts';
import { C } from '../palette.ts';
import * as G from '../geometry.ts';
import { AMBIENT_HIDE } from '../crossfade.ts';
import { switchOn } from '../condition.ts';
import { FORCE, LABOUR_DAY } from '../states.ts';
import { companionGyro } from '../blob.ts';
import { COMPANION_SABER, SICKLE, SICKLE_BLADE, SICKLE_BOX, SICKLE_HANDLE } from '../data/props.ts';
import { saberPart } from './saber.ts';

/**
 * The sickle: a crescent blade tapering to a point, on a short leaning handle.
 *
 * HANDLE FIRST, BLADE OVER IT, so the blade's foot covers the joint - and the two
 * overlap rather than meeting end to end, because at this scale a hairline of
 * background between two shapes reads as two objects. data/props.ts derives the
 * foot from the handle's own top end, so they cannot come apart.
 *
 * THE BLADE IS THREE ARCS ON ONE CIRCLE, thickest at the foot and thinnest at the
 * free end. WFF has no path primitive and every stroke is one constant thickness
 * end to end, so a tapered crescent is not expressible as a shape - but it is
 * expressible as a run of arcs that each get thinner, which is the same trick the
 * hammer's peen and the Santa hat's cone are built from. Drawn thin end FIRST so
 * each thicker step paints over the last one's cap.
 */
const sickle = (): Node[] => [
	el('PartDraw', { name: 'companion_sickle', ...SICKLE_BOX }, [
		el('Line', { ...SICKLE_HANDLE }, [
			el('Stroke', { color: C.WOOD, thickness: SICKLE.handle.thickness, cap: 'ROUND' })
		]),
		...SICKLE_BLADE.map(({ thickness, ...arc }) =>
			el('Arc', { ...arc }, [el('Stroke', { color: C.STEEL, thickness, cap: 'ROUND' })])
		)
	])
];

/**
 * The companion's own lightsaber, GREEN and leaning the other way.
 *
 * Same builder, same six strokes, three quarters the size - see face/saber.ts. The
 * mirroring is the point: two blades raised apart read as two characters, and two
 * parallel blades read as one character drawn twice.
 */
const lightsaber = (): Node[] => [
	saberPart('companion_lightsaber', COMPANION_SABER, C.SABER_GREEN)
];

/**
 * The wrapper carrying the position and the Gyro, kept separate from the
 * Condition so "where is it" and "when is it" stay two questions - the same split
 * heroPropsSection() makes.
 *
 * TWO OCCASIONS WANT THIS HAND, and neither can happen on the other's day - the
 * proof in states.ts walks all 372 month/day pairs and says so - so the order
 * between them carries no meaning, unlike heroProps() where the ordering IS how the
 * calendar beats the weekday. Listed as the year runs.
 */
export const companionProps = (): Node =>
	el('Group', { name: 'companion_props', ...G.ANCHORS.COMPANION_PROPS, alpha: 255 }, [
		companionGyro(),
		el('Variant', AMBIENT_HIDE),
		switchOn([
			{ name: 'companion_sickle', when: LABOUR_DAY, then: sickle() },
			{ name: 'companion_saber', when: FORCE, then: lightsaber() }
		])
	]);
