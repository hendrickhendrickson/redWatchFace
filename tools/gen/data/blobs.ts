/**
 * The two blobs, as data.
 *
 * WHAT THIS IS NOT: one parameterised blob(). blob.ts argues at length against
 * that and the argument still holds - the companion is not the hero scaled down.
 * Its gyro gain is lower on purpose, its arms drop differently at night, its scarf
 * tail is clipped by its own box, and its sweat figure is the hero's scaled 1.5x
 * rather than the reverse. Folding fifteen measured exceptions into flags on one
 * builder would make the next wrist iteration fight the abstraction.
 *
 * So: two separate row sets, read by two separate call sequences, through shared
 * builders that take explicit geometry. What changes is that the ROWS are now
 * written once instead of the coordinates being typed once per colour pass.
 *
 * THE ONE IDEA WORTH THE FILE: a limb is a line drawn TWICE, once thick in cream
 * and once thin in ink, with a cap ellipse on each pass. The hand-written version
 * typed each line's four coordinates twice - once in the cream block and again in
 * the ink block, separated by up to twenty lines - so a limb could be moved on one
 * pass and not the other, producing an ink core sticking out of a cream sleeve.
 * Here each limb is one row and both passes read it.
 *
 * AND THE GLOVES COME FROM THE SAME ROWS. Every glove was a byte-identical copy of
 * an arm's cream cap ellipse, in a different part of the file, with only the fill
 * changed - four such copies in the hero, two in the companion. Deriving them
 * removes the same class of bug that handing bodyPart and mouthMask the same colour
 * removed: a mitten that no longer sits on its hand cannot be written.
 */

import type { Box } from '../geometry.ts';
import * as G from '../geometry.ts';
import type { HeartTread } from '../expr.ts';
import { T } from '../states.ts';

/** A limb: one line, drawn twice, with a cap on each pass. */
export type Limb = {
	line: { startX: number; startY: number; endX: number; endY: number };
	/** The outer cream cap - a hand or a foot. Gloves are drawn from this box. */
	cream: Box;
	/** The inner ink cap, inset inside the cream one. */
	ink: Box;
};

/** How thick each of a blob's two passes is. */
export type LimbStroke = {
	cream: number;
	ink: number;
};

// --- The hero ---------------------------------------------------------------

export const HERO_STROKE: LimbStroke = { cream: 8, ink: 4.5 };

/** Both legs, in one part. Always drawn; the arms are pose-dependent. */
export const HERO_LEGS: Limb[] = [
	{
		line: { startX: 38, startY: 112, endX: 34, endY: 124 },
		cream: G.box(22, 117, 24, 15),
		ink: G.box(24, 119, 20, 11)
	},
	{
		line: { startX: 62, startY: 112, endX: 66, endY: 124 },
		cream: G.box(54, 117, 24, 15),
		ink: G.box(56, 119, 20, 11)
	}
];

/**
 * The four arm poses, one Limb each.
 *
 * `leftUp` IS THE ANCHOR FOR EVERY HELD PROP. Its cream cap at (1,26,19,18) puts
 * the hand's centre at group-local (10.5,35), and data/props.ts derives the prop
 * group's own hand position from exactly this row rather than from a number typed
 * into a comment. See the header of face/hero-props.ts.
 */
export const HERO_ARMS = {
	/** Raised, holding whatever the props section draws. The daytime default. */
	leftUp: {
		line: { startX: 22, startY: 70, endX: 11, endY: 40 },
		cream: G.box(1, 26, 19, 18),
		ink: G.box(3, 28, 15, 14)
	},
	/** Hanging, at night when it is not raining. */
	leftDown: {
		line: { startX: 24, startY: 78, endX: 12, endY: 96 },
		cream: G.box(0.5, 93, 19, 18),
		ink: G.box(2.5, 95, 15, 14)
	},
	/** Out to the side, the daytime default. Lands partly under the headset cup. */
	rightOut: {
		line: { startX: 84, startY: 74, endX: 93, endY: 62 },
		cream: G.box(84, 52, 18, 17),
		ink: G.box(86, 54, 14, 13)
	},
	/** Hanging, at night. */
	rightDown: {
		line: { startX: 76, startY: 78, endX: 88, endY: 96 },
		cream: G.box(80.5, 93, 19, 18),
		ink: G.box(82.5, 95, 15, 14)
	}
} as const satisfies Record<string, Limb>;

