/**
 * The four chips, as data: an icon and a number each, sitting in a row.
 *
 * THE VALUE BOX WAS COMPUTED BY HAND FIVE TIMES. Every chip's text fills its chip
 * from where the text starts to the chip's right edge, at the chip's full height -
 * so `width` was always `anchor.width - x` and `height` was always `anchor.height`,
 * arithmetic done in someone's head and typed in. `valueBox` does it instead, and
 * the heart-rate chip's value and placeholder now come from ONE call rather than
 * two byte-identical boxes forty lines apart.
 *
 * THE ICONS ARE WHERE THE SHARED COLUMNS WERE HIDING. The footprint's five shapes
 * use three widths between them, two of them twice; the heart's point square was
 * centred in its box by a hand-computed 2.5. Both are now single definitions.
 *
 * WHAT IS NOT DERIVED: where each chip's text starts (28, 28, 33, 32). Those are
 * measured against icons of different widths, and there is no text metric in WFF to
 * derive them from - see the note in type.ts. They stay named fields.
 */

import * as G from '../geometry.ts';
import { n, src, type Source } from '../expr.ts';

/**
 * A chip's text box: from `x` to the chip's right edge, full height.
 *
 * THIS IS THE WHOLE REASON THE MODULE EXISTS. Five hand-computed widths, and one
 * of them - the heart rate's - written out twice for the value and the placeholder,
 * which must stay the same box or the number jumps when the sensor loses contact.
 */
export const valueBox = (chip: G.Box, x: number): G.Box => G.box(x, 0, chip.width - x, chip.height);

/** Where each chip's number begins, measured against its icon. */
export const TEXT_X = {
	HEART_RATE: 28,
	STEPS: 28,
	BATTERY: 33,
	WEATHER: 32
};

// --- The heart --------------------------------------------------------------

/**
 * Two lobes and a rotated square, because WFF has no path primitive.
 *
 * THE SQUARE'S UPPER CORNERS ARE MEANT TO BE HIDDEN behind the lobes, and that is
 * the one property worth checking: it is what makes the three shapes read as one
 * heart instead of a diamond parked under two circles. Asserted below.
 *
 * The square is centred in its own part box, which used to be a 2.5 typed twice.
 * Rotating a 13px square 45 degrees needs 18.38px of box and it has 18, so the
 * left and right corners are shaved by 0.19px. That is the shipped shape and it is
 * invisible; the corners that matter are hidden anyway.
 */
export const HEART = {
	lobe: 13,
	/** How far the second lobe is offset from the first. */
	spread: 9,
	lobesAt: { x: 0, y: 8 },
	point: { box: 18, angle: 45 },
	/** How far the point's centre sits below the lobes' centre. */
	drop: 4.5
};

const HEART_WIDTH = HEART.lobe + HEART.spread;

export const HEART_LOBES_BOX = G.box(HEART.lobesAt.x, HEART.lobesAt.y, HEART_WIDTH, HEART.lobe);

export const HEART_LOBES: G.Box[] = [0, HEART.spread].map((dx) =>
	G.box(dx, 0, HEART.lobe, HEART.lobe)
);

const POINT_CENTRE = {
	x: HEART.lobesAt.x + HEART_WIDTH / 2,
	y: HEART.lobesAt.y + HEART.lobe / 2 + HEART.drop
};

export const HEART_POINT_BOX = {
	...G.box(
		POINT_CENTRE.x - HEART.point.box / 2,
		POINT_CENTRE.y - HEART.point.box / 2,
		HEART.point.box,
		HEART.point.box
	),
	pivotX: 0.5,
	pivotY: 0.5,
	angle: HEART.point.angle
};

/** Centred in the part box, so the rotation pivot and the square agree. */
export const HEART_POINT = G.box(
	(HEART.point.box - HEART.lobe) / 2,
	(HEART.point.box - HEART.lobe) / 2,
	HEART.lobe,
	HEART.lobe
);

{
	if (HEART.spread >= HEART.lobe) {
		throw new Error(
			`the heart's lobes are ${HEART.spread} apart at ${HEART.lobe} wide - they no longer touch`
		);
	}
	// Half the diagonal of the rotated square: how far its top corner reaches up.
	const reach = (HEART.lobe * Math.SQRT2) / 2;
	const pointTop = POINT_CENTRE.y - reach;
	const lobesBottom = HEART.lobesAt.y + HEART.lobe;
	if (pointTop >= lobesBottom) {
		throw new Error(
			`the heart's point starts at y${pointTop.toFixed(2)}, below the lobes' bottom edge at ` +
				`${lobesBottom} - its corners would show and it would read as a diamond, not a heart`
		);
	}
}

// --- The footprint ----------------------------------------------------------

/**
 * A sole built from five shapes, tilted as a whole.
 *
 * THREE COLUMNS, NOT FIVE. The five shapes share three widths between them - the
 * arch's 7.5 appears in an ellipse and a rectangle, the heel's 7 likewise - and
 * each pair had its x and width typed independently, so a sole could narrow on one
 * shape and not its partner.
 *
 * THE HEEL IS 1px OFF THE SOLE'S AXIS: the ball and arch centre on 13 and the heel
 * on 14. Recorded, not corrected - a real footprint's heel is offset, the icon is
 * tilted 25 degrees anyway, and changing it changes what the watch has been drawing.
 */
const COLUMNS = {
	ball: { x: 7.5, width: 11 },
	arch: { x: 9.25, width: 7.5 },
	heel: { x: 10.5, width: 7 }
};

