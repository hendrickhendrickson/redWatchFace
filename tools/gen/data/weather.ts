/**
 * The sky and weather marks, as data: the snowflake, the storm burst, the bolt,
 * the umbrella, the sun and the moon.
 *
 * THE SNOWFLAKE IS THE POINT OF THIS FILE. It was fifteen `Line` elements and 86
 * literals describing a shape with six-fold symmetry - so the symmetry, which is
 * the only reason it reads as a snowflake at 36px, existed nowhere except in the
 * coordinates. All fifteen lines now come out of a centre, six arm angles and two
 * radii, and they reproduce the authored values to the last decimal.
 *
 * WHAT DOES NOT GET DERIVED. The burst's twelve radii are irregular ON PURPOSE -
 * that irregularity is what stops it reading as a gear - so they stay a column of
 * measured numbers, the same call rain.ts makes about its hand-placed x scatter.
 * What changed is that the column is now twelve radii instead of twenty-four
 * endpoint coordinates, and the irregularity is legible in the data rather than
 * hidden in a set of Line elements.
 *
 * THREE AUTHORING CONVENTIONS ARE NAMED HERE rather than reproduced by accident,
 * and they are NOT the same convention - which is the trap. The sun's eight rays
 * are written with their endpoints in ascending y, ties broken by ascending x. A
 * snowflake axis is a vector along its arm, so it runs from the far tip to the near
 * one whichever way that points. A barb runs root-to-tip, with the PAIR ordered
 * upper-first. Writing the axes y-ascending like the rays reverses exactly one of
 * the three, which is how the difference was found.
 *
 * And the draw order of radial spokes is tabulated, because it is arbitrary: all
 * spokes in a given mark share one colour and one thickness and none overlaps, so
 * the order is invisible on screen and preserved only so this refactor stays
 * byte-identical.
 */

import * as G from '../geometry.ts';
import { n, raw, src, type Expr } from '../expr.ts';
import { evaluate } from '../eval.ts';

const r2 = (v: number): number => Math.round(v * 100) / 100;
const rad = (deg: number): number => (deg * Math.PI) / 180;

/** A stroked segment. */
export type Seg = {
	startX: number;
	startY: number;
	endX: number;
	endY: number;
};

/** A point at `r` from (`cx`,`cy`) along `deg`, measured clockwise from 3 o'clock
 *  with y growing downward - screen convention, not WFF's arc convention. */
const polar = (cx: number, cy: number, r: number, deg: number) => ({
	x: cx + r * Math.cos(rad(deg)),
	y: cy + r * Math.sin(rad(deg))
});

/**
 * A segment written the way this face writes segments: ascending y, then
 * ascending x.
 *
 * COMPARED AT 2dp, NOT AT FULL PRECISION, and that is not a detail. The two barbs
 * on a vertical arm are at the same y by design - and `sin(220 deg)` and
 * `sin(320 deg)` differ in the last bit of a double, so a full-precision
 * comparison picks one arbitrarily and swaps the pair. Comparing at the
 * resolution the shape is authored at is both correct and stable.
 */
type Pt = { x: number; y: number };

/** Ascending y, then ascending x, both compared at 2dp. */
const upFirst = (a: Pt, b: Pt): number => r2(a.y) - r2(b.y) || r2(a.x) - r2(b.x);

const ordered = (a: Pt, b: Pt): Seg => {
	const [p, q] = upFirst(a, b) <= 0 ? [a, b] : [b, a];
	return { startX: r2(p.x), startY: r2(p.y), endX: r2(q.x), endY: r2(q.y) };
};

/** A segment that always runs from `p`, whatever direction that is. */
const from = (p: Pt, q: Pt): Seg => ({
	startX: r2(p.x),
	startY: r2(p.y),
	endX: r2(q.x),
	endY: r2(q.y)
});

// --- The snowflake ----------------------------------------------------------

