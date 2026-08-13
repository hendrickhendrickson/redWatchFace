/**
 * The sleep z's, as data: two trios, one per blob.
 *
 * NEAR-IDENTICAL AND NOT IDENTICAL, which is why this is two rows in one table
 * rather than one builder called twice with a scale factor. The companion's trio is
 * not the hero's shrunk: its sizes are 9/12/15 against 13/18/24, ratios of 0.69,
 * 0.67 and 0.63, so there is no scale to find. And THE TWO FACE OPPOSITE WAYS - the
 * hero's z's trail off to the right, the companion's to the left - which is what keeps
 * the pair from reading as one repeated motif.
 *
 * NEITHER TRIO MOVES FOR THE CHRISTMAS TREE, which stands in the companion's strip.
 * Both were briefly reshaped to clear it and both looked worse for it; the reasoning
 * that put them back is in ANCHORS.COMPANION_SLEEP_ZZZ, and it is a rule about which
 * state pays, not a fact about geometry.
 *
 * THE PHASES ARE A SECOND APART ON PURPOSE, so the two sets do not pulse together.
 * That offset was the only difference between two otherwise identical Transform
 * strings; it is a field now, and the assertion at the bottom is the thing that
 * fires if someone "simplifies" the two sets into one phase.
 *
 * WHAT IS NOT DERIVED: each z's box. The padding around a glyph is 3x5 for all three
 * of the companion's and for the hero's smallest, and 2x4 for the hero's other two,
 * so a derivation would need two exceptions out of six. WFF exposes no text metric
 * to derive it from anyway - see type.ts - so the boxes are measured fields, with an
 * assertion that a box is at least as big as the glyph it holds.
 */

import * as G from '../geometry.ts';
import { C } from '../palette.ts';

/** One z: where it sits, how big it is, and in what colour. */
export type Zed = {
	/** Part-name suffix. */
	tier: string;
	box: G.Box;
	size: number;
	colour: string;
};

export type ZzzSet = {
	/** Part-name stem; the z's are `<part>_<tier>`. */
	part: string;
	group: string;
	anchor: G.Box;
	/** Which blob's parallax gain this set has to repeat. */
	gyro: 'hero' | 'companion';
	/** How far the trio rises over one cycle. */
	rise: number;
	/** Seconds per cycle, and where in that cycle this set starts. */
	period: number;
	offset: number;
	zeds: Zed[];
};

/**
 * BOTH TRIOS USE THE SAME THREE COLOURS, which is a fact about the pair and was
 * previously six independent colour references. Only the sizes and boxes differ.
 */
const TIER = { small: C.ZZZ_SMALL, mid: C.ZZZ_MID, big: C.ICE };

export const ZZZ_SETS: ZzzSet[] = [
	{
		part: 'zzz',
		group: 'sleep_zzz',
		anchor: G.ANCHORS.SLEEP_ZZZ,
		gyro: 'hero',
		rise: 14,
		period: 3,
		offset: 0,
		zeds: [
			{ tier: 'small', box: G.box(0, 32, 16, 18), size: 13, colour: TIER.small },
			{ tier: 'mid', box: G.box(17, 18, 20, 22), size: 18, colour: TIER.mid },
			{ tier: 'big', box: G.box(35, 2, 26, 28), size: 24, colour: TIER.big }
		]
	},
	{
		part: 'companion_zzz',
		group: 'companion_sleep_zzz',
		anchor: G.ANCHORS.COMPANION_SLEEP_ZZZ,
		gyro: 'companion',
		rise: 9,
		period: 3,
		/** A second behind the hero's. */
		offset: 1,
		zeds: [
			{ tier: 'small', box: G.box(32, 28, 12, 14), size: 9, colour: TIER.small },
			{ tier: 'mid', box: G.box(17, 14, 15, 17), size: 12, colour: TIER.mid },
			{ tier: 'big', box: G.box(0, 0, 18, 20), size: 15, colour: TIER.big }
		]
	}
];