export const FOOTPRINT = {
	angle: -25,
	columns: COLUMNS,
	/** Order is draw order, heel last. */
	rows: [
		{ tag: 'Ellipse', col: 'ball', y: 4.5, height: 13 },
		{ tag: 'Ellipse', col: 'arch', y: 11, height: 9 },
		{ tag: 'Rectangle', col: 'arch', y: 15.5, height: 4 },
		{ tag: 'Rectangle', col: 'heel', y: 21.5, height: 3.5 },
		{ tag: 'Ellipse', col: 'heel', y: 22, height: 6.5 }
	] as const satisfies readonly {
		tag: 'Ellipse' | 'Rectangle';
		col: keyof typeof COLUMNS;
		y: number;
		height: number;
	}[]
};

export const FOOTPRINT_BOX = {
	...G.box(0, 1, 28, 34),
	pivotX: 0.5,
	pivotY: 0.5,
	angle: FOOTPRINT.angle
};

export const FOOTPRINT_SHAPES = FOOTPRINT.rows.map((row) => {
	const column = COLUMNS[row.col];
	return { tag: row.tag, box: G.box(column.x, row.y, column.width, row.height) };
});

{
	const centre = (column: { x: number; width: number }) => column.x + column.width / 2;
	if (centre(COLUMNS.ball) !== centre(COLUMNS.arch)) {
		throw new Error(
			`the footprint's ball centres on ${centre(COLUMNS.ball)} and its arch on ${centre(COLUMNS.arch)} - ` +
				'the sole would kink at the arch'
		);
	}
	// Every row's column must exist, and the widths must narrow toward the heel or
	// the sole reads as a club.
	const widths = FOOTPRINT.rows.map((row) => COLUMNS[row.col].width);
	if (widths.some((width, i) => i > 0 && width > widths[i - 1])) {
		throw new Error(`the footprint widens toward the heel: ${widths.join(' -> ')}`);
	}
}

// --- The battery cell -------------------------------------------------------

/**
 * A cell outline, a nub, and a bar that tracks the charge.
 *
 * `0.145` WAS THE UNEXPLAINED NUMBER, twice. It is `(fill.width - empty) / 100`,
 * so the bar is 1px wide at empty and exactly fills its housing at 100 - and
 * deriving it from the rectangle means resizing the cell cannot leave the bar
 * overflowing, which was previously a silent two-site edit.
 *
 * The fill sitting inside the shell's stroke is asserted rather than eyeballed:
 * WFF centres a stroke on its path, so half the 2px outline is inside the shell's
 * own bounds and a fill flush to those bounds would paint over it.
 */
export const BATTERY = {
	shell: { x: 1, y: 1, width: 20, height: 13, radius: 3.5, thickness: 2 },
	nub: { x: 21.5, y: 4.5, width: 3, height: 6 },
	fill: { x: 3.5, y: 3.5, width: 15.5, height: 8, radius: 1.5 },
	/** How wide the bar is at 0%, so an empty battery still reads as a battery. */
	empty: 1,
	full: 100
};

export const BATTERY_SHELL = {
	...G.box(BATTERY.shell.x, BATTERY.shell.y, BATTERY.shell.width, BATTERY.shell.height),
	cornerRadiusX: BATTERY.shell.radius,
	cornerRadiusY: BATTERY.shell.radius
};

export const BATTERY_NUB = G.box(
	BATTERY.nub.x,
	BATTERY.nub.y,
	BATTERY.nub.width,
	BATTERY.nub.height
);

export const BATTERY_FILL = {
	...G.box(BATTERY.fill.x, BATTERY.fill.y, BATTERY.fill.width, BATTERY.fill.height),
	cornerRadiusX: BATTERY.fill.radius,
	cornerRadiusY: BATTERY.fill.radius
};

/** The bar's width, from `empty` at 0% to the full housing at 100%. */
export const batteryFillWidth = (): string =>
	`${n(BATTERY.empty)} + ${src('BATTERY_PERCENT')} * ${n((BATTERY.fill.width - BATTERY.empty) / BATTERY.full)}`;

{
	const inset = BATTERY.shell.thickness / 2;
	const inner = {
		from: BATTERY.shell.x + inset,
		to: BATTERY.shell.x + BATTERY.shell.width - inset
	};
	const bar = { from: BATTERY.fill.x, to: BATTERY.fill.x + BATTERY.fill.width };
	if (bar.from < inner.from || bar.to > inner.to) {
		throw new Error(
			`the battery bar spans ${bar.from}..${bar.to} but the shell's inner edge is ` +
				`${inner.from}..${inner.to} - a full charge would paint over the outline`
		);
	}
}

// --- Text -------------------------------------------------------------------

/**
 * One chip's number.
 *
 * SIX SITES HAD THIS STRUCTURE WRITTEN OUT - PartText, Text, Font, then either a
 * Template with a format and a Parameter or a bare literal - differing only in
 * name, colour, weight, alignment and what they format. That is a row, not a
 * shape, and the byte-identical heart-rate pair proves it.
 */
export type ChipValue = {
	name: string;
	/** Where the text starts. The box fills the chip from here. */
	x: number;
	colour: string;
	weight?: 'BOLD' | 'NORMAL';
	align?: 'START' | 'CENTER';
	/** A printf-style format if `source` is set, otherwise a literal. */
	text: string;
	source?: Source;
};
