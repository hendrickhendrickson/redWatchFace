/**
 * The umbrella the hero holds up in the rain.
 *
 * A TOP-LEVEL SIBLING of the hero, repeating its Gyro gain BY HAND AND NOT
 * OPTIONALLY: without it the hero's fist slid off the shaft by up to 16px across a
 * full tilt sweep, which is the observation that produced the note in blob.ts.
 *
 * The shaft's hook is an Arc rather than two lines, so the curve stays a curve at
 * any scale - and data/weather.ts now asserts that the straight run ends exactly
 * where the arc's rim begins, in both axes, which was previously four numbers
 * agreeing by hand.
 *
 * FOUR LOBES IN TWO SIZES make the dome; the ribs deliberately do NOT sit on the
 * lobe seams, since a rib drawn on a seam vanishes into it. Both are tables in
 * data/weather.ts, and the seam-avoidance is asserted rather than hoped for.
 */

import { el, type Node } from '../xml.ts';
import { C } from '../palette.ts';
import * as G from '../geometry.ts';
import { AMBIENT_HIDE } from '../crossfade.ts';
import { when } from '../condition.ts';
import { RAIN_LIKELY } from '../states.ts';
import { heroGyro } from '../blob.ts';
import {
	UMBRELLA,
	UMBRELLA_HOOK,
	UMBRELLA_LOBES,
	UMBRELLA_RIBS,
	UMBRELLA_SHAFT,
	UMBRELLA_SPAN
} from '../data/weather.ts';

const bone = (thickness: number) => [el('Stroke', { color: C.BONE, thickness, cap: 'ROUND' })];

export const heroUmbrella = (): Node =>
	when('prop_wet', RAIN_LIKELY, [
		el('Group', { name: 'hero_umbrella', ...G.ANCHORS.HERO_UMBRELLA, alpha: 255 }, [
			heroGyro(),
			el('Variant', AMBIENT_HIDE),
			el('PartDraw', { name: 'umbrella_shaft', ...G.at(164, 70) }, [
				...UMBRELLA_SHAFT.map((run) => el('Line', { ...run }, bone(UMBRELLA.shaft.thickness))),
				el('Arc', { ...UMBRELLA_HOOK }, bone(UMBRELLA.shaft.thickness))
			]),
			el('PartDraw', { name: 'umbrella_canopy', ...G.at(164, 30) }, [
				el('RoundRectangle', { ...UMBRELLA_SPAN }, [el('Fill', { color: C.TEAL })]),
				...UMBRELLA_LOBES.map((lobe) =>
					el('Ellipse', { ...lobe }, [el('Fill', { color: C.TEAL })])
				),
				...UMBRELLA_RIBS.map((rib) =>
					el('Line', { ...rib }, [
						el('Stroke', { color: C.TEAL_DARK, thickness: UMBRELLA.rib.thickness, cap: 'BUTT' })
					])
				)
			])
		])
	]);
