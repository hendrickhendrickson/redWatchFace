/**
 * Whatever the hero is holding: the Wednesday coffee cup, the Friday game
 * controller, or the warm-day cocktail. Exactly one of the three, ever.
 *
 * WHY THIS IS A TOP-LEVEL SECTION AND NOT PART OF blob_hero. The hero group
 * starts at canvas x207 and its raised hand sits at group-local x10.5, so a
 * prop wider than 21px centred on that hand would need to start left of the
 * group's own origin - and content there is clipped. The companion's left
 * hand already demonstrates it: `mini_limbs` draws its cream cap from x-2 and
 * the cap arrives flat-sided. Two passes of the controller were left visibly
 * off-centre by that limit before it was worth restructuring around.
 *
 * The fix is the one the umbrella, the bolt, the burst and both sets of Zzz
 * already use: be a sibling of the blob rather than a child of it, position
 * in ABSOLUTE canvas coordinates, and repeat the blob's Gyro gain by hand so
 * the prop still tracks the wrist tilt. `heroGyro()` is that repetition and it
 * is not optional - without it the prop slides off the fist by up to 16px
 * across a full tilt sweep.
 *
 * DRAW ORDER IS PRESERVED EXACTLY. This section is registered immediately
 * after blobHero() in face/index.ts, which is where these three Conditions
 * used to sit as its last children - so the props still paint over the hero
 * (including over the headset, which is correct: a held object is nearer the
 * viewer than a band worn on the head) and still under the companion, the
 * rain and the umbrella.
 *
 * THE ANCHOR. The hero group is at (207,262) and `hero_arm_left_up`'s hand
 * ellipse is (1,26,19,18), so the hand's centre is at canvas (217.5,297).
 * This group sits at (199,262), which puts that hand at group-local
 * (18.5,35) - the number every prop below is positioned against.
 *
 * NO NEGATION ANYWHERE, the same idiom the retired salute used: the two
 * meeting props are tested AHEAD of the weather-driven cocktail, so the
 * cocktail's own Compare means "hot and sunny AND NOT coffee-time AND NOT
 * controller-time" for free. Without the ordering, a hot sunny Wednesday
 * 10:35 or a hot sunny Friday 15:45 would draw two props in one fist.
 */

import { el, text, type Node } from '../xml.ts'
import { C } from '../palette.ts'
import { WEDNESDAY_MEETING, FRIDAY_GAME_ICON } from '../meetings.ts'
import { triangleAlpha, secondPhase } from '../expr.ts'
import { heroGyro } from '../blob.ts'

