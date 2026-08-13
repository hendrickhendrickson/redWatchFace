/**
 * Whatever the hero is holding: the Wednesday coffee cup, the Friday game
 * controller, or the warm-day cocktail. Exactly one of the three, ever.
 *
 * WHY THIS IS A TOP-LEVEL SECTION AND NOT PART OF blob_hero. The hero group
 * starts at canvas x207 and its raised hand sits at group-local x10.5, so a
 * prop wider than 21px centred on that hand would need to start left of the
 * group's own origin - and content there is clipped. The companion's left
 * hand already demonstrates it: `companion_limbs` draws its cream cap from x-2 and
 * the cap arrives flat-sided. Two passes of the controller were left visibly
 * off-centre by that limit before it was worth restructuring around.
 *
 * The fix is the one the umbrella, the bolt, the burst and both sets of Zzz
 * already use: be a sibling of the blob rather than a child of it, position
 * in ABSOLUTE canvas coordinates, and repeat the blob's Gyro gain by hand so
 * the prop still tracks the wrist tilt. `heroGyro()` is that repetition and it
 * is not optional - without it the prop slides off the fist by up to 16px
 * across a full tilt sweep.
 *
 * DRAW ORDER IS PRESERVED EXACTLY. This section is registered immediately
 * after blobHero() in face/index.ts, which is where these three Conditions
 * used to sit as its last children - so the props still paint over the hero
 * (including over the headset, which is correct: a held object is nearer the
 * viewer than a band worn on the head) and still under the companion, the
 * rain and the umbrella.
 *
 * THE ANCHOR IS NOW COMPUTED, NOT DESCRIBED. Every prop below is positioned
 * against the hero's raised fist, and that position used to be worked out in
 * this comment and then typed into eleven coordinates. It lives in
 * data/props.ts as `HAND`, derived from the two anchors and the arm row and
 * asserted against the shipped (18.5,35) on every build - so moving the hero
 * can no longer leave the props hanging in mid-air.
 *
 * NO NEGATION ANYWHERE, the same idiom the retired salute used: the two
 * meeting props are tested AHEAD of the weather-driven cocktail, so the
 * cocktail's own Compare means "hot and sunny AND NOT coffee-time AND NOT
 * controller-time" for free. Without the ordering, a hot sunny Wednesday
 * 10:35 or a hot sunny Friday 15:45 would draw two props in one fist.
 */

import { el, type Node } from '../xml.ts';
import { C } from '../palette.ts';
import { saberPart } from './saber.ts';
import * as G from '../geometry.ts';
import { AMBIENT_HIDE } from '../crossfade.ts';
import { switchOn } from '../condition.ts';
import { BIRTHDAY, FORCE, HOT_AND_SUNNY, LABOUR_DAY } from '../states.ts';
import { WEDNESDAY_MEETING, FRIDAY_GAME_ICON } from '../meetings.ts';
import { drift, driftAlpha, grow, group, secondPhase, triangleAlpha, triangleAt } from '../expr.ts';
import { heroGyro } from '../blob.ts';
import {
	CAKE,
	CAKE_BOX,
	CAKE_CANDLE,
	CAKE_CASE,
	CAKE_FROSTING,
	CAKE_PLEATS,
	COCKTAIL,
	COCKTAIL_BOX,
	COCKTAIL_GLASS,
	COCKTAIL_LIQUID,
	COCKTAIL_STRAW,
	CONTROLLER_BOX,
	CONTROLLER_SHAPES,
	CUP_BOX,
	CUP_SHAPES,
	DIAMOND,
	FLAME_BOX,
	FLAME_INNER,
	FLAME_OUTER,
	HAMMER,
	HAMMER_BOX,
	HAMMER_FACE,
	HAMMER_HEAD,
	HAMMER_SHAFT,
	HANDLE,
	HANDLE_ARC,
	PULSE_BOX,
	PULSE_BUTTON,
	SABER,
	STEAM,
	STEAM_SEGMENTS,
	type Seg
} from '../data/props.ts';

const fill = (colour: string) => [el('Fill', { color: colour })];

const stroke = (
	segment: Seg,
	colour: string,
	thickness: number,
	// BUTT ends the stroke flat ON its endpoint. The hammer's head needs it: a round
	// cap on a 7.5px stroke rounds the striking face off by nearly four pixels.
	cap: 'ROUND' | 'BUTT' = 'ROUND'
): Node => el('Line', { ...segment }, [el('Stroke', { color: colour, thickness, cap })]);