/**
 * The leaf tuft: three leaves, all in one box, rotated about its centre.
 *
 * The centre leaf is the light green one and carries a vein; the outer two are
 * darker and sit behind it. Order is draw order.
 */
export type Leaf = {
	name: string;
	angle: number;
	/** The blade. */
	blade: Box;
	dark: boolean;
	/** The centre leaf's vein, if it has one. */
	vein?: { startX: number; startY: number; endX: number; endY: number };
};

export const HERO_LEAVES: Leaf[] = [
	{ name: 'leaf_left', angle: -36, blade: G.box(30, 4, 20, 36), dark: true },
	{ name: 'leaf_right', angle: 34, blade: G.box(30, 6, 20, 34), dark: true },
	{
		name: 'leaf_center',
		angle: 0,
		blade: G.box(29, 0, 22, 40),
		dark: false,
		vein: { startX: 40, startY: 36, endX: 40, endY: 8 }
	}
];

/**
 * The 20 April tuft: the same hair, grown into a cannabis leaf.
 *
 * LOW-KEY BY CONSTRUCTION, AND THAT IS THE WHOLE BRIEF. Nothing new is introduced
 * to make this read - no new colour, no new primitive, no outline, no serration.
 * It is the same `Leaf` rows through the same leafPart(); only the count and the
 * proportions change. At a glance it is still the blob's hair, and only on a
 * second look is it anything else.
 *
 * DERIVED, NOT TABULATED, and that is the whole reason this is a builder. The
 * three properties the shape needs - one shared origin, a symmetric spread, and a
 * size that falls off smoothly from the middle blade outward - are each one line
 * here and were each an invitation to drift when the blades were ten hand-typed
 * boxes. The first cut had five independent bases spanning y40..41 and two size
 * steps that jumped; both are now impossible rather than asserted.
 *
 * EVERY BLADE IS ROOTED AT THE PIVOT, AND THE PIVOT IS THE TOP OF THE BODY.
 * leafPart swings each blade about a point given as a fraction of the shared box,
 * so a blade whose base is anywhere else orbits a point it is not attached to -
 * with five narrow blades that reads as a splay rather than a fan. Rooting them
 * ALL at the pivot makes the tuft radiate by construction, and putting that pivot
 * on the body's own crown rather than 4px inside it is what stops the blades
 * appearing to sprout out of the blob's forehead.
 */
type FanSpec = {
	/** Part-name stem. Blades are numbered outward from the centre. */
	prefix: string;
	/** How many symmetric pairs flank the centre blade. */
	pairs: number;
	/** The outermost pair's angle. Inner pairs are interpolated towards 0. */
	spread: number;
	/** The shared root, in the tuft box's coordinates - see FAN_PIVOT. */
	root: { x: number; y: number };
	/** The centre blade, and the outermost pair. Everything between is a blend. */
	centre: { length: number; width: number };
	outer: { length: number; width: number };
};

/** A tuft, with the pivot leafPart has to swing it about. */
export type Fan = {
	/** Fractions of the tuft box, which is the form WFF's pivotX/pivotY take. */
	pivot: { x: number; y: number };
	leaves: Leaf[];
};

/**
 * A symmetric fan of blades, all rooted at one point, sized smoothly from the
 * middle outward.
 *
 * Draw order is back to front - outermost pair first, centre blade last - which is
 * the order the ordinary tuft is written in, and it is what lets the blades overlap
 * without the fan looking shuffled.
 */
const fan = (box: G.Box, spec: FanSpec): Fan => {
	const blade = (name: string, angle: number, t: number): Leaf => {
		const length = spec.centre.length + (spec.outer.length - spec.centre.length) * t;
		const width = spec.centre.width + (spec.outer.width - spec.centre.width) * t;
		return {
			name,
			angle,
			// The base sits ON the root, so rotating about the root leaves it there.
			blade: G.box(spec.root.x - width / 2, spec.root.y - length, width, length),
			dark: t > 0
		};
	};

	const leaves: Leaf[] = [];
	for (let rank = spec.pairs; rank >= 1; rank--) {
		const t = rank / spec.pairs;
		const angle = spec.spread * t;
		leaves.push(blade(`${spec.prefix}_${rank}_left`, -angle, t));
		leaves.push(blade(`${spec.prefix}_${rank}_right`, angle, t));
	}
	leaves.push({
		...blade(`${spec.prefix}_center`, 0, 0),
		// The one vein on the tuft, up the middle of the blade that carries it.
		vein: {
			startX: spec.root.x,
			startY: spec.root.y - 2,
			endX: spec.root.x,
			endY: spec.root.y - spec.centre.length + 4
		}
	});

	// Rounded to 6dp: a pivot is a fraction, and 20/48 unrounded is eighteen
	// characters of XML for a quarter of a thousandth of a pixel.
	const frac = (value: number): number => Math.round(value * 1e6) / 1e6;
	return { pivot: { x: frac(spec.root.x / box.width), y: frac(spec.root.y / box.height) }, leaves };
};

