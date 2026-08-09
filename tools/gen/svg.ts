/**
 * The SECOND BACKEND: the same node tree, rendered to SVG instead of WFF.
 *
 * face() returns Node[] and serialize() in xml.ts is a pure function of it. So
 * watchface.xml stops being the only compilation target simply by adding another
 * pure function of the same tree:
 *
 *                          /-> serialize()  -> watchface.xml   (WFF, ships)
 *   face()  ->  Node[]  --<
 *                          \-> renderSvg()  -> SVG             (the preview)
 *
 * NO NEW INTERMEDIATE REPRESENTATION. Node[] already IS one - model.ts has been
 * flattening the same tree to {path, tag, attrs, text} since the migration - and
 * inventing another would mean touching the path that produces the shipping file,
 * which is the one thing the semantic gate exists to prevent. Everything above the
 * seam is shared: every constant, every table, every predicate, every section
 * builder. The split is the last function call.
 *
 * THIS FILE LIVES IN gen/ RATHER THAN IN tools/preview/ on purpose. It is a peer
 * of xml.ts, not part of a UI, and putting it under the preview would make
 * build.ts import from the app it is supposed to be independent of. tools/preview
 * is only a Svelte shell around this function.
 *
 * WHAT IT IS FOR, and what it is not. Seeing a change on the wrist costs a Gradle
 * build, an install, a broadcast and a wake; a full state sweep via
 * capture-states.ps1 costs about nine minutes. That is a fine gate and a hopeless
 * authoring loop. This is the authoring loop.
 *
 * IT IS NOT PIXEL TRUTH, and three things guarantee that:
 *
 *   - TEXT. The family is SYNC_TO_DEVICE, which means "whatever the watch uses",
 *     so glyph advance belongs to the device and not to this file. WFF exposes no
 *     text-width source either, which is why geometry.ts records that the date row
 *     is centred by ESTIMATE. Anything text-shaped here is indicative.
 *   - EASING. The ambient cross-fade's interpolation curves are named, not
 *     specified; the windows are honoured, the exact curve is approximated.
 *   - SCALE. The design canvas is 450x450, the Pixel Watch 4 reports 426, and the
 *     emulator 454. This adds a fourth geometry rather than settling the question.
 *
 * The wrist stays the arbiter. cycle-states.ps1 is still the final word.
 */

import type { Attrs, Element, Node } from './xml.ts'
import { compile, run, type Ast, type Values } from './eval.ts'

export interface RenderOpts {
  /** Source values. Use fixtures.ts valuesFor(state) to get a coherent set. */
  values: Values
  /** Render the ambient face: <Variant mode="AMBIENT"> is applied. */
  ambient?: boolean
  /**
   * Scrub the transition BETWEEN the two modes, `t` running 0..1.
   *
   * This is the only way to see the asymmetry crossfade.ts documents at length
   * without putting a build on a wrist and watching 200ms go by. One pair of
   * windows serves both directions, so going ambient leaves a 0.05 gap with
   * neither copy drawn and coming back leaves an overlap with both - and the
   * clock has never been reported as broken while the date was, because the
   * clock's two copies are congruent and the date's were not.
   *
   * Set this INSTEAD of `ambient`; it supersedes it.
   */
  transition?: { t: number; toAmbient: boolean }
  /**
   * What the clock and the date read. Text content cannot be derived from the
   * numeric sources: [DAY_OF_WEEK_S] is a string source, and TimeText renders the
   * system clock with no literal mode. mock-state.ts has the same problem and
   * solves it the same way.
   */
  display?: { time: string; weekday: string }
}

/**
 * A parse cache.
 *
 * The preview re-renders every animation frame and the tree holds 112 Transforms,
 * every one of which would otherwise be re-lexed and re-parsed 60 times a second.
 * Expression strings are immutable, so caching on the string is safe.
 */
