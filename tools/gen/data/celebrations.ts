/**
 * The calendar's costumes and emblems, as data.
 *
 * ONE FILE FOR SEVEN OCCASIONS because they share almost nothing except the two
 * bodies they hang off, and that sharing is the thing worth keeping in one place:
 * a Santa hat and a party hat both sit on the hero's crown, and the crown is a
 * point derived from HERO_BOX rather than a number typed once per hat. Held
 * objects are NOT here - a hammer is a prop, so it lives in data/props.ts beside
 * the coffee cup, positioned off the same derived HAND.
 *
 * NO COLOUR IN THIS FILE, the call data/fireworks.ts makes and for the same
 * reason: which green a tree is, is a look; where its tiers sit, is geometry. The
 * face modules own the first and read the second.
 *
 * WHAT IS DERIVED AND WHAT IS TABULATED. A placement that follows from a body box
 * is computed - so moving a blob moves its hat - and a shape traced by eye stays
 * a table with the measurement in it. A derivation that needs a fudge per row is
 * not a derivation; see the same note in data/props.ts.
 */

import * as G from '../geometry.ts';
import { GOAL_POLE } from './blobs.ts';

// --- The German tricolour ---------------------------------------------------

/**
 * The flag flown on 3 October, on the step-goal pole.
 *
 * A FLAG FLIES TO THE RIGHT OF ITS POLE AND IS DRAWN BEHIND IT. Both halves are
 * conventions for every flag this face ever grows, not facts about this one:
 *
 *   RIGHT, because a flag streams AWAY from whoever is carrying it, and the hero
 *   carries this pole in its right hand on the right of its own body. The first cut
 *   flew it left, back over the hero's head, on the reasoning that the limb box had
 *   no room to the right - which was true, and the answer to "the box is too small"
 *   is a bigger box, not a backwards flag. HERO_LIMB_BOX went from 106 to 122.
 *
 *   BEHIND, because the pole passes in front of the cloth it carries. Drawn over
 *   the pole the hoist covers it and the flag reads as a sticker stuck on beside a
 *   stick. This is document order in face/blob-hero.ts, since WFF has no z-index.
 *
 * THE BANDS ARE 4.5 TALL, not 3. The design canvas is 450 and the watch is 426,
 * so everything here renders at about 0.95x: a 3px band arrives as 2.8 device
 * pixels and two of them merge. 4.5 survives the scaling with an edge left over.
 */
export const TRICOLOUR = {
	width: 20,
	/** Per band. Three bands, so the flag is 13.5 tall. */
	bandHeight: 4.5,
	bands: 3,
	/** The hoist's top, on the pole. Level with the goal pennant's own top. */
	top: 21
};

/**
 * The three bands, top to bottom. The face module supplies the three colours.
 *
 * THE HOIST IS ON THE POLE AND THE FLY REACHES RIGHT OF IT, so the hoist edge is
 * GOAL_POLE.x itself rather than that minus a width. The band overlaps the pole's
 * own stroke by half its thickness, which is what stops a hairline of background
 * showing between cloth and staff at 0.95x.
 */
export const TRICOLOUR_BANDS: G.Box[] = Array.from({ length: TRICOLOUR.bands }, (_, band) =>
	G.box(
		GOAL_POLE.x,
		TRICOLOUR.top + band * TRICOLOUR.bandHeight,
		TRICOLOUR.width,
		TRICOLOUR.bandHeight
	)
);

{
	const problems: string[] = [];
	const fly = GOAL_POLE.x + TRICOLOUR.width;
	const bottom = TRICOLOUR.top + TRICOLOUR.bands * TRICOLOUR.bandHeight;

	// Content outside a part box is cut off with no error anywhere - the single
	// most repeated hazard in this codebase. The flag is the widest thing hanging
	// off the pole, so it is the one most likely to run out of box.
	if (fly > G.HERO_LIMB_BOX.width) {
		problems.push(
			`the flag's fly edge is at x${fly}, past the limb box's ${G.HERO_LIMB_BOX.width} - the far ` +
				'end of every band would be cut off, silently'
		);
	}
	if (bottom > G.HERO_LIMB_BOX.height) {
		problems.push(`the flag reaches y${bottom}, past the limb box's ${G.HERO_LIMB_BOX.height}`);
	}
	// It flies RIGHT. Stated as a check because it is a convention for the next flag
	// as much as a fact about this one, and because "left" fits and looks fine.
	if (TRICOLOUR_BANDS.some((band) => band.x !== GOAL_POLE.x)) {
		problems.push(
			`a band's hoist is not on the pole at x${GOAL_POLE.x} - a flag flies to the RIGHT of its ` +
				'pole, with its hoist edge on it'
		);
	}
	// The pole has to be long enough to fly it from.
	if (TRICOLOUR.top < GOAL_POLE.top || bottom > GOAL_POLE.bottom) {
		problems.push(
			`the flag spans y${TRICOLOUR.top}..${bottom}, outside the pole's ` +
				`${GOAL_POLE.top}..${GOAL_POLE.bottom} - it would hang off the end`
		);
	}
	// It must not reach the head it flies above. HERO_BOX is the body outline.
	if (bottom > G.HERO_BOX.y) {
		problems.push(`the flag reaches y${bottom}, into the hero's head at y${G.HERO_BOX.y}`);
	}

	if (problems.length) {
		throw new Error(`the tricolour no longer flies:\n  ${problems.join('\n  ')}`);
	}
}

// --- The Santa hats ---------------------------------------------------------

