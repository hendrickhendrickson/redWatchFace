/**
 * What the blobs WEAR on a calendar day, as opposed to what they hold.
 *
 * ONE MODULE FOR BOTH BLOBS, unlike every other accessory on this face. The scarf,
 * the gloves, the shades and the sweat are each written twice - once in
 * blob-hero.ts and once in blob-companion.ts - and blob.ts argues at length that
 * this is right, because the two blobs differ in fifteen measured ways and folding
 * them into one parameterised builder would make the next wrist iteration fight
 * the abstraction.
 *
 * These are the exception, and the reason is narrow: a Santa hat is the SAME
 * OBJECT on two heads. Its differences between the blobs are pure scale and they
 * are already expressed as data - two Hat rows in data/celebrations.ts - so what
 * is left here takes a row and draws it, with nothing per-blob to know. Where that
 * stops being true, as it does for the ghost and the pumpkin, the builder goes
 * back to being one function per blob.
 *
 * THESE ARE ADDITIVE CONDITIONS, drawn OVER the blob rather than replacing any of
 * it - the call the step-goal flag makes, and for the same reason: a costume that
 * is a branch of an existing switch makes the thing it branches away from
 * disappear, which is how the goal state once showed a pole with no arm behind it.
 * The one Condition on this face that genuinely replaces a body is the storm
 * X-ray, and it replaces it because a skeleton IS the body.
 *
 * NO AMBIENT VARIANT ANYWHERE HERE. Every one of these is drawn inside
 * `blob_hero` or `blob_companion`, and both of those groups already carry
 * AMBIENT_HIDE - so the whole blob, costume included, is already gone in ambient.
 * Adding a second Variant would be the "animated Transform and AMBIENT Variant on
 * the same attribute" hazard for no gain.
 */

import { el, type Node } from '../xml.ts';
import { C } from '../palette.ts';
import { when } from '../condition.ts';
import { BIRTHDAY, CHRISTMAS, HALLOWEEN } from '../states.ts';
import type { Expr } from '../expr.ts';
import {
	bobbleBox,
	centredSquare,
	COMPANION_PARTY_HAT,
	COMPANION_SANTA_HAT,
	coneRows,
	coneStripes,
	crownDome,
	crownStem,
	GHOST,
	GHOST_EYES,
	GHOST_MOUTH,
	GHOST_SCALLOPS,
	HERO_PARTY_HAT,
	HERO_SANTA_HAT,
	pompomBox,
	PUMPKIN,
	PUMPKIN_EYES,
	PUMPKIN_NOSE,
	type PartyHat,
	type SantaHat
} from '../data/celebrations.ts';
import type { Box } from '../geometry.ts';

/**
 * A Santa hat: a domed crown across the whole brim, a flop, a bobble.
 *
 * DRAW ORDER IS THE WHOLE CONSTRUCTION, and it is the fix. The crown's dome and
 * stem go down first and both run BELOW the brim's top edge; the flop hangs off the
 * crown's shoulder; the brim then covers every one of those feet at once, which is
 * what makes the hat look tucked into its band rather than balanced on it. The
 * bobble goes last, over the thin arc's end, because its box is derived from that
 * exact point and would otherwise be half covered by the stroke it sits on.
 *
 * THE CROWN IS TWO FILLED SHAPES, NOT A STROKED ARC. A stroked arc is a band with a
 * hole through it - the first version showed the leaf tuft through the middle of
 * the hat - and it touches its brim at one end only, so the red sat on the leftmost
 * inch of a 46px band. See data/celebrations.ts.
 *
 * BOTH FLOP ARCS SHARE ONE ELLIPSE - same centre, same radii - so the join cannot
 * develop a kink no matter how the row is retuned.
 */
const santaShapes = (hat: SantaHat, cloth: string, trim: string): Node[] => {
	const arc = (from: number, to: number, thickness: number) =>
		el(
			'Arc',
			{
				centerX: hat.flop.centerX,
				centerY: hat.flop.centerY,
				width: hat.flop.rx * 2,
				height: hat.flop.ry * 2,
				startAngle: from,
				endAngle: to
			},
			[el('Stroke', { color: cloth, thickness, cap: 'ROUND' })]
		);

	return [
		el('Rectangle', { ...crownStem(hat) }, [el('Fill', { color: cloth })]),
		el('Ellipse', { ...crownDome(hat) }, [el('Fill', { color: cloth })]),
		arc(hat.flop.from, hat.flop.mid, hat.flop.thick),
		arc(hat.flop.mid, hat.flop.to, hat.flop.thin),
		el(
			'RoundRectangle',
			{ ...hat.brim, cornerRadiusX: hat.brim.radius, cornerRadiusY: hat.brim.radius },
			[el('Fill', { color: trim })]
		),
		el('Ellipse', { ...bobbleBox(hat) }, [el('Fill', { color: trim })])
	];
};