const astCache = new Map<string, Ast>()
const asAst = (expr: string): Ast => {
  let a = astCache.get(expr)
  if (a === undefined) {
    a = compile(expr)
    astCache.set(expr, a)
  }
  return a
}

const num = (v: string | number | undefined, fallback = 0): number =>
  v === undefined ? fallback : typeof v === 'number' ? v : Number(v)

/** XML text escaping, for text content rather than attributes. */
const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * WFF colours are #rrggbb or #aarrggbb. SVG has no alpha channel in a hex colour,
 * so an 8-digit value has to become a colour plus a separate opacity - which is
 * why this returns a pair. The Scene's own background is #ff000000, i.e. opaque
 * black written the long way, and reading that as #ff0000 (red) is the mistake
 * this function exists to not make.
 */
const colour = (v: string | number | undefined): { fill: string; opacity: number } => {
  const s = String(v ?? '#000000')
  if (/^#[0-9a-fA-F]{8}$/.test(s)) {
    return { fill: `#${s.slice(3)}`, opacity: parseInt(s.slice(1, 3), 16) / 255 }
  }
  return { fill: s, opacity: 1 }
}

const CAP: Record<string, string> = { ROUND: 'round', SQUARE: 'square', BUTT: 'butt' }
const ANCHOR: Record<string, string> = { START: 'start', CENTER: 'middle', END: 'end' }
const WEIGHT: Record<string, string> = { LIGHT: '300', NORMAL: '400', BOLD: '700' }

/** Children that modify their parent rather than drawing. */
const isModifier = (tag: string) =>
  tag === 'Transform' || tag === 'Variant' || tag === 'Gyro' || tag === 'Fill' || tag === 'Stroke'

interface Resolved {
  attrs: Attrs
  /** Extra translation contributed by a <Gyro> child. */
  gyro: { x: number; y: number }
  paint: { fill?: Attrs; stroke?: Attrs }
}

/**
 * Apply every modifier child to an element's own attributes.
 *
 * ORDER MATTERS AND IS NOT ARBITRARY. <Transform> is the live, expression-driven
 * value; <Variant mode="AMBIENT"> is the ambient OVERRIDE of whatever that value
 * would be. So Variant is applied last, which is what makes
 * `<Variant target="alpha" value="0">` actually hide a group whose alpha a
 * Transform is busy animating - the rain drops are exactly that case.
 */
const resolve = (e: Element, o: RenderOpts): Resolved => {
  const attrs: Attrs = { ...e.attrs }
  const gyro = { x: 0, y: 0 }
  const paint: Resolved['paint'] = {}

  for (const c of e.children) {
    if (c.k !== 'el') continue
    switch (c.tag) {
      case 'Transform': {
        const target = String(c.attrs['target'])
        attrs[target] = run(asAst(String(c.attrs['value'])), o.values)
        break
      }
      case 'Gyro':
        // <Gyro> is NOT inherited by siblings, which is why the gain is repeated
        // seven times in the output; see blob.ts. Here it simply offsets the group
        // it sits in.
        gyro.x = run(asAst(String(c.attrs['x'])), o.values)
        gyro.y = run(asAst(String(c.attrs['y'])), o.values)
        break
      case 'Fill':
        paint.fill = c.attrs
        break
      case 'Stroke':
        paint.stroke = c.attrs
        break
      default:
        break
    }
  }

  for (const c of e.children) {
    if (c.k !== 'el' || c.tag !== 'Variant' || c.attrs['mode'] !== 'AMBIENT') continue
    const target = String(c.attrs['target'])

    if (o.transition === undefined) {
      if (o.ambient) attrs[target] = c.attrs['value']
      continue
    }

    // The element's own value, post-Transform, IS its interactive value.
    const live = num(attrs[target], target === 'alpha' ? 255 : 0)
    const ambient = num(c.attrs['value'])
    const duration = num(c.attrs['duration'], 0)

    if (duration === 0) {
      /**
       * NO WINDOW: the fifteen AMBIENT_HIDE sites. crossfade.ts explains why they
       * have no duration - a section that simply disappears has nothing to hand
       * over to - but not WHEN in the transition they snap, and that is not
       * recorded anywhere because it has never mattered.
       *
       * So this shows the DESTINATION value for the whole transition rather than
       * inventing a snap point: decoration is simply absent while going ambient
       * and present while coming back. If the snap point ever matters, the wrist
       * is what settles it, not this.
       */
      attrs[target] = o.transition.toAmbient ? ambient : live
      continue
    }

    const w = Math.min(1, Math.max(0, (o.transition.t - num(c.attrs['startOffset'], 0)) / duration))
    const p = (EASE[String(c.attrs['interpolation'] ?? '')] ?? ((x: number) => x))(w)
    attrs[target] = o.transition.toAmbient ? live + (ambient - live) * p : ambient + (live - ambient) * p
  }

  return { attrs, gyro, paint }
}