/**
 * A Santa hat: a dome across the whole brim, a flop hanging off it, a bobble.
 *
 * THE CROWN USED TO BE ONE STROKED ARC, AND THAT WAS THE BUG. A hat drawn as a
 * thick curved band is a band - it has a HOLE in it, and the hole showed the leaf
 * tuft behind, so the hat read as a red horseshoe with a plant growing through it.
 * Worse, the band only touched the brim at one end, so the red sat on the leftmost
 * inch of a 46px white band and the rest of it floated bare.
 *
 * WHAT REPLACES IT IS TWO FILLED SHAPES AND A COVER. An Ellipse gives the domed top
 * and a Rectangle carries it down to the brim - together, a dome-topped crown. Both
 * run BELOW the brim's top edge and the brim is drawn over them, so the joint is
 * hidden rather than fitted. That is the same move the coffee cup makes with its rim
 * and the mouth mask makes with the body: WFF has no clipping except a part box, so
 * "cut this off" is always "draw something opaque over it".
 *
 * THE CROWN IS INSET BY THE BRIM'S CORNER RADIUS, and the first cut was not. Made
 * exactly as wide as the brim it looked right in the numbers and wrong on the watch:
 * the brim is a RoundRectangle, so its top corners curve away, and the crown's square
 * ones stuck out past them as two red nicks either side of the white. Insetting by
 * the radius puts the crown inside the curve everywhere. It also happens to be what a
 * hat looks like - a crown is narrower than the band it sits in.
 *
 * THE DOME IS AS DEEP AS THE CROWN IS TALL. A shallower one left a straight-sided
 * shoulder where the ellipse stopped and the flop began, which read as a notch cut
 * out of the top of the hat. At `domeHeight == height` the ellipse's own curve runs
 * all the way down to the brim and there is no straight section to notch.
 *
 * THE FLOP IS STILL ARCS, and that part was always right. It hangs off the crown's
 * shoulder rather than replacing it, tapers in one step from thick to thin, and
 * carries the bobble on its end.
 *
 * TABULATED, unlike the headset, precisely because there are TWO of them. The
 * headset's numbers stay literal in face/blob-hero.ts on the grounds that a table
 * of one row is a table nobody needs - the same reasoning says a shape that exists
 * at two scales on two heads is a table of two.
 */
export type SantaHat = {
	/** The white band across the crown. Overhangs the head on both sides. */
	brim: G.Box & { radius: number };
	/** How far the crown rises above the brim's top edge, and how domed it is. */
	crown: { height: number; domeHeight: number };
	/**
	 * The flop, as an elliptical arc swept clockwise from 12 o'clock - WFF's own
	 * convention. `from` is on the crown, `mid` is where the fat arc hands over to
	 * the thin one, `to` is the tip the bobble sits on.
	 */
	flop: {
		centerX: number;
		centerY: number;
		rx: number;
		ry: number;
		from: number;
		mid: number;
		to: number;
		thick: number;
		thin: number;
	};
	bobble: number;
};

/** Where an elliptical arc is at a given angle. WFF measures clockwise from 12. */
const onArc = (flop: SantaHat['flop'], degrees: number) => {
	const t = (degrees * Math.PI) / 180;
	return {
		x: flop.centerX + flop.rx * Math.sin(t),
		y: flop.centerY - flop.ry * Math.cos(t)
	};
};

/**
 * The hero's hat. Placed against the head, which HERO_BOX puts at x14..86 with its
 * crown at y36 - the same point the headset band peaks at, and for the same reason.
 * The crown lives entirely ABOVE that point, over open background, which is what
 * keeps a red hat legible on the red Monday blob.
 */
export const HERO_SANTA_HAT: SantaHat = {
	brim: { ...G.box(27, 33, 46, 9), radius: 4.5 },
	crown: { height: 24, domeHeight: 24 },
	flop: {
		centerX: 52,
		centerY: 44,
		rx: 26,
		ry: 26,
		from: 30,
		mid: 72,
		to: 104,
		thick: 12,
		thin: 7.5
	},
	bobble: 10
};

/** The companion's, on a 44x42 head instead of a 72x80 one. */
export const COMPANION_SANTA_HAT: SantaHat = {
	brim: { ...G.box(14, 17, 32, 7), radius: 3.5 },
	crown: { height: 16, domeHeight: 16 },
	flop: {
		centerX: 31,
		centerY: 28,
		rx: 17,
		ry: 17,
		from: 30,
		mid: 72,
		to: 104,
		thick: 8.5,
		thin: 5
	},
	bobble: 7
};

/**
 * How wide the crown is: the brim, less its own corner radius on each side.
 * See the note above - square corners on a rounded band show as red nicks.
 */
const crownWidth = (hat: SantaHat): number => hat.brim.width - hat.brim.radius * 2;

/** The domed top of a crown: an ellipse across the crown, sitting on the stem. */
export const crownDome = (hat: SantaHat): G.Box =>
	G.box(
		hat.brim.x + hat.brim.radius,
		hat.brim.y - hat.crown.height,
		crownWidth(hat),
		hat.crown.domeHeight * 2
	);

/**
 * The straight sides, from the dome's own centre line down INTO the brim.
 *
 * It ends at the brim's BOTTOM rather than its top, so the brim covers the join
 * completely - ending it at the top leaves a hairline of background between crown
 * and band at 0.95x, which reads as a hat hovering over its own brim.
 */
export const crownStem = (hat: SantaHat): G.Box => {
	const dome = crownDome(hat);
	const top = dome.y + hat.crown.domeHeight;
	return G.box(
		hat.brim.x + hat.brim.radius,
		top,
		crownWidth(hat),
		hat.brim.y + hat.brim.height - top
	);
};

/** The bobble, DERIVED from where the thin arc actually ends rather than placed. */
export const bobbleBox = (hat: SantaHat): G.Box => {
	const tip = onArc(hat.flop, hat.flop.to);
	return G.box(tip.x - hat.bobble / 2, tip.y - hat.bobble / 2, hat.bobble, hat.bobble);
};

// --- The party hats ---------------------------------------------------------

/**
 * A 19 December party hat: a real triangular cone, striped, with a pompom.
 *
 * WFF HAS NO POLYGON, AND THE FIRST CUT PRETENDED OTHERWISE. It reused the Santa
 * hat's arc with the ellipse centre shoved 30px to the side, on the reasoning that
 * the far edge of a big ellipse is near enough to straight - which it is, and it
 * still read as a curved horn rather than a cone, because a stroked arc is a band
 * of constant width and a cone is a shape that narrows.
 *
 * SO THE CONE IS A STACK OF RECTANGLES, one per row, each as wide as the triangle
 * is at that height. That is the only exact filled triangle the five primitives
 * allow: there is no path, no polygon, and a rotated square cannot be cut in half
 * because a PartDraw's clip box turns WITH its contents.
 *
 * EVERY ROW REACHES THE BASE rather than being a band of its own height, and they
 * are drawn widest first. Same colour, overlapping, so there are no internal edges
 * to antialias against each other - a stack of abutting bands shows every seam.
 *
 * THE ROW COUNT IS NOT A ROUND NUMBER FOR A ROUND REASON. The step in the
 * silhouette is halfWidth/rows, and the canvas is 450 against a 426 watch, so a
 * design pixel is 0.947 device pixels: a step under about 1.4 design px disappears
 * into the antialiasing. Halve the rows and the cone reads as a ziggurat. Asserted
 * below, so widening a hat without adding rows is a build failure rather than a
 * discovery on the wrist.
 *
 * THE STRIPES ARE THE SAME FORMULA. A band across the cone at height t is a
 * rectangle exactly `coneWidthAt(t)` wide, so it cannot poke out of the sides - and
 * the whole reason to build the cone this way is that "how wide is it here" becomes
 * a function anything can call.
 */
