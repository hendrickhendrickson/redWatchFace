/**
 * The sleep z's, as data: two trios, one per blob.
 *
 * NEAR-IDENTICAL AND NOT IDENTICAL, which is why this is two rows in one table
 * rather than one builder called twice with a scale factor. The companion's trio is
 * not the hero's shrunk: its sizes are 9/12/15 against 13/18/24, ratios of 0.69,
 * 0.67 and 0.63, so there is no scale to find. And THE TWO FACE OPPOSITE WAYS - the
 * hero's z's grow left to right, the companion's right to left - which is what keeps
 * the pair from reading as one repeated motif.
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

import * as G from '../geometry.ts'
import { C } from '../palette.ts'

/** One z: where it sits, how big it is, and in what colour. */
export interface Zed {
  /** Part-name suffix. */
  tier: string
  box: G.Box
  size: number
  colour: string
}

export interface ZzzSet {
  /** Part-name stem; the z's are `<part>_<tier>`. */
  part: string
  group: string
  anchor: G.Box
  /** Which blob's parallax gain this set has to repeat. */
  gyro: 'hero' | 'companion'
  /** How far the trio rises over one cycle. */
  rise: number
  /** Seconds per cycle, and where in that cycle this set starts. */
  period: number
  offset: number
  zeds: Zed[]
}

/**
 * BOTH TRIOS USE THE SAME THREE COLOURS, which is a fact about the pair and was
 * previously six independent colour references. Only the sizes and boxes differ.
 */
const TIER = { small: C.ZZZ_SMALL, mid: C.ZZZ_MID, big: C.ICE }

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
      { tier: 'big', box: G.box(35, 2, 26, 28), size: 24, colour: TIER.big },
    ],
  },
  {
    part: 'mini_zzz',
    group: 'mini_sleep_zzz',
    anchor: G.ANCHORS.MINI_SLEEP_ZZZ,
    gyro: 'companion',
    rise: 9,
    period: 3,
    /** A second behind the hero's. */
    offset: 1,
    zeds: [
      { tier: 'small', box: G.box(32, 28, 12, 14), size: 9, colour: TIER.small },
      { tier: 'mid', box: G.box(17, 14, 15, 17), size: 12, colour: TIER.mid },
      { tier: 'big', box: G.box(0, 0, 18, 20), size: 15, colour: TIER.big },
    ],
  },
]

{
  const problems: string[] = []

  for (const s of ZZZ_SETS) {
    for (const z of s.zeds) {
      if (z.box.width < z.size || z.box.height < z.size) {
        problems.push(`${s.part}_${z.tier} is ${z.box.width}x${z.box.height} for a ${z.size}px glyph - it would clip`)
      }
      if (z.box.x + z.box.width > s.anchor.width || z.box.y + z.box.height > s.anchor.height) {
        problems.push(
          `${s.part}_${z.tier} reaches (${z.box.x + z.box.width},${z.box.y + z.box.height}) outside its ` +
            `${s.anchor.width}x${s.anchor.height} group`,
        )
      }
    }
    // Sizes must climb small -> mid -> big, so the trio reads as one z receding
    // rather than three z's of arbitrary size.
    const sizes = s.zeds.map((z) => z.size)
    if (sizes.some((v, i) => i > 0 && v <= sizes[i - 1]!)) {
      problems.push(`${s.part} sizes do not increase: ${sizes.join(' -> ')}`)
    }
  }

  // The whole point of the offset.
  const [hero, mini] = ZZZ_SETS
  if (hero!.offset % hero!.period === mini!.offset % mini!.period) {
    problems.push('both trios are on the same phase - they would pulse together, which is the one thing to avoid')
  }

  if (problems.length) throw new Error(`the sleep z's no longer fit:\n  ${problems.join('\n  ')}`)
}
