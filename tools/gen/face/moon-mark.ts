/**
 * The moon, in the sky between the blobs at night.
 *
 * A LIT DISC WITH A BLACK DISC SLIDING ACROSS IT. The shadow's x is driven by
 * [MOON_PHASE_POSITION], so the phase on screen is the real one.
 *
 * THE TRAVEL RATE HAS A NAME NOW. `1.6255` was the last unexplained number in the
 * face; it is 2 x 24px / 29.53 days - the shadow crossing the disc and returning
 * once per synodic month. data/weather.ts derives it and then runs the finished
 * expression through the evaluator at new moon, full moon and the wrap, so the
 * cycle is checked where the shadow actually lands rather than by arithmetic on
 * the rate. The units are measured, not documented: the WFF reference does not
 * list this source at all. See docs/capabilities.md for the hardware probe.
 *
 * NO GYRO, deliberately. Nothing joins to it, and holding it in the same plane as
 * the clock is what makes it read as sky rather than as another prop stuck to a
 * blob. Distant things moving least is the effect, not a gap in it - see blob.ts.
 *
 * IT SHARES ITS BOX WITH THE SNOWFLAKE (ANCHORS.SKY_MARK) and the two must never
 * both draw. states.ts proves that: MOON_VISIBLE requires the temperature to be
 * above freezing OR the forecast to be missing, which is exactly the complement of
 * freeze-mark.ts's gate.
 */

import { el, type Node } from '../xml.ts';
import { C } from '../palette.ts';
import * as G from '../geometry.ts';
import { AMBIENT_HIDE } from '../crossfade.ts';
import { when } from '../condition.ts';
import { MOON_VISIBLE } from '../states.ts';
import { MOON_DISC, moonShadowX } from '../data/weather.ts';

export const moonMark = (): Node =>
	when('prop_moon', MOON_VISIBLE, [
		el('Group', { name: 'moon_mark', ...G.ANCHORS.SKY_MARK, alpha: 255 }, [
			el('Variant', AMBIENT_HIDE),
			el(
				'PartDraw',
				{ name: 'moon_disc', ...G.at(G.ANCHORS.SKY_MARK.width, G.ANCHORS.SKY_MARK.height) },
				[
					el('Ellipse', { ...MOON_DISC }, [el('Fill', { color: C.MOON_DISC })]),
					// The shadow's authored x is where the Transform's first frame puts it -
					// half way across - so the part reads sensibly with no data at all.
					el('Ellipse', { ...MOON_DISC, x: MOON_DISC.x + MOON_DISC.width / 2 }, [
						el('Transform', { target: 'x', value: moonShadowX() }),
						el('Fill', { color: C.BLACK })
					])
				]
			)
		])
	]);
