/**
 * The fireworks: five independently-phased bursts, each a rocket climbing from
 * a shared launch line and then a ring of sparks flying out and falling.
 *
 * ONE CYCLE, TWO ACTS. Each burst runs off a single free-running phase `p` in
 * 0..1 (see `phase()` in expr.ts, verified on hardware by the rain field). The
 * first `LAUNCH_FRAC` of it is the rocket's climb; the rest is the explosion.
 * Both acts are the SAME `ramp()` idiom this face already uses for gating
 * (states.ts, precipGate): `ramp(p, 0, LAUNCH_FRAC)` is 0 before launch, rises
 * to 1 as the rocket reaches apex, and holds at 1 for the rest of the cycle;
 * `ramp(p, LAUNCH_FRAC, 1)` is the mirror image, sitting at 0 through the climb
 * and then rising through the explosion. Composed with `triangleAlpha()`, each
 * act fades in, holds and fades out ENTIRELY WITHIN ITS OWN HALF, so the rocket
 * is never visible past apex and no spark is visible before it.
 *
 * A ROCKET IS A Group TRANSLATED, exactly like a rain drop: the carrying group
 * covers the full canvas and its own `y` grows from 0 to `cy - LAUNCH_Y`, while
 * its PartDraw sits at the fixed canvas position `(cx, LAUNCH_Y)` - so the group
 * Transform only ever has to describe the climb, not the placement. Sparks work
 * the same way, outward instead of up (see face/fireworks.ts).
 *
 * TRAVEL AND FADE ARE TWO SEPARATE CLOCKS, and that is what "some explosions
 * linger longer" is built on. `pace` scales how fast a spark flies to its full
 * reach; `linger` scales how much of the explosion window it stays lit for. A
 * burst at linger 1.0 is still glowing as its cycle wraps; one at 0.6 is dark
 * for the last 40% of the window. Both scalings are >= 1 in the emitted
 * expression (see the note on `pace`), which is what keeps every fade ending at
 * alpha 0 rather than snapping there.
 *
 * SPARKS VARY, DELIBERATELY, so five bursts of six do not read as one shape
 * repeated five times. Angle, reach, size, pace, linger AND SHAPE are perturbed
 * by a small SEEDED generator (same Numeric Recipes LCG fixtures.ts uses for its
 * evaluation grid) - deterministic, so the build is reproducible, but not a
 * hand-tabulated column the way the rain drops and the burst's twelve radii are.
 * Unlike those two, there is no shipped hand-authored version to reproduce
 * byte-for-byte, so there is nothing here worth pinning by hand.
 *
 * COLOUR IS NOT HERE. Which bursts are single-coloured and which mix is a
 * presentation choice and lives with the other hexes, in face/fireworks.ts.
 */

import { clamp, grow, n, phase, ramp, raw, triangleAlpha, type Expr } from '../expr.ts';
import * as G from '../geometry.ts';
// The four-attribute shape a <Line> takes. Defined next door for the snowflake's
// axes and imported rather than restated - it is the same fact about WFF, and a
// second copy is exactly what this whole tools/gen tree exists to avoid.
import type { Seg } from './weather.ts';

const rad = (deg: number): number => (deg * Math.PI) / 180;
const r2 = (v: number): number => Math.round(v * 1000) / 1000;

/** Numeric Recipes LCG, same constants fixtures.ts uses for EVAL_GRID - a local
 *  copy rather than a shared import, since the only thing in common is the
 *  algorithm, and it is four lines. */
const lcg = (seed: number) => {
	let s = seed >>> 0;
	return () => {
		s = (Math.imul(1664525, s) + 1013904223) >>> 0;
		return s / 0x100000000;
	};
};

// --- Timing shared by every burst --------------------------------------------

/** Fraction of a burst's cycle spent climbing, before it explodes. */
export const LAUNCH_FRAC = 0.28;
/** Every rocket climbs from this y - a shared "horizon" below the sky marks and
 *  above the round bezel's tightest corner (see the placements below). */
export const LAUNCH_Y = 360;

// --- Bursts -------------------------------------------------------------------

