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

import * as G from '../geometry.ts'
import { HERO_ARMS } from './blobs.ts'

/**
 * Round to one decimal place.
 *
 * Every authored coordinate in this section is at most 1dp, and the fractions
 * multiply out to things like 5.712. Rounding at the point of derivation is what
 * makes byte-identity with the hand-written values achievable at all - and it is
 * also the resolution the design was traced at, so it is not merely cosmetic.
 */
const r1 = (n: number): number => Math.round(n * 10) / 10

/** A stroked segment. */
export interface Seg {
  startX: number
  startY: number
  endX: number
  endY: number
}

const seg = (startX: number, startY: number, endX: number, endY: number): Seg =>
  ({ startX, startY, endX, endY })

// --- The hand ---------------------------------------------------------------

/**
 * Where the hero's raised fist is, in THIS group's coordinates.
 *
 * Derived, not typed: the hero anchor, plus the centre of `leftUp`'s cream cap,
 * minus the props anchor. HERO_ARMS.leftUp carries a note pointing back here so
 * the dependency is visible from both ends.
 */
export const HAND = (() => {
  const cap = HERO_ARMS.leftUp.cream
  return {
    x: G.ANCHORS.HERO.x + cap.x + cap.width / 2 - G.ANCHORS.HERO_PROPS.x,
    y: G.ANCHORS.HERO.y + cap.y + cap.height / 2 - G.ANCHORS.HERO_PROPS.y,
  }
})()

/**
 * The value the props were authored against.
 *
 * Restated here because something asserts the restatement on every build - the
 * rule palette.ts's SHIPPED table set. If the hero moves, this fires and the
 * message says which of the three inputs changed under it.
 */
const HAND_SHIPPED = { x: 18.5, y: 35 }

if (HAND.x !== HAND_SHIPPED.x || HAND.y !== HAND_SHIPPED.y) {
  throw new Error(
    `the hero's fist is now at prop-local (${HAND.x},${HAND.y}), not ` +
      `(${HAND_SHIPPED.x},${HAND_SHIPPED.y}) - ANCHORS.HERO, ANCHORS.HERO_PROPS or ` +
      'HERO_ARMS.leftUp.cream moved, and every prop in this file is placed against it',
  )
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
export interface Cup {
  x: number
  width: number
  /** The rim ellipse's box top. */
  top: number
  topH: number
  /** The straight-sided body, from the rim's centre down. */
  bodyH: number
  baseH: number
  /** How far the coffee is inset inside the rim. */
  inset: { x: number; y: number }
}

export const CUP: Cup = {
  x: 4,
  width: 13,
  top: 8.5,
  topH: 5,
  bodyH: 9.75,
  baseH: 4.5,
  inset: { x: 1.75, y: 1 },
}

/** The rim's vertical centre, which is where the straight sides begin. */
const CUP_SHOULDER = CUP.top + CUP.topH / 2
/** The bottom of the base ellipse - the point that sits on the hand. */
const CUP_BASE_BOTTOM = CUP_SHOULDER + CUP.bodyH + CUP.baseH / 2
const CUP_CENTRE_X = CUP.x + CUP.width / 2
/** The right-hand wall. The handle is positioned off this. */
const CUP_WALL_X = CUP.x + CUP.width

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
    CUP.topH - 2 * CUP.inset.y,
  ),
}

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
export const HANDLE = { r: 3.5, thickness: 2, gap: 60, centerY: 16 }

const HALF_GAP_RAD = ((HANDLE.gap / 2) * Math.PI) / 180

export const HANDLE_ARC = {
  centerX: Math.round(CUP_WALL_X + HANDLE.r * Math.cos(HALF_GAP_RAD) + HANDLE.thickness / 2),
  centerY: HANDLE.centerY,
  width: 2 * HANDLE.r,
  height: 2 * HANDLE.r,
  startAngle: 270 + HANDLE.gap / 2,
  endAngle: 270 + HANDLE.gap / 2 + (360 - HANDLE.gap),
}

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
export interface Wisp {
  /** The centreline. */
  x: number
  /** Rise per segment. The middle wisp's is larger, so it tops out higher. */
  dy: number
  sway: 1 | -1
}