/**
 * The Wednesday coffee cup.
 *
 * IT IS NOT A ROUNDED RECTANGLE. It is a rim ellipse, a straight-sided body and
 * a bottom ellipse, stacked - which is what gives it a CONVEX BASE. A
 * RoundRectangle bottoms out flat, and a flat base is wrong in a view that is
 * looking down far enough to see into the cup at all: if the rim reads as an
 * ellipse then the base has to as well. data/props.ts stacks the three off one
 * x, one width and one rim height rather than three independent placements.
 *
 * THE RIM IS A SEPARATE WHITE ELLIPSE UNDER THE COFFEE, and the coffee is inset
 * inside it. Drawing the liquid at its own coordinates left it touching open
 * background on the left and right, so the cup had no wall at the top - it read
 * as a bowl of brown, not a mug.
 *
 * THE HANDLE'S 60-DEGREE GAP FACES THE CUP, and its centre is derived from the
 * wall it has to touch: the ring's leftmost pixel lands ON x17 rather than
 * inside it. Before that, the ring crossed into the body and the two whites
 * merged into one wall twice as thick as the other side.
 *
 * THREE WISPS, EACH WITH TWO DIRECTION CHANGES. One direction change reads as a
 * bent wire and two lines converging on a point read as an arrowhead - both were
 * drawn and both were wrong. Three segments per wisp is where it starts reading
 * as vapour, and the three occupy disjoint x-bands 1.1px apart, which
 * data/props.ts asserts rather than claiming.
 */
const coffee = (): Node[] => [
	el('PartDraw', { name: 'hero_coffee_cup', ...CUP_BOX }, [
		el('Arc', { ...HANDLE_ARC }, [
			el('Stroke', { color: C.WHITE, thickness: HANDLE.thickness, cap: 'ROUND' })
		]),
		el('Ellipse', { ...CUP_SHAPES.base }, fill(C.WHITE)),
		el('Rectangle', { ...CUP_SHAPES.body }, fill(C.WHITE)),
		el('Ellipse', { ...CUP_SHAPES.rim }, fill(C.WHITE)),
		el('Ellipse', { ...CUP_SHAPES.coffee }, fill(C.COFFEE))
	]),
	steam()
];

/**
 * The steam, drifting up and fading - the same drift()/driftAlpha() idiom the
 * sleep z's use, on STEAM.period's short loop so it reads as a light simmer
 * rather than a gust. A SEPARATE Group from the cup, sharing its box: the wisps
 * are the only part of the cup that moves, and a Group carrying a Transform
 * needs an integer box exactly like the cup's own - which CUP_BOX already is.
 */
const steam = (): Node => {
	const p = group(secondPhase(STEAM.period));
	return el('Group', { name: 'hero_coffee_steam', ...CUP_BOX, alpha: 255 }, [
		el('Transform', { target: 'y', value: drift(STEAM.rise, p) }),
		el('Transform', { target: 'alpha', value: driftAlpha(p) }),
		el(
			'PartDraw',
			{ ...G.at(CUP_BOX.width, CUP_BOX.height), name: 'hero_coffee_steam_wisps' },
			STEAM_SEGMENTS.map((segment) => stroke(segment, C.STEAM, STEAM.thickness))
		)
	]);
};

/**
 * The Friday game controller. Layout traced off a photograph of the real thing,
 * as fractions of the full silhouette width - and those fractions are now the
 * source in data/props.ts rather than prose beside their multiplied-out results.
 *
 * THE D-PAD SITS INBOARD OF THE LEFT STICK - 0.355 against 0.204. It is the most
 * recognisable thing about this layout and the thing the first two attempts had
 * backwards. The stick/d-pad/stick arrangement is asymmetric BY DESIGN; only the
 * shell and the d-pad's own cross are symmetric, and both are - the cross by
 * construction now, off one centre.
 *
 * THE SIDES ANGLE OUT, narrow at the top and wide at the base, because the real
 * shell does: 0.67 of its maximum width at the top edge. That is built from a
 * 24-wide shell with the grip ellipses reaching 28 at their widest, so the
 * silhouette runs 15 across the very top (the flat between the corner arcs), 24
 * by y4.5 and 28 by y13.5. A single rounded rectangle gave dead-vertical sides,
 * which is what read as a slab.
 *
 * THE DEPARTURES FROM THE PHOTOGRAPH ARE NAMED FIELDS, and one of them turned
 * out not to be what this comment used to say. See CONTROLLER in data/props.ts:
 * the buttons really are enlarged to 3.2 against a true 2.2, but the diamond's
 * 1.5px nudge buys clearance from the SHELL EDGE, not from the right stick.
 */
