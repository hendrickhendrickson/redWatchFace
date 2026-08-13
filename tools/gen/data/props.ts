/**
 * What the hero holds, as data: the Wednesday coffee cup, the Friday game
 * controller, the warm-day cocktail.
 *
 * THE HAND IS THE ORIGIN OF EVERYTHING HERE, and it used to be a number in a
 * comment. face/hero-props.ts explained in prose that the hero group at (207,262)
 * plus `hero_arm_left_up`'s cream cap at (1,26,19,18) puts the fist at canvas
 * (217.5,297), which against the props anchor (199,262) is group-local (18.5,35) -
 * "the number every prop below is positioned against". It was then typed into
 * eleven coordinates by hand. Moving the hero, or repositioning that one arm,
 * would have left every prop hanging in mid-air with nothing to report it.
 * `HAND` below computes it from the two anchors and the arm row, and asserts the
 * shipped value.
 *
 * THE CONTROLLER'S FRACTIONS WERE ALREADY WRITTEN DOWN - as prose, alongside code
 * that carried only the multiplied-out products. So the traced proportions could
 * not be checked against the shape, and in fact two of them do not reproduce it
 * (see CONTROLLER). Here the fractions are the source and the products are
 * computed, so the trace is a claim the build tests rather than a note the build
 * ignores.
 *
 * WHAT STAYS TABULATED. Where a number is a measured departure rather than a
 * consequence, it is a named field with the departure's size in it - the same call
 * rain.ts makes with its hand-placed x scatter. A derivation that needs a fudge
 * per row is not a derivation.
 */

import * as G from '../geometry.ts';
import { COMPANION_LIMBS, HERO_ARMS } from './blobs.ts';

/**
 * Round to one decimal place.
 *
 * Every authored coordinate in this section is at most 1dp, and the fractions
 * multiply out to things like 5.712. Rounding at the point of derivation is what
 * makes byte-identity with the hand-written values achievable at all - and it is
 * also the resolution the design was traced at, so it is not merely cosmetic.
 */
const r1 = (value: number): number => Math.round(value * 10) / 10;

/** A stroked segment. */
export type Seg = {
	startX: number;
	startY: number;
	endX: number;
	endY: number;
};

const seg = (startX: number, startY: number, endX: number, endY: number): Seg => ({
	startX,
	startY,
	endX,
	endY
});

// --- The hand ---------------------------------------------------------------

/**
 * Where the hero's raised fist is, in THIS group's coordinates.
 *
 * Derived, not typed: the hero anchor, plus the centre of `leftUp`'s cream cap,
 * minus the props anchor. HERO_ARMS.leftUp carries a note pointing back here so
 * the dependency is visible from both ends.
 */
export const HAND = (() => {
	const cap = HERO_ARMS.leftUp.cream;
	return {
		x: G.ANCHORS.HERO.x + cap.x + cap.width / 2 - G.ANCHORS.HERO_PROPS.x,
		y: G.ANCHORS.HERO.y + cap.y + cap.height / 2 - G.ANCHORS.HERO_PROPS.y
	};
})();

/**
 * The value the props were authored against.
 *
 * Restated here because something asserts the restatement on every build - the
 * rule palette.ts's SHIPPED table set. If the hero moves, this fires and the
 * message says which of the three inputs changed under it.
 */
const HAND_SHIPPED = { x: 18.5, y: 35 };

if (HAND.x !== HAND_SHIPPED.x || HAND.y !== HAND_SHIPPED.y) {
	throw new Error(
		`the hero's fist is now at prop-local (${HAND.x},${HAND.y}), not ` +
			`(${HAND_SHIPPED.x},${HAND_SHIPPED.y}) - ANCHORS.HERO, ANCHORS.HERO_PROPS or ` +
			'HERO_ARMS.leftUp.cream moved, and every prop in this file is placed against it'
	);
}

/**
 * The COMPANION's near hand, in ITS prop group's coordinates. Derived exactly as
 * HAND is, off the same three inputs one blob down.
 *
 * LIMB 1, NOT LIMB 0 - the hand on the hero's side. The two tools are a pair and
 * have to read as one: put the sickle in the far hand and the hammer and sickle sit
 * at opposite ends of the face with a whole blob between them.
 *
 * The companion has no arm poses at all, so unlike HAND there is no "which pose"
 * to choose - these four limbs are the same day and night, which is also why the
 * sickle needs no equivalent of HANDS_FULL.
 */
const COMPANION_GRIP = COMPANION_LIMBS[1].cream;

export const COMPANION_HAND = {
	x:
		G.ANCHORS.COMPANION.x +
		COMPANION_GRIP.x +
		COMPANION_GRIP.width / 2 -
		G.ANCHORS.COMPANION_PROPS.x,
	y:
		G.ANCHORS.COMPANION.y +
		COMPANION_GRIP.y +
		COMPANION_GRIP.height / 2 -
		G.ANCHORS.COMPANION_PROPS.y
};

/**
 * As HAND_SHIPPED: a restatement that something checks on every build.
 *
 * x MOVED FROM 34.5 TO 33.5 when COMPANION_LIMBS[1].cream's grip cap shifted
 * 1px left to bring it inside its own 62-wide part box - see data/blobs.ts. The
 * sickle follows it automatically, since SICKLE_BOX is computed off this value
 * rather than typed separately.
 */
const COMPANION_HAND_SHIPPED = { x: 33.5, y: 46 };

if (
	COMPANION_HAND.x !== COMPANION_HAND_SHIPPED.x ||
	COMPANION_HAND.y !== COMPANION_HAND_SHIPPED.y
) {
	throw new Error(
		`the companion's fist is now at prop-local (${COMPANION_HAND.x},${COMPANION_HAND.y}), not ` +
			`(${COMPANION_HAND_SHIPPED.x},${COMPANION_HAND_SHIPPED.y}) - ANCHORS.COMPANION, ` +
			'ANCHORS.COMPANION_PROPS or COMPANION_LIMBS[1].cream moved, and the sickle hangs off it'
	);
}

// --- The Wednesday coffee cup -----------------------------------------------

/**
 * The cup, as the three stacked shapes it actually is.
 *
 * NOT A ROUNDED RECTANGLE, on purpose - see face/hero-props.ts for why a convex
 * base is required once the rim reads as an ellipse. What matters here is that the
 * three shapes SHARE ONE x AND ONE WIDTH and stack by construction: the body
 * rectangle starts at the rim ellipse's centre, and the base ellipse's centre
 * lands on the rectangle's bottom edge. Written out, that was three independent
 * y values and three independent widths, and nothing said they were the same cup.
 */
export type Cup = {
	x: number;
	width: number;
	/** The rim ellipse's box top. */
	top: number;
	topH: number;
	/** The straight-sided body, from the rim's centre down. */
	bodyH: number;
	baseH: number;
	/** How far the coffee is inset inside the rim. */
	inset: { x: number; y: number };
};

export const CUP: Cup = {
	x: 4,
	width: 13,
	top: 8.5,
	topH: 5,
	bodyH: 9.75,
	baseH: 4.5,
	inset: { x: 1.75, y: 1 }
};

/** The rim's vertical centre, which is where the straight sides begin. */
const CUP_SHOULDER = CUP.top + CUP.topH / 2;
/** The bottom of the base ellipse - the point that sits on the hand. */
const CUP_BASE_BOTTOM = CUP_SHOULDER + CUP.bodyH + CUP.baseH / 2;
const CUP_CENTRE_X = CUP.x + CUP.width / 2;
/** The right-hand wall. The handle is positioned off this. */
const CUP_WALL_X = CUP.x + CUP.width;

export const CUP_SHAPES = {
	/** The white base, drawn first of the three. */
	base: G.box(CUP.x, CUP_BASE_BOTTOM - CUP.baseH, CUP.width, CUP.baseH),
	body: G.box(CUP.x, CUP_SHOULDER, CUP.width, CUP.bodyH),
	rim: G.box(CUP.x, CUP.top, CUP.width, CUP.topH),
	/**
	 * The coffee, inset inside the rim so a white wall is left on both sides.
	 *
	 * DERIVED FROM THE RIM RATHER THAN PLACED. Drawing the liquid at its own
	 * coordinates is how it ended up touching open background on the left and
	 * right, which read as a bowl of brown rather than a mug.
	 */
	coffee: G.box(
		CUP.x + CUP.inset.x,
		CUP.top + CUP.inset.y,
		CUP.width - 2 * CUP.inset.x,
		CUP.topH - 2 * CUP.inset.y
	)
};

/**
 * The handle: a ring with a 60-degree gap, and the gap faces the cup.
 *
 * BOTH ANGLES AND THE CENTRE COME OUT OF `gap`. WFF measures clockwise from 12
 * o'clock, so 270 is 9 o'clock - pointing at the cup - and the arc runs from
 * half a gap past that all the way round: start 300, end 600. Those two numbers
 * were typed, and so was the 21 below, with the arithmetic in a comment.
 *
 * `centerX` IS SET BY THE WALL. The ring's leftmost drawn pixel is at
 * `centerX - r*cos(gap/2) - thickness/2`, and it has to land ON the wall at x17,
 * not inside it: when it crossed into the body the two whites merged and that
 * side of the wall read twice as thick as the other. So the centre is derived
 * from the wall and the assertion below checks the landing.
 */
