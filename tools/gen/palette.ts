/**
 * Every colour the face uses, and the rules that derive one colour from another.
 *
 * WHY THIS FILE IS THE POINT OF THE MIGRATION. WFF has no variables, so the
 * seven-colour weekday table was written out ELEVEN times in the hand-authored
 * XML - hero body, hero round mouth, hero open mouth, hero mouth mask, the
 * companion's four equivalents, and the date row's chip, weekday and day. The
 * masks are the dangerous ones: an open mouth is a dark ellipse whose top half
 * is repainted in the body colour, so a body/mask mismatch shows up as a dark
 * bar across a face on exactly one weekday. Here the body and its mask are the
 * same value, so that mismatch is not expressible.
 *
 * The seven body colours are the ONLY chosen values. Everything else - 21 more
 * hexes - is computed, and the computation was verified against the committed
 * file: all 21 reproduce byte-for-byte.
 */

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type Hex = string;

/** Draw order and Compare order. Monday is the Default, so it is listed first. */
export const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/**
 * [DAY_OF_WEEK] IS 1 = SUNDAY, the Java/ICU convention, NOT ISO 8601.
 *
 * MEASURED on the watch with a throwaway PartText that read 5 on a Thursday.
 * Assuming ISO would put every colour one day out, which looks exactly like a
 * correct implementation six days a week. This mapping now exists once; in the
 * XML it was implicit across 54 separate `[DAY_OF_WEEK] == N` comparisons.
 */
export const DAY_OF_WEEK: Record<Weekday, number> = {
	sun: 1,
	mon: 2,
	tue: 3,
	wed: 4,
	thu: 5,
	fri: 6,
	sat: 7
};

/**
 * The hero blob's body colour, per weekday. THE SEVEN CHOSEN VALUES.
 *
 * Monday is the brand red. Thursday's blue and Sunday's purple were lightened
 * from their first values to open up contrast against the dark eyes and mouth.
 */
export const HERO: Record<Weekday, Hex> = {
	mon: '#ee4e43',
	tue: '#f5c92e',
	wed: '#a5d63a',
	thu: '#6b9df2',
	fri: '#f0862f',
	sat: '#8fa3bc',
	sun: '#b07ce4'
};

/**
 * The companion wears TOMORROW's hero colour, so the pair never share a hue and
 * the small blob previews the next day. The cycle closes: Sunday -> Monday.
 */
export const TOMORROW: Record<Weekday, Weekday> = {
	mon: 'tue',
	tue: 'wed',
	wed: 'thu',
	thu: 'fri',
	fri: 'sat',
	sat: 'sun',
	sun: 'mon'
};

export const COMPANION = (d: Weekday): Hex => HERO[TOMORROW[d]];

// --- HSL, the derivation machinery -----------------------------------------

type Hsl = {
	h: number;
	s: number;
	l: number;
};

export function toHsl(hex: Hex): Hsl {
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;
	const mx = Math.max(r, g, b);
	const mn = Math.min(r, g, b);
	const l = (mx + mn) / 2;
	if (mx === mn) {
		return { h: 0, s: 0, l };
	}
	const d = mx - mn;
	const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
	const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
	return { h: h / 6, s, l };
}

const hueToRgb = (p: number, q: number, tIn: number): number => {
	let t = tIn;
	if (t < 0) {
		t += 1;
	}
	if (t > 1) {
		t -= 1;
	}
	if (t < 1 / 6) {
		return p + (q - p) * 6 * t;
	}
	if (t < 1 / 2) {
		return q;
	}
	if (t < 2 / 3) {
		return p + (q - p) * (2 / 3 - t) * 6;
	}
	return p;
};