const controller = (): Node[] => [
	el('PartDraw', { name: 'hero_controller', ...CONTROLLER_BOX }, [
		// Grips first, so the shell covers where they join it.
		...CONTROLLER_SHAPES.grips.map((grip) => el('Ellipse', { ...grip }, fill(C.WHITE))),
		el('RoundRectangle', { ...CONTROLLER_SHAPES.shell }, fill(C.WHITE)),
		el('Ellipse', { ...CONTROLLER_SHAPES.leftStick }, fill(C.INK)),
		...CONTROLLER_SHAPES.dpad.map((bar) => el('Rectangle', { ...bar }, fill(C.INK))),
		el('Ellipse', { ...CONTROLLER_SHAPES.rightStick }, fill(C.INK)),
		// Y, X, B - the diamond's top, left and right. A (bottom) is drawn
		// separately below so it alone can pulse.
		el('Ellipse', { ...DIAMOND.top }, fill(C.SUN)),
		el('Ellipse', { ...DIAMOND.left }, fill(C.SCARF)),
		el('Ellipse', { ...DIAMOND.right }, fill(C.CORAL))
	]),
	// A, the diamond's bottom - the one face button that pulses, so the
	// controller reads as being played rather than held. Same triangle idiom the
	// sweat drips use, on its own 2s loop. A Group's x/y must be integers, so the
	// fractional part of the button's position lives on the Ellipse inside it;
	// both halves of that split are derived from the diamond's centre, so they
	// cannot disagree with the three buttons above.
	el('Group', { name: 'hero_controller_pulse', ...PULSE_BOX, alpha: 255 }, [
		el('Transform', { target: 'alpha', value: triangleAlpha(secondPhase(2)) }),
		el('PartDraw', { ...G.at(PULSE_BOX.width, PULSE_BOX.height), name: 'hero_controller_button' }, [
			el('Ellipse', { ...PULSE_BUTTON }, fill(C.GREEN))
		])
	])
];

/**
 * The warm-day cocktail, unchanged since it shipped - the part box moved from
 * the hero group's (0,6) to this group's (8,6), which is the same canvas
 * position, (207,268).
 *
 * EVERY x COMES OFF THE STEM, which is the fist. The bowl, the stem, the foot
 * and the liquid were six independent coordinates that happened to agree about
 * being symmetric about x10.5; only the straw is asymmetric, deliberately.
 */
const cocktail = (): Node[] => [
	el('PartDraw', { name: 'hero_cocktail', ...COCKTAIL_BOX }, [
		stroke(COCKTAIL_STRAW, C.TEAL, COCKTAIL.thickness),
		...COCKTAIL_GLASS.map((segment) => stroke(segment, C.BONE, COCKTAIL.thickness)),
		el('Ellipse', { ...COCKTAIL_LIQUID }, fill(C.COCKTAIL))
	])
];

/**
 * The 1 May hammer, swung up and to the left: a shaft, a head across it, and a
 * darker striking face at the blunt end.
 *
 * SHAFT FIRST, HEAD OVER IT. The shaft runs the full length of the tool and the
 * head covers where the two meet, so the joint needs no separate treatment - the
 * same order the coffee cup stacks its rim over its body in.
 *
 * EVERY PIECE IS A STROKE, INCLUDING THE HEAD. A thick Line with BUTT caps is a
 * rectangle at any angle, which is what lets a leaning hammer be drawn without a
 * rotated PartDraw - and the head's three narrowing steps are what give its right
 * end a point, since no stroke in WFF can taper along its own length. BUTT and not
 * ROUND: a round cap on a 7.5px stroke would round the striking face off by nearly
 * four pixels and turn the blunt end into a ball.
 *
 * The companion carries the sickle; see face/companion-props.ts, which exists
 * because of this pairing.
 */
