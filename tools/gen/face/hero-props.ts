/**
 * Whatever the hero is holding: the Wednesday coffee cup, the Friday game
 * controller, or the warm-day cocktail. Exactly one of the three, ever.
 *
 * WHY THIS IS A TOP-LEVEL SECTION AND NOT PART OF blob_hero. The hero group
 * starts at canvas x207 and its raised hand sits at group-local x10.5, so a
 * prop wider than 21px centred on that hand would need to start left of the
 * group's own origin - and content there is clipped. The companion's left
 * hand already demonstrates it: `mini_limbs` draws its cream cap from x-2 and
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
import * as G from '../geometry.ts';
import { AMBIENT_HIDE } from '../crossfade.ts';
import { switchOn } from '../condition.ts';
import { HOT_AND_SUNNY } from '../states.ts';
import { WEDNESDAY_MEETING, FRIDAY_GAME_ICON } from '../meetings.ts';
import { triangleAlpha, secondPhase } from '../expr.ts';
import { heroGyro } from '../blob.ts';
import {
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
	HANDLE,
	HANDLE_ARC,
	PULSE_BOX,
	PULSE_BUTTON,
	STEAM,
	STEAM_SEGMENTS,
	type Seg
} from '../data/props.ts';

const fill = (colour: string) => [el('Fill', { color: colour })];

const stroke = (segment: Seg, colour: string, thickness: number): Node =>
	el('Line', { ...segment }, [el('Stroke', { color: colour, thickness, cap: 'ROUND' })]);

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
		el('Ellipse', { ...CUP_SHAPES.coffee }, fill(C.COFFEE)),
		...STEAM_SEGMENTS.map((segment) => stroke(segment, C.STEAM, STEAM.thickness))
	])
];

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

export const heroProps = (): Node =>
	switchOn([
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