export const STEAM = {
  /** Where the wisps start, just above the rim. */
  y0: 8,
  /** How far each bend leaves the centreline. */
  sway: 1,
  segments: 3,
  thickness: 1.4,
  wisps: [
    { x: 6, dy: 2.3, sway: -1 },
    { x: 10.5, dy: 2.5, sway: 1 },
    { x: 15, dy: 2.3, sway: 1 },
  ] as Wisp[],
}

/** A wisp's four points, bending sway / -sway / back to the centreline. */
const wispPoints = (w: Wisp): { x: number; y: number }[] =>
  [0, 1, 2, 3].map((i) => ({
    x: r1(w.x + (i === 1 ? w.sway : i === 2 ? -w.sway : 0) * STEAM.sway),
    y: r1(STEAM.y0 - i * w.dy),
  }))

export const STEAM_SEGMENTS: Seg[] = STEAM.wisps.flatMap((w) => {
  const p = wispPoints(w)
  return [0, 1, 2].map((i) => seg(p[i]!.x, p[i]!.y, p[i + 1]!.x, p[i + 1]!.y))
})

/**
 * The cup's part box.
 *
 * BOTH ORIGIN COORDINATES ARE THE HAND. The body is centred on the fist's x and
 * the base's bottom edge sits exactly on its y - which is what the comment said,
 * expressed as `x: 8, y: 12`. The size stays tabulated; it is generous rather
 * than tight, and the three assertions after it are what keep it honest, since
 * anything that outgrows this box is silently clipped.
 */
export const CUP_BOX = G.box(HAND.x - CUP_CENTRE_X, HAND.y - CUP_BASE_BOTTOM, 28, 24)

{
  const handleRight = HANDLE_ARC.centerX + HANDLE.r + HANDLE.thickness / 2
  const steamTop = Math.min(...STEAM_SEGMENTS.map((s) => Math.min(s.startY, s.endY)))
  const problems: string[] = []

  // The ring must touch the wall, not cross it and not float clear of it. Half a
  // tenth of a pixel either way - tighter than the 1dp the shape is authored at.
  const leftmost = HANDLE_ARC.centerX - HANDLE.r * Math.cos(HALF_GAP_RAD) - HANDLE.thickness / 2
  if (Math.abs(leftmost - CUP_WALL_X) > 0.05) {
    problems.push(`the handle's leftmost pixel is at ${r1(leftmost)}, not on the wall at ${CUP_WALL_X}`)
  }
  if (handleRight > CUP_BOX.width) problems.push(`the handle reaches ${handleRight}, past the box's ${CUP_BOX.width}`)
  if (CUP_BASE_BOTTOM > CUP_BOX.height) problems.push(`the base reaches ${CUP_BASE_BOTTOM}, past the box's ${CUP_BOX.height}`)
  /**
   * THE TALLEST WISP'S CAP IS CLIPPED, BY 0.2px, AND THAT IS THE SHIPPED SHAPE.
   *
   * The middle wisp's centreline tops out at y0.5 inside a box that starts at 0,
   * and a 1.4-thick round cap reaches 0.7 past the endpoint - so its last 0.2px
   * arrives flat instead of round. Recorded rather than quietly fixed, the same
   * call MINI_SCARF_BOX makes about the companion's scarf tail: growing the box
   * changes what the watch has been drawing.
   *
   * What is asserted is the line itself, not the cap. A centreline outside the
   * box would lose a whole segment, which is a bug; a shaved cap is a detail.
   */
  if (steamTop < 0) {
    problems.push(`a steam centreline reaches ${r1(steamTop)}, outside the box - a whole segment would be lost`)
  } else if (steamTop - STEAM.thickness / 2 < -0.25) {
    problems.push(
      `the steam's cap now overshoots the box top by ${r1(STEAM.thickness / 2 - steamTop)}px, ` +
        'against the 0.2 that shipped - it would read as a flat-topped wisp',
    )
  }

  // The three claims the steam comment makes, as checks.
  const bands = STEAM.wisps.map((w) => [
    r1(w.x - STEAM.sway - STEAM.thickness / 2),
    r1(w.x + STEAM.sway + STEAM.thickness / 2),
  ] as const)
  for (let i = 1; i < bands.length; i++) {
    if (bands[i]![0] <= bands[i - 1]![1]) {
      problems.push(`steam wisps ${i - 1} and ${i} overlap: ${bands[i - 1]![1]} then ${bands[i]![0]}`)
    }
  }
  const outer = STEAM.wisps.filter((_, i) => i !== 1)
  if ((outer[0]!.x + outer[1]!.x) / 2 !== CUP_CENTRE_X) {
    problems.push(`the outer wisps mirror about ${(outer[0]!.x + outer[1]!.x) / 2}, not the cup's ${CUP_CENTRE_X}`)
  }
  if (STEAM.wisps[1]!.dy <= STEAM.wisps[0]!.dy) {
    problems.push('the middle wisp no longer rises higher than the outer two - the group reads as a fence')
  }

  if (problems.length) throw new Error(`the coffee cup no longer holds together:\n  ${problems.join('\n  ')}`)
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
const SILHOUETTE = { left: 0.5, width: 28 }
const SILHOUETTE_CENTRE = SILHOUETTE.left + SILHOUETTE.width / 2

/** A position traced off the photograph, as a fraction of the silhouette's width. */
export interface Traced {
  frac: number
  /**
   * A measured departure from the traced position, in px. Present only where the
   * fraction does not reproduce the shipped shape, and always with a reason.
   */
  off?: number
}

/** Across the silhouette, from its left edge. */
const across = (t: Traced): number => r1(SILHOUETTE.left + t.frac * SILHOUETTE.width + (t.off ?? 0))
/** Down from the silhouette's top. Fractions are of the WIDTH in both axes -
 *  that is how the trace was taken, and it is why nothing here divides by 20. */
const down = (t: Traced): number => r1(t.frac * SILHOUETTE.width + (t.off ?? 0))

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
const STICK_D = r1(0.164 * SILHOUETTE.width)

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
  diamond: { x: { frac: 0.822, off: -1.5 }, y: { frac: 0.204 }, spacing: 2.6, d: 3.2 },
}