export const HANDLE = { r: 3.5, thickness: 2, gap: 60, centerY: 16 };

const HALF_GAP_RAD = ((HANDLE.gap / 2) * Math.PI) / 180;

export const HANDLE_ARC = {
	centerX: Math.round(CUP_WALL_X + HANDLE.r * Math.cos(HALF_GAP_RAD) + HANDLE.thickness / 2),
	centerY: HANDLE.centerY,
	width: 2 * HANDLE.r,
	height: 2 * HANDLE.r,
	startAngle: 270 + HANDLE.gap / 2,
	endAngle: 270 + HANDLE.gap / 2 + (360 - HANDLE.gap)
};

/**
 * Three wisps of steam, each with two direction changes.
 *
 * ONE ROW PER WISP. This was nine `Line` elements with twelve coordinate pairs
 * between them, and the properties the comment claimed - disjoint x-bands, the
 * outer two mirrored about the cup's centre, the middle one rising higher - were
 * claims about numbers nobody could check without redoing the arithmetic. Both
 * are asserted below.
 *
 * `sway` is WHICH WAY THE FIRST BEND GOES. The left wisp bends left first and the
 * other two bend right first, which is why the three do not read as one wave.
 */
export type Wisp = {
	/** The centreline. */
	x: number;
	/** Rise per segment. The middle wisp's is larger, so it tops out higher. */
	dy: number;
	sway: 1 | -1;
};

export const STEAM = {
	/** Where the wisps start, just above the rim. */
	y0: 8,
	/** How far each bend leaves the centreline. */
	sway: 1,
	segments: 3,
	thickness: 1.4,
	/** How far a wisp drifts upward over one cycle, in px - the drift() idiom the sleep z's use. */
	rise: 4,
	/** Seconds per drift/fade cycle - short, so it reads as a light simmer rather than a gust. */
	period: 3,
	// `satisfies`, not `as`: it checks the rows against Wisp AND keeps `sway` at its literal
	// 1 / -1 rather than widening it to number, which the assertion form threw away.
	wisps: [
		{ x: 6, dy: 2.3, sway: -1 },
		{ x: 10.5, dy: 2.5, sway: 1 },
		{ x: 15, dy: 2.3, sway: 1 }
	] satisfies Wisp[]
};

/** A wisp's four points, bending sway / -sway / back to the centreline. */
const wispPoints = (wisp: Wisp): { x: number; y: number }[] =>
	[0, 1, 2, 3].map((i) => ({
		x: r1(wisp.x + (i === 1 ? wisp.sway : i === 2 ? -wisp.sway : 0) * STEAM.sway),
		y: r1(STEAM.y0 - i * wisp.dy)
	}));

export const STEAM_SEGMENTS: Seg[] = STEAM.wisps.flatMap((wisp) => {
	const points = wispPoints(wisp);
	return [0, 1, 2].map((i) => seg(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y));
});

/**
 * The cup's part box.
 *
 * BOTH ORIGIN COORDINATES ARE THE HAND. The body is centred on the fist's x and
 * the base's bottom edge sits exactly on its y - which is what the comment said,
 * expressed as `x: 8, y: 12`. The size stays tabulated; it is generous rather
 * than tight, and the three assertions after it are what keep it honest, since
 * anything that outgrows this box is silently clipped.
 */
export const CUP_BOX = G.box(HAND.x - CUP_CENTRE_X, HAND.y - CUP_BASE_BOTTOM, 28, 24);

{
	const handleRight = HANDLE_ARC.centerX + HANDLE.r + HANDLE.thickness / 2;
	const steamTop = Math.min(
		...STEAM_SEGMENTS.map((segment) => Math.min(segment.startY, segment.endY))
	);
	const problems: string[] = [];

	// The ring must touch the wall, not cross it and not float clear of it. Half a
	// tenth of a pixel either way - tighter than the 1dp the shape is authored at.
	const leftmost = HANDLE_ARC.centerX - HANDLE.r * Math.cos(HALF_GAP_RAD) - HANDLE.thickness / 2;
	if (Math.abs(leftmost - CUP_WALL_X) > 0.05) {
		problems.push(
			`the handle's leftmost pixel is at ${r1(leftmost)}, not on the wall at ${CUP_WALL_X}`
		);
	}
	if (handleRight > CUP_BOX.width) {
		problems.push(`the handle reaches ${handleRight}, past the box's ${CUP_BOX.width}`);
	}
	if (CUP_BASE_BOTTOM > CUP_BOX.height) {
		problems.push(`the base reaches ${CUP_BASE_BOTTOM}, past the box's ${CUP_BOX.height}`);
	}
	/**
	 * THE TALLEST WISP'S CAP IS CLIPPED, BY 0.2px, AND THAT IS THE SHIPPED SHAPE.
	 *
	 * The middle wisp's centreline tops out at y0.5 inside a box that starts at 0,
	 * and a 1.4-thick round cap reaches 0.7 past the endpoint - so its last 0.2px
	 * arrives flat instead of round. Recorded rather than quietly fixed, the same
	 * call COMPANION_SCARF_BOX makes about the companion's scarf tail: growing the box
	 * changes what the watch has been drawing.
	 *
	 * What is asserted is the line itself, not the cap. A centreline outside the
	 * box would lose a whole segment, which is a bug; a shaved cap is a detail.
	 */
	if (steamTop < 0) {
		problems.push(
			`a steam centreline reaches ${r1(steamTop)}, outside the box - a whole segment would be lost`
		);
	} else if (steamTop - STEAM.thickness / 2 < -0.25) {
		problems.push(
			`the steam's cap now overshoots the box top by ${r1(STEAM.thickness / 2 - steamTop)}px, ` +
				'against the 0.2 that shipped - it would read as a flat-topped wisp'
		);
	}

	// The three claims the steam comment makes, as checks.
	const bands = STEAM.wisps.map(
		(wisp) =>
			[
				r1(wisp.x - STEAM.sway - STEAM.thickness / 2),
				r1(wisp.x + STEAM.sway + STEAM.thickness / 2)
			] as const
	);
	for (let i = 1; i < bands.length; i++) {
		if (bands[i][0] <= bands[i - 1][1]) {
			problems.push(
				`steam wisps ${i - 1} and ${i} overlap: ${bands[i - 1][1]} then ${bands[i][0]}`
			);
		}
	}
	const outer = STEAM.wisps.filter((_, i) => i !== 1);
	if ((outer[0].x + outer[1].x) / 2 !== CUP_CENTRE_X) {
		problems.push(
			`the outer wisps mirror about ${(outer[0].x + outer[1].x) / 2}, not the cup's ${CUP_CENTRE_X}`
		);
	}
	if (STEAM.wisps[1].dy <= STEAM.wisps[0].dy) {
		problems.push(
			'the middle wisp no longer rises higher than the outer two - the group reads as a fence'
		);
	}

	if (problems.length) {
		throw new Error(`the coffee cup no longer holds together:\n  ${problems.join('\n  ')}`);
	}
}

// --- The Friday game controller ---------------------------------------------

/**
 * THE SILHOUETTE IS THE COORDINATE SYSTEM, and it is placed by the hand.
 *
 * The full shape is 28 wide - the shell is 24 and the grip ellipses reach 28 at
 * their widest - and it is centred on the fist at x18.5 inside an integer part
 * box. That is where the half-pixel offsets scattered through this prop come
 * from: 28 is even, 18.5 is not, so the content sits at 0.5..28.5 in a box whose
 * own origin is an integer. The comment said so; every affected coordinate then
 * carried the 0.5 by hand.
 */
const SILHOUETTE = { left: 0.5, width: 28 };
const SILHOUETTE_CENTRE = SILHOUETTE.left + SILHOUETTE.width / 2;

/** A position traced off the photograph, as a fraction of the silhouette's width. */
export type Traced = {
	frac: number;
	/**
	 * A measured departure from the traced position, in px. Present only where the
	 * fraction does not reproduce the shipped shape, and always with a reason.
	 */
	off?: number;
};

/** Across the silhouette, from its left edge. */
const across = (traced: Traced): number =>
	r1(SILHOUETTE.left + traced.frac * SILHOUETTE.width + (traced.off ?? 0));
/** Down from the silhouette's top. Fractions are of the WIDTH in both axes -
 *  that is how the trace was taken, and it is why nothing here divides by 20. */
const down = (traced: Traced): number => r1(traced.frac * SILHOUETTE.width + (traced.off ?? 0));