/**
 * A six-fold snowflake: three axes through the centre, and a pair of barbs part
 * way out along each of the six arms.
 *
 * THE SIX ARMS ARE 30 + 60k, not 60k, and the 30 is what makes it a snowflake
 * rather than an asterisk - one axis lands vertical and the other two lean, so the
 * shape has a flat top and bottom pair of barbs. Every one of the fifteen authored
 * lines follows from this block plus `AXIS` and `BARB`, checked below.
 */
export const FLAKE = {
	/** Centre of ANCHORS.SKY_MARK's 36x36 box. */
	centre: 18,
	arms: [0, 1, 2, 3, 4, 5].map((k) => 30 + 60 * k),
	axis: { r: 15, thickness: 2.6 },
	/** A barb: a node out along the arm, and two tips splayed off it. */
	barb: { at: 9, r: 5, splay: 50, thickness: 2 },
	/**
	 * Which arm each axis is named by. Each axis spans an arm AND its opposite, so
	 * these three have to cover all six exactly once - asserted below, because
	 * getting it wrong draws one axis twice and leaves a gap.
	 */
	axes: [90, 30, 330],
	/** Shipped draw order for the six barb pairs. Arbitrary; see the file header. */
	barbOrder: [270, 90, 330, 30, 210, 150]
};

const flakeArm = (deg: number, r: number) => polar(FLAKE.centre, FLAKE.centre, r, deg);

/**
 * Each axis runs from its opposite arm's tip, through the centre, to its own.
 *
 * DIRECTION, NOT ORDER. Two of the three happen to come out top-to-bottom and the
 * 330 axis does not, so writing them y-ascending reverses that one - which is how
 * this was caught. An axis is a vector along its arm; it is not a pair of points
 * to be sorted.
 */
export const FLAKE_AXES: Seg[] = FLAKE.axes.map((deg) =>
	from(flakeArm(deg, -FLAKE.axis.r), flakeArm(deg, FLAKE.axis.r))
);

/**
 * Two barbs per arm, upper tip first.
 *
 * A BARB ALWAYS STARTS AT ITS NODE, unlike the axes and the sun's rays - a barb
 * has a root and a tip, and the root goes first even when the tip is above it. It
 * is the PAIR that is ordered by tip, upper before lower.
 */
export const FLAKE_BARBS: Seg[] = FLAKE.barbOrder.flatMap((deg) => {
	const node = flakeArm(deg, FLAKE.barb.at);
	return [deg - FLAKE.barb.splay, deg + FLAKE.barb.splay]
		.map((angle) => polar(node.x, node.y, FLAKE.barb.r, angle))
		.sort(upFirst)
		.map((tip) => from(node, tip));
});

{
	const problems: string[] = [];
	const spanned = FLAKE.axes.flatMap((axis) => [axis, (axis + 180) % 360]).sort((a, b) => a - b);
	if (spanned.join(' ') !== [...FLAKE.arms].sort((a, b) => a - b).join(' ')) {
		problems.push(
			`the three axes span ${spanned.join('/')}, not the six arms ${FLAKE.arms.join('/')}`
		);
	}
	if (
		[...FLAKE.barbOrder].sort((a, b) => a - b).join(' ') !==
		[...FLAKE.arms].sort((a, b) => a - b).join(' ')
	) {
		problems.push(
			'barbOrder is not a permutation of the six arms - an arm would be barbed twice or not at all'
		);
	}
	// The barbs have to sit ON the axes, not float beside them.
	if (FLAKE.barb.at >= FLAKE.axis.r) {
		problems.push(
			`the barb node at ${FLAKE.barb.at} is at or past the axis tip at ${FLAKE.axis.r}`
		);
	}
	// Nothing may leave the 36x36 box: an axis tip plus its round cap is the
	// furthest-out thing in the shape.
	const reach = FLAKE.axis.r + FLAKE.axis.thickness / 2;
	if (FLAKE.centre - reach < 0 || FLAKE.centre + reach > 2 * FLAKE.centre) {
		problems.push(
			`the flake reaches ${r2(reach)} from centre, outside its ${2 * FLAKE.centre}px box`
		);
	}
	if (problems.length) {
		throw new Error(`the snowflake lost its symmetry:\n  ${problems.join('\n  ')}`);
	}
}