/**
 * A party hat: a triangular cone, three stripes, a pompom, on a brim.
 *
 * THE CONE IS A STACK OF RECTANGLES AND THAT IS NOT A COMPROMISE - it is the only
 * exact filled triangle WFF's five primitives allow. Widest row first, every row
 * running all the way down to the base, all in one colour: overlapping rather than
 * abutting, so there is not one internal edge for the renderer to antialias into a
 * visible seam. data/celebrations.ts owns the row count and asserts that the step
 * it produces is finer than the device can resolve.
 *
 * THERE IS NO BRIM, AND THERE WAS ONE. A party hat had the Santa hat's white band
 * under it, because they were the same builder - and at 40 wide against a 34-wide
 * cone it was the biggest thing on the blob's head. A cone sits on a head; it does
 * not need a band, and the base row runs a few pixels into the crown so there is no
 * gap to hide either.
 *
 * STRIPES OVER THE CONE. Each is cut to the cone's own width where it sits, by the
 * same function that gives the rows theirs, so no part of this can hang over an edge.
 */
const partyShapes = (hat: PartyHat, cone: string, stripe: string): Node[] => [
	...coneRows(hat).map((row) => el('Rectangle', { ...row }, [el('Fill', { color: cone })])),
	...coneStripes(hat).map((band) => el('Rectangle', { ...band }, [el('Fill', { color: stripe })])),
	el('Ellipse', { ...pompomBox(hat) }, [el('Fill', { color: stripe })])
];

/**
 * A hat as a whole Condition, ready to drop into a blob's child list.
 *
 * `box` is the blob's LIMB box, not its body box: a crown reaches well above the
 * head and a bobble hangs out past the side, so anything smaller clips them. All
 * four hats' reach is asserted against their limb box in data/celebrations.ts.
 *
 * `gate` and `part` are BOTH GIVEN, and deriving one from the other is a trap
 * worth naming: `${gate}_hat` looks tidy and turns `hero_santa_hat` into
 * `hero_christmas_hat`. Expression names say WHEN something draws and part names
 * say WHAT it is, they are separate namespaces, and a part called "christmas hat"
 * tells a reader looking at a rendering nothing about what they are looking at.
 */
const hat = (gate: string, part: string, predicate: Expr, box: Box, shapes: Node[]): Node =>
	when(gate, predicate, [el('PartDraw', { ...box, name: part }, shapes)]);

export const heroSantaHat = (box: Box): Node =>
	hat(
		'hero_christmas',
		'hero_santa_hat',
		CHRISTMAS,
		box,
		santaShapes(HERO_SANTA_HAT, C.SANTA, C.WHITE)
	);

export const companionSantaHat = (box: Box): Node =>
	hat(
		'companion_christmas',
		'companion_santa_hat',
		CHRISTMAS,
		box,
		santaShapes(COMPANION_SANTA_HAT, C.SANTA, C.WHITE)
	);

/** The 19 December party hats: magenta cone, gold stripes, no brim. */
export const heroPartyHat = (box: Box): Node =>
	hat(
		'hero_birthday',
		'hero_party_hat',
		BIRTHDAY,
		box,
		partyShapes(HERO_PARTY_HAT, C.PARTY, C.PARTY_STRIPE)
	);

export const companionPartyHat = (box: Box): Node =>
	hat(
		'companion_birthday',
		'companion_party_hat',
		BIRTHDAY,
		box,
		partyShapes(COMPANION_PARTY_HAT, C.PARTY, C.PARTY_STRIPE)
	);

// --- Halloween --------------------------------------------------------------

/**
 * The hero's ghost sheet.
 *
 * TWO PARTS, not one. The sheet and its face share a box, so it could be a single
 * PartDraw - but the eyes and mouth are holes in the sheet and keeping them a
 * separate part means the sheet can be retimed, recoloured or resized without
 * anyone having to scroll past three dark ellipses to find its own shapes.
 */