/**
 * The traced layout.
 *
 * THE D-PAD SITS INBOARD OF THE LEFT STICK - 0.355 against 0.204 - which is the
 * most recognisable thing about this arrangement and the thing two earlier passes
 * had backwards. Now that the fractions are the source, that ordering is visible
 * in the data instead of being a consequence to re-derive.
 *
 * TWO ROWS CARRY AN `off`, AND THEY ARE NOT THE SAME TWO THE COMMENT CLAIMED.
 * The old note said the ABXY diamond and the right stick were "pulled 1.5px
 * apart" because the enlarged buttons would collide with the enlarged stick.
 * Computing both placements says otherwise: the clearance between the A button
 * and the right stick is 0.51px where the fractions put them and 0.49px as
 * shipped, so nothing was gained there. What the 1.5px inboard nudge actually
 * buys is the SHELL EDGE - see the assertion below - and the right stick's 0.8px
 * has no derivable reason at all, so it is recorded as measured rather than
 * dressed up.
 *
 * ONE SIZE IS TRACED AND THE REST ARE PX. The two sticks share `STICK_D`, which
 * their traced 0.164 reproduces - and them being the same size is a design fact
 * rather than a coincidence of two independently typed 4.6s. The buttons are 3.2
 * against a true 2.2 because below ~3px a colour stops reading as a colour, and
 * the d-pad's 5.4 arm is 0.05px off what its traced 0.191 gives: inside the noise
 * of the trace, but a fraction that needs correcting to a tenth is not carrying
 * its weight.
 */
const STICK_D = r1(0.164 * SILHOUETTE.width);

export const CONTROLLER = {
	shell: { width: 24, height: 15, radius: 4.5 },
	/** The grips ARE the silhouette's outer edges, so they are flush by construction.
	 *  The traced 0.145/0.855 would put their centres at 4.6 and 24.4 against a
	 *  shipped 5.5 and 23.5; the shipped pair is symmetric about the silhouette and
	 *  the traced one is not, so the silhouette wins and the fractions are dropped. */
	grip: { d: 10, top: 7, bottom: { frac: 0.717 } },
	leftStick: { x: { frac: 0.204 }, y: { frac: 0.191 }, d: STICK_D },
	dpad: { x: { frac: 0.355 }, y: { frac: 0.388 }, arm: 5.4, bar: 2 },
	rightStick: { x: { frac: 0.691, off: -0.8 }, y: { frac: 0.382, off: 0.8 }, d: STICK_D },
	/** Y, X, B, A on a diamond. `spacing` is the same in both axes. */
	diamond: { x: { frac: 0.822, off: -1.5 }, y: { frac: 0.204 }, spacing: 2.6, d: 3.2 }
};

/** A circle placed by its centre. */
const dot = (cx: number, cy: number, d: number): G.Box =>
	G.box(r1(cx - d / 2), r1(cy - d / 2), d, d);

/** The grips' bottom edge, which is also the part box's height. */
const GRIP_BOTTOM = Math.round(down(CONTROLLER.grip.bottom));

/**
 * The part box.
 *
 * `x` IS THE HAND, `width` AND `height` ARE THE CONTENT. The silhouette runs to
 * 28.5, so the box needs 29 integer columns to hold it, and the grips are the
 * lowest thing in it. `y` stays tabulated - the shell's top edge against the
 * fist is a judgement about how the controller is held, not a derivation.
 */
export const CONTROLLER_BOX = G.box(
	HAND.x - SILHOUETTE_CENTRE,
	25,
	Math.ceil(SILHOUETTE.left + SILHOUETTE.width),
	GRIP_BOTTOM
);

const DPAD_C = { x: across(CONTROLLER.dpad.x), y: down(CONTROLLER.dpad.y) };
const DIAMOND_C = { x: across(CONTROLLER.diamond.x), y: down(CONTROLLER.diamond.y) };

export const CONTROLLER_SHAPES = {
	/** Drawn before the shell, so the shell covers where they join it. */
	grips: [SILHOUETTE.left, SILHOUETTE.left + SILHOUETTE.width - CONTROLLER.grip.d].map((x) =>
		G.box(x, CONTROLLER.grip.top, CONTROLLER.grip.d, GRIP_BOTTOM - CONTROLLER.grip.top)
	),
	shell: {
		...G.box(
			SILHOUETTE_CENTRE - CONTROLLER.shell.width / 2,
			0,
			CONTROLLER.shell.width,
			CONTROLLER.shell.height
		),
		cornerRadiusX: CONTROLLER.shell.radius,
		cornerRadiusY: CONTROLLER.shell.radius
	},
	leftStick: dot(
		across(CONTROLLER.leftStick.x),
		down(CONTROLLER.leftStick.y),
		CONTROLLER.leftStick.d
	),
	/** Both bars centre on the same point, so the cross is symmetric about itself
	 *  by construction. It was four independent coordinate pairs. */
	dpad: [
		G.box(
			r1(DPAD_C.x - CONTROLLER.dpad.bar / 2),
			r1(DPAD_C.y - CONTROLLER.dpad.arm / 2),
			CONTROLLER.dpad.bar,
			CONTROLLER.dpad.arm
		),
		G.box(
			r1(DPAD_C.x - CONTROLLER.dpad.arm / 2),
			r1(DPAD_C.y - CONTROLLER.dpad.bar / 2),
			CONTROLLER.dpad.arm,
			CONTROLLER.dpad.bar
		)
	],
	rightStick: dot(
		across(CONTROLLER.rightStick.x),
		down(CONTROLLER.rightStick.y),
		CONTROLLER.rightStick.d
	)
};

/**
 * The diamond's four buttons, by compass point.
 *
 * A IS IN HERE WITH THE OTHER THREE even though it is drawn in a separate group
 * so it alone can pulse. Its position was worked out in a comment - "the centre
 * lands at (26.0,33.3), which is the part box origin (4,25) plus local
 * (22.0,8.3)" - and then typed as a group origin and an ellipse offset that had
 * to agree with each other and with the three buttons it completes. Now all four
 * come off one centre and one spacing.
 */
const DIAMOND_AT = (dx: number, dy: number) =>
	dot(
		r1(DIAMOND_C.x + dx * CONTROLLER.diamond.spacing),
		r1(DIAMOND_C.y + dy * CONTROLLER.diamond.spacing),
		CONTROLLER.diamond.d
	);

export const DIAMOND = {
	/** Draw order: top, left, right. */
	top: DIAMOND_AT(0, -1),
	left: DIAMOND_AT(-1, 0),
	right: DIAMOND_AT(1, 0),
	bottom: DIAMOND_AT(0, 1)
};

/**
 * The pulsing A button, which lives in its own Group so a Transform can fade it.
 *
 * A GROUP'S x/y MUST BE INTEGERS, so the button's fractional position has to live
 * on the ellipse inside it - and the two halves of that split have to add back up
 * to the same centre the other three buttons are placed against. Both halves are
 * derived from that centre here, which is the only way the split cannot drift.
 */
const PULSE_SIZE = 5;
const A_CENTRE = {
	x: CONTROLLER_BOX.x + DIAMOND_C.x,
	y: r1(CONTROLLER_BOX.y + DIAMOND_C.y + CONTROLLER.diamond.spacing)
};

export const PULSE_BOX = G.box(
	Math.round(A_CENTRE.x - PULSE_SIZE / 2),
	Math.round(A_CENTRE.y - PULSE_SIZE / 2),
	PULSE_SIZE,
	PULSE_SIZE
);

export const PULSE_BUTTON = dot(
	r1(A_CENTRE.x - PULSE_BOX.x),
	r1(A_CENTRE.y - PULSE_BOX.y),
	CONTROLLER.diamond.d
);

/**
 * WHY THE DIAMOND CARRIES A 1.5px NUDGE.
 *
 * The buttons are enlarged to 3.2 so their colours read at this size. At the
 * traced 0.822 that pushes the B button's right edge to 27.7, which is 1.2px past
 * the shell's own right edge at 26.5 - the button would hang off the shell and
 * into the grip. Pulled 1.5px inboard it lands at 26.2, leaving 0.3px of shell.
 *
 * This block asserts both halves of that: what is shipped fits, and the traced
 * position does not. The second half is the part that matters - without it the
 * nudge looks like an unexplained fudge and the next person removes it.
 */
{
	const shellRight = CONTROLLER_SHAPES.shell.x + CONTROLLER_SHAPES.shell.width;
	const bRight = DIAMOND.right.x + DIAMOND.right.width;
	if (bRight > shellRight) {
		throw new Error(
			`the B button reaches ${r1(bRight)}, past the shell's right edge at ${shellRight}`
		);
	}
	const untraced = across({ frac: CONTROLLER.diamond.x.frac });
	const wouldReach = r1(untraced + CONTROLLER.diamond.spacing + CONTROLLER.diamond.d / 2);
	if (wouldReach <= shellRight) {
		throw new Error(
			`the diamond's ${CONTROLLER.diamond.x.off}px nudge is no longer needed: untouched, B would ` +
				`reach ${wouldReach} and the shell ends at ${shellRight}. Drop the off and say why.`
		);
	}
}

// --- The warm-day cocktail --------------------------------------------------

