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
export interface Box {
  x: number
  y: number
  width: number
  height: number
}

export const box = (x: number, y: number, width: number, height: number): Box =>
  ({ x, y, width, height })

/** Local origin, sized to its parent. Used by primitives drawn inside a Part. */
export const at = (width: number, height: number): Box => ({ x: 0, y: 0, width, height })

// --- The canvas -------------------------------------------------------------

export const CANVAS = box(0, 0, 450, 450)
export const CANVAS_W = 450
export const CANVAS_H = 450

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
export const DATE_WEEKDAY_BOX = box(120, 42, 100, 32)
export const DATE_CHIP_BOX = box(229, 41, 44, 34)
export const DATE_DAY_BOX = box(229, 42, 44, 32)
/** The chip's rounded rectangle, drawn at the chip box's own origin. */
export const DATE_CHIP_SHAPE = at(44, 34)
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
export const DATE_CHIP_OUTLINE_SHAPE = box(1, 1, 42, 32)

// --- Hero blob --------------------------------------------------------------

/** The hero's body box. 31 sites in the hand-authored file. */
export const HERO_BOX = box(14, 36, 72, 80)
/** Its body shape, at local origin. */
export const HERO_BODY_SHAPE = at(72, 80)
export const HERO_BODY_RADIUS = { cornerRadiusX: 36, cornerRadiusY: 34 }

/** Limbs, accessories and anything that reaches outside the body. */
export const HERO_LIMB_BOX = box(0, 0, 106, 132)

export const HERO_MOUTH_ROUND = box(30, 42, 11, 11)
export const HERO_MOUTH_OPEN = box(24, 38, 22, 20)
/**
 * The mask that repaints the open mouth's top half in the body colour.
 *
 * IT STARTS 3px ABOVE THE ELLIPSE (y 35 vs 38), and that is a fix rather than
 * slack: at the same y the antialiased top edges did not cancel and a 1px
 * sliver read convincingly as a little nose. Any mask built this way must
 * overshoot.
 */
export const HERO_MOUTH_MASK = box(22, 35, 26, 13)

export const HERO_SWEAT_BOX = box(38, 40, 26, 11)

// --- Companion blob ---------------------------------------------------------

/** The companion's body box. 30 sites in the hand-authored file. */
export const MINI_BOX = box(8, 20, 44, 42)
export const MINI_BODY_SHAPE = at(44, 42)
export const MINI_BODY_RADIUS = { cornerRadiusX: 22, cornerRadiusY: 20 }

export const MINI_LIMB_BOX = box(0, 0, 62, 72)

export const MINI_MOUTH_ROUND = box(18.5, 26, 7, 7)
export const MINI_MOUTH_OPEN = box(16, 24, 12, 11)
export const MINI_MOUTH_MASK = box(15, 21, 14, 8)

export const MINI_SWEAT_BOX = box(21, 25, 18, 8)

// --- Chips and icons --------------------------------------------------------

export const WX_ICON_BOX = box(0, 3, 26, 26)
export const BATTERY_BOX = box(0, 10, 26, 16)
export const LEAF_BOX = box(10, 0, 80, 80)

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
export const GYRO_HERO = { x: 0.229, y: 0.143 } as const
export const GYRO_COMPANION = { x: 0.157, y: 0.1 } as const

/** Wrist tilt is clamped before it is scaled, so a sharp turn cannot fling a
 *  blob off the canvas. */
export const GYRO_CLAMP = 35
