/**
 * The rain field: 24 independently-phased drops, gated on the forecast.
 *
 * THE 24 DROPS ARE THE DESIGN, not an effect with a count. Two loose columns
 * bracket the umbrella canopy, and each drop carries its own precipitation gate
 * walking 20 -> 92 in roughly even steps, so DENSITY ramps with the forecast:
 * about seven drops are visible at the 50% that switches the field on, and all
 * 24 by 100%.
 *
 * fract() is what made this possible. Before it was verified on hardware every
 * drop had to share the whole-second sawtooth and the rain fell in visible
 * ranks; independent phases per drop is the difference between rain and a
 * curtain.
 *
 * The x positions are a HAND-PLACED SCATTER, not a formula - values repeat and
 * there is no generator that produces them. They stay tabulated.
 */

import { el, type Node } from '../xml.ts'
import { C } from '../palette.ts'
import * as G from '../geometry.ts'
import { AMBIENT_HIDE } from '../crossfade.ts'
import { when } from '../condition.ts'
import { RAIN_LIKELY } from '../states.ts'
import { PRECIP, precipGate, phase, triangleAlpha, grow } from '../expr.ts'

interface Drop {
  /** Where the drop sits. Part boxes are xs:integer in WFF. */
  x: number
  y: number
  /** Width and height at 50% precipitation, before the ramp widens them. */
  w0: number
  h0: number
  /** Height growth. Tabulated rather than derived: h0 * 0.35 lands on .x5 for
   *  several rows and the authored values do not all round the same way. */
  hx: number
  /** Fall distance at 50%, and its growth. Two of the 24 were hand-nudged off
   *  the 0.35 ratio, so these are tabulated too. */
  fall: number
  fallX: number
  /** Cycles per second, and the phase offset that de-synchronises this drop. */
  hz: number
  ph: number
  /** Precipitation percentage at which this drop starts fading in. */
  gate: number
}

const DROPS: Drop[] = [
  { x:  82, y: 256, w0: 3.4, h0: 13, hx: 4.6, fall: 77.8, fallX: 27.2, hz: 0.9,  ph: 0.07, gate: 20 },
  { x: 302, y: 262, w0: 3.6, h0: 14, hx: 4.9, fall: 80.0, fallX: 28.0, hz: 0.9,  ph: 0.31, gate: 25 },
  { x: 111, y: 268, w0: 3.8, h0: 15, hx: 5.2, fall: 74.4, fallX: 26.1, hz: 0.9,  ph: 0.23, gate: 30 },
  { x: 320, y: 266, w0: 3.8, h0: 15, hx: 5.2, fall: 75.6, fallX: 26.4, hz: 0.9,  ph: 0.79, gate: 34 },
  { x: 350, y: 258, w0: 3.0, h0: 12, hx: 4.2, fall: 77.9, fallX: 27.3, hz: 0.95, ph: 0.66, gate: 38 },
  { x:  87, y: 264, w0: 3.4, h0: 13, hx: 4.6, fall: 75.8, fallX: 26.5, hz: 0.95, ph: 0.44, gate: 42 },
  { x: 332, y: 262, w0: 3.2, h0: 13, hx: 4.6, fall: 81.1, fallX: 28.4, hz: 0.9,  ph: 0.11, gate: 46 },
  { x:  99, y: 258, w0: 3.0, h0: 13, hx: 4.6, fall: 73.3, fallX: 25.7, hz: 0.9,  ph: 0.61, gate: 50 },
  { x: 308, y: 290, w0: 3.6, h0: 14, hx: 4.9, fall: 70.0, fallX: 24.5, hz: 1.0,  ph: 0.48, gate: 54 },
  { x: 129, y: 256, w0: 3.2, h0: 13, hx: 4.6, fall: 80.0, fallX: 28.0, hz: 0.9,  ph: 0.88, gate: 57 },
  { x: 344, y: 266, w0: 3.0, h0: 12, hx: 4.2, fall: 77.8, fallX: 27.2, hz: 0.9,  ph: 0.27, gate: 60 },
  { x: 123, y: 300, w0: 3.6, h0: 14, hx: 4.9, fall: 64.5, fallX: 22.6, hz: 1.1,  ph: 0.72, gate: 63 },
  { x:  93, y: 272, w0: 3.0, h0: 12, hx: 4.2, fall: 75.6, fallX: 26.4, hz: 0.9,  ph: 0.84, gate: 66 },
  { x: 105, y: 288, w0: 3.0, h0: 12, hx: 4.2, fall: 70.0, fallX: 24.5, hz: 1.0,  ph: 0.15, gate: 69 },
  { x: 326, y: 294, w0: 3.4, h0: 13, hx: 4.6, fall: 70.0, fallX: 24.5, hz: 1.0,  ph: 0.92, gate: 72 },
  { x: 308, y: 252, w0: 3.0, h0: 11, hx: 3.9, fall: 78.9, fallX: 27.6, hz: 0.9,  ph: 0.53, gate: 75 },
  { x: 314, y: 272, w0: 3.6, h0: 14, hx: 4.9, fall: 76.7, fallX: 26.8, hz: 0.9,  ph: 0.19, gate: 78 },
  { x: 117, y: 296, w0: 3.2, h0: 13, hx: 4.6, fall: 66.7, fallX: 23.3, hz: 1.05, ph: 0.37, gate: 81 },
  { x: 338, y: 292, w0: 3.0, h0: 12, hx: 4.2, fall: 69.0, fallX: 24.2, hz: 1.0,  ph: 0.58, gate: 84 },
  { x:  99, y: 280, w0: 3.4, h0: 13, hx: 4.6, fall: 72.0, fallX: 25.2, hz: 1.0,  ph: 0.96, gate: 86 },
  { x: 320, y: 302, w0: 3.2, h0: 12, hx: 4.2, fall: 67.0, fallX: 23.5, hz: 1.0,  ph: 0.03, gate: 88 },
  { x: 129, y: 290, w0: 3.6, h0: 14, hx: 4.9, fall: 70.0, fallX: 24.5, hz: 1.0,  ph: 0.41, gate: 90 },
  { x:  87, y: 252, w0: 3.0, h0: 12, hx: 4.2, fall: 75.6, fallX: 26.4, hz: 0.9,  ph: 0.68, gate: 91 },
  { x: 302, y: 252, w0: 3.2, h0: 12, hx: 4.2, fall: 73.7, fallX: 25.8, hz: 0.95, ph: 0.87, gate: 92 },
]

