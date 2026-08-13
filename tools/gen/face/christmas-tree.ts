/**
 * The Christmas tree: three tiers, a trunk, five baubles and a star, standing in
 * the empty canvas at bottom left from 24 to 26 December.
 *
 * A TOP-LEVEL SECTION AND NOT A PROP, like rain.ts and fireworks.ts - it belongs
 * to the scene rather than to either blob, so it has no Gyro. That is deliberate
 * and it is what makes it read as scenery: the blobs and everything they carry
 * drift with the wrist, and a tree that drifted with them would join the pair
 * rather than stand behind them.
 *
 * REGISTERED BEFORE THE BLOBS in face/index.ts, for the same reason. Nothing
 * actually overlaps it - data/celebrations.ts asserts that against the companion's
 * sleep z's, the one thing that shares its corner - but "scenery is painted first"
 * is the rule that keeps being true when something moves.
 *
 * THE SHAPES ARE ELLIPSES BECAUSE THERE ARE NO TRIANGLES; see TREE in
 * data/celebrations.ts, which also owns every coordinate here.
 */

import { el, type Node } from '../xml.ts';
import { C } from '../palette.ts';
import * as G from '../geometry.ts';
import { AMBIENT_HIDE } from '../crossfade.ts';
import { when } from '../condition.ts';
import { CHRISTMAS } from '../states.ts';
import { starSegments, starThickness } from '../data/fireworks.ts';
import {
	TREE,
	TREE_BAUBLES,
	TREE_STAR_BOX,
	TREE_TIERS,
	TREE_TRUNK,
	TREE_TRUNK_FOOT
} from '../data/celebrations.ts';

/**
 * The baubles' colours, cycled.
 *
 * FOUR HEXES THE FACE ALREADY USES, so a decorated tree reads as this face's
 * palette at Christmas rather than as a second palette arriving with it - the
 * same call BURST_PALETTES makes for the fireworks, and the reason there is no
 * C.BAUBLE_RED.
 */
const BAUBLE_COLOURS = [C.CORAL, C.SUN, C.TEAL, C.SCARF];

/**
 * Bottom tier to top, then the decorations.
 *
 * THE TIERS ALTERNATE SHADE, dark under light, which is what gives a stack of
 * flat ellipses any depth at all. Without it the three read as one blob: they
 * overlap by design (asserted), and two identical greens meeting in an overlap
 * have no edge between them.
 */
const tree = (): Node[] => [
	el('PartDraw', { ...G.ANCHORS.CHRISTMAS_TREE, x: 0, y: 0, name: 'christmas_tree' }, [
		// Trunk, then its rounded foot - the coffee cup's construction exactly, and
		// for the same reason: a flat bottom reads as a shape cut off by the edge of
		// the picture rather than as a cylinder. The ellipse is centred ON the
		// rectangle's bottom edge, so half of it is inside and there is no seam.
		el('Rectangle', { ...TREE_TRUNK }, [el('Fill', { color: C.WOOD })]),
		el('Ellipse', { ...TREE_TRUNK_FOOT }, [el('Fill', { color: C.WOOD })]),
		...TREE_TIERS.map((tier, i) =>
			el('Ellipse', { ...tier }, [el('Fill', { color: i % 2 === 0 ? C.TREE_DARK : C.TREE })])
		),
		...TREE_BAUBLES.map((bauble, i) =>
			el('Ellipse', { ...bauble }, [
				el('Fill', { color: BAUBLE_COLOURS[i % BAUBLE_COLOURS.length] })
			])
		)
	]),
	// The star gets its OWN part, because starSegments() places its points in a box
	// of its own size at local origin - the same contract face/fireworks.ts calls it
	// under. Drawing it in the tree's part would need every segment offset by hand.
	el('PartDraw', { ...TREE_STAR_BOX, name: 'christmas_star' }, [
		...starSegments(TREE.star.size).map((seg) =>
			el('Line', { ...seg }, [
				// BUTT caps, not ROUND: the axes span the full box, so a round cap would
				// push each point half a thickness past the edge and be clipped flat.
				// face/fireworks.ts makes the same choice for the same reason.
				el('Stroke', { color: C.SUN, thickness: starThickness(TREE.star.size), cap: 'BUTT' })
			])
		)
	])
];

export const christmasTree = (): Node =>
	when('prop_christmas_tree', CHRISTMAS, [
		el('Group', { ...G.ANCHORS.CHRISTMAS_TREE, name: 'christmas_tree_group', alpha: 255 }, [
			el('Variant', AMBIENT_HIDE),
			...tree()
		])
	]);
