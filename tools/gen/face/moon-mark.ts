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
 * THE DISC IS SHADED, NOT A FLAT FILL. A RadialGradient (available in the v5
 * schema, unused everywhere else in this face) reads as a lit sphere rather than
 * a coin, and two static craters break up the silhouette. This is vector detail,
 * not a bitmap: at a 24px disc a PNG buys nothing a photo wouldn't already lose to
 * antialiasing, and it would be the face's first raster asset in a project that is
 * otherwise 100% generated primitives - a real precedent for one moon icon. The
 * craters sit UNDER the shadow ellipse in document order, so the travelling
 * shadow still covers them correctly; see the crater block below.
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

/**
 * Two fixed craters, offset from the disc's centre so the disc reads as a
 * particular rock rather than a lit circle with a dot centred in it. Sizes and
 * positions are chosen for how they look at 24px, not for lunar accuracy - real
 * mare placement is invisible at this size and would only fight the phase mask.
 */
const CRATERS = [
	{ box: G.box(12, 10, 5, 5), color: C.MOON_SHADE },
	{ box: G.box(20, 19, 4, 4), color: C.MOON_CRATER }
];

export const moonMark = (): Node =>
	when('prop_moon', MOON_VISIBLE, [
		el('Group', { name: 'moon_mark', ...G.ANCHORS.SKY_MARK, alpha: 255 }, [
			el('Variant', AMBIENT_HIDE),
			el(
				'PartDraw',
				{ name: 'moon_disc', ...G.at(G.ANCHORS.SKY_MARK.width, G.ANCHORS.SKY_MARK.height) },
				[
					el('Ellipse', { ...MOON_DISC }, [
						el('Fill', { color: C.MOON_DISC }, [
							// Light source up and left of centre; radius wider than the disc so
							// the far corner settles into MOON_SHADE instead of hard-clipping.
							el('RadialGradient', {
								centerX: MOON_DISC.x + MOON_DISC.width * 0.35,
								centerY: MOON_DISC.y + MOON_DISC.height * 0.3,
								radius: MOON_DISC.width * 0.75,
								colors: `${C.MOON_DISC} ${C.MOON_SHADE}`,
								positions: '0 1'
							})
						])
					]),
					...CRATERS.map(({ box, color }) => el('Ellipse', { ...box }, [el('Fill', { color })])),
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