/**
 * The two named curves, APPROXIMATED.
 *
 * WFF names its interpolations and does not specify them, so these are the
 * conventional quadratics: EASE_IN holds then leaves, EASE_OUT arrives then
 * settles. What the preview reproduces faithfully is the WINDOWS - which copy is
 * moving when, and therefore the gap and the overlap. The shape of each ramp
 * inside its window is indicative, like everything text-shaped here.
 */
const EASE: Record<string, (w: number) => number> = {
  EASE_IN: (w) => w * w,
  EASE_OUT: (w) => 1 - (1 - w) * (1 - w),
}

/** fill / stroke attributes for a drawn shape. */
const paintAttrs = (p: Resolved['paint']): string => {
  const out: string[] = []
  if (p.fill) {
    const { fill, opacity } = colour(p.fill['color'])
    out.push(`fill="${fill}"`)
    if (opacity !== 1) out.push(`fill-opacity="${opacity}"`)
  } else {
    // A shape with only a <Stroke> must not be filled black by SVG's default.
    out.push('fill="none"')
  }
  if (p.stroke) {
    const { fill, opacity } = colour(p.stroke['color'])
    out.push(`stroke="${fill}"`)
    if (opacity !== 1) out.push(`stroke-opacity="${opacity}"`)
    out.push(`stroke-width="${num(p.stroke['thickness'], 1)}"`)
    const cap = CAP[String(p.stroke['cap'] ?? 'BUTT')]
    if (cap) out.push(`stroke-linecap="${cap}"`)
  }
  return out.join(' ')
}

/**
 * WFF angles run CLOCKWISE FROM 12 O'CLOCK, not counter-clockwise from 3 as SVG
 * and trigonometry do.
 *
 * Deduced from the file rather than assumed: the hero's eye arcs run 270 to 450
 * and the coffee handle 300 to 600. Under this convention the handle's sweep is
 * 300 degrees, leaving a 60 degree gap - which is exactly what the comment above
 * that Arc in hero-props.ts says it has, and it is measured against the cup wall.
 * Any other convention makes that comment false.
 */
const onArc = (cx: number, cy: number, rx: number, ry: number, deg: number) => {
  const r = ((deg - 90) * Math.PI) / 180
  return { x: cx + rx * Math.cos(r), y: cy + ry * Math.sin(r) }
}

const arcPath = (a: Attrs): string => {
  const cx = num(a['centerX'])
  const cy = num(a['centerY'])
  const rx = num(a['width']) / 2
  const ry = num(a['height']) / 2
  const from = num(a['startAngle'])
  const to = num(a['endAngle'])
  const sweep = Math.abs(to - from)
  // A full turn or more cannot be drawn as one SVG arc segment; two halves can.
  if (sweep >= 360) {
    const p0 = onArc(cx, cy, rx, ry, from)
    const pm = onArc(cx, cy, rx, ry, from + 180)
    return `M ${p0.x} ${p0.y} A ${rx} ${ry} 0 0 1 ${pm.x} ${pm.y} A ${rx} ${ry} 0 0 1 ${p0.x} ${p0.y}`
  }
  const p0 = onArc(cx, cy, rx, ry, from)
  const p1 = onArc(cx, cy, rx, ry, to)
  const large = sweep > 180 ? 1 : 0
  const dir = to >= from ? 1 : 0
  return `M ${p0.x} ${p0.y} A ${rx} ${ry} 0 ${large} ${dir} ${p1.x} ${p1.y}`
}