export type Burst = {
	/** Where the burst explodes, in canvas coordinates. Also where its rocket aims. */
	cx: number;
	cy: number;
	/** How far a spark travels from the centre at full extension, before its own
	 *  per-spark reach factor scales it. */
	radius: number;
	/** The ring's rotation, so five bursts do not all point the same six ways. */
	baseDeg: number;
	/** How many sparks this shell breaks into. Varies per burst: a big, slow
	 *  shell throws more of them than a small tight one. */
	sparks: number;
	/** Cycles per second, and the phase offset that de-synchronises this burst -
	 *  both the climb and the explosion ride this one clock. */
	hz: number;
	ph: number;
	/** How far sparks droop under gravity by the end of the explosion. */
	gravity: number;
	/**
	 * What fraction of the explosion window this burst's sparks stay lit for.
	 *
	 * 1.0 means still glowing as the cycle wraps - the longest linger available;
	 * 0.6 means dark for the last 40% of the window, so the sky is empty for a
	 * beat before the next rocket goes up. MUST BE <= 1: above it a spark would
	 * still be mid-fade when the phase wraps and would snap to black instead of
	 * fading, the same hazard documented on `pace`. Asserted below.
	 */
	linger: number;
};

/**
 * Five bursts, placed in the canvas's least crowded corners - clear of the
 * 68..188 time band and clear of both ANCHORS.HERO and ANCHORS.COMPANION, the
 * same discipline the rain field's x scatter follows (see rain.ts). Slower than
 * a bare explosion would need (hz 0.15..0.23, so a full cycle is 4.3..6.7s):
 * LAUNCH_FRAC still has to read as a climb, not a flicker, before the burst
 * gets its turn.
 *
 * SPARKS DO FLY PAST THE BEZEL, and that is the intent rather than an oversight.
 * The canvas clips to a circle inscribed in its own 450px square
 * (docs/capabilities.md), every burst centre sits 158..188 from the middle of
 * it, and the widest shells reach further than the gap that leaves - so their
 * outermost sparks stream off the edge of the glass instead of stopping politely
 * inside it. That is what a firework overhead looks like, and it is what keeps a
 * 450px canvas from feeling like the whole of the sky.
 *
 * WHAT IS ACTUALLY ASSERTED, at the bottom of this file, is the weaker and more
 * defensible half of that: every spark is still ON the glass at the moment it
 * first reaches full brightness. A spark that crossed the bezel before then
 * would have spent its whole visible life mid-fade at the edge - a flicker in
 * the corner, and 7 to 11 elements paid for to draw it. Where it goes AFTER that
 * is a look, and is deliberately not constrained.
 *
 * SIZE, COUNT AND LINGER ALL VARY TOGETHER, and roughly in step: the big slow
 * shells (1 and 4) throw the most sparks the furthest, while burst 2 - the
 * closest to the bezel at 187 - stays the tightest and shortest-lived of the
 * five. Paired with the differing `hz`, no two bursts are ever at the same point
 * of the same act.
 */
export const BURSTS: Burst[] = [
	{
		cx: 95,
		cy: 95,
		radius: 62,
		sparks: 12,
		baseDeg: 0,
		hz: 0.19,
		ph: 0.05,
		gravity: 14,
		linger: 1
	},
	{
		cx: 355,
		cy: 90,
		radius: 44,
		sparks: 8,
		baseDeg: 20,
		hz: 0.16,
		ph: 0.4,
		gravity: 16,
		linger: 0.68
	},
	{
		cx: 225,
		cy: 58,
		radius: 58,
		sparks: 10,
		baseDeg: 40,
		hz: 0.23,
		ph: 0.7,
		gravity: 20,
		linger: 0.88
	},
	{
		cx: 68,
		cy: 245,
		radius: 66,
		sparks: 14,
		baseDeg: 10,
		hz: 0.18,
		ph: 0.22,
		gravity: 16,
		linger: 0.62
	},
	{
		cx: 386,
		cy: 250,
		radius: 50,
		sparks: 8,
		baseDeg: 55,
		hz: 0.15,
		ph: 0.85,
		gravity: 18,
		linger: 0.95
	}
] as const;

// --- Shared phase, and the two acts it drives --------------------------------

/** The burst's own free-running clock, 0..1. Drives both the rocket and its sparks. */
export const burstPhase = (burst: Burst): Expr => phase(burst.hz, burst.ph);

/** 0 before launch, 1 from apex onward - the rocket's half of the cycle. */
export const launchProgress = (burst: Burst): Expr => ramp(burstPhase(burst), 0, LAUNCH_FRAC);

/** 0 through the climb, 1 from the end of the explosion onward - the sparks' half. */
export const explosionProgress = (burst: Burst): Expr => ramp(burstPhase(burst), LAUNCH_FRAC, 1);

// --- The rocket ----------------------------------------------------------------

/** The carrying Group's y, climbing from 0 to `cy - LAUNCH_Y` as launchProgress runs 0..1. */
export const rocketY = (burst: Burst): Expr => grow(0, burst.cy - LAUNCH_Y, launchProgress(burst));

/** Fades in, holds, fades out - entirely within the climb; zero for the rest of the cycle. */
export const rocketAlpha = (burst: Burst): Expr => triangleAlpha(launchProgress(burst));