const hammer = (): Node[] => [
	el('PartDraw', { name: 'hero_hammer', ...HAMMER_BOX }, [
		stroke(HAMMER_SHAFT, C.WOOD, HAMMER.shaft.thickness),
		...HAMMER_HEAD.map((step) => stroke(step.seg, C.STEEL, step.thickness, 'BUTT')),
		stroke(HAMMER_FACE.seg, C.STEEL_DARK, HAMMER_FACE.thickness, 'BUTT')
	])
];

/**
 * ONE FIST, FIVE THINGS THAT WANT IT, AND THE ORDER IS THE ANSWER.
 *
 * THE CELEBRATION IS LISTED FIRST. 1 May is a whole day and the Wednesday standup
 * is fifteen minutes of it, so when the two collide the hammer wins - which is
 * both what a reader expects and the only way to say it without a negation: the
 * cup's own Compare already means "Wednesday 10:30 AND NOT a public holiday" for
 * free, exactly as it has always meant "and not the cocktail".
 */
/**
 * The birthday cupcake, with one candle burning.
 *
 * THE FLAME IS A SECOND GROUP because it is the only part that moves. A Group's
 * x/y must be integers, so its half-pixel offset lives on the ellipses inside -
 * the split the controller's pulsing A button already makes, and derived from one
 * centre in data/props.ts so the two halves cannot drift apart.
 *
 * IT FLICKERS BETWEEN 160 AND 255, NOT 0 AND 255. triangleAlpha - the idiom the
 * rain drops and the controller button use - reaches zero at both ends of its
 * phase, which is right for something that should vanish and reappear and wrong
 * for a flame: a candle that goes fully out twice a second reads as broken, not as
 * lit. A floor also makes the frozen capture clock a non-issue, and data/props.ts
 * asserts the alpha at that exact instant rather than trusting the reasoning.
 */
const cupcake = (): Node[] => [
	el('PartDraw', { name: 'hero_cupcake', ...CAKE_BOX }, [
		el('RoundRectangle', { ...CAKE_CASE }, fill(C.SCARF)),
		...CAKE_PLEATS.map((pleat) => el('Rectangle', { ...pleat }, fill(C.SCARF_DARK))),
		// Bottom tier first, so each one above overlaps the one below and the swirl
		// has no seam. Alternating shade is what gives three flat ellipses depth.
		...CAKE_FROSTING.map((tier, i) =>
			el('Ellipse', { ...tier }, fill(i % 2 === 0 ? C.FROSTING_DARK : C.FROSTING))
		),
		el('Rectangle', { ...CAKE_CANDLE }, fill(C.CREAM))
	]),
	el('Group', { name: 'hero_cupcake_flame', ...FLAME_BOX, alpha: 255 }, [
		el('Transform', {
			target: 'alpha',
			value: grow(
				CAKE.flicker.floor,
				255 - CAKE.flicker.floor,
				triangleAt(secondPhase(CAKE.flicker.period))
			)
		}),
		el('PartDraw', { ...G.at(FLAME_BOX.width, FLAME_BOX.height), name: 'hero_cupcake_wick' }, [
			el('Ellipse', { ...FLAME_OUTER }, fill(C.SUN)),
			el('Ellipse', { ...FLAME_INNER }, fill(C.CREAM))
		])
	])
];

/** The 4 May lightsaber, blue. The companion draws the same shape in green - see
 *  face/saber.ts, which owns the six strokes both of them share. */
const lightsaber = (): Node[] => [saberPart('hero_lightsaber', SABER, C.SABER)];

export const heroProps = (): Node =>
	switchOn([
		{ name: 'hero_cake', when: BIRTHDAY, then: cupcake() },
		{ name: 'hero_saber', when: FORCE, then: lightsaber() },
		{ name: 'hero_hammer', when: LABOUR_DAY, then: hammer() },
		{ name: 'hero_coffee', when: WEDNESDAY_MEETING, then: coffee() },
		{ name: 'hero_controller', when: FRIDAY_GAME_ICON, then: controller() },
		{ name: 'hero_drink', when: HOT_AND_SUNNY, then: cocktail() }
	]);

/**
 * The wrapper that carries the position and the Gyro. Kept separate from the
 * Condition above so the "where is it" and the "when is it" stay legible as
 * two different questions.
 */
export const heroPropsSection = (): Node =>
	el('Group', { name: 'hero_props', ...G.ANCHORS.HERO_PROPS, alpha: 255 }, [
		heroGyro(),
		el('Variant', AMBIENT_HIDE),
		heroProps()
	]);