/**
 * The root of each tuft: the centre of its blob's crown, in tuft-box coordinates.
 *
 * DERIVED FROM THE BODY, so the hair cannot come adrift from the head it grows out
 * of. Both tuft boxes and both body boxes are siblings inside the same limb box, so
 * this is one subtraction rather than a measured offset.
 */
const crownOf = (body: G.Box, tuft: G.Box) => ({
	x: body.x + body.width / 2 - tuft.x,
	y: body.y - tuft.y
});

/**
 * FIVE BLADES ON THE HERO. An odd symmetric fan of narrow blades IS the cannabis
 * silhouette; nothing else here is doing any of that work.
 *
 * The centre blade is 35 long against the outermost pair's 24, and 13 wide against
 * 8 - a leaf whose blades are all one size reads as a starburst. 35 is also the
 * ceiling: the root is 36px down an 80px box, so a longer centre blade runs out of
 * the top of the tuft and is cut flat.
 */
export const HERO_WEED_FAN: Fan = fan(G.LEAF_BOX, {
	prefix: 'leaf_weed',
	pairs: 2,
	spread: 64,
	root: crownOf(G.HERO_BOX, G.LEAF_BOX),
	centre: { length: 35, width: 13 },
	outer: { length: 24, width: 8 }
});

export const HERO_LEAVES_WEED: Leaf[] = HERO_WEED_FAN.leaves;

// --- The companion ----------------------------------------------------------

export const COMPANION_STROKE: LimbStroke = { cream: 6.2, ink: 3.2 };

/**
 * All four limbs in one part, unlike the hero.
 *
 * THE COMPANION HAS NO ARM POSES. It keeps the same four limbs day and night,
 * which is one of the measured differences between the two blobs rather than an
 * omission - the hero's arms are what carry props and the umbrella, and the
 * companion carries nothing.
 *
 * EVERY CAP SITS FULLY INSIDE THE 62x72 PART BOX, and that took moving four of
 * them: the left arm's cap used to start at x-2 (2px outside, clipped flat on
 * its left edge) and the right arm's and both legs' caps ran 1px past the box's
 * right/bottom edge. Only the HAND/FOOT end of each limb moved - 1-2px, toward
 * the body - so the shoulder/hip attachment (`line.startX/startY`) is untouched
 * and the cream/ink pair still shares the same centre it always did. See
 * face/hero-props.ts and the clipping note in svg.ts for why a Part clipping to
 * its own box is real WFF behaviour, not a preview artefact - this was that
 * exact bug class, just not caught here until it was visibly wrong on a wrist.
 */
export const COMPANION_LIMBS: Limb[] = [
	{
		line: { startX: 12, startY: 44, endX: 7, endY: 38 },
		cream: G.box(0, 32, 13, 12),
		ink: G.box(2, 34, 9, 8)
	},
	{
		line: { startX: 48, startY: 44, endX: 55, endY: 37 },
		cream: G.box(49, 30, 13, 12),
		ink: G.box(51, 32, 9, 8)
	},
	{
		line: { startX: 24, startY: 60, endX: 22, endY: 65 },
		cream: G.box(12, 60, 19, 12),
		ink: G.box(14, 62, 15, 8)
	},
	{
		line: { startX: 38, startY: 60, endX: 40, endY: 65 },
		cream: G.box(31, 60, 19, 12),
		ink: G.box(33, 62, 15, 8)
	}
];

/**
 * The step-goal flag's pole, and the hand that holds it.
 *
 * THIS EXISTS BECAUSE THE GRIP WAS LOST ONCE. The pole was authored to be held by
 * `rightOut`'s fist - it runs down x93, the exact centre of that cap, and spans
 * y19..74, bracketing the cap's centre at y60.5 - but nothing said so, so when the
 * salute was removed and the flag became a *branch* of the right-arm switch instead
 * of its own Condition, the arm stopped being drawn in the goal state and the pole
 * floated. Three releases, and the committed screenshot still showed the old grip.
 *
 * Recording the pole here, next to the arm row it depends on, is what makes the
 * relationship checkable. face/blob-hero.ts draws it.
 */