export type PartyHat = {
	/** Which head this sits on. The cone's centre line and its base come off it. */
	head: G.Box;
	cone: {
		/** The base's half-width, at `baseY`. The apex is directly above its centre. */
		halfWidth: number;
		baseY: number;
		apexY: number;
		rows: number;
	};
	/**
	 * Bands across the cone. `at` is the stripe's TOP edge as a fraction of the way
	 * from base to apex, and it hangs downward from there - measured at the top
	 * because that is the cone's narrowest point across the band, and a stripe cut to
	 * its own bottom width has two corners hanging over the sides of a shape that
	 * narrows. Inset by a fraction of a pixel at the bottom instead, where the cone's
	 * own colour fills the gap and nothing shows.
	 */
	stripes: { at: number; height: number }[];
	pompom: number;
};

export const HERO_PARTY_HAT: PartyHat = {
	head: G.HERO_BOX,
	cone: { halfWidth: 17, baseY: 41, apexY: 6, rows: 14 },
	stripes: [
		{ at: 0.18, height: 3.4 },
		{ at: 0.46, height: 3 },
		{ at: 0.72, height: 2.4 }
	],
	pompom: 9
};

export const COMPANION_PARTY_HAT: PartyHat = {
	head: G.COMPANION_BOX,
	cone: { halfWidth: 13, baseY: 25, apexY: 4, rows: 12 },
	stripes: [
		{ at: 0.2, height: 2.6 },
		{ at: 0.5, height: 2.2 },
		{ at: 0.76, height: 1.8 }
	],
	pompom: 7
};

/** The cone's centre line: the middle of the head it sits on. */
const coneCentre = (hat: PartyHat): number => hat.head.x + hat.head.width / 2;

/**
 * How wide the cone is at a height, `t` running 0 at the base to 1 at the apex.
 * The one function the rows, the stripes and every assertion below all go through.
 */
export const coneWidthAt = (hat: PartyHat, t: number): number => hat.cone.halfWidth * 2 * (1 - t);

/** The y a fraction of the way up the cone. */
const coneYAt = (hat: PartyHat, t: number): number =>
	hat.cone.baseY + (hat.cone.apexY - hat.cone.baseY) * t;

/** The cone, widest row first. Each row runs from its own top down to the base. */
export const coneRows = (hat: PartyHat): G.Box[] =>
	Array.from({ length: hat.cone.rows }, (_, i) => {
		const t = i / hat.cone.rows;
		const width = coneWidthAt(hat, t);
		const top = coneYAt(hat, t);
		return G.box(coneCentre(hat) - width / 2, top, width, hat.cone.baseY - top);
	});

/** A stripe across the cone, exactly as wide as the cone is where it sits. */
export const coneStripes = (hat: PartyHat): G.Box[] =>
	hat.stripes.map((stripe) => {
		// Measured at the stripe's TOP edge, which is where the cone is narrowest
		// across the band - see the note on `stripes`.
		const width = coneWidthAt(hat, stripe.at);
		return G.box(coneCentre(hat) - width / 2, coneYAt(hat, stripe.at), width, stripe.height);
	});

/** The pompom, centred on the apex. */
export const pompomBox = (hat: PartyHat): G.Box =>
	G.box(coneCentre(hat) - hat.pompom / 2, hat.cone.apexY - hat.pompom / 2, hat.pompom, hat.pompom);