/** A heavier drop is proportionally wider. Exact for all 24 authored values. */
const widthGrowth = (w0: number) => w0 * 0.3

/**
 * The authored literal equals the 100% case for width/height, and the 0% case
 * for the fall - a renderer that ignored <Transform> would still draw
 * plausible rain rather than nothing. That convention is deliberate and worth
 * keeping when adding drops.
 */
const drop = (d: Drop, i: number): Node => {
  const n = String(i + 1).padStart(2, '0')
  const wx = widthGrowth(d.w0)
  const rw = d.w0 + wx
  const rh = d.h0 + d.hx
  // The Part box is the shape's bounding box with a pixel of slack, so a drop
  // at full width is not clipped by its own parent.
  const boxW = Math.ceil(rw) + 1
  const boxH = Math.ceil(rh) + 1

  // Bound ONCE. In the hand-authored file this sub-expression was written out
  // six times per drop - twice in y, four times in alpha - and a one-character
  // drift in any copy would put a drop's fade out of step with its own fall.
  const p = phase(d.hz, d.ph)

  return el('Group', { ...G.CANVAS, name: `rain_drop_${n}`, alpha: 255 }, [
    el('Transform', { target: 'y', value: `(${grow(d.fall, d.fallX, PRECIP)}) * ${p}` }),
    el('Transform', { target: 'alpha', value: `${triangleAlpha(p)} * ${precipGate(d.gate)}` }),
    el('PartDraw', { name: `rain_shape_${n}`, x: d.x, y: d.y, width: boxW, height: boxH }, [
      el('RoundRectangle', {
        x: 0, y: 0, width: rw, height: rh,
        cornerRadiusX: rw / 2, cornerRadiusY: rw / 2,
      }, [
        el('Transform', { target: 'width', value: grow(d.w0, wx, PRECIP) }),
        el('Transform', { target: 'height', value: grow(d.h0, d.hx, PRECIP) }),
        el('Fill', { color: C.RAINDROP }),
      ]),
    ]),
  ])
}

/**
 * The field only exists above a 50% forecast; below that there is no rain.
 *
 * THE SAME PREDICATE THE UMBRELLA USES, and it used to be composed separately
 * here - identically, by luck rather than by construction. It is one fact, so it
 * now comes from states.ts, where a build-time proof also holds it below the storm
 * gate: the bolt cannot strike with the umbrella down.
 */
export const rain = (): Node =>
  when('prop_rain', RAIN_LIKELY, [
    el('Group', { ...G.CANVAS, name: 'rain_fall', alpha: 255 }, [
      el('Variant', AMBIENT_HIDE),
      ...DROPS.map(drop),
    ]),
  ])