export const GOAL_POLE = { x: 93, top: 19, bottom: 74, thickness: 2.5 };

{
	const cap = HERO_ARMS.rightOut.cream;
	const fist = { x: cap.x + cap.width / 2, y: cap.y + cap.height / 2 };
	const problems: string[] = [];
	// Half a pixel either way: the pole has to pass through the fist, not near it.
	if (Math.abs(GOAL_POLE.x - fist.x) > 0.5) {
		problems.push(
			`the pole is at x${GOAL_POLE.x} and the fist at x${fist.x} - it would be held beside the hand`
		);
	}
	if (fist.y < GOAL_POLE.top || fist.y > GOAL_POLE.bottom) {
		problems.push(
			`the fist is at y${fist.y}, outside the pole's ${GOAL_POLE.top}..${GOAL_POLE.bottom} - ` +
				'the hand would grip empty air'
		);
	}
	if (problems.length) {
		throw new Error(`the step-goal flag is no longer held:\n  ${problems.join('\n  ')}`);
	}
}

/** Which limbs are hands, and so get mittens when it is cold enough. */
export const COMPANION_HAND_LIMBS = [0, 1] as const;

export const COMPANION_LEAVES: Leaf[] = [
	{ name: 'companion_leaf_left', angle: -26, blade: G.box(19, 6, 11, 18), dark: true },
	{ name: 'companion_leaf_right', angle: 20, blade: G.box(18, 4, 12, 20), dark: false }
];

/**
 * The companion's 20 April tuft. THREE BLADES, NOT FIVE.
 *
 * Its whole tuft box is 48 square against the hero's 80, so the five-blade fan
 * scaled down puts two pairs of 3px blades inside 30px of arc - which at 0.95x on
 * the device is a smudge, not a leaf. Three keeps the symmetric odd fan, which is
 * the part that carries the read, and drops the pair that would not survive.
 *
 * IT IS PROPORTIONALLY FATTER THAN THE HERO'S, not a scaled copy. The first cut
 * scaled the hero's ratios down and the blades arrived 5px wide against a 20px
 * length - at 0.95x on the device that is four and a half device pixels of green,
 * and the tuft read as three hairs rather than as a leaf. 10 and 7.5 against the
 * same lengths gives the same silhouette enough body to survive the scale, and the
 * width ratio (0.50 against the hero's 0.37) is the one place the two fans
 * deliberately disagree.
 *
 * The companion's normal tuft has only TWO blades and no centre one, so unlike the
 * hero's this is not "the same tuft, narrower" - it gains an axis of symmetry it
 * does not normally have. That is the trade for legibility at this size.
 */
export const COMPANION_WEED_FAN: Fan = fan(G.COMPANION_LEAF_BOX, {
	prefix: 'companion_leaf_weed',
	pairs: 1,
	spread: 38,
	root: crownOf(G.COMPANION_BOX, G.COMPANION_LEAF_BOX),
	centre: { length: 20, width: 10 },
	outer: { length: 14.5, width: 7.5 }
});

export const COMPANION_LEAVES_WEED: Leaf[] = COMPANION_WEED_FAN.leaves;

// --- The tufts, checked -----------------------------------------------------

/**
 * A ROTATED BLADE THAT LEAVES ITS BOX IS CUT OFF, SILENTLY.
 *
 * leafPart puts each blade in a PartDraw carrying `angle` and a pivot, so what is
 * drawn is not the authored rectangle - it is that rectangle swung about a point
 * somewhere in the tuft. Nothing anywhere reports a blade whose tip has been shaved
 * off by its own part edge, and the wider the angle the further the tip travels:
 * the weed fan reaches +-64 degrees where the normal tuft stops at 36, so it moves
 * a blade's far end about 13px further out.
 *
 * THE PIVOT IS AN ARGUMENT because the two kinds of tuft no longer share one. The
 * ordinary tufts swing about the box's centre, which is where they have always
 * swung; the weed fans swing about the crown of the body underneath, which is 4px
 * higher on the hero and 4px higher on the companion. Defaulting it would have made
 * a wrong pivot the quiet option.
 *
 * The bound is exact rather than sampled. For an ellipse of radii (rx,ry) turned
 * by t, the axis-aligned half-extents are sqrt((rx*cos t)^2 + (ry*sin t)^2) and
 * sqrt((rx*sin t)^2 + (ry*cos t)^2) - the standard result, and cheaper than
 * walking the perimeter.
 */