export function fromHsl(h: number, s: number, l: number): Hex {
	let r: number, g: number, b: number;
	if (s === 0) {
		r = g = b = l;
	} else {
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hueToRgb(p, q, h + 1 / 3);
		g = hueToRgb(p, q, h);
		b = hueToRgb(p, q, h - 1 / 3);
	}
	const toHex = (channel: number) =>
		Math.round(channel * 255)
			.toString(16)
			.padStart(2, '0');
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * A blob's mouth is its own body hue at S x0.55 / L x0.41.
 *
 * The ratios were MEASURED off the original #ee4e43 / #5a2a22 pair, so red is
 * unchanged to a rounding step and the other six inherit the relationship.
 */
export const mouth = (body: Hex): Hex => {
	const { h, s, l } = toHsl(body);
	return fromHsl(h, s * 0.55, l * 0.41);
};

/**
 * The date row takes the day's HUE AND ONLY ITS HUE.
 *
 * It briefly carried the full-saturation body colour - a filled swatch of chip
 * with near-black digits - and that was far too loud for a 26px row sitting
 * under a 100px clock. These two S/L pairs are lifted straight off the retired
 * fixed colours (slate #3a4757 and ice blue #b9c6d4), so only the hue moves.
 */
export const dateChip = (body: Hex): Hex => fromHsl(toHsl(body).h, 0.2, 0.28);
export const dateText = (body: Hex): Hex => fromHsl(toHsl(body).h, 0.22, 0.78);

// --- Fixed colours ----------------------------------------------------------

/**
 * Named from where they are actually used, not from the XML header's palette
 * table - that table had already drifted (it still listed the limb colour as
 * the retired navy #8fa9c6). Generating the documentation from these values is
 * what stops that happening again.
 */
export const C = {
	/** Scene background. OLED black, same in both modes. */
	BG: '#ff000000',
	BLACK: '#000000',
	WHITE: '#ffffff',

	/** Primary text: time, stat numbers, temperature. */
	CREAM: '#fff6e8',
	/** Date in ambient, and the big Zzz. */
	ICE: '#b9c6d4',

	/** Arms, legs and the steps icon. Light, because limbs sit OUTSIDE the
	 *  bodies against the black background. */
	LIMB: '#e9dccb',
	/** The dark line on limbs, and the eyes. On-body, so it stays dark. */
	INK: '#23384f',

	/** Accent: heart icon and low battery only. The temperature used to be coral
	 *  too; it is a reading, not a warning, so it is cream now. */
	CORAL: '#e8543c',
	/** Battery fill, leaves, the step-goal flag. */
	GREEN: '#5fb874',
	LEAF_DARK: '#4fa968',
	LEAF_LIGHT: '#86ce97',
	/** Steps, cocktail, umbrella canopy. Brightened from #2e7c8a, which read as
	 *  mud against black. */
	TEAL: '#4fb3c4',
	TEAL_DARK: '#2e7c8a',

	SCARF: '#3f78c4',
	SCARF_DARK: '#2f5d9e',
	/** Sunglasses: dark lens, lighter frame. */
	SHADES: '#1b2733',
	SHADES_FRAME: '#5c7288',

	/** Headset: dark cup/band, lighter cushion rim - the same dark-tech pairing
	 *  as the sunglasses, kept as its own pair rather than reused so a retheme
	 *  of one accessory cannot silently retheme the other. */
	HEADSET: '#2b3a4a',
	HEADSET_LIGHT: '#6c8298',
	/** The mic's tiny "live call" glow. */
	MIC_LED: '#4fb3c4',

	/** The Wednesday coffee cup's liquid. The cup itself is WHITE - see C.WHITE
	 *  above - so this is the one colour that has to read as "coffee" on its
	 *  own; darkened from the first pass, which read as tea. */
	COFFEE: '#4a2f1e',
	/**
	 * Its steam. THE ONLY TRANSLUCENT COLOUR ON THE FACE, and the one place
	 * 8-digit #AARRGGBB is load-bearing rather than incidental: alpha 0x99 is
	 * ~60%, so the wisps read as vapour rather than as two solid cream wires.
	 * (C.BG is also 8-digit, but its alpha is ff and carries no meaning.)
	 *
	 * Android's convention is #AARRGGBB, NOT #RRGGBBAA - getting that backwards
	 * yields a fully opaque colour of the wrong hue, which looks like a palette
	 * mistake rather than an alpha mistake.
	 */
	STEAM: '#99fff6e8',

	/** The Friday game controller's face buttons deliberately reuse existing
	 *  hexes rather than restate them - Xbox's own ABXY colours happen to
	 *  already exist here: A is GREEN, B is CORAL, X is SCARF, Y is SUN. The
	 *  body is WHITE and the sticks/d-pad/outlines are all INK - neither needs
	 *  a colour of its own either. */

	SWEAT: '#9fd4e8',
	RAINDROP: '#7fb6d9',
	SNOWFLAKE: '#bfe4f2',
	BOLT: '#ffd34d',
	BURST: '#ffe24d',

	SUN: '#ffc93c',
	MOON: '#e8eef5',
	MOON_DISC: '#e8e6dc',
	/** The disc's terminator edge and its two craters - all three steps darker
	 *  than MOON_DISC, in the same warm-grey family, so the shading reads as
	 *  one rock rather than a lit circle with grey dots stuck on it. */
	MOON_SHADE: '#cdc7b4',
	MOON_CRATER: '#b3ad9a',
	CLOUD: '#cbd5df',

	/** Flag pole, cocktail glass, umbrella shaft. */
	BONE: '#e8e0d4',

	/**
	 * The German tricolour, flown from the step-goal pole on 3 October.
	 *
	 * FLAG_BLACK IS NOT #000000, AND THAT IS THE WHOLE POINT. The scene background
	 * is OLED black, so a true black band would not be a dark band on this face -
	 * it would be a 20x4 hole in the flag, and the tricolour would read as two
	 * stripes floating above a pole. #2f2f33 is far enough off the background to
	 * hold an edge and dark enough to read as black beside a saturated red, which
	 * is the only context it ever appears in.
	 *
	 * The other two are the real flag: RAL-ish #dd0000 and #ffce00, unmodified,
	 * because they have no such problem.
	 */
	FLAG_BLACK: '#2f2f33',
	FLAG_RED: '#dd0000',
	FLAG_GOLD: '#ffce00',

	/**
	 * The 1 May tools: the hero's hammer and the companion's sickle.
	 *
	 * COOLER THAN BONE, deliberately. C.BONE is the flag pole, the cocktail glass
	 * and the umbrella shaft - a warm off-white that reads as "pale object". A tool
	 * has to read as METAL, and against this palette the only thing that
	 * distinguishes metal from bone at 20px is the temperature of the grey.
	 *
	 * STEEL_DARK is the hammer's striking face and nothing else: one band of it at
	 * the head's end is what stops a plain rectangle reading as a brick.
	 */
	STEEL: '#b8c2cc',
	STEEL_DARK: '#7d8894',
	/** The hammer's handle, the sickle's, and the Christmas tree's trunk. */
	WOOD: '#96633a',

	/**
	 * The Santa hats, 24 to 26 December.
	 *
	 * DEEPER THAN THE MONDAY HERO, which is #ee4e43 - a red hat on a red blob is
	 * the one collision this costume can have, and it is a one-in-seven chance
	 * rather than an unlucky one. It survives mainly because the geometry keeps the
	 * cone ABOVE the crown and puts the white brim between the two; the deeper red
	 * is the second line of defence, not the first.
	 */
	SANTA: '#c62828',

	/**
	 * The tree. DARKER AND BLUER THAN THE BLOBS' OWN LEAVES (#5fb874 / #4fa968),
	 * which is what stops a conifer three inches from the companion reading as more
	 * of its hair. The trunk is C.WOOD, shared with the 1 May tools rather than
	 * restated.
	 */
	TREE: '#2f7d4f',
	TREE_DARK: '#23603c',

	/**
	 * The 31 October costumes.
	 *
	 * GHOST IS NOT C.WHITE and not C.CREAM. A pure white sheet covering most of a
	 * blob is the brightest thing on an otherwise dark face and reads as a hole
	 * punched in it; and C.CREAM is the clock's colour, which would tie the costume
	 * to the type. This is a bone white with a little blue in it - a sheet in
	 * moonlight rather than a sheet of paper.
	 *
	 * PUMPKIN_CARVE is a very dark brown rather than C.INK, the navy the blobs' own
	 * eyes use. Navy holes in an orange gourd read as painted-on; the carved parts
	 * of a jack-o'-lantern are the inside of the shell, so they take its hue.
	 */
	GHOST: '#eef1f5',
	GHOST_SHADE: '#c8d2dc',
	PUMPKIN: '#ef7d18',
	PUMPKIN_DARK: '#c25c0b',
	PUMPKIN_CARVE: '#3a1d05',
	/** The pumpkin's stalk. Greyer than the tree, which is a living conifer. */
	STALK: '#5d7a3c',

	/**
	 * 19 December: the party hats and the cupcake.
	 *
	 * PARTY is the one hue this palette did not already have. Every other
	 * celebration colour is either a real-world constraint (the tricolour, Santa
	 * red) or borrowed from what was here; a party hat is neither, and magenta is
	 * the only region of the wheel far enough from all seven weekday body colours
	 * that the hat cannot collide with the blob wearing it on any day of the week.
	 *
	 * The cupcake's case is C.SCARF and its pleats C.SCARF_DARK, reused rather than
	 * restated - the scarf's blue is already this face's "small folded fabric".
	 */
	PARTY: '#c860d0',
	/**
	 * The party hats' stripes and pompoms. GOLD ON MAGENTA is the widest gap on the
	 * wheel this palette can produce, which is what a 3px band needs to survive being
	 * drawn on a shape 34px across - anything closer in hue reads as a smudge in the
	 * magenta rather than as a stripe. Shared with C.FLAG_GOLD's neighbourhood
	 * deliberately: there is no third yellow here worth having.
	 */
	PARTY_STRIPE: '#ffd24a',
	FROSTING: '#f6b9cb',
	FROSTING_DARK: '#e295ac',

	/**
	 * 4 May: the lightsaber's blade.
	 *
	 * THE BLADE IS TWO STROKES, NOT ONE, and this is only the outer of them. A
	 * lightsaber does not read as a coloured stick - it reads as a WHITE-HOT CORE
	 * inside a coloured glow, which is why C.WHITE runs down the middle of this on a
	 * thinner stroke. One stroke of this blue alone looks like a drinking straw.
	 *
	 * Brighter and cooler than C.SCARF (#3f78c4), which is the same family and would
	 * otherwise be the obvious reuse: a scarf is fabric in shadow and this is meant
	 * to be emitting light, and at this size brightness is the only cue for that.
	 */
	SABER: '#4aa8ff',
	/**
	 * The companion's blade, 4 May. GREEN because a duel needs two colours and green
	 * is the other one this fiction has; also because the companion is the small blob
	 * and a second blue would read as the hero's saber duplicated rather than as a
	 * second character. Matched to SABER for brightness, not for hue: both have to
	 * look like they are emitting rather than reflecting.
	 */
	SABER_GREEN: '#5ce87a',

	/**
	 * The hilt, 4 May, AND THE FIRST VERSION OF IT WAS WRONG. It was C.STEEL - the
	 * hammer's grey, #b8c2cc - which is a PALE grey, and a pale grey object beside a
	 * white-hot blade reads as plastic: the blade is the brightest thing on the face,
	 * so anything next to it has to be dark to read as solid at all. The hammer gets
	 * away with the same grey because nothing beside it is lit.
	 *
	 * THREE TONES AND NOT ONE, which is the other half of "metallic". A single flat
	 * fill has no highlight and no shadow, and at 13px that is the whole difference
	 * between a machined object and a drawn one: HILT is the body, HILT_DARK the grip
	 * rings cut into it, and EMITTER the brighter shroud at the top where the blade
	 * comes out - the one place a real hilt catches its own light.
	 */
	HILT: '#4a515a',
	HILT_DARK: '#282d34',
	EMITTER: '#9aa3ae',
	COCKTAIL: '#ffab4a',
	/** Weather unavailable, and the heart-rate placeholder dash. */
	WX_NONE: '#d9a695',
	HR_PLACEHOLDER: '#c3b1a4',

	ZZZ_MID: '#a8b8c8',
	ZZZ_SMALL: '#93a3b4',

	/** The sleeping companion's ribcage. */
	SKELETON_DARK: '#14181d',
	SKELETON_LIGHT: '#f4f1ea'
} as const;

/**
 * The 21 derived colours exactly as they shipped, frozen as a test fixture.
 *
 * These were read out of the hand-authored watchface.xml before the migration
 * and confirmed to reproduce from the seven body hexes above, 21 for 21, with
 * no fudge factor. They are duplicated here ON PURPOSE and the duplication is
 * the point: it is what lets verifyDerivation() below fail loudly if a ratio is
 * ever nudged, instead of every mouth on the face quietly shifting a shade.
 *
 * A tool may restate a fact about the face only if something asserts the
 * restatement on every build. This is that restatement; verifyDerivation is
 * that assertion.
 *
 * If a colour here is ever changed deliberately, change the RATIO, not this
 * table - the table is what the ratio is checked against.
 */
export const SHIPPED = {
	mouth: {
		mon: '#5b2622',
		tue: '#594c1e',
		wed: '#3f4c24',
		thu: '#273f69',
		fri: '#57381f',
		sat: '#3a434d',
		sun: '#482e62'
	},
	chip: {
		mon: '#563b39',
		tue: '#564f39',
		wed: '#4d5639',
		thu: '#394456',
		fri: '#564639',
		sat: '#394656',
		sun: '#473956'
	},
	text: {
		mon: '#d3bcbb',
		tue: '#d3cebb',
		wed: '#cbd3bb',
		thu: '#bbc4d3',
		fri: '#d3c6bb',
		sat: '#bbc6d3',
		sun: '#c7bbd3'
	}
} as const satisfies Record<string, Record<Weekday, Hex>>;

/**
 * Self-check, run by the generator on every build.
 *
 * Turns "the mouths look slightly off" - which nobody would notice until it was
 * on a wrist on the wrong weekday - into a named failure naming the day.
 */
export function verifyDerivation(): string[] {
	const problems: string[] = [];
	for (const day of WEEKDAYS) {
		const body = HERO[day];
		const checks: Array<[string, Hex, Hex]> = [
			[`mouth ${day}`, mouth(body), SHIPPED.mouth[day]],
			[`date chip ${day}`, dateChip(body), SHIPPED.chip[day]],
			[`date text ${day}`, dateText(body), SHIPPED.text[day]]
		];
		for (const [label, got, want] of checks) {
			if (got !== want) {
				problems.push(`${label}: ratio now derives ${got}, but ${want} shipped`);
			}
		}
	}
	return problems;
}
