/**
 * Birthday confetti: twenty scraps of paper falling across the whole face,
 * each on its own phase, each turned to its own angle.
 *
 * A TOP-LEVEL CANVAS OVERLAY, like rain.ts and fireworks.ts - it belongs to
 * nothing on the face, so it has no Gyro and it draws over everything. Registered
 * last but one in face/index.ts, beside the fireworks, because those two are the
 * only sections that are meant to cover the clock.
 *
 * ONE Group PER PIECE, covering the full canvas and translating from 0. That is
 * rain.ts's per-drop construction exactly, and for the same reason: a Part's own
 * x/y are authoring-time integers and cannot be animated, so anything that moves
 * moves as a Group around a stationary Part.
 *
 * EACH PIECE IS TURNED, AND NONE OF THEM TUMBLE. `angle` is a PartDraw attribute
 * and the face has never animated one - the fireworks and the leaves both set it
 * statically - so a spinning scrap would be the first, on a target where an
 * expression that validates can still do nothing at all. Twenty scraps at twenty
 * fixed angles read as confetti; the tumble is not worth being the experiment.
 *
 * THE SCATTER IS HAND-PLACED, like rain.ts's. Values repeat and there is no
 * generator behind them; they stay tabulated.
 */

import { el, type Node } from '../xml.ts';
import { C } from '../palette.ts';
import * as G from '../geometry.ts';
import { AMBIENT_HIDE } from '../crossfade.ts';
import { when } from '../condition.ts';
import { BIRTHDAY } from '../states.ts';
import { grow, phase, triangleAlpha } from '../expr.ts';

type Scrap = {
	x: number;
	y: number;
	/** Paper, so one side is longer than the other. */
	w: number;
	h: number;
	/** How far it falls over one cycle. */
	fall: number;
	/** Which way this scrap is turned. Static - see the header. */
	angle: number;
	/**
	 * Cycles per second, and the offset that de-synchronises this scrap.
	 *
	 * 60 * hz MUST BE A WHOLE NUMBER. SECOND_MILLISECOND wraps 59.999 -> 0, so a
	 * fract() phase is only continuous across that wrap when it is - and when it is
	 * not, nothing fails: the face renders, the validator passes, and every scrap
	 * jumps once a minute. Asserted below, as DRIP_RATE is.
	 */
	hz: number;
	ph: number;
	/** Index into COLOURS. */
	c: number;
};

/** The face's own palette going off, not a second one arriving with it. */
const COLOURS = [C.CORAL, C.SUN, C.TEAL, C.GREEN, C.SCARF, C.CREAM, C.PARTY];

const SCRAPS: Scrap[] = [
	{ x: 96, y: 70, w: 7, h: 4, fall: 300, angle: 24, hz: 0.2, ph: 0.07, c: 0 },
	{ x: 318, y: 62, w: 6, h: 4, fall: 320, angle: -38, hz: 0.2, ph: 0.61, c: 1 },
	{ x: 148, y: 44, w: 8, h: 4, fall: 340, angle: 62, hz: 0.25, ph: 0.23, c: 2 },
	{ x: 262, y: 78, w: 6, h: 5, fall: 290, angle: -14, hz: 0.2, ph: 0.88, c: 3 },
	{ x: 74, y: 120, w: 7, h: 4, fall: 260, angle: 47, hz: 0.25, ph: 0.35, c: 4 },
	{ x: 356, y: 108, w: 6, h: 4, fall: 270, angle: -55, hz: 0.25, ph: 0.72, c: 5 },
	{ x: 208, y: 36, w: 7, h: 5, fall: 350, angle: 8, hz: 0.2, ph: 0.16, c: 6 },
	{ x: 122, y: 168, w: 6, h: 4, fall: 230, angle: -29, hz: 0.3, ph: 0.44, c: 1 },
	{ x: 296, y: 152, w: 8, h: 4, fall: 240, angle: 71, hz: 0.3, ph: 0.91, c: 0 },
	{ x: 52, y: 186, w: 6, h: 5, fall: 200, angle: 33, hz: 0.3, ph: 0.28, c: 2 },
	{ x: 386, y: 176, w: 7, h: 4, fall: 210, angle: -66, hz: 0.3, ph: 0.55, c: 3 },
	{ x: 178, y: 96, w: 6, h: 4, fall: 300, angle: 19, hz: 0.25, ph: 0.79, c: 5 },
	{ x: 240, y: 128, w: 7, h: 5, fall: 270, angle: -42, hz: 0.25, ph: 0.11, c: 4 },
	{ x: 336, y: 216, w: 6, h: 4, fall: 180, angle: 58, hz: 0.35, ph: 0.66, c: 6 },
	{ x: 88, y: 240, w: 7, h: 4, fall: 160, angle: -21, hz: 0.35, ph: 0.38, c: 0 },
	{ x: 272, y: 196, w: 6, h: 5, fall: 200, angle: 76, hz: 0.35, ph: 0.94, c: 2 },
	{ x: 156, y: 224, w: 8, h: 4, fall: 170, angle: -9, hz: 0.35, ph: 0.5, c: 1 },
	{ x: 368, y: 258, w: 6, h: 4, fall: 140, angle: 41, hz: 0.4, ph: 0.19, c: 3 },
	{ x: 62, y: 276, w: 7, h: 5, fall: 130, angle: -73, hz: 0.4, ph: 0.83, c: 4 },
	{ x: 216, y: 264, w: 6, h: 4, fall: 150, angle: 12, hz: 0.4, ph: 0.31, c: 5 }
];