const checkTuft = (
	label: string,
	box: G.Box,
	leaves: Leaf[],
	pivot: { x: number; y: number }
): string[] => {
	const problems: string[] = [];

	for (const leaf of leaves) {
		const t = (leaf.angle * Math.PI) / 180;
		const rx = leaf.blade.width / 2;
		const ry = leaf.blade.height / 2;
		// The blade's centre, swung about the pivot.
		const dx = leaf.blade.x + rx - pivot.x;
		const dy = leaf.blade.y + ry - pivot.y;
		const cx = pivot.x + dx * Math.cos(t) - dy * Math.sin(t);
		const cy = pivot.y + dx * Math.sin(t) + dy * Math.cos(t);
		const hx = Math.hypot(rx * Math.cos(t), ry * Math.sin(t));
		const hy = Math.hypot(rx * Math.sin(t), ry * Math.cos(t));

		if (cx - hx < 0 || cy - hy < 0 || cx + hx > box.width || cy + hy > box.height) {
			problems.push(
				`${label}: ${leaf.name} at ${leaf.angle} degrees spans ` +
					`(${(cx - hx).toFixed(1)},${(cy - hy).toFixed(1)})..` +
					`(${(cx + hx).toFixed(1)},${(cy + hy).toFixed(1)}) in a ${box.width}x${box.height} ` +
					'box - its tip would be cut flat'
			);
		}
		// Every blade radiates from the pivot, so its base has to be AT the pivot.
		// A blade rooted elsewhere swings around a point it is not attached to.
		const base = leaf.blade.y + leaf.blade.height;
		if (Math.abs(base - pivot.y) > 2) {
			problems.push(
				`${label}: ${leaf.name}'s base is at y${base}, ${Math.abs(base - pivot.y)} from the ` +
					`pivot at y${pivot.y} - it would swing away from the tuft instead of fanning out of it`
			);
		}
	}
	return problems;
};

const CENTRE_OF = (box: G.Box) => ({ x: box.width / 2, y: box.height / 2 });