// --- Sparks: seeded variation ---------------------------------------------------

/**
 * A round ember, or a little star.
 *
 * A union of string literals rather than a boolean, because "is it a star" stops
 * being answerable the moment a third shape is wanted - and rules.md rules out
 * an enum. The renderer switches on it in face/fireworks.ts.
 */
export type SparkShape = 'dot' | 'star';

export type SparkSpec = {
	/** Unit direction, jittered off the ring's even spacing. */
	dx: number;
	dy: number;
	/** This spark's own share of the burst's radius - some sparks fly further. */
	reach: number;
	/** Dot diameter, or the star's point-to-point width. */
	size: number;
	/** Round ember or little star. */
	shape: SparkShape;
	/**
	 * How much FASTER than the burst's own explosion clock this spark moves -
	 * always >= 1, never slower. A spark that ran slower would still be short of
	 * full reach and full fade when the shared window closes and the cycle wraps,
	 * and triangleAlpha is only guaranteed zero at the ENDS of the progress it is
	 * given - so a slow spark would snap to alpha 0 instead of fading into it. A
	 * fast spark reaches its own end early, holds there - alpha already 0 - and
	 * has nothing left to snap.
	 */
	pace: number;
	/**
	 * This spark's own share of its burst's `linger`, so a ring does not go out
	 * all at once. <= 1, and multiplied by a burst linger that is also <= 1, so
	 * the product cannot break the invariant `linger` documents.
	 */
	lingerScale: number;
};

const seeded = lcg(0xfa1e5);

/** Stars are drawn as crossed lines and read smaller than a filled disc of the
 *  same nominal size, so they are scaled up to compensate. */
const STAR_SIZE_BOOST = 1.45;
/** Roughly one spark in three is a star. */
const STAR_SHARE = 0.34;

/**
 * One spec per (burst, spark) pair, generated once at module load in burst then
 * spark order - so it is deterministic across builds but not a hand-placed
 * table (see the file header for why that is the right call here).
 */
export const SPARK_SPECS: SparkSpec[][] = BURSTS.map((burst) =>
	Array.from({ length: burst.sparks }, (_, i) => {
		const angleJitter = (seeded() - 0.5) * 16;
		const deg = burst.baseDeg + i * (360 / burst.sparks) + angleJitter;
		const reach = 0.62 + seeded() * 0.66;
		const baseSize = 3 + seeded() * 3.4;
		const pace = 1 + seeded() * 0.4;
		const lingerScale = 0.78 + seeded() * 0.22;
		const shape: SparkShape = seeded() < STAR_SHARE ? 'star' : 'dot';
		return {
			dx: r2(Math.cos(rad(deg))),
			dy: r2(Math.sin(rad(deg))),
			reach: r2(reach),
			size: r2(shape === 'star' ? baseSize * STAR_SIZE_BOOST : baseSize),
			shape,
			pace: r2(pace),
			lingerScale: r2(lingerScale)
		};
	})
);

// --- The star -------------------------------------------------------------------

/**
 * THREE AXES THROUGH ONE CENTRE, at 30 degree steps - a six-pointed star, the
 * same construction the snowflake uses (data/weather.ts, FLAKE.axes) and for the
 * same reason: WFF has no <Path>, so a star is however many <Line>s it takes.
 * Three is the fewest that still reads as a star rather than a cross at this
 * size, and it is what the snowflake already proves legible.
 */
export const STAR_AXES_DEG = [90, 30, 150];

/** The three segments of a star of `size`, in a size x size box at local origin. */
export const starSegments = (size: number): Seg[] => {
	const c = size / 2;
	return STAR_AXES_DEG.map((deg) => ({
		startX: r2(c + c * Math.cos(rad(deg + 180))),
		startY: r2(c + c * Math.sin(rad(deg + 180))),
		endX: r2(c + c * Math.cos(rad(deg))),
		endY: r2(c + c * Math.sin(rad(deg)))
	}));
};

/** A star's stroke, proportional to its size so a big star is not a spider. */
export const starThickness = (size: number): number => r2(Math.max(1, size * 0.26));

// --- The two clocks -------------------------------------------------------------

/** This spark's own TRAVEL progress: the shared ramp, paced faster, then clamped
 *  back to 0..1 so a fast spark holds at its full reach rather than overshooting. */
const sparkProgress = (burst: Burst, spec: SparkSpec): Expr =>
	clamp(raw(`${explosionProgress(burst)} * ${n(spec.pace)}`), 0, 1);

/**
 * This spark's own FADE progress - a separate clock from its travel.
 *
 * Dividing by the effective linger is the same thing as pacing UP by its
 * reciprocal, and since the linger is <= 1 that reciprocal is always >= 1: the
 * fade always completes at or before the wrap, never after it. A burst at
 * linger 1.0 fades exactly as the window closes; one at 0.62 is out well
 * before, leaving the sky dark for a beat.
 */