// --- The storm burst --------------------------------------------------------

/**
 * Twelve spokes from one centre at 30-degree steps, with IRREGULAR radii.
 *
 * THE RADII ARE THE DATA AND THEY STAY MEASURED. They run 35.9 to 50 rather than
 * sitting on a circle, and that is the whole design - a burst on a circle reads as
 * a gear. So there is no formula to find here, and the honest form is a column of
 * twelve numbers rather than twenty-four endpoint coordinates with the angles
 * implicit in them.
 *
 * ELEVEN OF THE TWELVE MIRROR ABOUT THE VERTICAL, and one does not: the spoke at
 * 330 is 41.7 where its mirror at 210 is 49.7. That single break is what tips the
 * shape from "symmetric star" to "flash", and it was invisible while the radii
 * were endpoints. Left exactly as shipped.
 *
 * Order is clockwise from 12 o'clock, which is the shipped draw order.
 */
export const BURST = {
	centre: 52,
	hub: 30,
	thickness: 9,
	/** From 270 (12 o'clock) clockwise in 30-degree steps. */
	from: 270,
	step: 30,
	radii: [50, 35.9, 41.7, 36, 49.7, 35.9, 50, 35.9, 49.7, 36, 49.7, 35.9]
};

export const BURST_HUB = G.box(
	BURST.centre - BURST.hub / 2,
	BURST.centre - BURST.hub / 2,
	BURST.hub,
	BURST.hub
);

/** Every spoke starts at the centre, so these are not `ordered()`. */
export const BURST_SPOKES: Seg[] = BURST.radii.map((radius, i) => {
	const tip = polar(BURST.centre, BURST.centre, radius, BURST.from + i * BURST.step);
	return {
		startX: BURST.centre,
		startY: BURST.centre,
		endX: Math.round(tip.x),
		endY: Math.round(tip.y)
	};
});

{
	const problems: string[] = [];
	if (new Set(BURST.radii).size === 1) {
		problems.push(
			'every spoke is the same length - the burst would read as a gear, which is the one thing it must not'
		);
	}
	if (BURST.radii.length !== 360 / BURST.step) {
		problems.push(
			`${BURST.radii.length} radii for ${360 / BURST.step} spokes at a ${BURST.step}-degree step`
		);
	}
	// The longest spokes overshoot the part box by design; the SQUARE caps on the
	// 50s reach 54.5 in a box whose half-width is 52, so four spoke tips arrive
	// flat. That is the shipped shape - a flat tip on a flash is invisible - and it
	// is recorded here rather than fixed. What must not happen is the CENTRELINE
	// leaving the box, which would cut a spoke short.
	const worst = Math.max(...BURST.radii);
	if (worst > BURST.centre) {
		problems.push(`a spoke centreline reaches ${worst}, past the box's ${BURST.centre}`);
	}
	if (problems.length) {
		throw new Error(`the storm burst no longer reads as a burst:\n  ${problems.join('\n  ')}`);
	}
}

// --- The bolt ---------------------------------------------------------------

/**
 * Three segments, drawn tip to tail so the joints cannot separate.
 *
 * Written out, the middle segment's start restated the first's end and the third's
 * start restated the middle's end - four coordinates typed twice. A polyline is
 * what this actually is.
 */
export const BOLT = {
	thickness: 6,
	points: [
		{ x: 22, y: 0 },
		{ x: 38, y: 28 },
		{ x: 24, y: 32 },
		{ x: 42, y: 64 }
	]
};

export const BOLT_SEGMENTS: Seg[] = BOLT.points.slice(0, -1).map((point, i) => {
	const next = BOLT.points[i + 1];
	return { startX: point.x, startY: point.y, endX: next.x, endY: next.y };
});