/**
 * The five format specifiers this face uses, and %% which is not one.
 *
 * Measured from the generated file rather than guessed: `%s` x8, `%d` x9,
 * `%d%%` x2, `%d°` x1, `%.0f` x1. So the set is %s, %d, %.Nf - and %%, which is an
 * ESCAPED LITERAL PERCENT and consumes no parameter. Handling only %s and %d, as
 * the first version of this did, renders the battery as "88%%" and the heart rate
 * as the literal text "%.0f". Both were visible in the first frame, which is the
 * argument for having built the renderer before the UI.
 */
const FORMAT = /%%|%s|%d|%\.(\d+)f/g

/**
 * The text a Font element carries.
 *
 * <Parameter expression="..."> supplies each specifier in order. [DAY_OF_WEEK_S]
 * is the only STRING source this face reads; it cannot be evaluated, so it comes
 * from opts.display - the same accommodation mock-state.ts makes in TEMPLATE_SWAPS,
 * and for the same reason.
 */
const textOf = (e: Element, o: RenderOpts): string => {
  let out = ''
  for (const c of e.children) {
    if (c.k === 'cdata' || c.k === 'text') {
      out += c.text
      continue
    }
    if (c.k !== 'el' || c.tag !== 'Template') continue

    let template = ''
    const params: Array<string | number> = []
    for (const t of c.children) {
      if (t.k === 'cdata' || t.k === 'text') template += t.text
      else if (t.k === 'el' && t.tag === 'Parameter') {
        const expr = String(t.attrs['expression'])
        if (expr.includes('DAY_OF_WEEK_S')) params.push(o.display?.weekday ?? 'Mon')
        else params.push(run(asAst(expr), o.values))
      }
    }

    let i = 0
    out += template.replace(FORMAT, (spec, decimals: string | undefined) => {
      if (spec === '%%') return '%'
      const v = params[i++]
      if (v === undefined) return ''
      if (spec === '%s') return String(v)
      if (decimals !== undefined) return Number(v).toFixed(Number(decimals))
      return String(Math.round(Number(v)))
    })
  }
  return out
}

/** A <clipPath> id, unique per part. */
let clipSeq = 0

