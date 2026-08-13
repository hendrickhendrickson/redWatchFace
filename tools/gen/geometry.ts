/**
 * The boxes and layout constants the face is built on.
 *
 * WFF has no variables, so in the hand-authored XML the hero's body box was
 * typed out 31 times, the companion's 30, the canvas 26 and the drip box 20.
 * With comments stripped the file held 3737 numeric literals drawn from only
 * 313 distinct values. Moving one blob meant up to 31 coordinated edits with
 * nothing to verify them; here it means editing one constant.
 *
 * DESIGN CANVAS IS 450 x 450. The platform scales that to the device, so every
 * coordinate here is a "design pixel", not a device pixel. Measured on the
 * hardware: the Pixel Watch 4 reports 426 x 426, so the canvas scales DOWN by
 * ~0.95. The Wear OS emulator's Large Round profile is 454 x 454, so anything
 * checked there renders ~6% larger than it does on a wrist.
 */

/** A Part or Group box. WFF requires these four to be xs:integer on Part elements. */
export type Box = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export const box = (x: number, y: number, width: number, height: number): Box => ({
	x,
	y,
	width,
	height
});

/** Local origin, sized to its parent. Used by primitives drawn inside a Part. */
export const at = (width: number, height: number): Box => ({ x: 0, y: 0, width, height });

// --- The canvas -------------------------------------------------------------

export const CANVAS = box(0, 0, 450, 450);
export const CANVAS_W = 450;
export const CANVAS_H = 450;

/**
 * The ROUND bezel the square canvas is shown through.
 *
 * The design canvas is a square and the watch is not: `clipShape` is CIRCLE, so
 * the four corners are never seen and anything placed in them is invisible with
 * nothing to report it. A shape can sit comfortably inside 450x450 and still be
 * half off the glass - the bottom-left corner is 93px outside the circle.
 *
 * Lived in data/fireworks.ts as a private constant, where it checked that a spark
 * is still on the glass when it first reaches full brightness. The Christmas tree
 * is the second thing to need it: it stands in the empty canvas at bottom left,
 * which is exactly where the bezel bites.
 */
export const BEZEL = { centre: CANVAS_W / 2, radius: CANVAS_W / 2 };

/** How far past the bezel a canvas point is. NEGATIVE IS INSIDE. */
export const pastBezel = (x: number, y: number): number =>
	Math.hypot(x - BEZEL.centre, y - BEZEL.centre) - BEZEL.radius;

/**
 * Layout map, y in design space. Kept here rather than in prose so the numbers
 * below can be checked against it.
 *
 *   42 -  74   weekday + day of month     "Sat 1"
 *   68 - 188   time                       "10:08"
 *  184 - 216   weather                    icon + "22 deg"
 *  216 - 252   stat row                   heart rate | steps | battery
 *  262 - 392   blob zone                  hero blob + companion blob
 */

// --- Date row ---------------------------------------------------------------

/**
 * Centred by ESTIMATE, not by measurement. There is no text-width data source
 * in WFF - Part* x/y/width/height are authoring-time integers and the only
 * content-derived value is textLength(), a CHARACTER count. So these assume a
 * 3-glyph weekday abbreviation at ~44 design px:
 *
 *   weekday ENDS at x 220 (box 120..220, growing leftwards)
 *   chip    229..273 fixed
 *   nominal span 176..273, centre 224.5 - i.e. canvas centre
 *
 * THE BOX IS SIZED BY ITS RIGHT EDGE, not its centre, and the weekday is
 * END-aligned into it - so the 9px gap to the chip is the same on all seven
 * days and the word grows leftwards instead. See weekdayGlyph in
 * face/date-common.ts for why that is the trade worth making.
 *
 * 100 wide holds about seven glyphs at this size, so a longer localised
 * abbreviation shifts the row left rather than clipping. A much wider or
 * narrower one still sits slightly off-centre; accepted, the alternative is no
 * chip.
 */