/**
 * A scrap: a Group that falls and fades, holding a turned Part that does neither.
 *
 * THE BOX IS SQUARE AND SIZED FOR THE ROTATION. A Part clips to its own box and
 * the box turns with the Part, so a 7x4 rectangle in a 7x4 box loses its corners
 * the moment it is turned at all. A square of the rectangle's own diagonal holds
 * it at every angle, and the rectangle is then centred inside it.
 */
const scrap = (item: Scrap, index: number): Node => {
	const label = String(index + 1).padStart(2, '0');
	const side = Math.ceil(Math.hypot(item.w, item.h)) + 1;
	const spin = phase(item.hz, item.ph);

	return el('Group', { ...G.CANVAS, name: `confetti_${label}`, alpha: 255 }, [
		el('Transform', { target: 'y', value: grow(0, item.fall, spin) }),
		el('Transform', { target: 'alpha', value: triangleAlpha(spin) }),
		el(
			'PartDraw',
			{
				name: `confetti_shape_${label}`,
				x: item.x,
				y: item.y,
				width: side,
				height: side,
				pivotX: 0.5,
				pivotY: 0.5,
				angle: item.angle
			},
			[
				el(
					'Rectangle',
					{
						x: (side - item.w) / 2,
						y: (side - item.h) / 2,
						width: item.w,
						height: item.h
					},
					[el('Fill', { color: COLOURS[item.c % COLOURS.length] })]
				)
			]
		)
	]);
};

export const confetti = (): Node =>
	when('prop_confetti', BIRTHDAY, [
		el('Group', { ...G.CANVAS, name: 'confetti_field', alpha: 255 }, [
			el('Variant', AMBIENT_HIDE),
			...SCRAPS.map(scrap)
		])
	]);

{
	const problems: string[] = [];

	for (const [i, item] of SCRAPS.entries()) {
		if (Math.abs(item.hz * 60 - Math.round(item.hz * 60)) > 1e-9) {
			problems.push(
				`scrap ${i + 1} falls at ${item.hz}Hz, which does not divide the minute: 60 * ${item.hz} ` +
					`is ${item.hz * 60}, so it would snap back to the top once every sixty seconds`
			);
		}
		if (item.c >= COLOURS.length) {
			problems.push(`scrap ${i + 1} asks for colour ${item.c} of ${COLOURS.length}`);
		}
	}

	/**
	 * AT LEAST HALF THE CONFETTI IS VISIBLE IN A CAPTURE.
	 *
	 * mock-state.ts freezes SECOND_MILLISECOND at 1.0 so screenshots are
	 * deterministic, and triangleAlpha is ZERO at both ends of its phase. A scrap
	 * whose fract(1.0 * hz + ph) lands on 0 or 1 renders nothing - and a table
	 * where too many of them do produces a docs frame of an empty sky that looks
	 * exactly like a feature that was never built. README:286 records this trap;
	 * this is the first table to check itself against it rather than be checked by
	 * someone noticing.
	 */
	const MOCK_MS = 1.0;
	const lit = SCRAPS.filter((item) => {
		const p = (MOCK_MS * item.hz + item.ph) % 1;
		const alpha = 255 * (Math.min(4 * p, 1) - Math.max(Math.min(4 * p - 3, 1), 0));
		return alpha > 0;
	}).length;

	if (lit < SCRAPS.length / 2) {
		problems.push(
			`only ${lit} of ${SCRAPS.length} scraps are lit at the frozen capture instant ` +
				'(SECOND_MILLISECOND = 1.0) - the birthday frame would come out nearly empty'
		);
	}

	if (problems.length) {
		throw new Error(`the confetti no longer falls:\n  ${problems.join('\n  ')}`);
	}
}