const sparkFadeProgress = (burst: Burst, spec: SparkSpec): Expr =>
	clamp(raw(`${explosionProgress(burst)} * ${n(1 / (burst.linger * spec.lingerScale))}`), 0, 1);

/** The carrying Group's x, growing from 0 to `dx*radius*reach` outward. */
export const sparkX = (burst: Burst, spec: SparkSpec): Expr =>
	grow(0, spec.dx * burst.radius * spec.reach, sparkProgress(burst, spec));

/** The carrying Group's y: the same outward growth, plus a droop that grows
 *  with the SQUARE of this spark's own progress, so gravity tells more toward
 *  the end of the flight than at the start. */
export const sparkY = (burst: Burst, spec: SparkSpec): Expr => {
	const p = sparkProgress(burst, spec);
	const out = grow(0, spec.dy * burst.radius * spec.reach, p);
	return raw(`${out} + ${n(burst.gravity)} * ${p} * ${p}`);
};

/** Fades in, holds, fades out - on this spark's own FADE clock, which is what
 *  makes one burst linger after another has gone dark. */
export const sparkAlpha = (burst: Burst, spec: SparkSpec): Expr =>
	triangleAlpha(sparkFadeProgress(burst, spec));

// --- Build-time proofs -----------------------------------------------------------

/**
 * Every fade completes within its own cycle.
 *
 * This is the invariant `linger` and `lingerScale` are both documented against,
 * and breaking it is invisible everywhere it could be caught: the expression
 * still validates, the still frames still look right, and the only symptom is a
 * spark going out with a snap instead of a fade - once every few seconds, on a
 * wrist, at New Year.
 */
for (const [b, burst] of BURSTS.entries()) {
	if (burst.linger <= 0 || burst.linger > 1) {
		throw new Error(`burst ${b + 1} has linger ${burst.linger}, which is not in (0, 1]`);
	}
	for (const [s, spec] of SPARK_SPECS[b].entries()) {
		const effective = burst.linger * spec.lingerScale;
		if (effective <= 0 || effective > 1) {
			throw new Error(
				`burst ${b + 1} spark ${s + 1} has an effective linger of ${effective}, ` +
					`which is not in (0, 1] - its fade would snap at the wrap`
			);
		}
		if (spec.pace < 1) {
			throw new Error(`burst ${b + 1} spark ${s + 1} paces at ${spec.pace}, slower than its burst`);
		}
	}
}

/** A star spans its whole box, so its points must not be clipped by it. */
for (const size of [3, 6, 9]) {
	for (const seg of starSegments(size)) {
		for (const v of [seg.startX, seg.startY, seg.endX, seg.endY]) {
			if (v < -0.001 || v > size + 0.001) {
				throw new Error(`a star of ${size} has a point at ${v}, outside its own box`);
			}
		}
	}
}

/**
 * How far past the bezel a spark is at a given travel progress. Negative is inside.
 *
 * The bezel itself moved to geometry.ts, next to the canvas it is a property of,
 * when the Christmas tree became the second thing that has to stay on the glass.
 * What stays here is the only part specific to a firework: where a spark IS at a
 * given point in its flight.
 */
const pastBezel = (burst: Burst, spec: SparkSpec, travel: number): number =>
	G.pastBezel(
		burst.cx + spec.dx * burst.radius * spec.reach * travel,
		burst.cy + spec.dy * burst.radius * spec.reach * travel + burst.gravity * travel * travel
	);

/**
 * Every spark is still on the glass when it first reaches full brightness.
 *
 * triangleAlpha holds at 255 from a fade progress of 0.25, so that instant is
 * `0.25 * effectiveLinger` of the explosion window, which the spark's own pace
 * turns into a travel progress. Raising a radius or a spark count is exactly the
 * kind of edit that can push an outer spark over the edge before it is ever seen
 * lit - and the symptom, one spark of fifty flickering at the rim, is not
 * something a still frame or the validator can report.
 */
for (const [b, burst] of BURSTS.entries()) {
	for (const [s, spec] of SPARK_SPECS[b].entries()) {
		const litAt = Math.min(0.25 * burst.linger * spec.lingerScale * spec.pace, 1);
		const over = pastBezel(burst, spec, litAt);
		if (over > 0) {
			throw new Error(
				`burst ${b + 1} spark ${s + 1} is ${over.toFixed(1)}px past the bezel by the time it ` +
					`reaches full brightness - it would only ever be seen mid-fade at the rim`
			);
		}
	}
}