export const DATE_WEEKDAY_BOX = box(120, 42, 100, 32);
export const DATE_CHIP_BOX = box(229, 41, 44, 34);
export const DATE_DAY_BOX = box(229, 42, 44, 32);
/** The chip's rounded rectangle, drawn at the chip box's own origin. */
export const DATE_CHIP_SHAPE = at(44, 34);
/**
 * The same chip as an outline, for ambient.
 *
 * INSET BY HALF THE STROKE WIDTH. WFF centres a stroke on its path, so drawing
 * it on DATE_CHIP_SHAPE would put half the line outside the 44x34 part box and
 * lose it to clipping on all four sides. Inset by 1 for a 2px stroke, the
 * line's OUTER edge lands exactly where the filled chip's edge is - which
 * matters because the two are cross-faded against each other.
 *
 * Corner radius drops by the same 1, so the two curves stay concentric.
 */
export const DATE_CHIP_OUTLINE_SHAPE = box(1, 1, 42, 32);

// --- Hero blob --------------------------------------------------------------

/** The hero's body box. 31 sites in the hand-authored file. */
export const HERO_BOX = box(14, 36, 72, 80);
/** Its body shape, at local origin. */
export const HERO_BODY_SHAPE = at(72, 80);
export const HERO_BODY_RADIUS = { cornerRadiusX: 36, cornerRadiusY: 34 };

/**
 * Limbs, accessories and anything that reaches outside the body.
 *
 * IT WAS 106 WIDE, AND THE FLAG IS WHY IT IS NOT. The step-goal pole runs down x93,
 * so 106 left thirteen pixels to its right - enough for the 12-wide goal pennant
 * with one to spare, and not enough for a tricolour, which needs about twenty
 * before three bands stop merging into a brown smear. The first cut flew the flag
 * LEFT off the pole instead, which fits and is wrong: a flag flies away from its
 * bearer, and one flying back over the hero's own head reads as a mistake.
 *
 * WIDENING IS SAFE IN A WAY MOVING IS NOT. Every part inside is authored in
 * limb-local coordinates and the group's canvas origin is unchanged, so nothing
 * moves - the box only stops cutting things off sooner. ANCHORS.HERO takes its size
 * from here, and an assertion below proves the two still agree.
 */
export const HERO_LIMB_BOX = box(0, 0, 122, 132);

export const HERO_MOUTH_ROUND = box(30, 42, 11, 11);
export const HERO_MOUTH_OPEN = box(24, 38, 22, 20);
/**
 * The mask that repaints the open mouth's top half in the body colour.
 *
 * IT STARTS 3px ABOVE THE ELLIPSE (y 35 vs 38), and that is a fix rather than
 * slack: at the same y the antialiased top edges did not cancel and a 1px
 * sliver read convincingly as a little nose. Any mask built this way must
 * overshoot.
 */
export const HERO_MOUTH_MASK = box(22, 35, 26, 13);

export const HERO_SWEAT_BOX = box(38, 40, 26, 11);

/**
 * The scarf, 16px TALLER than the body so the hanging tail has room.
 *
 * Derived from HERO_BOX rather than restated, which is the whole point: the scarf
 * sits on the body and a body that moves without it is a two-site edit that
 * nothing checks.
 */
export const HERO_SCARF_BOX = box(HERO_BOX.x, HERO_BOX.y, HERO_BOX.width, HERO_BOX.height + 16);

/** The sunglasses, across the eyes. */
export const HERO_SHADES_BOX = box(24, 54, 50, 18);

// --- Companion blob ---------------------------------------------------------

/** The companion's body box. 30 sites in the hand-authored file. */
export const COMPANION_BOX = box(8, 20, 44, 42);
export const COMPANION_BODY_SHAPE = at(44, 42);
export const COMPANION_BODY_RADIUS = { cornerRadiusX: 22, cornerRadiusY: 20 };

export const COMPANION_LIMB_BOX = box(0, 0, 62, 72);

export const COMPANION_MOUTH_ROUND = box(18.5, 26, 7, 7);
export const COMPANION_MOUTH_OPEN = box(16, 24, 12, 11);
export const COMPANION_MOUTH_MASK = box(15, 21, 14, 8);

export const COMPANION_SWEAT_BOX = box(21, 25, 18, 8);

