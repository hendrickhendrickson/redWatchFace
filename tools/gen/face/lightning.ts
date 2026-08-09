/**
 * The bolt that strikes beside the companion in a storm.
 *
 * A POLYLINE, WRITTEN AS ONE. The three segments were three Lines, and each one's
 * start restated the previous one's end - four coordinates typed twice, so a bolt
 * with a gap in it was one careless edit away. data/weather.ts holds four points
 * and the segments come off them in pairs.
 *
 * A TOP-LEVEL SIBLING of the companion, not a child of it, because it is gated by
 * its own Condition - which is also why it has to repeat the companion's Gyro gain
 * by hand. See blob.ts.
 */

import { el, type Node } from '../xml.ts';
import { C } from '../palette.ts';
import * as G from '../geometry.ts';
import { AMBIENT_HIDE } from '../crossfade.ts';
import { when } from '../condition.ts';
import { STORM } from '../states.ts';
import { companionGyro } from '../blob.ts';
import { BOLT, BOLT_SEGMENTS } from '../data/weather.ts';

export const lightning = (): Node =>
	when('prop_storm', STORM, [
		el('Group', { name: 'companion_lightning', ...G.ANCHORS.COMPANION_LIGHTNING, alpha: 255 }, [
			companionGyro(),
			el('Variant', AMBIENT_HIDE),
			el('PartDraw', { name: 'bolt', ...G.at(56, 68) }, [
				...BOLT_SEGMENTS.map((s) =>
					el('Line', { ...s }, [
						el('Stroke', { color: C.BOLT, thickness: BOLT.thickness, cap: 'SQUARE' })
					])
				)
			])
		])
	]);