{
	const problems: string[] = [];

	// --- the Santa hats --------------------------------------------------------
	for (const [label, hat, limb, head] of [
		['hero Santa', HERO_SANTA_HAT, G.HERO_LIMB_BOX, G.HERO_BOX],
		['companion Santa', COMPANION_SANTA_HAT, G.COMPANION_LIMB_BOX, G.COMPANION_BOX]
	] as const) {
		const dome = crownDome(hat);
		const stem = crownStem(hat);
		const bobble = bobbleBox(hat);

		/**
		 * THE RED SITS ON THE WHOLE WHITE BAND. This is the fix the shape was rebuilt
		 * for, so it is the check that has to exist: crown and brim share an x and a
		 * width, which they do by construction here and did not at all before.
		 */
		/**
		 * THE RED SITS ON THE WHOLE WHITE BAND, AND INSIDE ITS ROUNDED CORNERS.
		 *
		 * Both halves are the reason this shape was rebuilt, so both are checked. Too
		 * narrow and the band floats bare at its ends; too wide and the crown's square
		 * corners poke out past the brim's curve as two red nicks - which is exactly
		 * what shipped, and which looks like a rendering artefact rather than a shape.
		 */
		const inset = dome.x - hat.brim.x;
		if (Math.abs(inset - hat.brim.radius) > 0.001 || dome.width !== crownWidth(hat)) {
			problems.push(
				`the ${label} hat's crown spans x${dome.x}..${dome.x + dome.width} on a brim running ` +
					`x${hat.brim.x}..${hat.brim.x + hat.brim.width} with a ${hat.brim.radius} corner - it ` +
					'has to be inset by exactly that radius or the corners show'
			);
		}
		if (crownWidth(hat) < hat.brim.width * 0.6) {
			problems.push(
				`the ${label} hat's crown is too narrow for its brim - the band would look bare`
			);
		}
		// The stem has to REACH the brim's bottom, or a line of background shows through.
		if (Math.abs(stem.y + stem.height - (hat.brim.y + hat.brim.height)) > 0.001) {
			problems.push(`the ${label} hat's crown does not reach the bottom of its own brim`);
		}
		/**
		 * NO STRAIGHT SHOULDER. The dome has to be at least as deep as the crown is
		 * tall, so its curve runs the whole way down to the brim; anything shallower
		 * leaves a vertical section where the ellipse stops, and the flop springing off
		 * that section reads as a notch cut out of the top of the hat.
		 */
		if (hat.crown.domeHeight < hat.crown.height) {
			problems.push(
				`the ${label} hat's dome is ${hat.crown.domeHeight} deep in a ${hat.crown.height} crown ` +
					'- the straight part left above the brim would read as an abrupt edge'
			);
		}
		/**
		 * THE FLOP HAS TO START INSIDE THE DOME, and against the ELLIPSE rather than
		 * against its bounding box - which is the version that passed while the arc was
		 * springing out of thin air above the corner of a curve. A dome is an ellipse,
		 * and its box holds a lot of empty sky at the top.
		 */
		const foot = onArc(hat.flop, hat.flop.from);
		const domeCentre = { x: dome.x + dome.width / 2, y: dome.y + dome.height / 2 };
		const radial =
			((foot.x - domeCentre.x) / (dome.width / 2)) ** 2 +
			((foot.y - domeCentre.y) / (dome.height / 2)) ** 2;
		if (radial > 1) {
			problems.push(
				`the ${label} hat's flop starts at (${foot.x.toFixed(1)},${foot.y.toFixed(1)}), which is ` +
					`outside the dome ellipse centred (${domeCentre.x},${domeCentre.y}) - the tip would ` +
					'spring off the side of the hat rather than out of it'
			);
		}
		// The brim sits ON the crown: it has to straddle the head's top edge and be
		// wider than the head is there, or it reads as a plaster rather than a hat.
		if (hat.brim.y > head.y || hat.brim.y + hat.brim.height < head.y) {
			problems.push(
				`the ${label} hat's brim spans y${hat.brim.y}..${hat.brim.y + hat.brim.height} and the ` +
					`head's crown is at y${head.y} - the brim would not sit on it`
			);
		}
		const headCentre = head.x + head.width / 2;
		const brimCentre = hat.brim.x + hat.brim.width / 2;
		if (Math.abs(headCentre - brimCentre) > 0.5) {
			problems.push(
				`the ${label} hat's brim is centred on x${brimCentre}, the head on x${headCentre}`
			);
		}
		// The taper must taper.
		if (hat.flop.thin >= hat.flop.thick) {
			problems.push(`the ${label} hat's flop does not narrow towards its tip`);
		}
		/**
		 * THE SWEEP MUST INCREASE, AND THIS ONE COST A RENDER TO FIND.
		 *
		 * Written 270 -> 45 instead of 270 -> 405, every number is still a legal angle,
		 * every other assertion still passes, and the arc sweeps the other way round
		 * the ellipse: down through 180, which is the BOTTOM. The hat came out draped
		 * across the hero's face. Nothing else could have caught it - the angles are
		 * valid, the shape is inside its box, and the bobble, derived from `to`, lands
		 * in exactly the right place either way because sin(435) is sin(75).
		 */
		if (hat.flop.mid <= hat.flop.from || hat.flop.to <= hat.flop.mid) {
			problems.push(
				`the ${label} hat's flop sweeps ${hat.flop.from} -> ${hat.flop.mid} -> ${hat.flop.to}, ` +
					'which is not increasing - WFF sweeps an Arc from startAngle UPWARD, so a sweep ' +
					"that crosses 12 o'clock has to be written past 360 (270 -> 405, not 270 -> 45). " +
					'Written backwards it goes the long way round and drapes over the face'
			);
		}
		/**
		 * NOTHING MAY LEAVE THE LIMB BOX - the silent clip, again.
		 *
		 * THE FLOP'S REACH IS SAMPLED ALONG THE ARC IT ACTUALLY DRAWS, not taken from
		 * its ellipse's extremes: an ellipse's top may be nowhere near the swept part.
		 * Half the stroke on each side, and the stroke narrows at `mid`.
		 */
		const reach = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
		for (let a = hat.flop.from; a <= hat.flop.to; a += 1) {
			const at = onArc(hat.flop, a);
			const half = (a <= hat.flop.mid ? hat.flop.thick : hat.flop.thin) / 2;
			reach.minX = Math.min(reach.minX, at.x - half);
			reach.minY = Math.min(reach.minY, at.y - half);
			reach.maxX = Math.max(reach.maxX, at.x + half);
			reach.maxY = Math.max(reach.maxY, at.y + half);
		}

		const pieces = [
			['flop', reach.minX, reach.minY, reach.maxX, reach.maxY],
			['bobble', bobble.x, bobble.y, bobble.x + bobble.width, bobble.y + bobble.height],
			['dome', dome.x, dome.y, dome.x + dome.width, dome.y + dome.height],
			['brim', hat.brim.x, hat.brim.y, hat.brim.x + hat.brim.width, hat.brim.y + hat.brim.height]
		] as const;
		for (const [piece, x0, y0, x1, y1] of pieces) {
			if (x0 < 0 || y0 < 0 || x1 > limb.width || y1 > limb.height) {
				problems.push(
					`the ${label} hat's ${piece} spans (${x0.toFixed(1)},${y0.toFixed(1)})..` +
						`(${x1.toFixed(1)},${y1.toFixed(1)}), outside its ${limb.width}x${limb.height} limb box`
				);
			}
		}
	}

	// --- the party hats --------------------------------------------------------
	for (const [label, hat, limb, head] of [
		['hero party', HERO_PARTY_HAT, G.HERO_LIMB_BOX, G.HERO_BOX],
		['companion party', COMPANION_PARTY_HAT, G.COMPANION_LIMB_BOX, G.COMPANION_BOX]
	] as const) {
		const rows = coneRows(hat);
		const pompom = pompomBox(hat);
		const centre = coneCentre(hat);

		if (hat.cone.apexY >= hat.cone.baseY) {
			problems.push(`the ${label} hat's apex is below its own base`);
		}
		/**
		 * THE BASE RUNS INTO THE HEAD, which is what a brim used to do for it.
		 *
		 * The widest row has to start below the crown or a line of background shows
		 * between hat and blob; it must not run so far down that the cone reads as
		 * sunk into the head. A few pixels either way, checked against HERO_BOX rather
		 * than against a number, so moving a blob cannot lift its hat off.
		 */
		const sunk = hat.cone.baseY - head.y;
		if (sunk <= 0 || sunk > head.height * 0.14) {
			problems.push(
				`the ${label} hat's cone stands at y${hat.cone.baseY} on a head whose crown is at ` +
					`y${head.y} - it would ${sunk <= 0 ? 'float above' : 'sink into'} the blob`
			);
		}
		// A cone as wide as the head it sits on is a bucket.
		if (hat.cone.halfWidth * 2 >= head.width) {
			problems.push(`the ${label} hat's cone is as wide as the head it stands on`);
		}
		// The step in the silhouette has to vanish at device scale - see the note above.
		const step = hat.cone.halfWidth / hat.cone.rows;
		if (step > 1.4) {
			problems.push(
				`the ${label} hat's cone steps ${step.toFixed(2)}px per row across ${hat.cone.rows} rows ` +
					'- the sides would read as a staircase rather than as straight edges'
			);
		}
		// Every stripe on the cone, and in order up it.
		for (const [i, stripe] of hat.stripes.entries()) {
			if (stripe.at <= 0 || stripe.at >= 1) {
				problems.push(`the ${label} hat's stripe ${i + 1} is not on the cone`);
			}
			if (i > 0 && stripe.at <= hat.stripes[i - 1].at) {
				problems.push(`the ${label} hat's stripes are not in order up the cone`);
			}
		}
		for (const band of coneStripes(hat)) {
			// Neither edge of a stripe may hang over the side, which is the one failure
			// this construction exists to make impossible. The top edge is the tight one.
			const tTop = (hat.cone.baseY - band.y) / (hat.cone.baseY - hat.cone.apexY);
			if (band.width > coneWidthAt(hat, tTop) + 0.001) {
				problems.push(
					`a ${label} hat stripe is ${band.width} wide where the cone is ` +
						`${coneWidthAt(hat, tTop).toFixed(2)} - its corners would hang over the edge`
				);
			}
			if (band.y + band.height > hat.cone.baseY) {
				problems.push(`a ${label} hat stripe hangs off the bottom of its own cone`);
			}
		}
		if (Math.abs(centre - (head.x + head.width / 2)) > 0.5) {
			problems.push(
				`the ${label} hat's cone is centred on x${centre}, the head on x${head.x + head.width / 2}`
			);
		}
		for (const [piece, box] of [
			['pompom', pompom],
			['widest row', rows[0]]
		] as const) {
			if (
				box.x < 0 ||
				box.y < 0 ||
				box.x + box.width > limb.width ||
				box.y + box.height > limb.height
			) {
				problems.push(
					`the ${label} hat's ${piece} spans (${box.x},${box.y})..` +
						`(${box.x + box.width},${box.y + box.height}), outside its ` +
						`${limb.width}x${limb.height} limb box`
				);
			}
		}
	}

	if (problems.length) {
		throw new Error(`a hat no longer sits on its head:\n  ${problems.join('\n  ')}`);
	}
}