/**
 * The companion's scarf, 2px SHORTER than its body - not taller, unlike the
 * hero's.
 *
 * THE TAIL IS CLIPPED BY THIS BOX AND THAT IS THE SHIPPED SHAPE. The tail
 * rectangle runs to local y51 inside a 40-high box, so its last 11px are cut off.
 * It is called out in this blob's header as the scarf tail overshooting its box.
 * Recorded here rather than quietly "fixed": growing the box would change what the
 * watch has been drawing, which is a design decision and not a tidy-up.
 */
export const COMPANION_SCARF_BOX = box(
	COMPANION_BOX.x,
	COMPANION_BOX.y,
	COMPANION_BOX.width,
	COMPANION_BOX.height - 2
);

/** The companion's shades. 1px higher than its closed eyes, which is deliberate. */
export const COMPANION_SHADES_BOX = box(16, 31, 28, 12);

/** Closed eyes: a shallow box holding two short lines. */
export const COMPANION_EYES_CLOSED_BOX = box(16, 32, 28, 12);

/** The companion's leaf tuft. Smaller and lower than the hero's LEAF_BOX. */
export const COMPANION_LEAF_BOX = box(6, 0, 48, 48);

// --- Chips and icons --------------------------------------------------------

export const WX_ICON_BOX = box(0, 3, 26, 26);
export const BATTERY_BOX = box(0, 10, 26, 16);
export const LEAF_BOX = box(10, 0, 80, 80);

// --- Where the sections sit on the canvas ------------------------------------

/**
 * Every top-level group's box, in canvas coordinates.
 *
 * THESE WERE THE LAST NUMBERS WITH NO NAME ANYWHERE. The boxes above were named
 * during the migration; the canvas positions that place them were not, so
 * `x: 207, y: 262` sat inline in blob-hero.ts and `x: 143, y: 322` in
 * blob-companion.ts, with ten more like them. "Where is the hero?" had no answer
 * except grep, and the answer mattered: hero-props.ts derives its whole layout
 * from the hero's position, four sections repeat a blob's Gyro gain to track it,
 * and freeze_mark and moon_mark must share one box exactly or they overlap.
 *
 * THE SIZES ARE NOT INDEPENDENT of the boxes above, and the assertion at the
 * bottom of this block proves it. A blob's group is exactly its limb box - the
 * limbs are the widest thing it contains - so the hero group being 106x132 is a
 * consequence of HERO_LIMB_BOX, not a second decision. It was written as a second
 * decision, twice, in two files.
 */
