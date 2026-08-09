/**
 * Type. One family, a handful of sizes, and the reason the attribute order below
 * is not negotiable.
 *
 * Every `<Font>` in the face named its family, size, weight and slant inline -
 * fifteen full blocks across seven modules, all reading `family:
 * 'SYNC_TO_DEVICE'`, and four of them stating `size: 25` for what is one type
 * scale shared by the whole stat row.
 *
 * THERE IS NO FONT FILE. SYNC_TO_DEVICE means "whatever the watch uses", which is
 * the right choice for a face that should look native, and it is also why the
 * preview in tools/preview can only ever approximate text: the metrics belong to
 * the device. WFF exposes no text-width source either - textLength() counts
 * CHARACTERS - so nothing here can be centred by measurement. See the note on
 * DATE_WEEKDAY_BOX in geometry.ts for what that costs.
 */

import type { Attrs } from './xml.ts';

/** The only family this face uses. */
export const FONT_FAMILY = 'SYNC_TO_DEVICE';

export type Weight = 'LIGHT' | 'NORMAL' | 'BOLD';
export type Slant = 'NORMAL' | 'ITALIC';

/**
 * The sizes, named by what they are for rather than by their number.
 *
 * CHIP is the interesting one: it was written out four times, once per stat chip,
 * and the four are one decision. The heart rate, the step count and the battery
 * percentage have to look like a row.
 */
export const SIZE = {
	/** The clock. Set in face/clock.ts, which owns its own congruent pair. */
	CLOCK: 100,
	/** The date row. Set in face/date-common.ts, which both copies share. */
	DATE: 26,
	/** Every stat chip: weather temperature, heart rate, steps, battery. */
	CHIP: 25
} as const;

/**
 * A Font attribute bag.
 *
 * ATTRIBUTE ORDER IS family, size, weight, slant, color, because that is the order
 * the fifteen hand-written blocks used and `xml.ts` emits attributes in insertion
 * order. Reordering them changes no semantics and every byte of fifteen lines.
 *
 * face/clock.ts and face/date-common.ts deliberately do NOT use this helper. Both
 * already have a named local constant, and both spread it as
 * `{ ...FONT, weight, color }`, which emits family, size, SLANT, weight, color -
 * a different order. Converting them would churn the output to no benefit, so they
 * keep their own bags and take FONT_FAMILY from here. Do not "unify" them without
 * expecting to regenerate.
 */
export const font = (
	size: number,
	weight: Weight,
	color: string,
	slant: Slant = 'NORMAL'
): Attrs => ({ family: FONT_FAMILY, size, weight, slant, color });