// --- The Christmas tree -----------------------------------------------------

/**
 * A conifer, as three stacked ellipses on a trunk, with a star and five baubles.
 *
 * ELLIPSES AND NOT TRIANGLES, because there are no triangles. WFF's five drawing
 * primitives are Ellipse, Line, Rectangle, RoundRectangle and Arc - there is no
 * polygon and no path, so the archetypal stepped-triangle tree cannot be drawn at
 * all. Stacked ellipses are not a workaround for that: they are the vocabulary
 * this face is already written in - both blobs, every leaf blade and every sweat
 * bead are ellipses - so a bushy tree belongs here in a way a faceted one would not.
 *
 * WIDEST AT THE BOTTOM AND EACH TIER OVERLAPPING THE ONE BELOW, asserted, because
 * that overlap is the only thing separating a conifer from three stacked beads.
 *
 * THE STAR IS THE FIREWORKS' STAR. data/fireworks.ts already builds a six-pointed
 * star out of three crossed lines, sized and thickness-matched to its box, and a
 * second implementation here would be a second thing to keep in step for no gain.
 */
export const TREE = {
	/** Bottom to top - which is also draw order, so each tier overlaps the last. */
	tiers: [
		{ cx: 31, cy: 86, rx: 29, ry: 19 },
		{ cx: 31, cy: 62, rx: 22, ry: 16 },
		{ cx: 31, cy: 40, rx: 16, ry: 13 }
	],
	/**
	 * The trunk, WITH A ROUNDED FOOT - a rectangle down to `top + height`, and an
	 * ellipse centred on that bottom edge so the very bottom is convex.
	 *
	 * THE SAME MOVE THE COFFEE CUP MAKES, and for the same reason. A flat-bottomed
	 * rectangle reads as a shape cut off by the edge of the picture; a rounded one
	 * reads as a cylinder seen from slightly above, which is the viewpoint every
	 * other object on this face is drawn from. The cup's note calls it "a convex base
	 * is required once the rim reads as an ellipse"; a trunk has no rim, but it has
	 * the same problem at the other end.
	 */
	trunk: { cx: 31, top: 98, width: 10, height: 8, footHeight: 6 },
	/** The star's box is square, and its size is what starSegments() is given. */
	star: { cx: 31, cy: 14, size: 18 },
	/** Hand-scattered, like rain.ts's x positions - there is no formula behind them. */
	baubles: [
		{ cx: 19, cy: 80 },
		{ cx: 44, cy: 84 },
		{ cx: 22, cy: 60 },
		{ cx: 41, cy: 62 },
		{ cx: 31, cy: 38 }
	],
	baubleDiameter: 7
};

const ellipse = (tier: { cx: number; cy: number; rx: number; ry: number }): G.Box =>
	G.box(tier.cx - tier.rx, tier.cy - tier.ry, tier.rx * 2, tier.ry * 2);

export const TREE_TIERS: G.Box[] = TREE.tiers.map(ellipse);
export const TREE_TRUNK: G.Box = G.box(
	TREE.trunk.cx - TREE.trunk.width / 2,
	TREE.trunk.top,
	TREE.trunk.width,
	TREE.trunk.height
);

/** The rounded foot, centred ON the trunk's bottom edge so the two cannot part. */
export const TREE_TRUNK_FOOT: G.Box = G.box(
	TREE.trunk.cx - TREE.trunk.width / 2,
	TREE.trunk.top + TREE.trunk.height - TREE.trunk.footHeight / 2,
	TREE.trunk.width,
	TREE.trunk.footHeight
);
export const TREE_STAR_BOX: G.Box = G.box(
	TREE.star.cx - TREE.star.size / 2,
	TREE.star.cy - TREE.star.size / 2,
	TREE.star.size,
	TREE.star.size
);
export const TREE_BAUBLES: G.Box[] = TREE.baubles.map((b) =>
	ellipse({ cx: b.cx, cy: b.cy, rx: TREE.baubleDiameter / 2, ry: TREE.baubleDiameter / 2 })
);