export const ANCHORS = {
	/** The hero blob. Its size IS HERO_LIMB_BOX; hero_props is placed against it. */
	HERO: box(207, 262, HERO_LIMB_BOX.width, HERO_LIMB_BOX.height),
	/** The companion. Size IS COMPANION_LIMB_BOX. */
	COMPANION: box(143, 322, COMPANION_LIMB_BOX.width, COMPANION_LIMB_BOX.height),

	/**
	 * Whatever the hero is holding.
	 *
	 * A SIBLING OF THE HERO, NOT A CHILD, and 8px to its left on purpose: a
	 * PartDraw cannot start left of its parent group's origin without being
	 * clipped, and a prop centred on the hero's raised hand would have to. See the
	 * header of face/hero-props.ts, and note that the hand's position in THIS
	 * group's coordinates is derived from these two anchors rather than typed.
	 *
	 * IT WAS 38 WIDE UNTIL THE LIGHTSABER NEEDED A LONGER BLADE. The blade runs on a
	 * diagonal because the vertical room above the fist is only 35px and a vertical
	 * blade in it reads as a torch; lengthening it therefore means leaning it
	 * further, and leaning it further means running out of box to the right. 52 buys
	 * a 33px blade against the 25 that fitted before.
	 *
	 * WIDENING IS FREE AND MOVING IS NOT. Every prop in data/props.ts is placed
	 * against HAND, which is derived from `x` - so growing `width` moves nothing at
	 * all, while changing `x` would move the group and the hand by the same amount
	 * and leave every prop exactly where it was, which is a much more confusing kind
	 * of no-op. `y` and `height` are the ones to leave alone: the controller and the
	 * cocktail hang off tabulated group-local y values, and those WOULD move.
	 */
	HERO_PROPS: box(199, 262, 52, 50),

	/**
	 * Whatever the COMPANION is holding. The same trick as HERO_PROPS, one blob down.
	 *
	 * The companion carried nothing at all until 1 May arrived with a sickle, and it
	 * needs this group for the same reason the hero's props do: its group is exactly
	 * as wide as its limbs (62), and the hand that takes the sickle sits at group-local
	 * x56.5 - five and a half pixels from the right edge. A 24-wide blade centred there
	 * runs to x68.5 and the last six pixels are simply not drawn. The companion's OWN
	 * limb row already demonstrates the failure from the other side: COMPANION_LIMBS[0]
	 * draws its cream cap from x-2 and the cap arrives flat-sided.
	 *
	 * So: a sibling rather than a child, absolute canvas coordinates, and
	 * companionGyro() repeated by hand inside it - without which the sickle slides off
	 * the fist across a tilt sweep, exactly as the hero's props would.
	 *
	 * IT GREW TWICE, from 34x40 at (185,330) to 54x66 at (165,312), and both times for
	 * the lightsaber: once outward for a blade at all, once UPWARD when the companion's
	 * was made the same length as the hero's rather than a scaled-down toy. A 27px
	 * blade raised out of a hand 36px down a 56-tall group does not fit in it.
	 *
	 * MOVING THIS GROUP MOVES NOTHING. Everything in it is placed against
	 * COMPANION_HAND, which is derived from this origin, so the two cancel;
	 * COMPANION_HAND_SHIPPED in data/props.ts is the restatement that proves it on
	 * every build. That is only true because nothing here carries a tabulated
	 * group-local y - unlike the hero's side, where the controller and the cocktail do.
	 */
	COMPANION_PROPS: box(165, 312, 54, 66),

	/** The storm burst behind the companion. */
	COMPANION_BURST: box(123, 306, 104, 104),
	/** The bolt. */
	COMPANION_LIGHTNING: box(133, 264, 56, 68),
	/** The umbrella the hero holds up in the rain. */
	HERO_UMBRELLA: box(137, 250, 164, 70),

	/**
	 * The sky mark, above and between the blobs.
	 *
	 * ONE BOX, TWO SECTIONS. freeze_mark and moon_mark both draw here and are
	 * mutually exclusive - states.ts asserts that they can never both fire. They
	 * had this box typed out separately, which is how a snowflake behind a moon
	 * would have happened.
	 */
	SKY_MARK: box(156, 278, 36, 36),

	/**
	 * The Christmas tree, standing in the empty canvas at bottom left.
	 *
	 * THE ONLY REALLY EMPTY PLACE ON THIS FACE, and it is smaller than it looks.
	 * The stat row ends at y252 and the companion starts at x143, which leaves the
	 * lower left - but the bezel cuts that corner off, and the companion's sleep
	 * z's sit at x105..151 on exactly the nights Christmas can fall on.
	 * data/celebrations.ts asserts all four corners against the bezel and against
	 * the z's rather than trusting this note.
	 *
	 * IT GREW TWICE AND CAME DOWN TO THE GROUND: 46x82 at (58,280), then 60x84 at
	 * (78,254), now 62x112 at (80,282). The middle version was closer and bigger and
	 * still wrong - its base sat at y338 against blobs whose feet are at y394, so it
	 * hung in the air above them.
	 *
	 * THE THREE EDGES IT STOPS AT ARE ALL HARD. Above, the heart-rate chip ends at
	 * y252 and runs x92..162, straight through where a tree this wide wants its star.
	 * Right, the companion's own group starts at x143. Below-left, the bezel: at y394
	 * anything left of x77 is behind the case, so the tree cannot simply slide further
	 * from the blobs to find room.
	 *
	 * WHAT MADE IT FIT WAS MOVING THE COMPANION'S SLEEP Z'S, which used to own exactly
	 * this strip - see ANCHORS.COMPANION_SLEEP_ZZZ. Christmas night draws both, so no
	 * TREE SHAPE may touch any z GLYPH; the two group boxes overlap and are meant to.
	 * data/celebrations.ts asserts the shapes rather than trusting this note.
	 */
	CHRISTMAS_TREE: box(80, 282, 62, 112),

	/** The hero's sleep z's, up and to its right. */
	SLEEP_ZZZ: box(294, 304, 64, 55),
	/**
	 * The companion's, level with its head and trailing off to its left.
	 *
	 * IT DOES NOT MOVE FOR THE CHRISTMAS TREE, and that is the point of this note.
	 * The tree stands on the blobs' ground line, which puts it in exactly this strip -
	 * the bezel cuts everything left of x77 at that height, so there is nowhere else
	 * for the tree to go - and the obvious response is to move the z's. It was tried
	 * twice. At (150,282) the trio sat on ANCHORS.SKY_MARK and read as three z's coming
	 * off the MOON; at (130,294,24,54), reshaped tall and narrow to fit the corridor
	 * between the canopy and the head, it read as a column of z's standing to attention.
	 *
	 * WHICH STATE PAYS IS THE ACTUAL QUESTION, and it is not a geometric one. `night`
	 * is on for a third of every day and `christmas` for three days a year, so the
	 * three-day state absorbs the collision: on Christmas night the z's cross the
	 * tree's canopy, which reads as z's drifting past a tree rather than as either
	 * shape being wrong. Nothing asserts they are apart, because they are not.
	 *
	 * WHAT IS STILL ASSERTED is that the trio LEAVES THE BLOB - data/zzz.ts, against
	 * the body ellipse rather than its box, since the z's set off from a corner. That
	 * is the check both failed positions would have been caught by, and neither of them
	 * had anything to do with the tree.
	 */
	COMPANION_SLEEP_ZZZ: box(105, 338, 46, 44),

	/**
	 * The stat row and the weather chip above it.
	 *
	 * FOUR ORIGINS THAT MAKE ONE ROW. The three stat chips share y216 and h36 and
	 * are only readable as a row if they keep doing so; the weather chip sits above
	 * them at y184. The widths differ because the content does.
	 */
	CHIP_WEATHER: box(190, 184, 90, 32),
	CHIP_HEART_RATE: box(92, 216, 70, 36),
	CHIP_STEPS: box(172, 216, 98, 36),
	CHIP_BATTERY: box(280, 216, 110, 36)
} as const;