export const heroProps = (): Node =>
  el('Condition', {}, [
    el('Expressions', {}, [
      el('Expression', { name: 'hero_coffee' }, [
        text(WEDNESDAY_MEETING),
      ]),
      el('Expression', { name: 'hero_controller' }, [
        text(FRIDAY_GAME_ICON),
      ]),
      el('Expression', { name: 'hero_drink' }, [
        text('[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.TEMPERATURE] &gt;= 25 &amp;&amp; [WEATHER.CONDITION] == 1 &amp;&amp; [WEATHER.IS_DAY]'),
      ]),
    ]),
    /**
     * The Wednesday coffee cup.
     *
     * IT IS NOT A ROUNDED RECTANGLE. It is a rim ellipse, a straight-sided
     * body and a bottom ellipse, stacked - which is what gives it a CONVEX
     * BASE. A RoundRectangle bottoms out flat, and a flat base is wrong in a
     * view that is looking down far enough to see into the cup at all: if the
     * rim reads as an ellipse then the base has to as well.
     *
     * THE RIM IS A SEPARATE WHITE ELLIPSE UNDER THE COFFEE, inset 1.75px
     * horizontally and 1px vertically. Drawing the liquid straight onto the
     * body left it touching open background on the left and right, so the cup
     * had no wall at the top - it read as a bowl of brown, not a mug.
     *
     * The base sits exactly on the hand's centre (local y35) and the body is
     * centred on the hand's x (18.5). The handle is deliberately NOT counted
     * in that centring: a mug is centred on its body with the handle hanging
     * off it.
     *
     * THE HANDLE'S 60-DEGREE GAP FACES THE CUP, so the leftmost pixel the
     * ring draws lands at 21 - 3.5*cos(30) - 1 = 16.97, ON the wall at x17
     * rather than inside it. Before that, the ring crossed into the body and
     * the two whites merged into one wall twice as thick as the other side.
     */
    el('Compare', { expression: 'hero_coffee' }, [
      el('PartDraw', { name: 'hero_coffee_cup', x: 8, y: 12, width: 28, height: 24 }, [
        el('Arc', { centerX: 21, centerY: 16, width: 7, height: 7, startAngle: 300, endAngle: 600 }, [
          el('Stroke', { color: C.WHITE, thickness: 2, cap: 'ROUND' }),
        ]),
        el('Ellipse', { x: 4, y: 18.5, width: 13, height: 4.5 }, [
          el('Fill', { color: C.WHITE }),
        ]),
        el('Rectangle', { x: 4, y: 11, width: 13, height: 9.75 }, [
          el('Fill', { color: C.WHITE }),
        ]),
        el('Ellipse', { x: 4, y: 8.5, width: 13, height: 5 }, [
          el('Fill', { color: C.WHITE }),
        ]),
        el('Ellipse', { x: 5.75, y: 9.5, width: 9.5, height: 3 }, [
          el('Fill', { color: C.COFFEE }),
        ]),
        /**
         * THREE wisps, each with TWO direction changes.
         *
         * One direction change reads as a bent wire and two lines converging
         * on a point read as an arrowhead - both were drawn and both were
         * wrong. Three segments per wisp is where it starts reading as
         * vapour.
         *
         * THE THREE OCCUPY DISJOINT x-BANDS AND CANNOT TOUCH. Centrelines run
         * 5..7, 9.5..11.5 and 14..16; at 1.4 thick each band grows 0.7 on
         * both sides, giving 4.3..7.7, 8.8..12.2 and 13.3..16.7 - so the gaps
         * between neighbours are 1.1px, checked rather than eyeballed. The
         * outer two mirror about the cup's centre at 10.5; the middle one
         * rises a little higher, which is what keeps the group from reading
         * as a picket fence.
         */
        el('Line', { startX: 6, startY: 8, endX: 5, endY: 5.7 }, [
          el('Stroke', { color: C.STEAM, thickness: 1.4, cap: 'ROUND' }),
        ]),
        el('Line', { startX: 5, startY: 5.7, endX: 7, endY: 3.4 }, [
          el('Stroke', { color: C.STEAM, thickness: 1.4, cap: 'ROUND' }),
        ]),
        el('Line', { startX: 7, startY: 3.4, endX: 6, endY: 1.1 }, [
          el('Stroke', { color: C.STEAM, thickness: 1.4, cap: 'ROUND' }),
        ]),
        el('Line', { startX: 10.5, startY: 8, endX: 11.5, endY: 5.5 }, [
          el('Stroke', { color: C.STEAM, thickness: 1.4, cap: 'ROUND' }),
        ]),
        el('Line', { startX: 11.5, startY: 5.5, endX: 9.5, endY: 3 }, [
          el('Stroke', { color: C.STEAM, thickness: 1.4, cap: 'ROUND' }),
        ]),
        el('Line', { startX: 9.5, startY: 3, endX: 10.5, endY: 0.5 }, [
          el('Stroke', { color: C.STEAM, thickness: 1.4, cap: 'ROUND' }),
        ]),
        el('Line', { startX: 15, startY: 8, endX: 16, endY: 5.7 }, [
          el('Stroke', { color: C.STEAM, thickness: 1.4, cap: 'ROUND' }),
        ]),
        el('Line', { startX: 16, startY: 5.7, endX: 14, endY: 3.4 }, [
          el('Stroke', { color: C.STEAM, thickness: 1.4, cap: 'ROUND' }),
        ]),
        el('Line', { startX: 14, startY: 3.4, endX: 15, endY: 1.1 }, [
          el('Stroke', { color: C.STEAM, thickness: 1.4, cap: 'ROUND' }),
        ]),
      ]),
    ]),
    /**
     * The Friday game controller. Layout traced off a photograph of the real
     * thing; every offset below is a measured fraction of the full silhouette
     * width, so the proportions can be checked rather than re-judged:
     *
     *   left stick   0.204 across, 0.191 down, 0.164 diameter
     *   d-pad        0.355 across, 0.388 down, 0.191 across the arms
     *   right stick  0.691 across, 0.382 down, 0.164 diameter
     *   ABXY centre  0.822 across, 0.204 down
     *   grips        0.145 and 0.855 across, reaching 0.717 down
     *
     * THE D-PAD SITS INBOARD OF THE LEFT STICK - 0.355 against 0.204. It is
     * the most recognisable thing about this layout and the thing the first
     * two attempts had backwards. The stick/d-pad/stick arrangement is
     * asymmetric BY DESIGN; only the shell and the d-pad's own cross are
     * symmetric, and both are.
     *
     * THE SIDES ANGLE OUT, narrow at the top and wide at the base, because
     * the real shell does: 0.67 of its maximum width at the top edge. That is
     * built from a 24-wide shell with the grip ellipses reaching 28 at their
     * widest, so the silhouette runs 15 across the very top (the flat between
     * the corner arcs), 24 by y4.5 and 28 by y13.5. A single rounded
     * rectangle gave dead-vertical sides, which is what read as a slab.
     *
     * TWO DEPARTURES FROM THE PHOTOGRAPH, both forced by scale. The buttons
     * are 3.2px against a true 2.2 - below ~3px a colour stops reading as a
     * colour at all - and the ABXY diamond and right stick are pulled 1.5px
     * apart from where the fractions put them, because the enlarged buttons
     * would otherwise collide with the enlarged stick. Everything else is
     * honest.
     *
     * The half-pixel offsets are not noise: the hand's centre lands on x18.5
     * and the silhouette is an even 28 wide, so the content carries a 0.5
     * shift inside an integer PartDraw box to centre on it exactly.
     */
    el('Compare', { expression: 'hero_controller' }, [
      el('PartDraw', { name: 'hero_controller', x: 4, y: 25, width: 29, height: 20 }, [
        // Grips first, so the shell covers where they join it.
        el('Ellipse', { x: 0.5, y: 7, width: 10, height: 13 }, [
          el('Fill', { color: C.WHITE }),
        ]),
        el('Ellipse', { x: 18.5, y: 7, width: 10, height: 13 }, [
          el('Fill', { color: C.WHITE }),
        ]),
        el('RoundRectangle', { x: 2.5, y: 0, width: 24, height: 15, cornerRadiusX: 4.5, cornerRadiusY: 4.5 }, [
          el('Fill', { color: C.WHITE }),
        ]),
        // Left stick - high and outboard.
        el('Ellipse', { x: 3.9, y: 3, width: 4.6, height: 4.6 }, [
          el('Fill', { color: C.INK }),
        ]),
        // D-pad - low, and INBOARD of the stick above it. Both bars centre on
        // (10.4,10.9), so the cross is symmetric about itself.
        el('Rectangle', { x: 9.4, y: 8.2, width: 2, height: 5.4 }, [
          el('Fill', { color: C.INK }),
        ]),
        el('Rectangle', { x: 7.7, y: 9.9, width: 5.4, height: 2 }, [
          el('Fill', { color: C.INK }),
        ]),
        // Right stick - low, matching the d-pad's height rather than the left
        // stick's, and nudged 1.5px clear of the A button above it.
        el('Ellipse', { x: 16.7, y: 9.2, width: 4.6, height: 4.6 }, [
          el('Fill', { color: C.INK }),
        ]),
        // Y, X, B - the diamond's top, left and right. A (bottom) is drawn
        // separately below so it alone can pulse.
        el('Ellipse', { x: 20.4, y: 1.5, width: 3.2, height: 3.2 }, [
          el('Fill', { color: C.SUN }),
        ]),
        el('Ellipse', { x: 17.8, y: 4.1, width: 3.2, height: 3.2 }, [
          el('Fill', { color: C.SCARF }),
        ]),
        el('Ellipse', { x: 23, y: 4.1, width: 3.2, height: 3.2 }, [
          el('Fill', { color: C.CORAL }),
        ]),
      ]),
      // A, the diamond's bottom - the one face button that pulses, so the
      // controller reads as being played rather than held. Same triangle
      // idiom the sweat drips use, on its own 2s loop. A Group's x/y must be
      // integers, so the fractional part of the button's position lives on
      // the Ellipse inside it: the centre lands at (26.0,33.3), which is the
      // part box origin (4,25) plus local (22.0,8.3).
      el('Group', { name: 'hero_controller_pulse', x: 24, y: 31, width: 5, height: 5, alpha: 255 }, [
        el('Transform', { target: 'alpha', value: triangleAlpha(secondPhase(2)) }),
        el('PartDraw', { x: 0, y: 0, width: 5, height: 5, name: 'hero_controller_button' }, [
          el('Ellipse', { x: 0.4, y: 0.7, width: 3.2, height: 3.2 }, [
            el('Fill', { color: C.GREEN }),
          ]),
        ]),
      ]),
    ]),
    // The warm-day cocktail, unchanged since it shipped - the part box moved
    // from the hero group's (0,6) to this group's (8,6), which is the same
    // canvas position, (207,268).
    el('Compare', { expression: 'hero_drink' }, [
      el('PartDraw', { name: 'hero_cocktail', x: 8, y: 6, width: 20, height: 30 }, [
        el('Line', { startX: 12.5, startY: 9, endX: 17.5, endY: 0 }, [
          el('Stroke', { color: C.TEAL, thickness: 2, cap: 'ROUND' }),
        ]),
        el('Line', { startX: 4, startY: 9, endX: 10.5, endY: 19 }, [
          el('Stroke', { color: C.BONE, thickness: 2, cap: 'ROUND' }),
        ]),
        el('Line', { startX: 17, startY: 9, endX: 10.5, endY: 19 }, [
          el('Stroke', { color: C.BONE, thickness: 2, cap: 'ROUND' }),
        ]),
        el('Line', { startX: 10.5, startY: 19, endX: 10.5, endY: 27 }, [
          el('Stroke', { color: C.BONE, thickness: 2, cap: 'ROUND' }),
        ]),
        el('Line', { startX: 6.5, startY: 27.5, endX: 14.5, endY: 27.5 }, [
          el('Stroke', { color: C.BONE, thickness: 2, cap: 'ROUND' }),
        ]),
        el('Ellipse', { x: 2.5, y: 6, width: 16, height: 6 }, [
          el('Fill', { color: C.COCKTAIL }),
        ]),
      ]),
    ]),
  ])

/**
 * The wrapper that carries the position and the Gyro. Kept separate from the
 * Condition above so the "where is it" and the "when is it" stay legible as
 * two different questions.
 */
export const heroPropsSection = (): Node =>
  el('Group', { name: 'hero_props', x: 199, y: 262, width: 38, height: 50, alpha: 255 }, [
    heroGyro(),
    el('Variant', { mode: 'AMBIENT', target: 'alpha', value: 0 }),
    heroProps(),
  ])