/** A circle placed by its centre. */
const dot = (cx: number, cy: number, d: number): G.Box =>
  G.box(r1(cx - d / 2), r1(cy - d / 2), d, d)

/** The grips' bottom edge, which is also the part box's height. */
const GRIP_BOTTOM = Math.round(down(CONTROLLER.grip.bottom))

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
  GRIP_BOTTOM,
)

const DPAD_C = { x: across(CONTROLLER.dpad.x), y: down(CONTROLLER.dpad.y) }
const DIAMOND_C = { x: across(CONTROLLER.diamond.x), y: down(CONTROLLER.diamond.y) }

export const CONTROLLER_SHAPES = {
  /** Drawn before the shell, so the shell covers where they join it. */
  grips: [SILHOUETTE.left, SILHOUETTE.left + SILHOUETTE.width - CONTROLLER.grip.d].map((x) =>
    G.box(x, CONTROLLER.grip.top, CONTROLLER.grip.d, GRIP_BOTTOM - CONTROLLER.grip.top),
  ),
  shell: {
    ...G.box(
      SILHOUETTE_CENTRE - CONTROLLER.shell.width / 2,
      0,
      CONTROLLER.shell.width,
      CONTROLLER.shell.height,
    ),
    cornerRadiusX: CONTROLLER.shell.radius,
    cornerRadiusY: CONTROLLER.shell.radius,
  },
  leftStick: dot(across(CONTROLLER.leftStick.x), down(CONTROLLER.leftStick.y), CONTROLLER.leftStick.d),
  /** Both bars centre on the same point, so the cross is symmetric about itself
   *  by construction. It was four independent coordinate pairs. */
  dpad: [
    G.box(r1(DPAD_C.x - CONTROLLER.dpad.bar / 2), r1(DPAD_C.y - CONTROLLER.dpad.arm / 2), CONTROLLER.dpad.bar, CONTROLLER.dpad.arm),
    G.box(r1(DPAD_C.x - CONTROLLER.dpad.arm / 2), r1(DPAD_C.y - CONTROLLER.dpad.bar / 2), CONTROLLER.dpad.arm, CONTROLLER.dpad.bar),
  ],
  rightStick: dot(across(CONTROLLER.rightStick.x), down(CONTROLLER.rightStick.y), CONTROLLER.rightStick.d),
}

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
  dot(r1(DIAMOND_C.x + dx * CONTROLLER.diamond.spacing), r1(DIAMOND_C.y + dy * CONTROLLER.diamond.spacing), CONTROLLER.diamond.d)