/**
 * Five strokes and a liquid, all hung off one stem x.
 *
 * THE STEM IS THE HAND. `stemX` is the fist's x in this box, so the bowl, the
 * stem, the foot and the liquid are all symmetric about the point the glass is
 * held at - which was true of the shipped shape and expressed as six independent
 * coordinates that happened to agree. Only the straw is asymmetric, deliberately.
 */
export const COCKTAIL = {
	/** Where the glass is held. The part box is placed so this lands on the fist. */
	stemX: 10.5,
	rimY: 9,
	rimHalf: 6.5,
	apexY: 19,
	stemBottom: 27,
	footY: 27.5,
	footHalf: 4,
	thickness: 2,
	straw: { fromX: 12.5, toX: 17.5, toY: 0 },
	liquid: { y: 6, width: 16, height: 6 }
};

/** Unchanged since it shipped; `y` is tabulated, `x` puts the stem on the fist. */
export const COCKTAIL_BOX = G.box(HAND.x - COCKTAIL.stemX, 6, 20, 30);

const STEM_X = COCKTAIL.stemX;

export const COCKTAIL_STRAW: Seg = seg(
	COCKTAIL.straw.fromX,
	COCKTAIL.rimY,
	COCKTAIL.straw.toX,
	COCKTAIL.straw.toY
);

/** Draw order: the two rim sides, the stem, then the foot. */
export const COCKTAIL_GLASS: Seg[] = [
	seg(STEM_X - COCKTAIL.rimHalf, COCKTAIL.rimY, STEM_X, COCKTAIL.apexY),
	seg(STEM_X + COCKTAIL.rimHalf, COCKTAIL.rimY, STEM_X, COCKTAIL.apexY),
	seg(STEM_X, COCKTAIL.apexY, STEM_X, COCKTAIL.stemBottom),
	seg(STEM_X - COCKTAIL.footHalf, COCKTAIL.footY, STEM_X + COCKTAIL.footHalf, COCKTAIL.footY)
];

export const COCKTAIL_LIQUID = G.box(
	STEM_X - COCKTAIL.liquid.width / 2,
	COCKTAIL.liquid.y,
	COCKTAIL.liquid.width,
	COCKTAIL.liquid.height
);

// --- The 1 May tools --------------------------------------------------------

/**
 * BOTH TOOLS ARE HELD AT AN ANGLE, and `lean` is the only place that is decided.
 *
 * They lean TOWARDS EACH OTHER - the hero is on the right and swings its hammer up
 * to the left, the companion is on the left and hooks its sickle up to the right -
 * so the pair crosses over the gap between the blobs the way the emblem does. Held
 * upright they were two vertical objects at opposite ends of the face with a whole
 * blob between them, and nothing said they were a pair.
 *
 * A LEAN IS A DIRECTION, NOT A ROTATION, and that is what keeps this cheap. The
 * hammer is Lines only, and a thick Line with BUTT caps IS a rectangle at any angle
 * - the trick the lightsaber is built on - so nothing needs a rotated PartDraw. The
 * sickle's blade is an Arc, which cannot be rotated at all without one; it does not
 * need to be, because the arc is CIRCULAR, and rotating a circular arc is the same
 * as adding the lean to both of its angles. See SICKLE.
 */
const leanUnit = (degrees: number) => {
	const t = (degrees * Math.PI) / 180;
	// Screen y grows downward, so "up" is negative. A positive lean tips the top
	// of the tool to the RIGHT.
	return { x: Math.sin(t), y: -Math.cos(t) };
};

/** A point `distance` from `from` along `unit`. */
const along = (
	from: { x: number; y: number },
	unit: { x: number; y: number },
	distance: number
) => ({ x: r1(from.x + unit.x * distance), y: r1(from.y + unit.y * distance) });

/**
 * The hammer, swung up and to the left out of the hero's raised fist.
 *
 * EVERYTHING COMES OFF THE GRIP AND THE LEAN. The shaft runs through the grip in
 * both directions, the head sits across the shaft's far end, and its taper steps
 * along that head - so the whole tool is one point, one angle and four lengths, and
 * it cannot develop a kink or come apart at a joint.
 *
 * THE HEAD'S RIGHT END IS A TRIANGLE, AND THAT IS WHAT MAKES IT A HAMMER. Every
 * stroke in WFF is one constant thickness end to end, so a wedge is not one shape -
 * but it IS a stack of them, exactly as the party hat's cone is a stack of
 * rectangles. Each row runs from the block's end to a point further along the head
 * and is thinner than the last, all in one colour and overlapping, so the union is a
 * wedge with no internal seams.
 *
 * ROWS, NOT STEPS. The first cut used three hand-tabulated thicknesses and read as
 * three chunks rather than as a point. `wedgeRows` is the same knob the hats carry,
 * and the assertion below holds the step in the silhouette finer than the device can
 * resolve - so this cannot quietly go back to looking like a staircase.
 *
 * THE BLUNT END IS DARKER. Without two distinguishable ends the silhouette is a bar
 * on a stick whichever way it points.
 */
export const HAMMER = {
	/** Where the fist closes on the shaft. The part box puts this on HAND. */
	grip: { x: 17.5, y: 26 },
	/** Degrees from vertical. NEGATIVE tips the head to the left. */
	lean: -20,
	shaft: { above: 23, below: 11, thickness: 3.4 },
	head: {
		length: 16,
		thickness: 7.5,
		/** How far along the head the solid block runs before the wedge starts. */
		wedgeFrom: 0.5,
		/** Rows in the wedge. See the note above, and the step assertion below. */
		wedgeRows: 9,
		/** How much of the blunt end is the darker striking face. */
		face: 0.34
	}
};

const HAMMER_UP = leanUnit(HAMMER.lean);
/** Across the head: the shaft's direction turned a quarter turn, pointing right. */
const HAMMER_ACROSS = { x: -HAMMER_UP.y, y: HAMMER_UP.x };

/**
 * The part box: placed so the grip lands on the fist, sized to hold the swung tool.
 *
 * `x` AND `y` ARE BOTH THE HAND now, where the upright version could take `x` from
 * the shaft and leave `y` tabulated. A leaning tool has no vertical axis to hang
 * things off, so the grip is the only fixed point there is.
 */
export const HAMMER_BOX = G.box(HAND.x - HAMMER.grip.x, HAND.y - HAMMER.grip.y, 23, 39);

const HAMMER_HEAD_CENTRE = along(HAMMER.grip, HAMMER_UP, HAMMER.shaft.above);
/** A point a fraction of the way across the head, blunt end at 0. */
const acrossHead = (t: number) =>
	along(HAMMER_HEAD_CENTRE, HAMMER_ACROSS, (t - 0.5) * HAMMER.head.length);

export const HAMMER_SHAFT: Seg = (() => {
	const butt = along(HAMMER.grip, HAMMER_UP, -HAMMER.shaft.below);
	return seg(butt.x, butt.y, HAMMER_HEAD_CENTRE.x, HAMMER_HEAD_CENTRE.y);
})();

/**
 * A stroke and the width to draw it at.
 *
 * THE THICKNESS IS BESIDE THE SEGMENT AND NOT MERGED INTO IT, deliberately. A face
 * module spreads a Seg straight onto a `<Line>`, so a `thickness` field sitting in
 * the same object arrives as a Line attribute - which is not valid there, and which
 * the validator does not check for because it only sees a string.
 */
export type Stroked = { seg: Seg; thickness: number };

/**
 * The head: a solid block, then a wedge stacked out of rows.
 *
 * EVERY ROW STARTS AT THE BLOCK'S END and runs to its own point along the head, so
 * they overlap rather than abut. One colour, so the union is the silhouette and the
 * draw order does not matter.
 */
export const HAMMER_HEAD: Stroked[] = (() => {
	const block = acrossHead(HAMMER.head.wedgeFrom);
	const blunt = acrossHead(0);
	const rows: Stroked[] = [
		{ seg: seg(blunt.x, blunt.y, block.x, block.y), thickness: HAMMER.head.thickness }
	];
	// Row i reaches i/rows of the way to the point at the thickness the wedge has
	// where row i-1 stopped. Shortest and thickest first; the last one reaches the
	// point at one row's worth of thickness, so nothing is ever drawn at zero.
	for (let i = 1; i <= HAMMER.head.wedgeRows; i++) {
		const to = acrossHead(
			HAMMER.head.wedgeFrom + (1 - HAMMER.head.wedgeFrom) * (i / HAMMER.head.wedgeRows)
		);
		rows.push({
			seg: seg(block.x, block.y, to.x, to.y),
			thickness: HAMMER.head.thickness * (1 - (i - 1) / HAMMER.head.wedgeRows)
		});
	}
	return rows;
})();

/** The darker striking face, at the blunt end, inside the head's first step. */
export const HAMMER_FACE: Stroked = (() => {
	const from = acrossHead(0);
	const to = acrossHead(HAMMER.head.face);
	return { seg: seg(from.x, from.y, to.x, to.y), thickness: HAMMER.head.thickness };
})();