{
	const problems: string[] = [];

	for (const set of ZZZ_SETS) {
		for (const zed of set.zeds) {
			if (zed.box.width < zed.size || zed.box.height < zed.size) {
				problems.push(
					`${set.part}_${zed.tier} is ${zed.box.width}x${zed.box.height} for a ${zed.size}px glyph - it would clip`
				);
			}
			if (
				zed.box.x + zed.box.width > set.anchor.width ||
				zed.box.y + zed.box.height > set.anchor.height
			) {
				problems.push(
					`${set.part}_${zed.tier} reaches (${zed.box.x + zed.box.width},${zed.box.y + zed.box.height}) outside its ` +
						`${set.anchor.width}x${set.anchor.height} group`
				);
			}
		}
		// Sizes must climb small -> mid -> big, so the trio reads as one z receding
		// rather than three z's of arbitrary size.
		const sizes = set.zeds.map((zed) => zed.size);
		if (sizes.some((size, i) => i > 0 && size <= sizes[i - 1])) {
			problems.push(`${set.part} sizes do not increase: ${sizes.join(' -> ')}`);
		}
	}

	/**
	 * THE SMALLEST Z HAS TO COME OFF THE BLOB, and that is a fact about two groups
	 * that never meet in the markup - the z's sit in their own section, the body in
	 * the blob's, and nothing between them relates the two.
	 *
	 * IT IS THE ONE THING THAT WAS ACTUALLY WRONG when the companion's trio moved for
	 * the Christmas tree. Every box fitted, the tree cleared it, the validator passed
	 * and the render showed three z's rising out of the MOON. A trio floating in the
	 * sky is not a trio the machine can tell from a trio leaving a sleeping blob unless
	 * someone writes down that the two have to touch.
	 *
	 * MEASURED AGAINST THE BODY ELLIPSE, NOT ITS BOX. Both blobs are ellipses and both
	 * trios leave from a corner, which is exactly where a box is furthest from the
	 * shape it encloses - the companion's smallest z is 3px inside the box and 5px
	 * clear of the blob. `radial` is the ellipse equation: 1 is the outline, below is
	 * inside, and the upper bound is what "adjacent to" means here. Hero 1.06,
	 * companion 1.26; the anchor that put the trio on the moon scores 1.65, which is
	 * why the bound is 1.5 rather than anything rounder.
	 */
	const BODIES = {
		hero: { anchor: G.ANCHORS.HERO, body: G.HERO_BOX },
		companion: { anchor: G.ANCHORS.COMPANION, body: G.COMPANION_BOX }
	};
	const ADJACENT = 1.5;

	for (const set of ZZZ_SETS) {
		const { anchor, body } = BODIES[set.gyro];
		const cx = anchor.x + body.x + body.width / 2;
		const cy = anchor.y + body.y + body.height / 2;
		// The trio's origin is its smallest z - the one nearest the mouth it came out of.
		const first = set.zeds[0];
		const left = set.anchor.x + first.box.x;
		const top = set.anchor.y + first.box.y;
		// The glyph's closest point to the body's centre.
		const near = {
			x: Math.min(Math.max(cx, left), left + first.box.width),
			y: Math.min(Math.max(cy, top), top + first.box.height)
		};
		const radial =
			((near.x - cx) / (body.width / 2)) ** 2 + ((near.y - cy) / (body.height / 2)) ** 2;
		if (radial <= 1) {
			problems.push(
				`${set.part}_${first.tier} is inside the ${set.gyro}'s body (radial ${radial.toFixed(2)})`
			);
		} else if (radial > ADJACENT) {
			problems.push(
				`${set.part}_${first.tier} floats ${radial.toFixed(2)} from the ${set.gyro} - ` +
					`the trio has to leave the blob, not the background`
			);
		}
	}

	// The whole point of the offset.
	const [hero, companion] = ZZZ_SETS;
	if (hero.offset % hero.period === companion.offset % companion.period) {
		problems.push(
			'both trios are on the same phase - they would pulse together, which is the one thing to avoid'
		);
	}

	if (problems.length) {
		throw new Error(`the sleep z's no longer fit:\n  ${problems.join('\n  ')}`);
	}
}