{
	const problems: string[] = [];
	const anchor = G.ANCHORS.CHRISTMAS_TREE;

	// Everything inside the section's own box, which is what clips it.
	for (const [label, box] of [
		['trunk', TREE_TRUNK],
		['trunk foot', TREE_TRUNK_FOOT],
		['star', TREE_STAR_BOX],
		...TREE_TIERS.map((b, i) => [`tier ${i + 1}`, b] as const),
		...TREE_BAUBLES.map((b, i) => [`bauble ${i + 1}`, b] as const)
	] as const) {
		if (
			box.x < 0 ||
			box.y < 0 ||
			box.x + box.width > anchor.width ||
			box.y + box.height > anchor.height
		) {
			problems.push(
				`the tree's ${label} spans (${box.x},${box.y})..(${box.x + box.width},${box.y + box.height}) ` +
					`in a ${anchor.width}x${anchor.height} box - it would be clipped`
			);
		}
	}

	// A conifer narrows upward, and each tier has to REACH the one below it. Two
	// tiers that merely touch leave a hairline of background between them, which at
	// this size reads as three separate bushes floating above a stick.
	for (let i = 1; i < TREE.tiers.length; i++) {
		const lower = TREE.tiers[i - 1];
		const upper = TREE.tiers[i];
		if (upper.rx >= lower.rx) {
			problems.push(`the tree's tier ${i + 1} is no narrower than tier ${i} - it would not taper`);
		}
		if (upper.cy + upper.ry <= lower.cy - lower.ry) {
			problems.push(`the tree's tiers ${i} and ${i + 1} do not overlap - it would read as bushes`);
		}
	}
	// The trunk has to be under the foliage, not beside it.
	const bottom = TREE.tiers[0];
	if (TREE.trunk.top > bottom.cy + bottom.ry) {
		problems.push("the tree's trunk starts below its lowest branches - there would be a gap");
	}
	// The foot has to sit ON the trunk's bottom edge - centred on it, so half of the
	// ellipse is inside the rectangle and there is no seam to antialias.
	if (
		Math.abs(
			TREE_TRUNK_FOOT.y + TREE_TRUNK_FOOT.height / 2 - (TREE.trunk.top + TREE.trunk.height)
		) > 0.001
	) {
		problems.push("the tree's rounded foot is not centred on the bottom of its own trunk");
	}
	if (TREE_TRUNK_FOOT.width !== TREE_TRUNK.width) {
		problems.push("the tree's foot and trunk are different widths - the sides would step");
	}
	// Every bauble on a tier rather than in mid-air. A point is on a tier when it is
	// inside that ellipse.
	for (const [i, bauble] of TREE.baubles.entries()) {
		const on = TREE.tiers.some(
			(tier) => ((bauble.cx - tier.cx) / tier.rx) ** 2 + ((bauble.cy - tier.cy) / tier.ry) ** 2 <= 1
		);
		if (!on) {
			problems.push(`the tree's bauble ${i + 1} at (${bauble.cx},${bauble.cy}) hangs off the tree`);
		}
	}

	/**
	 * THE WHOLE TREE IS ON THE GLASS.
	 *
	 * It stands in the empty canvas at bottom left, which is precisely where the
	 * round bezel cuts hardest - the canvas corner nearest it is 93px outside the
	 * circle. A tree that fits its own box and fits the 450x450 canvas can still
	 * have a third of itself behind the case, and neither the validator nor a
	 * square-canvas preview would say so.
	 */
	for (const [dx, dy] of [
		[0, 0],
		[anchor.width, 0],
		[0, anchor.height],
		[anchor.width, anchor.height]
	]) {
		const over = G.pastBezel(anchor.x + dx, anchor.y + dy);
		if (over > 0) {
			problems.push(
				`the tree's corner at canvas (${anchor.x + dx},${anchor.y + dy}) is ${over.toFixed(1)}px ` +
					'outside the round bezel - that part of it is behind the case'
			);
		}
	}

	/**
	 * IT OVERLAPS THE COMPANION'S SLEEPING Z'S ON PURPOSE, and there is deliberately no
	 * assertion here saying otherwise.
	 *
	 * There was one, and it was a mistake. The tree stands on the blobs' ground line,
	 * which is the strip the z's have occupied since long before there was a tree, and
	 * a rule that the two must be apart can only be satisfied by moving the z's - the
	 * bezel pins the tree. Two positions were tried and both made `night` worse: one put
	 * the trio on the moon, the other stood it up in a column.
	 *
	 * `night` IS ON FOR A THIRD OF EVERY DAY AND `christmas` FOR THREE DAYS A YEAR. The
	 * three-day state absorbs the collision, and on the nights both draw the z's drift
	 * across the canopy, which is what z's do. That is a choice about which state pays,
	 * not something a build-time check can decide - so it is written here rather than
	 * enforced, and ANCHORS.COMPANION_SLEEP_ZZZ says the same thing from the other side.
	 */

	if (problems.length) {
		throw new Error(`the Christmas tree no longer stands up:\n  ${problems.join('\n  ')}`);
	}
}

// --- The 4 May face, and why there isn't one --------------------------------
//
// THE HERO USED TO GLARE ON 4 MAY, with two angled bars for eyes and a downturned
// arc for a mouth. Both are gone, and the deletion is worth a note because the
// shapes worked: the state was read as the hero playing a villain, and it is meant
// to be two friendly Jedi raising blades together. An expression that fights the
// scene is worse than no expression, and the sabers were always going to carry it.
//
// The one part of it that outlived the shapes is in docs/wff-findings.md: a `270 ->
// 450` arc is bowed UPWARD, ends low, which is a smile when it is an eye and a
// scowl when it is a mouth.

// --- The Halloween costumes -------------------------------------------------

/**
 * The hero's ghost sheet: a dome, a torso, and a scalloped hem.
 *
 * A DOME PLUS A RECTANGLE, NOT ONE RoundRectangle. A rounded rectangle rounds all
 * four corners with one radius pair, so a sheet built from one has a bottom edge
 * that curves back inwards - and the hem scallops would then hang off a shape that
 * is already tucking under, which reads as a bell rather than a sheet. An ellipse
 * for the head and a plain rectangle for the body gives a flat hem to hang the
 * scallops off, which is the whole point of having them.
 *
 * IT DOES NOT COVER THE HANDS OR THE FEET, and that is deliberate rather than a
 * limit. The sheet spans x12..88 inside a 106-wide limb box, so both hands (which
 * reach x1 and x102) and both feet (y117..132) stay outside it. A blob under a
 * sheet with its hands and feet sticking out is legible as a blob in a costume; a
 * perfectly covered one is just a shape.
 */