// --- The umbrella -----------------------------------------------------------

/**
 * The canopy: a spanning bar, four lobes on top of it, and three ribs.
 *
 * THE LOBES ARE TWO SIZES, NOT ONE. The outer pair is 13 tall and the inner pair
 * 21, which is what gives the canopy its dome - four equal lobes read as a
 * scalloped plank. So they are a four-row table rather than a repeat count, and
 * the rows carry the size that makes the silhouette.
 *
 * THE RIBS DO NOT SIT UNDER THE LOBE SEAMS, and that is deliberate rather than
 * sloppy: seams fall at 38, 77 and 115 while the ribs are at 39, 80 and 120. A rib
 * drawn exactly on a seam disappears into it, so each is nudged off by 1 to 5px.
 * Recorded as its own row set for that reason - deriving ribs from seams would
 * quietly "fix" the thing that makes them visible.
 */
export const UMBRELLA = {
	span: { width: 160, height: 10, y: 12, radius: 4 },
	lobeWidth: 45,
	lobes: [
		{ x: 0, y: 9, height: 13 },
		{ x: 38, y: 1, height: 21 },
		{ x: 77, y: 1, height: 21 },
		{ x: 115, y: 9, height: 13 }
	],
	rib: { xs: [39, 80, 120], from: 13, to: 21, thickness: 1.8 },
	shaft: {
		x: 80,
		thickness: 3,
		/** Two straight runs, with the hook's arc between them. */
		upper: { from: 18, to: 38 },
		lower: { from: 56, to: 60 },
		/** The hook is an Arc so the curve stays a curve at any scale. */
		hook: { centerX: 74, centerY: 60, r: 6, startAngle: 90, endAngle: 270 }
	}
};

export const UMBRELLA_SPAN = {
	...G.box(0, UMBRELLA.span.y, UMBRELLA.span.width, UMBRELLA.span.height),
	cornerRadiusX: UMBRELLA.span.radius,
	cornerRadiusY: UMBRELLA.span.radius
};

export const UMBRELLA_LOBES: G.Box[] = UMBRELLA.lobes.map((lobe) =>
	G.box(lobe.x, lobe.y, UMBRELLA.lobeWidth, lobe.height)
);

export const UMBRELLA_RIBS: Seg[] = UMBRELLA.rib.xs.map((x) => ({
	startX: x,
	startY: UMBRELLA.rib.from,
	endX: x,
	endY: UMBRELLA.rib.to
}));

export const UMBRELLA_SHAFT: Seg[] = [UMBRELLA.shaft.upper, UMBRELLA.shaft.lower].map((run) => ({
	startX: UMBRELLA.shaft.x,
	startY: run.from,
	endX: UMBRELLA.shaft.x,
	endY: run.to
}));

export const UMBRELLA_HOOK = {
	centerX: UMBRELLA.shaft.hook.centerX,
	centerY: UMBRELLA.shaft.hook.centerY,
	width: 2 * UMBRELLA.shaft.hook.r,
	height: 2 * UMBRELLA.shaft.hook.r,
	startAngle: UMBRELLA.shaft.hook.startAngle,
	endAngle: UMBRELLA.shaft.hook.endAngle
};