/**
 * The sickle, hooked up and to the right out of the companion's near hand.
 *
 * IT HOOKS THE OTHER WAY NOW. The first cut swept 180 -> 335, which is bottom to
 * upper-LEFT, so the blade's open side faced the hero and the tool read as a
 * bracket. Mirrored about its own handle - every angle t becomes 360-t - it opens
 * away from the hero and reads as a hook.
 *
 * MORE THAN A HALF CIRCLE. At 155 degrees the curve stops before it has turned back
 * on itself, and a curve that has not turned back is an arc, not a blade. 200 is
 * past the halfway point by enough to be unmistakably a crescent.
 *
 * THE LEAN IS ADDED TO BOTH ANGLES AND NOTHING ELSE MOVES. An Arc's box is
 * axis-aligned and WFF has no rotation except on a PartDraw, whose clip box turns
 * with it - but the blade is a CIRCLE, and a rotated circular arc is just the same
 * arc at shifted angles. So the whole tool tilts for the price of one addition.
 *
 * THE POINT IS THE SAME TAPER-IN-STEPS THE HAMMER'S PEEN USES, run the other way:
 * thinnest at the free end, full thickness where it meets the handle. Steps overlap
 * deliberately - a butt joint between two strokes at this scale leaves a seam that
 * separates them completely.
 *
 * THE BLADE'S FOOT IS THE HANDLE'S TOP END, and the first cut put it in the middle.
 * Setting the arc's CENTRE to the handle's top puts its 180-degree point `radius`
 * back DOWN the handle - so the blade attached partway along and the last nine
 * pixels of stick carried on past it, out into the air. The centre is `radius`
 * beyond the top instead, which lands the foot exactly on the end of the handle.
 * Asserted below against the handle's own end rather than against a number.
 */
export const SICKLE = {
	/** Where the fist closes on the handle. Mirrors HAMMER.grip one blob down. */
	grip: { x: 6.5, y: 23 },
	/** POSITIVE: the blade tips to the right, towards the hero and its hammer. */
	lean: 20,
	handle: { above: 6, below: 9, thickness: 3.4 },
	blade: {
		radius: 8,
		/** Degrees, swept BACKWARDS from the foot at the handle. */
		sweep: 200,
		/** Free end first, so the tip is the thin one. `to` is a fraction of sweep. */
		steps: [
			{ to: 0.2, thickness: 1.2 },
			{ to: 0.36, thickness: 2.2 },
			{ to: 1, thickness: 3.2 }
		]
	}
};

const SICKLE_UP = leanUnit(SICKLE.lean);

export const SICKLE_BOX = G.box(
	COMPANION_HAND.x - SICKLE.grip.x,
	COMPANION_HAND.y - SICKLE.grip.y,
	22,
	34
);

/** `radius` past the handle's top, which is what puts the foot ON that top. */
const SICKLE_CENTRE = along(SICKLE.grip, SICKLE_UP, SICKLE.handle.above + SICKLE.blade.radius);
/** The handle's far end, where the blade has to meet it. */
const SICKLE_HANDLE_TOP = along(SICKLE.grip, SICKLE_UP, SICKLE.handle.above);
/** The foot, where the blade meets the handle: straight down the handle, leaned. */
const SICKLE_FOOT_ANGLE = 180 + SICKLE.lean;

export const SICKLE_HANDLE: Seg = (() => {
	const butt = along(SICKLE.grip, SICKLE_UP, -SICKLE.handle.below);
	return seg(butt.x, butt.y, SICKLE_HANDLE_TOP.x, SICKLE_HANDLE_TOP.y);
})();

/** The blade, free end first, as arcs on one circle that thicken towards the foot. */
export const SICKLE_BLADE: {
	centerX: number;
	centerY: number;
	width: number;
	height: number;
	startAngle: number;
	endAngle: number;
	thickness: number;
}[] = SICKLE.blade.steps.map((step, i) => {
	// Each step starts a touch before the last one ended, so no seam shows.
	const overlap = i === 0 ? 0 : 2;
	const from = i === 0 ? 0 : SICKLE.blade.steps[i - 1].to;
	const at = (t: number) => r1(SICKLE_FOOT_ANGLE - SICKLE.blade.sweep * (1 - t));
	return {
		centerX: SICKLE_CENTRE.x,
		centerY: SICKLE_CENTRE.y,
		width: 2 * SICKLE.blade.radius,
		height: 2 * SICKLE.blade.radius,
		startAngle: r1(at(from) - overlap),
		endAngle: at(step.to),
		thickness: step.thickness
	};
});