export const GHOST = {
	/** The rounded top. An ellipse, so the sheet has a head. */
	dome: G.box(12, 30, 76, 60),
	/**
	 * The straight-sided body, starting inside the dome so the two never seam.
	 *
	 * IT HAS TO REACH THE BOTTOM OF THE BLOB ON ITS OWN, and "on its own" is the part
	 * that took two goes. At 42 tall it ended at y102 against a body running to y116
	 * and showed a 14px band of red. At 50 the TORSO PLUS THE SCALLOPS reached y116 -
	 * which the check accepted, and which is not the same thing at all: the scallops
	 * are half-circles, so between each pair there is a notch, and the blob's red
	 * showed through every notch as a little red tooth along the hem.
	 *
	 * At 58 the torso alone covers the body with 2px to spare and the scallops hang
	 * BELOW it, where a gap between them shows background. The 2px is the same
	 * overshoot HERO_MOUTH_MASK needs: at exactly the body's own edge the two
	 * antialiased boundaries do not cancel and a hairline of red survives in each
	 * notch. The check below is against HERO_BOX rather than against a number, and it
	 * ignores the hem for exactly this reason.
	 */
	torso: G.box(12, 60, 76, 58),
	/** Four half-circles along the bottom edge, making the hem wavy. */
	scallops: 4,
	scallopHeight: 16,
	/**
	 * The face, DERIVED FROM THE SHEET'S OWN CENTRE LINE rather than placed.
	 *
	 * IT WAS ASYMMETRIC, BY THREE PIXELS AND BY ONE. The eyes were typed at x30 and
	 * x62 on a sheet running 12..88, which centres them on x53 against the sheet's
	 * 50; the mouth was at x41, centring on 51. Three pixels of drift on a face is
	 * not a detail - it is the difference between a ghost and a ghost that has been
	 * hit. Nobody could have seen it in the numbers, and everybody sees it on the
	 * wrist.
	 *
	 * So the offsets below are FROM THE CENTRE, and the boxes come out of a mirror.
	 */
	eyeGap: 16,
	eye: { width: 14, height: 18, y: 56 },
	mouth: { width: 20, height: 22, y: 80 }
};

/** The sheet's own centre line - the one x every feature on its face hangs off. */
const GHOST_CENTRE = GHOST.dome.x + GHOST.dome.width / 2;

/** The two eyes, mirrored about the sheet's centre. */
export const GHOST_EYES: G.Box[] = [-1, 1].map((side) =>
	G.box(
		GHOST_CENTRE + side * GHOST.eyeGap - GHOST.eye.width / 2,
		GHOST.eye.y,
		GHOST.eye.width,
		GHOST.eye.height
	)
);

/** The mouth, on that same centre line. */
export const GHOST_MOUTH: G.Box = G.box(
	GHOST_CENTRE - GHOST.mouth.width / 2,
	GHOST.mouth.y,
	GHOST.mouth.width,
	GHOST.mouth.height
);

/** The hem, derived: `scallops` half-circles spread along the torso's bottom edge. */
export const GHOST_SCALLOPS: G.Box[] = Array.from({ length: GHOST.scallops }, (_, i) => {
	const width = GHOST.torso.width / GHOST.scallops;
	return G.box(
		GHOST.torso.x + i * width,
		GHOST.torso.y + GHOST.torso.height - GHOST.scallopHeight / 2,
		width,
		GHOST.scallopHeight
	);
});

/**
 * The companion's pumpkin costume.
 *
 * THE CARVED FACE IS DIAMONDS, NOT TRIANGLES, and that is a primitive limit met
 * head on rather than worked around. WFF offers Ellipse, Line, Rectangle,
 * RoundRectangle and Arc - no polygon, no path - so a triangle can only come from
 * clipping a rotated shape, and a Part's clip box rotates WITH the part (it is one
 * transform), so there is no way to hold a square still and cut it in half. A
 * rotated square is one PartDraw and reads as carved; a stack of shapes
 * approximating a triangle reads as a mistake.
 *
 * `angle`/`pivotX`/`pivotY` on a PartDraw is the same mechanism leafPart() uses to
 * fan the leaf tuft, which is the only other rotation on this face.
 */
export const PUMPKIN = {
	/** The gourd, over the companion's whole body. */
	body: G.box(6, 18, 48, 46),
	/** Two vertical ribs, as the left and right halves of one ellipse. */
	rib: { centerX: 30, centerY: 41, width: 26, height: 44, thickness: 1.6 },
	stalk: { ...G.box(27, 11, 6, 9), radius: 1.5 },
	/**
	 * The carved face, MIRRORED ABOUT THE GOURD rather than placed - the same fix the
	 * ghost's needed and the same reason. The eyes were at x14 and x30 on a body
	 * running 6..54, which centres them on 27 against the gourd's 30, so the whole
	 * face sat three pixels to the left of the nose and grin that were correctly
	 * centred. A jack-o'-lantern with its eyes off to one side reads as a mistake and
	 * not as a carving.
	 *
	 * A carved diamond is a square in a box big enough to hold it turned 45 degrees.
	 */
	eyeSquare: 5,
	eyeGap: 8,
	eyeBox: 10,
	noseSquare: 3.2,
	noseBox: 8,
	noseY: 38,
	eyeY: 30,
	/** The grin, as an arc through the bottom of an ellipse. */
	grin: { centerX: 30, centerY: 42, width: 24, height: 18, from: 118, to: 242, thickness: 3 },
	/** Two teeth, painted back OVER the grin in the gourd's own colour. */
	teeth: [G.box(24, 48, 3, 4), G.box(33, 48, 3, 4)]
};

/** The gourd's own centre line, which every carved feature is mirrored about. */
const PUMPKIN_CENTRE = PUMPKIN.body.x + PUMPKIN.body.width / 2;

/** The two carved eyes, mirrored. */
export const PUMPKIN_EYES: G.Box[] = [-1, 1].map((side) =>
	G.box(
		PUMPKIN_CENTRE + side * PUMPKIN.eyeGap - PUMPKIN.eyeBox / 2,
		PUMPKIN.eyeY,
		PUMPKIN.eyeBox,
		PUMPKIN.eyeBox
	)
);

/** The nose, on the centre line. */
export const PUMPKIN_NOSE: G.Box = G.box(
	PUMPKIN_CENTRE - PUMPKIN.noseBox / 2,
	PUMPKIN.noseY,
	PUMPKIN.noseBox,
	PUMPKIN.noseBox
);

/** A rotated square, centred in its own box. The box holds it at any angle. */
export const centredSquare = (box: G.Box, side: number): G.Box =>
	G.box(box.x + (box.width - side) / 2, box.y + (box.height - side) / 2, side, side);