{
	const problems = [
		...checkTuft('hero tuft', G.LEAF_BOX, HERO_LEAVES, CENTRE_OF(G.LEAF_BOX)),
		...checkTuft(
			'companion tuft',
			G.COMPANION_LEAF_BOX,
			COMPANION_LEAVES,
			CENTRE_OF(G.COMPANION_LEAF_BOX)
		)
	];

	for (const [label, box, body, tuft] of [
		['hero', G.LEAF_BOX, G.HERO_BOX, HERO_WEED_FAN],
		['companion', G.COMPANION_LEAF_BOX, G.COMPANION_BOX, COMPANION_WEED_FAN]
	] as const) {
		const pivot = { x: tuft.pivot.x * box.width, y: tuft.pivot.y * box.height };
		problems.push(...checkTuft(`${label} weed tuft`, box, tuft.leaves, pivot));

		/**
		 * THE FAN GROWS OUT OF THE CROWN, not out of the forehead.
		 *
		 * The pivot is a FRACTION in the XML and a position here, and the two have to
		 * describe the same point or the blades swing about somewhere they are not
		 * attached to. Checked against the body box rather than against the number it
		 * was derived from, so moving a blob is what this reports.
		 */
		const crown = { x: body.x + body.width / 2 - box.x, y: body.y - box.y };
		if (Math.abs(pivot.x - crown.x) > 0.001 || Math.abs(pivot.y - crown.y) > 0.001) {
			problems.push(
				`the ${label} weed fan pivots on (${pivot.x},${pivot.y}) and its body's crown is at ` +
					`(${crown.x},${crown.y}) - the blades would radiate from a point off the head`
			);
		}

		/**
		 * SYMMETRIC, AND SHRINKING SMOOTHLY OUTWARD.
		 *
		 * Both are properties of fan() rather than of these rows, so what this really
		 * checks is that fan() still has them - which is worth having, because it is
		 * the one place a sign error or an off-by-one in the rank loop would show up as
		 * a lopsided leaf and nothing else.
		 */
		const leaves = tuft.leaves;
		if (leaves.length % 2 === 0) {
			problems.push(`the ${label} weed fan has ${leaves.length} blades - it needs a centre one`);
		}
		if (leaves.at(-1)?.angle !== 0) {
			problems.push(`the ${label} weed fan's last blade is not the upright centre one`);
		}
		for (let i = 0; i + 1 < leaves.length - 1; i += 2) {
			const [left, right] = [leaves[i], leaves[i + 1]];
			if (left.angle !== -right.angle) {
				problems.push(
					`the ${label} weed fan is lopsided: ${left.name} at ${left.angle} against ` +
						`${right.name} at ${right.angle}`
				);
			}
			if (left.blade.width !== right.blade.width || left.blade.height !== right.blade.height) {
				problems.push(`${left.name} and ${right.name} are not the same size`);
			}
		}
		// Every blade rooted at the same point - the property the whole builder exists
		// for, and the one the hand-typed version got wrong across a 1px spread.
		for (const leaf of leaves) {
			const base = { x: leaf.blade.x + leaf.blade.width / 2, y: leaf.blade.y + leaf.blade.height };
			if (Math.abs(base.x - pivot.x) > 0.001 || Math.abs(base.y - pivot.y) > 0.001) {
				problems.push(
					`the ${label} weed fan's ${leaf.name} is rooted at (${base.x},${base.y}), not on the ` +
						`shared pivot at (${pivot.x},${pivot.y})`
				);
			}
		}
		// And the centre blade is the biggest, in BOTH axes - the brief, as a check.
		const centre = leaves.at(-1);
		for (const leaf of leaves.slice(0, -1)) {
			if (
				centre === undefined ||
				leaf.blade.width >= centre.blade.width ||
				leaf.blade.height >= centre.blade.height
			) {
				problems.push(
					`the ${label} weed fan's ${leaf.name} is not smaller than its centre blade in both axes`
				);
			}
		}
	}

	if (problems.length) {
		throw new Error(`a leaf tuft no longer holds together:\n  ${problems.join('\n  ')}`);
	}
}

// --- Sweat ------------------------------------------------------------------

/**
 * The forehead cluster, as one table per blob plus the subsets each branch shows.
 *
 * THREE DISCRETE STEPS, and the SUBSETS ARE THE SAME FOR BOTH BLOBS: one bead is
 * the middle of the three, two are the outer pair, three are all of them. Written
 * out, that was six literal blocks per blob encoding one 3-row table and three
 * index sets - and the middle bead's coordinates appeared twice per blob, in the
 * "three" block and again in the "one" block.
 *
 * The companion's figure is the hero's scaled to suit the larger head relative to
 * its body, not the other way round; see blob.ts.
 */
export type SweatFigure = {
	beads: Box[];
	/** Indices into `beads`, per branch. Shared by both blobs by design. */
	three: number[];
	two: number[];
	one: number[];
};

const SUBSETS = { three: [0, 1, 2], two: [0, 2], one: [1] };

export const HERO_SWEAT: SweatFigure = {
	beads: [G.box(0, 3, 6, 7.5), G.box(9, 0, 6, 7.5), G.box(18, 3, 6, 6)],
	...SUBSETS
};

export const COMPANION_SWEAT: SweatFigure = {
	beads: [G.box(0, 2, 4, 5), G.box(6, 0, 4, 5), G.box(12, 2, 4, 4)],
	...SUBSETS
};

/**
 * The drips: two out-of-phase groups of beads sliding down the cheeks.
 *
 * `fall` and `fallExtra` are the distance at the sweat gate and how much further
 * it slides at double that heart rate - the hero's 12 growing to 30, the
 * companion's 4 to 10.
 *
 * `secondFrom`/`secondTo` FADE THE SECOND DRIP IN LATE, so a resting-but-warm
 * wearer gets one trickle rather than two. It brackets the all-three-beads
 * threshold, which is why it is expressed against T.SWEAT_ALL_BPM instead of as
 * two more loose numbers.
 */
export type DripFigure = {
	beads: Box[];
	fall: number;
	fallExtra: number;
	secondFrom: number;
	secondTo: number;
};

const SECOND_DRIP = { secondFrom: T.SWEAT_ALL_BPM - 10, secondTo: T.SWEAT_ALL_BPM + 10 };