const render = (n: Node, o: RenderOpts, defs: string[]): string => {
  if (n.k !== 'el') return ''
  const e = n
  const { attrs, gyro, paint } = resolve(e, o)

  const kids = () => e.children.filter((c) => !(c.k === 'el' && isModifier(c.tag)))
  const inner = () => kids().map((c) => render(c, o, defs)).join('')

  switch (e.tag) {
    // --- Document scaffolding ------------------------------------------------
    case 'WatchFace':
      return inner()
    case 'Scene': {
      const { fill, opacity } = colour(attrs['backgroundColor'])
      return `<rect x="0" y="0" width="450" height="450" fill="${fill}" fill-opacity="${opacity}" />${inner()}`
    }
    case 'Metadata':
      return ''

    // --- Structure -----------------------------------------------------------
    case 'Group': {
      const x = num(attrs['x']) + gyro.x
      const y = num(attrs['y']) + gyro.y
      const alpha = num(attrs['alpha'], 255) / 255
      if (alpha === 0) return ''
      const op = alpha === 1 ? '' : ` opacity="${alpha}"`
      return `<g transform="translate(${x} ${y})"${op}>${inner()}</g>`
    }

    /**
     * A Part CLIPS TO ITS OWN BOX, and implementing that is not optional.
     *
     * It is the single most consequential piece of WFF semantics in this face.
     * `mini_limbs` draws a hand ellipse from local x-2 inside a box that starts at
     * 0, and the cap arrives FLAT-SIDED on the watch - which is the observation
     * the entire hero_props restructuring came out of, since a prop centred on the
     * hero's raised hand would have been cut off the same way. A preview that
     * skipped clipping would draw that ellipse round, and would therefore hide the
     * exact class of bug this face has already been bitten by once.
     */
    case 'PartDraw':
    case 'PartText': {
      const x = num(attrs['x'])
      const y = num(attrs['y'])
      const w = num(attrs['width'])
      const h = num(attrs['height'])
      const alpha = num(attrs['alpha'], 255) / 255
      if (alpha === 0) return ''

      const id = `clip${clipSeq++}`
      defs.push(`<clipPath id="${id}"><rect x="0" y="0" width="${w}" height="${h}" /></clipPath>`)

      const t = [`translate(${x} ${y})`]
      const angle = num(attrs['angle'])
      if (angle !== 0) {
        t.push(`rotate(${angle} ${num(attrs['pivotX'], 0.5) * w} ${num(attrs['pivotY'], 0.5) * h})`)
      }
      const op = alpha === 1 ? '' : ` opacity="${alpha}"`
      const body = e.tag === 'PartText' ? renderPartText(e, o, w, h) : inner()
      return `<g transform="${t.join(' ')}" clip-path="url(#${id})"${op}>${body}</g>`
    }

    /**
     * WFF takes the FIRST Compare that evaluates true, else the Default.
     *
     * That ordering is how the face expresses priority with no negation anywhere -
     * the Wednesday coffee cup wins the hero's fist over a hot-and-sunny cocktail
     * purely by being listed first. Getting this order wrong here would draw two
     * props in one fist, which is precisely the bug the ordering prevents.
     */
    case 'Condition': {
      const named = new Map<string, string>()
      for (const c of e.children) {
        if (c.k !== 'el' || c.tag !== 'Expressions') continue
        for (const x of c.children) {
          if (x.k !== 'el' || x.tag !== 'Expression') continue
          const body = x.children.map((t) => (t.k === 'text' || t.k === 'cdata' ? t.text : '')).join('')
          named.set(String(x.attrs['name']), body)
        }
      }
      for (const c of e.children) {
        if (c.k !== 'el' || c.tag !== 'Compare') continue
        const expr = named.get(String(c.attrs['expression']))
        if (expr === undefined) throw new Error(`Compare references unknown expression ${c.attrs['expression']}`)
        if (run(asAst(expr), o.values) !== 0) {
          return c.children.map((x) => render(x, o, defs)).join('')
        }
      }
      for (const c of e.children) {
        if (c.k === 'el' && c.tag === 'Default') {
          return c.children.map((x) => render(x, o, defs)).join('')
        }
      }
      return ''
    }

    // --- Shapes --------------------------------------------------------------
    case 'Ellipse': {
      // WFF gives a bounding box; SVG wants a centre and two radii.
      const w = num(attrs['width'])
      const h = num(attrs['height'])
      const cx = num(attrs['x']) + w / 2
      const cy = num(attrs['y']) + h / 2
      return `<ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="${h / 2}" ${paintAttrs(paint)} />`
    }
    case 'Rectangle':
      return `<rect x="${num(attrs['x'])}" y="${num(attrs['y'])}" width="${num(attrs['width'])}" height="${num(attrs['height'])}" ${paintAttrs(paint)} />`
    case 'RoundRectangle':
      return (
        `<rect x="${num(attrs['x'])}" y="${num(attrs['y'])}" width="${num(attrs['width'])}" height="${num(attrs['height'])}"` +
        ` rx="${num(attrs['cornerRadiusX'])}" ry="${num(attrs['cornerRadiusY'])}" ${paintAttrs(paint)} />`
      )
    case 'Line':
      return (
        `<line x1="${num(attrs['startX'])}" y1="${num(attrs['startY'])}"` +
        ` x2="${num(attrs['endX'])}" y2="${num(attrs['endY'])}" ${paintAttrs(paint)} />`
      )
    case 'Arc':
      return `<path d="${arcPath(attrs)}" ${paintAttrs(paint)} />`

    // --- The clock -----------------------------------------------------------
    case 'DigitalClock':
      return inner()
    case 'TimeText': {
      const alpha = num(attrs['alpha'], 255) / 255
      if (alpha === 0) return ''
      const w = num(attrs['width'])
      const h = num(attrs['height'])
      const font = e.children.find((c) => c.k === 'el' && c.tag === 'Font') as Element | undefined
      const time = o.display?.time ?? '10:09'
      const op = alpha === 1 ? '' : ` opacity="${alpha}"`
      return (
        `<g transform="translate(${num(attrs['x'])} ${num(attrs['y'])})"${op}>` +
        svgText(time, font?.attrs ?? {}, String(attrs['align'] ?? 'CENTER'), w, h) +
        '</g>'
      )
    }

    default:
      // Unknown tags render their children rather than vanishing, so a new
      // element type shows up as unstyled content instead of a silent hole.
      return inner()
  }
}