{
	const problems: string[] = [];

	// --- the ghost -------------------------------------------------------------
	// The torso has to start INSIDE the dome. If they merely touch, the antialiased
	// edges do not cancel and a seam runs across the sheet - the same failure the
	// hero's mouth mask overshoots by 3px to avoid.
	if (GHOST.torso.y >= GHOST.dome.y + GHOST.dome.height) {
		problems.push("the ghost's torso starts below its dome - a seam would show across the sheet");
	}
	if (GHOST.torso.x !== GHOST.dome.x || GHOST.torso.width !== GHOST.dome.width) {
		problems.push("the ghost's torso and dome are different widths - the sides would step");
	}
	// The whole sheet inside the limb box, hem included.
	const hemBottom = GHOST.torso.y + GHOST.torso.height + GHOST.scallopHeight / 2;
	if (hemBottom > G.HERO_LIMB_BOX.height || GHOST.dome.y < 0) {
		problems.push(`the ghost spans y${GHOST.dome.y}..${hemBottom}, outside its limb box`);
	}
	/**
	 * THE SHEET REACHES PAST THE BLOB IT COVERS, on all three sides that matter.
	 *
	 * A costume that stops short of the body leaves a band of the blob's own colour
	 * showing through - which is what a 42-tall torso did, and it read as the sheet
	 * having ridden up rather than as a hem. Checked against HERO_BOX so growing the
	 * hero cannot quietly undress the ghost.
	 */
	const under = G.HERO_BOX;
	// THE TORSO'S OWN BOTTOM, not the hem's. A scalloped hem is half-circles with
	// notches between them; counting it as coverage lets the blob show through every
	// notch, which is what shipped and which reads as red teeth along the edge.
	const covered = GHOST.torso.y + GHOST.torso.height;
	if (
		GHOST.dome.x > under.x ||
		GHOST.dome.x + GHOST.dome.width < under.x + under.width ||
		GHOST.dome.y > under.y ||
		covered < under.y + under.height + 2
	) {
		problems.push(
			`the ghost sheet's solid part spans (${GHOST.dome.x},${GHOST.dome.y})..` +
				`(${GHOST.dome.x + GHOST.dome.width},${covered}) and the body it covers spans ` +
				`(${under.x},${under.y})..(${under.x + under.width},${under.y + under.height}) - the blob ` +
				'would show through the notches between the scallops'
		);
	}
	// Its face has to be ON the sheet, or the eyes float beside it.
	for (const [label, hole] of [
		['left eye', GHOST_EYES[0]],
		['right eye', GHOST_EYES[1]],
		['mouth', GHOST_MOUTH]
	] as const) {
		if (
			hole.x < GHOST.dome.x ||
			hole.x + hole.width > GHOST.dome.x + GHOST.dome.width ||
			hole.y < GHOST.dome.y ||
			hole.y + hole.height > GHOST.torso.y + GHOST.torso.height
		) {
			problems.push(`the ghost's ${label} is not on the sheet`);
		}
	}
	// The scallops have to reach across the whole hem, or it is a fringe on one side.
	const hemSpan = GHOST_SCALLOPS.reduce((total, s) => total + s.width, 0);
	if (Math.abs(hemSpan - GHOST.torso.width) > 0.01) {
		problems.push(`the ghost's hem covers ${hemSpan} of a ${GHOST.torso.width}-wide sheet`);
	}
	// --- the pumpkin -----------------------------------------------------------
	// The gourd has to cover the body it is a costume for.
	const body = G.COMPANION_BOX;
	if (
		PUMPKIN.body.x > body.x ||
		PUMPKIN.body.y > body.y ||
		PUMPKIN.body.x + PUMPKIN.body.width < body.x + body.width ||
		PUMPKIN.body.y + PUMPKIN.body.height < body.y + body.height
	) {
		problems.push(
			"the pumpkin does not cover the companion's body - the blob would show around its edges"
		);
	}
	// A diamond is a square turned 45 degrees, so its box has to be at least
	// side * sqrt(2) or the points are cut off - and a cut-off diamond is a hexagon.
	for (const [label, boxes, side] of [
		['eye', PUMPKIN_EYES, PUMPKIN.eyeSquare],
		['nose', [PUMPKIN_NOSE], PUMPKIN.noseSquare]
	] as const) {
		for (const box of boxes) {
			const needed = side * Math.SQRT2;
			if (box.width < needed - 0.001 || box.height < needed - 0.001) {
				problems.push(
					`a pumpkin ${label}'s ${box.width}x${box.height} box cannot hold a ${side} square ` +
						`turned 45 degrees - it needs ${needed.toFixed(2)}, and the points would be cut flat`
				);
			}
		}
	}
	// Everything carved has to be on the gourd.
	for (const [label, box] of [
		['left eye', PUMPKIN_EYES[0]],
		['right eye', PUMPKIN_EYES[1]],
		['nose', PUMPKIN_NOSE],
		['stalk', PUMPKIN.stalk],
		...PUMPKIN.teeth.map((t, i) => [`tooth ${i + 1}`, t] as const)
	] as const) {
		const insideX =
			box.x >= PUMPKIN.body.x && box.x + box.width <= PUMPKIN.body.x + PUMPKIN.body.width;
		// The stalk is the one thing that belongs ABOVE the gourd rather than on it.
		const okY =
			label === 'stalk'
				? box.y + box.height >= PUMPKIN.body.y && box.y < PUMPKIN.body.y
				: box.y >= PUMPKIN.body.y && box.y + box.height <= PUMPKIN.body.y + PUMPKIN.body.height;
		if (!insideX || !okY) {
			problems.push(`the pumpkin's ${label} is not where it should be relative to the gourd`);
		}
	}
	// The teeth have to sit ON the grin, or they are two orange specks in a mouth.
	const grinBottom = PUMPKIN.grin.centerY + PUMPKIN.grin.height / 2;
	for (const [i, tooth] of PUMPKIN.teeth.entries()) {
		if (tooth.y > grinBottom || tooth.y + tooth.height < PUMPKIN.grin.centerY) {
			problems.push(`the pumpkin's tooth ${i + 1} does not touch the grin`);
		}
	}
	// The costume must not outgrow the limb box it is drawn in.
	if (
		PUMPKIN.stalk.y < 0 ||
		PUMPKIN.body.x + PUMPKIN.body.width > G.COMPANION_LIMB_BOX.width ||
		PUMPKIN.body.y + PUMPKIN.body.height > G.COMPANION_LIMB_BOX.height
	) {
		problems.push('the pumpkin reaches outside the companion limb box');
	}

	if (problems.length) {
		throw new Error(`a Halloween costume no longer holds together:\n  ${problems.join('\n  ')}`);
	}
}