export const heroGhost = (box: Box): Node =>
	when('hero_halloween', HALLOWEEN, [
		el('PartDraw', { ...box, name: 'hero_ghost_sheet' }, [
			el('Ellipse', { ...GHOST.dome }, [el('Fill', { color: C.GHOST })]),
			el('Rectangle', { ...GHOST.torso }, [el('Fill', { color: C.GHOST })]),
			// The hem last, so each half-circle sits over the flat edge it hangs off.
			...GHOST_SCALLOPS.map((scallop) =>
				el('Ellipse', { ...scallop }, [el('Fill', { color: C.GHOST })])
			)
		]),
		el('PartDraw', { ...box, name: 'hero_ghost_face' }, [
			// C.BLACK, NOT C.INK. Every other dark shape on this face is the navy the
			// blobs' own eyes use, and these are the exception: they are HOLES in a
			// sheet, and a hole shows whatever is behind the costume - which here is
			// the scene background, #000000. Navy read as two painted-on ovals.
			...GHOST_EYES.map((eye) => el('Ellipse', { ...eye }, [el('Fill', { color: C.BLACK })])),
			el('Ellipse', { ...GHOST_MOUTH }, [el('Fill', { color: C.BLACK })])
		])
	]);

/**
 * The companion's pumpkin costume: a gourd, two ribs, a stalk and a carved face.
 *
 * FIVE PARTS, AND FOUR OF THEM EXIST ONLY TO BE ROTATED. `angle` and its pivot are
 * PartDraw attributes, not shape attributes, so every diamond needs a part of its
 * own - there is no way to turn one Rectangle inside a shared part. leafPart() pays
 * the same cost for the same reason, one part per leaf blade.
 *
 * THE TEETH ARE PAINTED BACK OVER THE GRIN IN THE GOURD'S OWN COLOUR, rather than
 * the grin being drawn as three separate strokes. A carved mouth is one cut with
 * bits left in it, and drawing it that way means the teeth cannot drift off the
 * curve they interrupt.
 */
export const companionPumpkin = (box: Box): Node =>
	when('companion_halloween', HALLOWEEN, [
		el('PartDraw', { ...box, name: 'companion_pumpkin' }, [
			el(
				'RoundRectangle',
				{
					...PUMPKIN.stalk,
					cornerRadiusX: PUMPKIN.stalk.radius,
					cornerRadiusY: PUMPKIN.stalk.radius
				},
				[el('Fill', { color: C.STALK })]
			),
			el('Ellipse', { ...PUMPKIN.body }, [el('Fill', { color: C.PUMPKIN })]),
			// The two halves of one ellipse: 0-180 is the right side, 180-360 the left.
			// Sharing a centre and radii is what stops the ribs drifting apart.
			...[
				[0, 180],
				[180, 360]
			].map(([from, to]) =>
				el(
					'Arc',
					{
						centerX: PUMPKIN.rib.centerX,
						centerY: PUMPKIN.rib.centerY,
						width: PUMPKIN.rib.width,
						height: PUMPKIN.rib.height,
						startAngle: from,
						endAngle: to
					},
					[el('Stroke', { color: C.PUMPKIN_DARK, thickness: PUMPKIN.rib.thickness, cap: 'BUTT' })]
				)
			),
			el(
				'Arc',
				{
					centerX: PUMPKIN.grin.centerX,
					centerY: PUMPKIN.grin.centerY,
					width: PUMPKIN.grin.width,
					height: PUMPKIN.grin.height,
					startAngle: PUMPKIN.grin.from,
					endAngle: PUMPKIN.grin.to
				},
				[el('Stroke', { color: C.PUMPKIN_CARVE, thickness: PUMPKIN.grin.thickness, cap: 'ROUND' })]
			),
			...PUMPKIN.teeth.map((tooth) =>
				el('Rectangle', { ...tooth }, [el('Fill', { color: C.PUMPKIN })])
			)
		]),
		...PUMPKIN_EYES.map((eye, i) =>
			diamond(eye, PUMPKIN.eyeSquare, `companion_pumpkin_eye_${i + 1}`)
		),
		diamond(PUMPKIN_NOSE, PUMPKIN.noseSquare, 'companion_pumpkin_nose')
	]);

/** A carved diamond: a square in its own part, turned 45 degrees about the centre. */
const diamond = (box: Box, side: number, name: string): Node =>
	el('PartDraw', { ...box, name, pivotX: 0.5, pivotY: 0.5, angle: 45 }, [
		el('Rectangle', { ...centredSquare({ ...box, x: 0, y: 0 }, side) }, [
			el('Fill', { color: C.PUMPKIN_CARVE })
		])
	]);