{
	const problems: string[] = [];

	/**
	 * A STROKE SPREADS PERPENDICULAR TO ITSELF, not in a square halo, and on a
	 * diagonal those are very different - the lightsaber's own bounds check was
	 * wrong for exactly this reason before it was rewritten. BUTT caps end flat ON
	 * the endpoint; ROUND ones reach half a thickness in every direction.
	 */
	const strokeCorners = (
		segment: Seg,
		thickness: number,
		round: boolean
	): { x: number; y: number }[] => {
		const axis = { x: segment.endX - segment.startX, y: segment.endY - segment.startY };
		const length = Math.hypot(axis.x, axis.y);
		const perp = { x: -axis.y / length, y: axis.x / length };
		const half = thickness / 2;
		return [
			{ x: segment.startX, y: segment.startY },
			{ x: segment.endX, y: segment.endY }
		].flatMap((end) =>
			round
				? [
						{ x: end.x - half, y: end.y - half },
						{ x: end.x + half, y: end.y + half }
					]
				: [
						{ x: end.x + perp.x * half, y: end.y + perp.y * half },
						{ x: end.x - perp.x * half, y: end.y - perp.y * half }
					]
		);
	};

	const outside = (label: string, box: G.Box, points: { x: number; y: number }[]): void => {
		for (const point of points) {
			if (point.x < 0 || point.y < 0 || point.x > box.width || point.y > box.height) {
				problems.push(
					`the ${label} reaches (${point.x.toFixed(2)},${point.y.toFixed(2)}), outside its ` +
						`${box.width}x${box.height} box - it would be cut off`
				);
			}
		}
	};

	// --- the hammer ------------------------------------------------------------
	outside('hammer shaft', HAMMER_BOX, strokeCorners(HAMMER_SHAFT, HAMMER.shaft.thickness, true));
	for (const [i, step] of HAMMER_HEAD.entries()) {
		outside(
			`hammer head step ${i + 1}`,
			HAMMER_BOX,
			strokeCorners(step.seg, step.thickness, false)
		);
	}

	/**
	 * THE WEDGE'S STEP HAS TO VANISH AT DEVICE SCALE, the same requirement the party
	 * hat's cone carries and for the same reason: the canvas is 450 against a 426
	 * watch, so a step under about 1.4 design px lands inside the antialiasing. This
	 * is the check that stops a fatter head quietly going back to a staircase.
	 */
	const wedgeStep = HAMMER.head.thickness / HAMMER.head.wedgeRows;
	if (wedgeStep > 1.4) {
		problems.push(
			`the hammer's peen steps ${wedgeStep.toFixed(2)}px across ${HAMMER.head.wedgeRows} rows - ` +
				'its edges would read as a staircase rather than as a wedge'
		);
	}
	if (HAMMER.head.wedgeFrom <= 0 || HAMMER.head.wedgeFrom >= 1) {
		problems.push("the hammer's wedge does not start inside its own head");
	}
	if (HAMMER.head.face >= HAMMER.head.wedgeFrom) {
		problems.push('the hammer striking face runs past the solid block it is painted inside');
	}
	// The head sits ACROSS the shaft, so its centre is the shaft's far end.
	if (
		Math.abs(HAMMER_HEAD_CENTRE.x - HAMMER_SHAFT.endX) > 0.05 ||
		Math.abs(HAMMER_HEAD_CENTRE.y - HAMMER_SHAFT.endY) > 0.05
	) {
		problems.push('the hammer head is not centred on the top of its own shaft');
	}
	// And it leans the way it says it does - a sign error here is invisible in a
	// still until you notice both tools pointing the same way.
	if (HAMMER_HEAD_CENTRE.x >= HAMMER.grip.x || HAMMER_HEAD_CENTRE.y >= HAMMER.grip.y) {
		problems.push(
			`the hammer head is at (${HAMMER_HEAD_CENTRE.x},${HAMMER_HEAD_CENTRE.y}), not up and to ` +
				`the LEFT of its grip at (${HAMMER.grip.x},${HAMMER.grip.y})`
		);
	}

	// --- the sickle ------------------------------------------------------------
	outside('sickle handle', SICKLE_BOX, strokeCorners(SICKLE_HANDLE, SICKLE.handle.thickness, true));
	// An arc's reach is its own circle, plus half a stroke. Conservative on purpose:
	// only part of the circle is swept, and a bound that ignores that cannot be wrong
	// in the direction that matters.
	for (const [i, step] of SICKLE_BLADE.entries()) {
		const reach = SICKLE.blade.radius + step.thickness / 2;
		outside(`sickle blade step ${i + 1}`, SICKLE_BOX, [
			{ x: step.centerX - reach, y: step.centerY - reach },
			{ x: step.centerX + reach, y: step.centerY + reach }
		]);
		// WFF sweeps an Arc from startAngle UPWARD. Written backwards it goes the long
		// way round - which is exactly how the Santa hat ended up draped over a face.
		if (step.endAngle <= step.startAngle) {
			problems.push(
				`the sickle blade's step ${i + 1} sweeps ${step.startAngle} -> ${step.endAngle}, which is ` +
					'not increasing'
			);
		}
	}
	for (let i = 1; i < SICKLE.blade.steps.length; i++) {
		if (SICKLE.blade.steps[i].thickness <= SICKLE.blade.steps[i - 1].thickness) {
			problems.push(
				`the sickle blade's step ${i + 1} is no thicker than step ${i} - its free end would not ` +
					'come to a point'
			);
		}
	}
	// It has to hook: less than half a turn and it is a bracket, not a blade.
	if (SICKLE.blade.sweep <= 180) {
		problems.push(
			`the sickle blade sweeps ${SICKLE.blade.sweep} degrees - at or under 180 it has not turned ` +
				'back on itself and reads as an arc rather than a crescent'
		);
	}
	/**
	 * THE BLADE MEETS THE END OF THE HANDLE, not a point partway along it.
	 *
	 * Derived from the same two numbers as both, so it is really a check on the
	 * derivation - which is worth having, because the version it replaced looked
	 * correct in the source (the centre was the handle's top, which sounds right) and
	 * left a nine-pixel stub of stick poking out past the blade on the wrist.
	 */
	// Rounded to 1dp like everything else here: `along()` rounds at each step, so an
	// unrounded comparison against a rounded endpoint fails by a tenth of a pixel.
	const foot = {
		x: r1(SICKLE_CENTRE.x - SICKLE_UP.x * SICKLE.blade.radius),
		y: r1(SICKLE_CENTRE.y - SICKLE_UP.y * SICKLE.blade.radius)
	};
	// 0.15 rather than 0.05: `along()` rounds to 1dp at every step, and these two
	// points are reached by different numbers of steps, so a tenth of a pixel of
	// disagreement is the authoring resolution rather than a gap. Nine pixels was the
	// bug; a tenth is not one.
	if (
		Math.abs(foot.x - SICKLE_HANDLE.endX) > 0.15 ||
		Math.abs(foot.y - SICKLE_HANDLE.endY) > 0.15
	) {
		problems.push(
			`the sickle blade's foot is at (${foot.x.toFixed(1)},${foot.y.toFixed(1)}) and its handle ` +
				`ends at (${SICKLE_HANDLE.endX},${SICKLE_HANDLE.endY}) - the stick would carry on past ` +
				'the blade'
		);
	}
	// It leans the OTHER way from the hammer, which is what makes them a pair.
	if (SICKLE_CENTRE.x <= SICKLE.grip.x || SICKLE_CENTRE.y >= SICKLE.grip.y) {
		problems.push(
			`the sickle's blade is at (${SICKLE_CENTRE.x},${SICKLE_CENTRE.y}), not up and to the RIGHT ` +
				`of its grip at (${SICKLE.grip.x},${SICKLE.grip.y})`
		);
	}
	if (Math.sign(SICKLE.lean) === Math.sign(HAMMER.lean)) {
		problems.push('the hammer and the sickle now lean the same way - they would not cross');
	}

	// --- both grips are on their own tools, and both boxes fit their groups ------
	for (const [name, grip, hand, box] of [
		['hammer', HAMMER.grip, HAND, HAMMER_BOX],
		['sickle', SICKLE.grip, COMPANION_HAND, SICKLE_BOX]
	] as const) {
		const local = { x: hand.x - box.x, y: hand.y - box.y };
		if (Math.abs(local.x - grip.x) > 0.001 || Math.abs(local.y - grip.y) > 0.001) {
			problems.push(
				`the ${name}'s grip is at (${grip.x},${grip.y}) and the fist lands at ` +
					`(${local.x},${local.y}) - it would be held beside the handle`
			);
		}
	}
	for (const [name, box, anchor] of [
		['hammer', HAMMER_BOX, G.ANCHORS.HERO_PROPS],
		['sickle', SICKLE_BOX, G.ANCHORS.COMPANION_PROPS]
	] as const) {
		if (
			box.x < 0 ||
			box.y < 0 ||
			box.x + box.width > anchor.width ||
			box.y + box.height > anchor.height
		) {
			problems.push(
				`the ${name}'s box (${box.x},${box.y},${box.width},${box.height}) does not fit its ` +
					`${anchor.width}x${anchor.height} prop group`
			);
		}
		if (!Number.isInteger(box.x) || !Number.isInteger(box.y)) {
			problems.push(
				`the ${name}'s box origin (${box.x},${box.y}) is not integral - Part x/y are xs:integer`
			);
		}
	}

	if (problems.length) {
		throw new Error(`the 1 May tools no longer hold together:\n  ${problems.join('\n  ')}`);
	}
}

// --- The 4 May lightsaber ---------------------------------------------------

/**
 * A lightsaber, held across the body on 4 May.
 *
 * ONE AXIS, FOUR STROKES ALONG IT. The hilt, the emitter shroud, the blade's glow
 * and the blade's white core are all segments of the same butt-to-tip line, cut at
 * two fractions - so the whole prop cannot develop a kink, and angling it is one
 * edit to two endpoints rather than eight coordinates that have to stay collinear.
 *
 * A THICK LINE WITH BUTT CAPS IS A RECTANGLE AT ANY ANGLE, which is the trick that
 * makes the diagonal possible at all. A real rectangle would need its own rotated
 * PartDraw - the mechanism the pumpkin's carved diamonds have to use - and three
 * rotated parts that must agree about one axis is exactly the class of drift this
 * file exists to remove.
 *
 * IT IS DIAGONAL BECAUSE IT HAS TO BE. The prop group is 38x50 and the fist sits
 * 35px down it, so a vertical blade gets 35px of room and reads as a torch. Across
 * the box's diagonal there are 46. That is still a short blade for a lightsaber,
 * and it is the ceiling: the group cannot grow upward without running into the
 * stat row, which sits directly above the hero's raised hand.
 *
 * THE CORE IS WHITE AND THINNER, and that is the whole illusion. See C.SABER.
 */
/**
 * A saber, as a grip and a lean. Both blobs draw one on 4 May.
 *
 * THE GRIP IS THE MIDDLE OF THE HILT, not one end of it. The first cut ran the
 * axis butt-to-tip and put the fist wherever it happened to fall on the hilt, which
 * was 81% of the way up it - so the blob held the saber by the emitter shroud, with
 * the whole pommel hanging below its hand. `hilt.half` is the same distance either
 * side of the fist by construction, which is what "centred in the hand" has to mean
 * for something whose grip is the only fixed point it has.
 *
 * THE LEAN IS WHAT MAKES THE BLADE LONG. There are only 35px of canvas above the
 * hero's raised fist before the stat row, so a vertical blade is 25px and reads as
 * a torch; across the diagonal there is half as much again. Every extra degree of
 * lean buys blade length and spends box width, which is why ANCHORS.HERO_PROPS grew
 * to 52 - see its note.
 */
type SaberSpec = {
	/** Where the fist closes, in the part box's coordinates. */
	grip: { x: number; y: number };
	/** Degrees from vertical. Positive tips the blade to the RIGHT. */
	lean: number;
	/** Half the hilt, so the grip is its centre. */
	hilt: { half: number; thickness: number };
	/** The shroud between hilt and blade, and how thick it is. */
	emitter: { length: number; thickness: number };
	blade: { length: number; thickness: number; core: number };
	/**
	 * The grip rings cut into the hilt, as distances from the fist along the axis.
	 * Two of them: one alone reads as a smudge, three at this size read as stripes.
	 */
	rings: { from: number; to: number }[];
};

/** Everything a face module needs to draw one saber, all on one axis. */
export type Saber = {
	box: G.Box;
	hilt: Stroked;
	rings: Stroked[];
	emitter: Stroked;
	blade: Stroked;
	core: Stroked;
};

const buildSaber = (
	label: string,
	hand: { x: number; y: number },
	group: G.Box,
	spec: SaberSpec
) => {
	const up = leanUnit(spec.lean);
	const at = (distance: number) => along(spec.grip, up, distance);
	const bladeStart = spec.hilt.half + spec.emitter.length;
	const bladeEnd = bladeStart + spec.blade.length;

	const run = (from: number, to: number, thickness: number): Stroked => {
		const a = at(from);
		const b = at(to);
		return { seg: seg(a.x, a.y, b.x, b.y), thickness };
	};

	const saber: Omit<Saber, 'box'> = {
		hilt: run(-spec.hilt.half, spec.hilt.half, spec.hilt.thickness),
		rings: spec.rings.map((ring) => run(ring.from, ring.to, spec.hilt.thickness)),
		emitter: run(spec.hilt.half, bladeStart, spec.emitter.thickness),
		blade: run(bladeStart, bladeEnd, spec.blade.thickness),
		// The core stops a touch short of the glow's round cap, so the tip stays blue.
		core: run(bladeStart, bladeEnd - spec.blade.thickness / 4, spec.blade.core)
	};

	const box = G.box(hand.x - spec.grip.x, hand.y - spec.grip.y, 0, 0);
	return { saber, box, up, bladeEnd, spec, label, group };
};

