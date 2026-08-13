/**
 * Fireworks: five rockets climbing from a shared launch line, each blooming
 * into six varied sparks that fly out and fall. Shown only in the small hours
 * of New Year's Day.
 *
 * A TOP-LEVEL CANVAS OVERLAY, like rain.ts, not a prop attached to a blob - so
 * no Gyro, and it is the last section drawn, on top of everything else, the
 * same way the rain field sits in front of both blobs. See face/index.ts for
 * why draw order is the whole reason this file is a section rather than a
 * child of something else.
 *
 * ONE Group PER ROCKET AND PER SPARK, each covering the full canvas and
 * translating its own position from 0 - exactly rain.ts's per-drop Group. A
 * rocket's PartDraw sits at its fixed launch point and the Group's `y` climbs
 * to the burst's centre; a spark's PartDraw sits at that centre and the
 * Group's `x`/`y` grow outward from it. Neither shape ever has to describe its
 * own placement, only its own travel - see data/fireworks.ts for the timing
 * that keeps the two acts from overlapping.
 *
 * THIS FILE OWNS THE COLOUR, and the data module deliberately does not. Which
 * shells are single-coloured and which mix is a look, not geometry, and it is
 * expressed as the LENGTH of a burst's palette rather than as a flag beside it:
 * a one-entry palette IS a single-coloured shell, so "solid" and "three
 * colours" cannot contradict each other the way a `mode` field and a colour
 * list could.
 */

import { el, type Node } from '../xml.ts';
import { C } from '../palette.ts';
import * as G from '../geometry.ts';
import { AMBIENT_HIDE } from '../crossfade.ts';
import { when } from '../condition.ts';
import { NEW_YEAR } from '../states.ts';
import {
	BURSTS,
	LAUNCH_Y,
	rocketAlpha,
	rocketY,
	SPARK_SPECS,
	sparkAlpha,
	starSegments,
	starThickness,
	sparkX,
	sparkY,
	type Burst,
	type SparkSpec
} from '../data/fireworks.ts';

/**
 * One palette per burst, cycled across that burst's sparks.
 *
 * A SINGLE ENTRY IS A SINGLE-COLOURED SHELL - bursts 2 and 4 - which is what a
 * real shell of one chemistry looks like. The other three mix, always including
 * C.CREAM: a real multi-colour break reads as colour plus white sparks, not as
 * two hues competing. Every hex is one the face already uses elsewhere, so the
 * display reads as this face's palette going off rather than a second one
 * arriving with it.
 */
const BURST_PALETTES: readonly (readonly string[])[] = [
	[C.CORAL, C.CREAM, C.SUN],
	[C.TEAL],
	[C.SUN, C.CREAM],
	[C.GREEN],
	[C.SCARF, C.CREAM, C.TEAL]
];

if (BURST_PALETTES.length !== BURSTS.length) {
	throw new Error(`${BURSTS.length} bursts but ${BURST_PALETTES.length} palettes - one per burst`);
}
for (const [i, palette] of BURST_PALETTES.entries()) {
	if (palette.length === 0) {
		throw new Error(`burst ${i + 1} has an empty palette - it would draw nothing`);
	}
}

/** The rocket wears its burst's first colour, so the climb previews the break. */
const rocketColor = (burstIndex: number): string => BURST_PALETTES[burstIndex][0];

const sparkColor = (burstIndex: number, sparkIndex: number): string => {
	const palette = BURST_PALETTES[burstIndex];
	return palette[sparkIndex % palette.length];
};

/** The rocket's trail: a short vertical streak climbing to its burst. */
const ROCKET_LEN = 12;
const ROCKET_W = 3;

const rocket = (burst: Burst, burstIndex: number): Node => {
	const id = String(burstIndex + 1).padStart(2, '0');
	const box = G.box(burst.cx - 1, LAUNCH_Y, ROCKET_W, ROCKET_LEN + 1);

	return el('Group', { ...G.CANVAS, name: `firework_rocket_${id}`, alpha: 255 }, [
		el('Transform', { target: 'y', value: rocketY(burst) }),
		el('Transform', { target: 'alpha', value: rocketAlpha(burst) }),
		el('PartDraw', { name: `firework_rocket_shape_${id}`, ...box }, [
			el('Line', { startX: ROCKET_W / 2, startY: ROCKET_LEN, endX: ROCKET_W / 2, endY: 0 }, [
				el('Stroke', { color: rocketColor(burstIndex), thickness: 2, cap: 'ROUND' })
			])
		])
	]);
};

/**
 * What a spark actually draws: a filled disc, or three crossed lines.
 *
 * BUTT CAPS ON THE STAR, not ROUND. A stroke is centred on its path, so a
 * round cap would push each of the six points half a thickness past the end of
 * its own axis - and the axes already span the full box, so those six caps
 * would be clipped flat by the PartDraw. Butt caps end exactly on the box edge,
 * which is both uncropped and sharper, and a star wants sharp points anyway.
 */
const sparkMark = (spec: SparkSpec, color: string): Node[] => {
	if (spec.shape === 'star') {
		const thickness = starThickness(spec.size);
		return starSegments(spec.size).map((seg) =>
			el('Line', { ...seg }, [el('Stroke', { color, thickness, cap: 'BUTT' })])
		);
	}
	return [el('Ellipse', { ...G.at(spec.size, spec.size) }, [el('Fill', { color })])];
};

const spark = (
	burst: Burst,
	burstIndex: number,
	sparkIndex: number,
	spec: SparkSpec,
	color: string
): Node => {
	const id = `${burstIndex + 1}_${String(sparkIndex + 1).padStart(2, '0')}`;
	const boxSize = Math.ceil(spec.size) + 1;
	const box = G.box(
		Math.round(burst.cx - spec.size / 2),
		Math.round(burst.cy - spec.size / 2),
		boxSize,
		boxSize
	);

	return el('Group', { ...G.CANVAS, name: `firework_spark_${id}`, alpha: 255 }, [
		el('Transform', { target: 'x', value: sparkX(burst, spec) }),
		el('Transform', { target: 'y', value: sparkY(burst, spec) }),
		el('Transform', { target: 'alpha', value: sparkAlpha(burst, spec) }),
		el('PartDraw', { name: `firework_shape_${id}`, ...box }, sparkMark(spec, color))
	]);
};

export const fireworks = (): Node =>
	when('prop_fireworks', NEW_YEAR, [
		el('Group', { ...G.CANVAS, name: 'fireworks_field', alpha: 255 }, [
			el('Variant', AMBIENT_HIDE),
			...BURSTS.map((burst, b) => rocket(burst, b)),
			...BURSTS.flatMap((burst, b) =>
				SPARK_SPECS[b].map((spec, s) => spark(burst, b, s, spec, sparkColor(b, s)))
			)
		])
	]);