{
	const problems: string[] = [];
	const seams = UMBRELLA.lobes.slice(1).map((lobe) => lobe.x);
	for (const x of UMBRELLA.rib.xs) {
		if (seams.includes(x)) {
			problems.push(`the rib at ${x} sits exactly on a lobe seam and would vanish into it`);
		}
	}
	// The lobes must cover the bar they sit on, or the canopy shows a notch.
	const covered = Math.max(...UMBRELLA.lobes.map((lobe) => lobe.x + UMBRELLA.lobeWidth));
	if (UMBRELLA.lobes[0].x > 0 || covered < UMBRELLA.span.width) {
		problems.push(
			`the lobes cover ${UMBRELLA.lobes[0].x}..${covered} of a ${UMBRELLA.span.width}-wide bar`
		);
	}
	// The shaft and the hook have to JOIN, in both axes. The arc runs 90 to 270 -
	// clockwise from 3 o'clock round the bottom to 9 o'clock - so its right-hand end
	// is at (centerX + r, centerY), and the straight run has to finish exactly
	// there or the handle shows a gap at the turn.
	const { lower, hook, x } = UMBRELLA.shaft;
	if (lower.to !== hook.centerY || x !== hook.centerX + hook.r) {
		problems.push(
			`the shaft ends at (${x},${lower.to}) but the hook's rim starts at ` +
				`(${hook.centerX + hook.r},${hook.centerY})`
		);
	}
	if (problems.length) {
		throw new Error(`the umbrella no longer holds together:\n  ${problems.join('\n  ')}`);
	}
}

// --- The sun ----------------------------------------------------------------

/**
 * Eight rays about the sun's disc, four on the axes and four on the diagonals.
 *
 * THE DIAGONALS ARE PLACED BY OFFSET, NOT BY RADIUS, and that is the one
 * approximation in the shape. An axis ray runs from radius 8.5 to 12; a diagonal
 * ray is written as 5.9 and 8.4 off the centre on BOTH coordinates, which puts it
 * at radius 8.34 and 11.88 - about 1.2% shorter than the axis rays. Nobody can see
 * 1.2%, and 5.9/8.4 are 1dp numbers where 8.5/sqrt2 is not, so the trade was worth
 * making. It is asserted below so a future edit cannot widen the gap into something
 * visible.
 */
export const SUN = {
	centre: 13,
	disc: 12,
	ray: {
		thickness: 2.2,
		/** Radii, for the four rays on the axes. */
		axis: { from: 8.5, to: 12 },
		/** Per-coordinate offsets, for the four on the diagonals. */
		diagonal: { from: 5.9, to: 8.4 }
	},
	/** Shipped draw order. Arbitrary; see the file header. */
	order: [270, 90, 180, 0, 225, 45, 315, 135]
};

export const SUN_DISC = G.box(
	SUN.centre - SUN.disc / 2,
	SUN.centre - SUN.disc / 2,
	SUN.disc,
	SUN.disc
);

export const SUN_RAYS: Seg[] = SUN.order.map((deg) => {
	const diagonal = deg % 90 !== 0;
	const step = Math.SQRT2;
	const { from, to } = diagonal
		? { from: SUN.ray.diagonal.from * step, to: SUN.ray.diagonal.to * step }
		: SUN.ray.axis;
	return ordered(polar(SUN.centre, SUN.centre, from, deg), polar(SUN.centre, SUN.centre, to, deg));
});

{
	// How far the diagonals fall short of the axis rays. Visible above a few
	// percent, so the tolerance is deliberately tight.
	const drift = Math.max(
		Math.abs(SUN.ray.diagonal.from * Math.SQRT2 - SUN.ray.axis.from) / SUN.ray.axis.from,
		Math.abs(SUN.ray.diagonal.to * Math.SQRT2 - SUN.ray.axis.to) / SUN.ray.axis.to
	);
	if (drift > 0.02) {
		throw new Error(
			`the sun's diagonal rays are now ${(drift * 100).toFixed(1)}% off the length of its axis rays - ` +
				'past the ~1.2% that shipped, the eight stop reading as one set'
		);
	}
	if (SUN.ray.axis.from <= SUN.disc / 2) {
		throw new Error(
			`the rays start at radius ${SUN.ray.axis.from}, inside the disc's own ${SUN.disc / 2}`
		);
	}
}

// --- The moon ---------------------------------------------------------------