/**
 * A blob's group is exactly as big as its limbs.
 *
 * Proving it here is what makes ANCHORS.HERO's size a derivation rather than a
 * coincidence, and it is the assertion that fires if someone widens a limb box
 * and forgets the group - which clips the limbs, on the wrist, silently.
 */
for (const [name, anchor, limb] of [
	['HERO', ANCHORS.HERO, HERO_LIMB_BOX],
	['COMPANION', ANCHORS.COMPANION, COMPANION_LIMB_BOX]
] as const) {
	if (anchor.width !== limb.width || anchor.height !== limb.height) {
		throw new Error(
			`ANCHORS.${name} is ${anchor.width}x${anchor.height} but its limb box is ` +
				`${limb.width}x${limb.height} - the limbs would be clipped`
		);
	}
}

/** The three stat chips are a row, so they share a baseline and a height. */
{
	const row = [ANCHORS.CHIP_HEART_RATE, ANCHORS.CHIP_STEPS, ANCHORS.CHIP_BATTERY];
	if (new Set(row.map((c) => `${c.y}:${c.height}`)).size !== 1) {
		throw new Error('the three stat chips no longer share a y and a height - the row would step');
	}
}

// --- Gyro -------------------------------------------------------------------

/**
 * Parallax gains. <Gyro> is NOT inherited by siblings, so in the XML every
 * accessory group repeated its blob's gain verbatim - 3 sites at the hero's
 * value and 4 at the companion's - and changing one meant hand-editing all of
 * them.
 *
 * The two values differ DELIBERATELY. The companion moves less, which is what
 * makes the pair read as sitting at different depths rather than as one flat
 * layer sliding about.
 */
export const GYRO_HERO = { x: 0.229, y: 0.143 } as const;
export const GYRO_COMPANION = { x: 0.157, y: 0.1 } as const;

/** Wrist tilt is clamped before it is scaled, so a sharp turn cannot fling a
 *  blob off the canvas. */
export const GYRO_CLAMP = 35;