export const DIAMOND = {
  /** Draw order: top, left, right. */
  top: DIAMOND_AT(0, -1),
  left: DIAMOND_AT(-1, 0),
  right: DIAMOND_AT(1, 0),
  bottom: DIAMOND_AT(0, 1),
}

/**
 * The pulsing A button, which lives in its own Group so a Transform can fade it.
 *
 * A GROUP'S x/y MUST BE INTEGERS, so the button's fractional position has to live
 * on the ellipse inside it - and the two halves of that split have to add back up
 * to the same centre the other three buttons are placed against. Both halves are
 * derived from that centre here, which is the only way the split cannot drift.
 */
const PULSE_SIZE = 5
const A_CENTRE = {
  x: CONTROLLER_BOX.x + DIAMOND_C.x,
  y: r1(CONTROLLER_BOX.y + DIAMOND_C.y + CONTROLLER.diamond.spacing),
}

export const PULSE_BOX = G.box(
  Math.round(A_CENTRE.x - PULSE_SIZE / 2),
  Math.round(A_CENTRE.y - PULSE_SIZE / 2),
  PULSE_SIZE,
  PULSE_SIZE,
)

export const PULSE_BUTTON = dot(
  r1(A_CENTRE.x - PULSE_BOX.x),
  r1(A_CENTRE.y - PULSE_BOX.y),
  CONTROLLER.diamond.d,
)

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
  const shellRight = CONTROLLER_SHAPES.shell.x + CONTROLLER_SHAPES.shell.width
  const bRight = DIAMOND.right.x + DIAMOND.right.width
  if (bRight > shellRight) {
    throw new Error(`the B button reaches ${r1(bRight)}, past the shell's right edge at ${shellRight}`)
  }
  const untraced = across({ frac: CONTROLLER.diamond.x.frac })
  const wouldReach = r1(untraced + CONTROLLER.diamond.spacing + CONTROLLER.diamond.d / 2)
  if (wouldReach <= shellRight) {
    throw new Error(
      `the diamond's ${CONTROLLER.diamond.x.off}px nudge is no longer needed: untouched, B would ` +
        `reach ${wouldReach} and the shell ends at ${shellRight}. Drop the off and say why.`,
    )
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
  liquid: { y: 6, width: 16, height: 6 },
}

/** Unchanged since it shipped; `y` is tabulated, `x` puts the stem on the fist. */
export const COCKTAIL_BOX = G.box(HAND.x - COCKTAIL.stemX, 6, 20, 30)

const STEM_X = COCKTAIL.stemX

export const COCKTAIL_STRAW: Seg =
  seg(COCKTAIL.straw.fromX, COCKTAIL.rimY, COCKTAIL.straw.toX, COCKTAIL.straw.toY)

/** Draw order: the two rim sides, the stem, then the foot. */
export const COCKTAIL_GLASS: Seg[] = [
  seg(STEM_X - COCKTAIL.rimHalf, COCKTAIL.rimY, STEM_X, COCKTAIL.apexY),
  seg(STEM_X + COCKTAIL.rimHalf, COCKTAIL.rimY, STEM_X, COCKTAIL.apexY),
  seg(STEM_X, COCKTAIL.apexY, STEM_X, COCKTAIL.stemBottom),
  seg(STEM_X - COCKTAIL.footHalf, COCKTAIL.footY, STEM_X + COCKTAIL.footHalf, COCKTAIL.footY),
]

export const COCKTAIL_LIQUID = G.box(
  STEM_X - COCKTAIL.liquid.width / 2,
  COCKTAIL.liquid.y,
  COCKTAIL.liquid.width,
  COCKTAIL.liquid.height,
)