/**
 * The hero's, leaning right and across the body.
 *
 * The box is 41x43 at group-local (10,0) - which puts its top edge on the group's,
 * because the blade uses every pixel of height there is.
 */
const HERO_SABER_BUILD = buildSaber('hero saber', HAND, G.ANCHORS.HERO_PROPS, {
	grip: { x: 10.5, y: 35 },
	lean: 30,
	hilt: { half: 6.5, thickness: 6.5 },
	emitter: { length: 3, thickness: 7.5 },
	blade: { length: 27, thickness: 6.5, core: 2.4 },
	rings: [
		{ from: -4.5, to: -3 },
		{ from: -1, to: 0.5 }
	]
});

export const SABER: Saber = { ...HERO_SABER_BUILD.saber, box: G.box(8, 0, 32, 43) };
/** Kept for the assertions and for anything that needs the box on its own. */
export const SABER_BOX = SABER.box;

/**
 * The companion's: same construction, three quarters the size, RAISED THE SAME WAY.
 *
 * THE SAME SABER, NOT A SMALLER ONE. The companion is the smaller blob and its first
 * saber was scaled to match, which made the pair read as an adult's and a child's toy
 * rather than as two Jedi. Two identical blades is the whole point of the state.
 *
 * BOTH RAISE TO THE RIGHT, and mirroring is not available. Leaning this one up and to
 * the LEFT is the obvious way to make a pair read as two characters - except that the
 * hand this group hangs off is COMPANION_LIMBS[1], the one on the hero's side, so "up
 * and to the left" runs the blade diagonally across the companion's own face and out
 * through its leaf tuft. The rendering was unambiguous: the small blob had been run
 * through. The other hand is no better: COMPANION_LIMBS[0] sits inside the sleep z's,
 * and 4 May is an all-day window, so at 02:00 the companion would be asleep and
 * holding a lit blade through its own snoring.
 *
 * THE LEAN IS SHALLOWER THAN THE HERO'S BY FOUR DEGREES, which is the only asymmetry
 * left and it is a clearance number rather than a design one: this group draws AFTER
 * blob_hero, so a blade that overshoots is not clipped, it is painted on top of the
 * hero. Asserted below against HERO_BOX in canvas coordinates, which is the only
 * place the two groups can be compared at all.
 */
const COMPANION_SABER_BUILD = buildSaber(
	'companion saber',
	COMPANION_HAND,
	G.ANCHORS.COMPANION_PROPS,
	{
		grip: { x: 10.5, y: 38 },
		lean: 26,
		hilt: { half: 6.5, thickness: 6.5 },
		emitter: { length: 3, thickness: 7.5 },
		blade: { length: 27, thickness: 6.5, core: 2.4 },
		rings: [
			{ from: -4.5, to: -3 },
			{ from: -1, to: 0.5 }
		]
	}
);

export const COMPANION_SABER: Saber = {
	...COMPANION_SABER_BUILD.saber,
	// x moved from 24 to 23 for the same reason COMPANION_HAND_SHIPPED did: the
	// grip cap it hangs off (COMPANION_LIMBS[1].cream) shifted 1px left.
	box: G.box(23, 8, 30, 46)
};

{
	const problems: string[] = [];

	for (const build of [HERO_SABER_BUILD, COMPANION_SABER_BUILD]) {
		const { label, spec, up, group } = build;
		const saber = label === 'hero saber' ? SABER : COMPANION_SABER;
		const box = saber.box;

		/**
		 * THE FIST IS ON THE HILT, AND IN THE MIDDLE OF IT.
		 *
		 * The step-goal pole floated for three releases because nothing checked that
		 * the hand and the thing it holds were in the same place. Since the grip is
		 * now the axis's own origin, "on the hilt" is true by construction and what is
		 * left to check is that the BOX puts that origin on the fist - which is the
		 * half of it that a moved anchor breaks.
		 */
		const local = { x: build.box.x, y: build.box.y };
		if (local.x !== box.x || local.y !== box.y) {
			problems.push(
				`the ${label}'s box is at (${box.x},${box.y}) and its grip wants (${local.x},${local.y}) - ` +
					'it would be held beside the hilt'
			);
		}
		if (!Number.isInteger(box.x) || !Number.isInteger(box.y)) {
			problems.push(`the ${label}'s box origin (${box.x},${box.y}) is not integral`);
		}
		// The two are the same object. Only the lean and the glow may differ.
		if (
			spec.blade.length !== HERO_SABER_BUILD.spec.blade.length ||
			spec.hilt.half !== HERO_SABER_BUILD.spec.hilt.half ||
			spec.blade.thickness !== HERO_SABER_BUILD.spec.blade.thickness
		) {
			problems.push(
				`the ${label} is not the same size as the hero's - the pair reads as one saber and one toy`
			);
		}
		// A lightsaber is mostly blade. If the hilt ever outgrows it, it is a torch.
		if (spec.blade.length <= spec.hilt.half * 2) {
			problems.push(`the ${label}'s hilt is now longer than its blade`);
		}
		if (spec.blade.core >= spec.blade.thickness) {
			problems.push(`the ${label}'s white core is not inside its glow`);
		}
		// Every ring inside the hilt it is cut into, or it is a band floating in space.
		for (const [i, ring] of spec.rings.entries()) {
			if (ring.from < -spec.hilt.half || ring.to > spec.hilt.half || ring.to <= ring.from) {
				problems.push(`the ${label}'s grip ring ${i + 1} is not inside its hilt`);
			}
		}
		// Both raise AWAY from the companion's body - see the note on COMPANION_SABER.
		// A negative lean here is the bug that put a blade through the small blob's head.
		if (spec.lean <= 0) {
			problems.push(
				`the ${label} leans ${spec.lean} degrees, which points it up and to the LEFT - across ` +
					"the companion's own face, whichever blob is holding it"
			);
		}

		/**
		 * Every stroke inside the part box.
		 *
		 * A STROKE SPREADS PERPENDICULAR TO ITS OWN AXIS, not in a square halo around
		 * it, and on a diagonal those are very different: a 6.5px stroke down this axis
		 * spreads 4.35 in x and 4.83 in y, where treating it as a square would claim
		 * 3.25 in both. An earlier version of this check did exactly that and reported
		 * the hilt as overflowing a box it clears by more than a pixel.
		 *
		 * The cap style is the other half. BUTT ends flat ON the endpoint, so its
		 * corners are just endpoint +- perpendicular; ROUND ends in a half-disc, which
		 * DOES reach half a thickness in every direction.
		 */
		const perp = { x: -up.y, y: up.x };
		const pieces: [string, Stroked, boolean][] = [
			// BUTT on the hilt: a lightsaber's pommel is a flat end, and a round cap on a
			// 6.5px stroke adds three pixels of dome the box was not sized for.
			['hilt', saber.hilt, false],
			['emitter', saber.emitter, false],
			['blade', saber.blade, true],
			['core', saber.core, true],
			...saber.rings.map((ring, i): [string, Stroked, boolean] => [`ring ${i + 1}`, ring, false])
		];
		for (const [piece, stroked, round] of pieces) {
			const half = stroked.thickness / 2;
			const corners = [
				{ x: stroked.seg.startX, y: stroked.seg.startY },
				{ x: stroked.seg.endX, y: stroked.seg.endY }
			].flatMap((end) =>
				round
					? [
							{ x: end.x - half, y: end.y - half },
							{ x: end.x + half, y: end.y + half }
						]
					: [
							{ x: end.x + perp.x * half, y: end.y + perp.y * half },
							{ x: end.x - perp.x * half, y: end.y - perp.y * half }
						]
			);
			for (const corner of corners) {
				if (corner.x < 0 || corner.y < 0 || corner.x > box.width || corner.y > box.height) {
					problems.push(
						`the ${label}'s ${piece} reaches (${corner.x.toFixed(2)},${corner.y.toFixed(2)}) with ` +
							`its ${stroked.thickness}px ${round ? 'ROUND' : 'BUTT'} stroke, outside its ` +
							`${box.width}x${box.height} box - it would be cut off`
					);
				}
			}
		}
		if (
			box.x < 0 ||
			box.y < 0 ||
			box.x + box.width > group.width ||
			box.y + box.height > group.height
		) {
			problems.push(
				`the ${label}'s box (${box.x},${box.y},${box.width},${box.height}) does not fit its ` +
					`${group.width}x${group.height} prop group`
			);
		}
	}

	if (problems.length) {
		throw new Error(`a lightsaber no longer holds together:\n  ${problems.join('\n  ')}`);
	}
}