/**
 * Text placement is the APPROXIMATE part of this renderer.
 *
 * WFF centres a Part's text within the part box, and the box was sized by
 * estimate in the first place because no text-width source exists (see
 * DATE_WEEKDAY_BOX in geometry.ts). Vertical centring here is
 * dominant-baseline on the box's middle, which is close and not exact, and
 * horizontal placement follows the declared align. Judge layout on the wrist.
 */
const svgText = (content: string, f: Attrs, align: string, w: number, h: number): string => {
  const anchor = ANCHOR[align] ?? 'start'
  const x = anchor === 'middle' ? w / 2 : anchor === 'end' ? w : 0
  const { fill, opacity } = colour(f['color'])
  const style = [
    `font-family="system-ui, sans-serif"`,
    `font-size="${num(f['size'], 16)}"`,
    `font-weight="${WEIGHT[String(f['weight'] ?? 'NORMAL')] ?? '400'}"`,
    f['slant'] === 'ITALIC' ? 'font-style="italic"' : '',
    `fill="${fill}"`,
    opacity !== 1 ? `fill-opacity="${opacity}"` : '',
  ].filter(Boolean).join(' ')
  return (
    `<text x="${x}" y="${h / 2}" text-anchor="${anchor}" dominant-baseline="central" ${style}>` +
    `${esc(content)}</text>`
  )
}

const renderPartText = (e: Element, o: RenderOpts, w: number, h: number): string => {
  const text = e.children.find((c) => c.k === 'el' && c.tag === 'Text') as Element | undefined
  if (!text) return ''
  const font = text.children.find((c) => c.k === 'el' && c.tag === 'Font') as Element | undefined
  if (!font) return ''
  return svgText(textOf(font, o), font.attrs, String(text.attrs['align'] ?? 'START'), w, h)
}

/**
 * Render a face tree to a standalone SVG document.
 *
 * `shape-rendering="geometricPrecision"` because this face is built entirely from
 * antialiased vector primitives whose overlaps are load-bearing: the open mouth is
 * an ellipse with its top half repainted in the body colour, and at the same y the
 * two antialiased edges failed to cancel and left a 1px sliver that read
 * convincingly as a nose. Crisp-edged rendering would not show that class of
 * artefact at all.
 */
export const renderSvg = (nodes: Node[], o: RenderOpts): string => {
  clipSeq = 0
  const defs: string[] = []
  const body = nodes.map((n) => render(n, o, defs)).join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 450" width="450" height="450" ` +
    `shape-rendering="geometricPrecision">` +
    `<defs>${defs.join('')}</defs>${body}</svg>`
  )
}