export const HERO_DRIP: DripFigure = {
	beads: [G.box(20, 55, 5, 7), G.box(73, 55, 5, 7)],
	fall: 12,
	fallExtra: 18,
	...SECOND_DRIP
};

export const COMPANION_DRIP: DripFigure = {
	beads: [G.box(12, 37, 3.5, 4.5), G.box(44.5, 37, 3.5, 4.5)],
	fall: 4,
	fallExtra: 6,
	...SECOND_DRIP
};

/**
 * How far the drip amplitude ramp reaches above the gate.
 *
 * The fall grows from `fall` to `fall + fallExtra` as the heart rate goes from the
 * sweat gate to this much above it. 100 over 100 is one doubling, which is what
 * the authored expression encoded.
 */
export const DRIP_RAMP_SPAN = 100;

/**
 * How OFTEN a drip runs, in cycles per second, per heart-rate band.
 *
 * THE DRIP USED TO RUN AT A FIXED 2 SECONDS at every pulse from 100 to 220, so
 * the only thing the heart rate changed was how far a bead slid - a 12px fall
 * growing to 30px, which reads as "slightly longer streak", not as effort. Rate
 * is what the eye actually reads as intensity, and it now spans 3:1:
 *
 *   100-119   0.2   one bead every 5.0s   a slow seep, forehead still bare
 *   120-139   0.25                4.0s    the middle pearl is out
 *   140-159   0.3                 3.3s    the outer pair
 *   160-199   0.4                 2.5s    all three, and the second drip fades in
 *   200+      0.6                 1.7s    two drips out of phase: dripping
 *
 * THE TREADS SIT ON THE PEARL GATES, which is the point: each new pearl arrives
 * with a visibly faster trickle rather than the two ramps drifting apart. TOP_BPM
 * is the one loose number - there is no pearl above 160, and a run at 200 has to
 * look different from one at 160.
 *
 * STRETCHED ONCE ALREADY, on the wrist on 2026-08-10. The first cut reached 1.0 -
 * a bead a second per cheek, two cheeks, half a second apart - at 180, and at 200
 * it read as a burst pipe rather than as a hard effort. The whole curve was
 * rescaled so that the rate the top of the range now reaches is the one 160 used
 * to, which keeps the escalation and loses the panic.
 *
 * Every rate here divides the minute evenly, which is a hard requirement rather
 * than a tidy choice; see heartStaircase in expr.ts and the assertion below.
 */
const DRIP_TOP_BPM = 200;

export const DRIP_RATE: { base: number; treads: HeartTread[] } = {
	base: 0.2,
	treads: [
		{ bpm: T.SWEAT_ONE_BPM, add: 0.05 },
		{ bpm: T.SWEAT_TWO_BPM, add: 0.05 },
		{ bpm: T.SWEAT_ALL_BPM, add: 0.1 },
		{ bpm: DRIP_TOP_BPM, add: 0.2 }
	]
};

/** Build-time proof that the two drip figures agree about their late fade. */
if (
	HERO_DRIP.secondFrom !== COMPANION_DRIP.secondFrom ||
	HERO_DRIP.secondTo !== COMPANION_DRIP.secondTo
) {
	throw new Error('the two blobs disagree about when the second drip appears');
}

/**
 * Every rate the staircase can reach must divide the minute evenly.
 *
 * SECOND_MILLISECOND wraps 59.999 -> 0, so a fract() phase is only continuous
 * across that wrap when `60 * rate` is a whole number. Break it and nothing
 * fails: the face renders, the validator passes, and a bead teleports back to
 * the forehead mid-fall once every sixty seconds - which is exactly the class of
 * bug a screenshot cannot show. The treads are cumulative, so it is the RUNNING
 * TOTALS that have to be checked, not the individual adds.
 */
{
	let rate = DRIP_RATE.base;
	for (const tread of [{ bpm: 0, add: 0 }, ...DRIP_RATE.treads]) {
		rate += tread.add;
		// Accumulated in floating point - 0.2 + 0.1 is 0.30000000000000004 - so this
		// asks "within a rounding error of a whole number", not Number.isInteger.
		if (Math.abs(rate * 60 - Math.round(rate * 60)) > 1e-9) {
			throw new Error(
				`drip rate ${rate} from ${tread.bpm}bpm does not divide the minute: ` +
					`60 * ${rate} is ${rate * 60}, so the drip would snap at every minute boundary`
			);
		}
	}
}