// --- The birthday cupcake ---------------------------------------------------

/**
 * A cupcake with one lit candle, in the hero's raised fist on 19 December.
 *
 * THE FROSTING IS THREE STACKED ELLIPSES, the same construction the Christmas tree
 * uses and for the same reason: there is no path primitive, so a piped swirl
 * cannot be drawn as a swirl. Three ellipses narrowing upward read as soft-serve,
 * which is what a piped rosette looks like from the front anyway.
 *
 * THE CASE IS NOT A TRAPEZOID, because nothing here tapers. It is a slightly
 * rounded rectangle with three vertical pleats in a darker tone, and the pleats
 * are what say "paper case" rather than "box" - without them the shape reads as a
 * jar, whatever its outline.
 *
 * EVERYTHING IS CENTRED ON `centreX`, which the part box puts on the fist. The
 * cocktail's stem and the coffee cup's centre are the same idea, and the .5 is
 * load-bearing for the same reason: a Part box must be an integer and the fist is
 * at x18.5.
 */
export const CAKE = {
	/** Where the cake is held, and the x every shape below is measured from. */
	centreX: 10.5,
	case: { top: 26, width: 16, height: 11, radius: 2 },
	pleats: { count: 3, width: 1.2 },
	/** Bottom tier first - widest, and drawn first so the ones above overlap it. */
	frosting: [
		{ cy: 24, rx: 9, ry: 5 },
		{ cy: 18.5, rx: 7, ry: 4.5 },
		{ cy: 13.5, rx: 4.5, ry: 3.5 }
	],
	candle: { top: 4, height: 8, width: 1.6 },
	/** The flame's centre, and the two ellipses that make it. */
	flame: { cy: 3, outer: { rx: 2.3, ry: 3 }, inner: { rx: 1.1, ry: 1.5 } },
	/** The flame's own group box - square, so the flicker cannot clip a corner. */
	flameBox: 8,
	/** How far the flicker dips below full brightness, and its period in seconds. */
	flicker: { floor: 160, period: 2 }
};

/** `y` hangs the cake so the fist lands on its case; `x` centres it on that fist. */
export const CAKE_BOX = G.box(HAND.x - CAKE.centreX, HAND.y - 34, 21, 40);

const cakeEllipse = (cy: number, rx: number, ry: number): G.Box =>
	G.box(CAKE.centreX - rx, cy - ry, rx * 2, ry * 2);

export const CAKE_CASE = {
	...G.box(CAKE.centreX - CAKE.case.width / 2, CAKE.case.top, CAKE.case.width, CAKE.case.height),
	cornerRadiusX: CAKE.case.radius,
	cornerRadiusY: CAKE.case.radius
};

/** Evenly spaced pleats across the case, derived rather than placed. */
export const CAKE_PLEATS: G.Box[] = Array.from({ length: CAKE.pleats.count }, (_, i) => {
	const step = CAKE.case.width / (CAKE.pleats.count + 1);
	return G.box(
		r1(CAKE_CASE.x + step * (i + 1) - CAKE.pleats.width / 2),
		CAKE.case.top,
		CAKE.pleats.width,
		CAKE.case.height
	);
});

export const CAKE_FROSTING: G.Box[] = CAKE.frosting.map((tier) =>
	cakeEllipse(tier.cy, tier.rx, tier.ry)
);

export const CAKE_CANDLE = G.box(
	CAKE.centreX - CAKE.candle.width / 2,
	CAKE.candle.top,
	CAKE.candle.width,
	CAKE.candle.height
);

/**
 * The flame's group box, in the PROP GROUP's coordinates - a Group's x/y must be
 * integers, so the half-pixel lives on the ellipses inside it. Exactly the split
 * the controller's pulsing A button makes, and derived from one centre for the
 * same reason: the two halves cannot drift apart.
 */
const FLAME_CENTRE = { x: CAKE_BOX.x + CAKE.centreX, y: CAKE_BOX.y + CAKE.flame.cy };

export const FLAME_BOX = G.box(
	Math.round(FLAME_CENTRE.x - CAKE.flameBox / 2),
	Math.round(FLAME_CENTRE.y - CAKE.flameBox / 2),
	CAKE.flameBox,
	CAKE.flameBox
);

const flameEllipse = (r: { rx: number; ry: number }): G.Box =>
	G.box(
		r1(FLAME_CENTRE.x - FLAME_BOX.x - r.rx),
		r1(FLAME_CENTRE.y - FLAME_BOX.y - r.ry),
		r.rx * 2,
		r.ry * 2
	);

export const FLAME_OUTER = flameEllipse(CAKE.flame.outer);
export const FLAME_INNER = flameEllipse(CAKE.flame.inner);

{
	const problems: string[] = [];

	// The fist has to be on the CASE - a cupcake is held by its paper, not its icing.
	const gripY = HAND.y - CAKE_BOX.y;
	if (gripY < CAKE.case.top || gripY > CAKE.case.top + CAKE.case.height) {
		problems.push(
			`the fist is at box-local y${gripY}, off the case's ${CAKE.case.top}..` +
				`${CAKE.case.top + CAKE.case.height} - the cake would float above the hand`
		);
	}
	// The frosting narrows upward and each tier reaches the one below it, or the
	// swirl reads as three separate beads. Same property the tree's tiers need.
	for (let i = 1; i < CAKE.frosting.length; i++) {
		const [lower, upper] = [CAKE.frosting[i - 1], CAKE.frosting[i]];
		if (upper.rx >= lower.rx) {
			problems.push(`the cake's frosting tier ${i + 1} is no narrower than tier ${i}`);
		}
		if (upper.cy + upper.ry <= lower.cy - lower.ry) {
			problems.push(`the cake's frosting tiers ${i} and ${i + 1} do not overlap`);
		}
	}
	// The lowest frosting has to sit ON the case, not hover over it.
	const lowest = CAKE.frosting[0];
	if (lowest.cy + lowest.ry < CAKE.case.top) {
		problems.push("the cake's frosting does not reach its case");
	}
	// The candle has to be planted in the frosting rather than balanced on air.
	const top = CAKE.frosting[CAKE.frosting.length - 1];
	if (CAKE.candle.top + CAKE.candle.height < top.cy - top.ry) {
		problems.push("the cake's candle does not reach the frosting");
	}
	// And the flame has to sit on the candle's wick.
	if (CAKE.flame.cy > CAKE.candle.top) {
		problems.push(
			`the flame is at y${CAKE.flame.cy}, below the candle's top at y${CAKE.candle.top}`
		);
	}
	// Nothing outside its own box, or its own prop group.
	for (const [label, box] of [
		['case', CAKE_CASE],
		['candle', CAKE_CANDLE],
		...CAKE_FROSTING.map((b, i) => [`frosting ${i + 1}`, b] as const),
		...CAKE_PLEATS.map((b, i) => [`pleat ${i + 1}`, b] as const)
	] as const) {
		if (
			box.x < 0 ||
			box.y < 0 ||
			box.x + box.width > CAKE_BOX.width ||
			box.y + box.height > CAKE_BOX.height
		) {
			problems.push(`the cake's ${label} is outside its ${CAKE_BOX.width}x${CAKE_BOX.height} box`);
		}
	}
	for (const [label, box] of [
		['cake', CAKE_BOX],
		['flame', FLAME_BOX]
	] as const) {
		const group = G.ANCHORS.HERO_PROPS;
		if (
			box.x < 0 ||
			box.y < 0 ||
			box.x + box.width > group.width ||
			box.y + box.height > group.height
		) {
			problems.push(
				`the ${label}'s box does not fit the ${group.width}x${group.height} prop group`
			);
		}
		if (!Number.isInteger(box.x) || !Number.isInteger(box.y)) {
			problems.push(`the ${label}'s box origin (${box.x},${box.y}) is not integral`);
		}
	}
	/**
	 * THE FLAME MUST BE LIT IN A CAPTURE.
	 *
	 * mock-state.ts freezes SECOND at 1 and SECOND_MILLISECOND at 1.0 so a
	 * screenshot is deterministic, and the face's whole-second sawtooth at that
	 * instant is ((1 % period) + 1.0 - 1) / period. A periodic alpha that lands on
	 * zero there renders NOTHING, and the frame comes out looking like the feature
	 * was never built - which has happened. The flicker floor makes that impossible
	 * by construction; this checks the construction.
	 */
	const mockPhase = ((1 % CAKE.flicker.period) + 1.0 - 1) / CAKE.flicker.period;
	const triangle = 2 * mockPhase - Math.min(Math.max(4 * mockPhase - 2, 0), 2);
	const mockAlpha = CAKE.flicker.floor + (255 - CAKE.flicker.floor) * triangle;
	if (mockAlpha < 1) {
		problems.push(
			`at the frozen capture instant the flame's alpha is ${mockAlpha.toFixed(0)} - the candle ` +
				'would be out in every screenshot'
		);
	}

	if (problems.length) {
		throw new Error(`the birthday cupcake no longer holds together:\n  ${problems.join('\n  ')}`);
	}
}