/**
 * A lit disc with a black disc sliding across it, driven by the real lunar phase.
 *
 * `1.6255` WAS THE LAST UNEXPLAINED NUMBER IN THE FACE, and it is
 * `2 x 24px / 29.53 days`: the shadow crosses the disc and comes back once per
 * synodic month. The doubling is because the sweep is out-and-back - the two
 * clamps are a there-and-return pair, not two halves of one crossing.
 *
 * THE UNITS ARE MEASURED, NOT DOCUMENTED. `MOON_PHASE_POSITION` is absent from the
 * WFF arithmetic-expression reference entirely, and Samsung's analogous Watch Face
 * Studio tag `[MOON_PO]` is 0-28, which would be a different rate. This repo
 * settled it on hardware instead: docs/capabilities.md records a probe reading of
 * 19.79 alongside MOON_PHASE_TYPE 5 (waning gibbous), and 19.79/29.53 = 0.67 is
 * waning gibbous - so the two agree and the source is in DAYS. Assuming a 0-1
 * fraction, which was tried, pinned the mask 246px off-screen and showed a
 * permanent full moon.
 *
 * The cycle is checked with the expression evaluator below rather than asserted by
 * arithmetic on the rate, because what matters is where the shadow actually lands.
 */
export const MOON = {
	disc: 24,
	/** Days per synodic month, to the two decimals the shipped rate was built from. */
	synodicDays: 29.53
};

export const MOON_DISC = G.box(6, 6, MOON.disc, MOON.disc);

/** How many px of shadow travel per day. Out and back, hence the doubling. */
export const MOON_SHADOW_RATE = Number(((2 * MOON.disc) / MOON.synodicDays).toFixed(4));

/**
 * The shadow's x.
 *
 * TWO CLAMPS, NOT A CONDITION. The first carries the shadow across the disc over
 * the waxing half and then saturates; the second is zero until the first has
 * finished and then walks it back. WFF has no branching inside an expression, so a
 * fold like this is how a triangle wave gets written at all.
 */
export const moonShadowX = (): Expr => {
	const travel = `${n(MOON_SHADOW_RATE)} * ${src('MOON_PHASE_POSITION')}`;
	const span = n(MOON.disc);
	// `raw()`, not `as Expr`. expr.ts owns the brand and is the only module that mints one;
	// minting it here would mean any file can call a bare string an Expr, which is the exact
	// thing the brand exists to stop.
	return raw(
		`${n(MOON_DISC.x)} + clamp(${travel}, 0, ${span}) + ` +
			`clamp(${span} - ${travel}, -${span}, 0)`
	);
};

{
	// Where the shadow sits at new moon, full moon and the next new moon. The disc
	// is at x6, so 6 means "fully covering" and 30 means "fully clear".
	const at = (days: number) => evaluate(moonShadowX(), { MOON_PHASE_POSITION: days });
	const newMoon = at(0);
	const full = at(MOON.synodicDays / 2);
	const wrap = at(MOON.synodicDays);
	const problems: string[] = [];

	if (newMoon !== MOON_DISC.x) {
		problems.push(`at day 0 the shadow is at ${newMoon}, not covering the disc at ${MOON_DISC.x}`);
	}
	if (Math.abs(full - (MOON_DISC.x + MOON.disc)) > 0.01) {
		problems.push(
			`at half a month the shadow is at ${r2(full)}, not clear of the disc at ${MOON_DISC.x + MOON.disc}`
		);
	}
	// The rate is rounded to 4dp, so the return does not land exactly. A tenth of a
	// pixel of snap at new moon is invisible; a whole pixel would not be.
	if (Math.abs(wrap - MOON_DISC.x) > 0.1) {
		problems.push(
			`after a full month the shadow is at ${r2(wrap)} instead of ${MOON_DISC.x}, so it would snap ` +
				`${r2(Math.abs(wrap - MOON_DISC.x))}px when the phase wraps`
		);
	}
	if (problems.length) {
		throw new Error(`the moon's shadow no longer completes its cycle:\n  ${problems.join('\n  ')}`);
	}
}
