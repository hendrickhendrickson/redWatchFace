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
 * capture-states.ts costs about nine minutes. That is a fine gate and a hopeless
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
 * The wrist stays the arbiter. cycle-states.ts is still the final word.
 */

import { isElement, isTextNode, type Attrs, type Element, type Node } from './xml.ts';
import { compile, run, type Ast, type Values } from './eval.ts';

export type RenderOpts = {
	/** Source values. Use fixtures.ts valuesFor(state) to get a coherent set. */
	values: Values;
	/** Render the ambient face: <Variant mode="AMBIENT"> is applied. */
	ambient?: boolean;
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
	transition?: { t: number; toAmbient: boolean };
	/**
	 * What the clock and the date read. Text content cannot be derived from the
	 * numeric sources: [DAY_OF_WEEK_S] is a string source, and TimeText renders the
	 * system clock with no literal mode. mock-state.ts has the same problem and
	 * solves it the same way.
	 */
	display?: { time: string; weekday: string };
};

/**
 * A parse cache.
 *
 * The preview re-renders every animation frame and the tree holds 112 Transforms,
 * every one of which would otherwise be re-lexed and re-parsed 60 times a second.
 * Expression strings are immutable, so caching on the string is safe.
 */
const astCache = new Map<string, Ast>();
const asAst = (expr: string): Ast => {
	let cached = astCache.get(expr);
	if (cached === undefined) {
		cached = compile(expr);
		astCache.set(expr, cached);
	}
	return cached;
};

const num = (value: string | number | undefined, fallback = 0): number =>
	value === undefined ? fallback : typeof value === 'number' ? value : Number(value);

/** XML text escaping, for text content rather than attributes. */
const esc = (text: string): string =>
	text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * WFF colours are #rrggbb or #aarrggbb. SVG has no alpha channel in a hex colour,
 * so an 8-digit value has to become a colour plus a separate opacity - which is
 * why this returns a pair. The Scene's own background is #ff000000, i.e. opaque
 * black written the long way, and reading that as #ff0000 (red) is the mistake
 * this function exists to not make.
 */
const colour = (value: string | number | undefined): { fill: string; opacity: number } => {
	const hex = String(value ?? '#000000');
	if (/^#[0-9a-fA-F]{8}$/.test(hex)) {
		return { fill: `#${hex.slice(3)}`, opacity: parseInt(hex.slice(1, 3), 16) / 255 };
	}
	return { fill: hex, opacity: 1 };
};

// Partial, because the key is whatever string the markup carried: an unrecognised cap or anchor
// is a miss, and every read below already falls back to a default. See /hhson-typescript.
const CAP: Partial<Record<string, string>> = { ROUND: 'round', SQUARE: 'square', BUTT: 'butt' };
const ANCHOR: Partial<Record<string, string>> = { START: 'start', CENTER: 'middle', END: 'end' };
const WEIGHT: Partial<Record<string, string>> = { LIGHT: '300', NORMAL: '400', BOLD: '700' };

/** Children that modify their parent rather than drawing. */
const isModifier = (tag: string) =>
	tag === 'Transform' || tag === 'Variant' || tag === 'Gyro' || tag === 'Fill' || tag === 'Stroke';

type Resolved = {
	attrs: Attrs;
	/** Extra translation contributed by a <Gyro> child. */
	gyro: { x: number; y: number };
	paint: { fill?: Attrs; stroke?: Attrs };
};

/**
 * Apply every modifier child to an element's own attributes.
 *
 * ORDER MATTERS AND IS NOT ARBITRARY. <Transform> is the live, expression-driven
 * value; <Variant mode="AMBIENT"> is the ambient OVERRIDE of whatever that value
 * would be. So Variant is applied last, which is what makes
 * `<Variant target="alpha" value="0">` actually hide a group whose alpha a
 * Transform is busy animating - the rain drops are exactly that case.
 */
const resolve = (element: Element, opts: RenderOpts): Resolved => {
	const attrs: Attrs = { ...element.attrs };
	const gyro = { x: 0, y: 0 };
	const paint: Resolved['paint'] = {};

	for (const child of element.children) {
		if (child.k !== 'el') {
			continue;
		}
		switch (child.tag) {
			case 'Transform': {
				const target = String(child.attrs['target']);
				attrs[target] = run(asAst(String(child.attrs['value'])), opts.values);
				break;
			}
			case 'Gyro':
				// <Gyro> is NOT inherited by siblings, which is why the gain is repeated
				// seven times in the output; see blob.ts. Here it simply offsets the group
				// it sits in.
				gyro.x = run(asAst(String(child.attrs['x'])), opts.values);
				gyro.y = run(asAst(String(child.attrs['y'])), opts.values);
				break;
			case 'Fill':
				paint.fill = child.attrs;
				break;
			case 'Stroke':
				paint.stroke = child.attrs;
				break;
			default:
				break;
		}
	}

	for (const child of element.children) {
		if (child.k !== 'el' || child.tag !== 'Variant' || child.attrs['mode'] !== 'AMBIENT') {
			continue;
		}
		const target = String(child.attrs['target']);

		if (opts.transition === undefined) {
			if (opts.ambient === true) {
				attrs[target] = child.attrs['value'];
			}
			continue;
		}

		// The element's own value, post-Transform, IS its interactive value.
		const live = num(attrs[target], target === 'alpha' ? 255 : 0);
		const ambient = num(child.attrs['value']);
		const duration = num(child.attrs['duration'], 0);

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
			attrs[target] = opts.transition.toAmbient ? ambient : live;
			continue;
		}

		// How far into this Variant's own window the transition has travelled, 0..1.
		const progress = Math.min(
			1,
			Math.max(0, (opts.transition.t - num(child.attrs['startOffset'], 0)) / duration)
		);
		const eased = (EASE[String(child.attrs['interpolation'] ?? '')] ?? ((at: number) => at))(
			progress
		);
		attrs[target] = opts.transition.toAmbient
			? live + (ambient - live) * eased
			: ambient + (live - ambient) * eased;
	}

	return { attrs, gyro, paint };
};

/**
 * The two named curves, APPROXIMATED.
 *
 * WFF names its interpolations and does not specify them, so these are the
 * conventional quadratics: EASE_IN holds then leaves, EASE_OUT arrives then
 * settles. What the preview reproduces faithfully is the WINDOWS - which copy is
 * moving when, and therefore the gap and the overlap. The shape of each ramp
 * inside its window is indicative, like everything text-shaped here.
 */
const EASE: Partial<Record<string, (w: number) => number>> = {
	EASE_IN: (w) => w * w,
	EASE_OUT: (w) => 1 - (1 - w) * (1 - w)
};

/** fill / stroke attributes for a drawn shape. */
const paintAttrs = (p: Resolved['paint']): string => {
	const out: string[] = [];
	if (p.fill) {
		const { fill, opacity } = colour(p.fill['color']);
		out.push(`fill="${fill}"`);
		if (opacity !== 1) {
			out.push(`fill-opacity="${opacity}"`);
		}
	} else {
		// A shape with only a <Stroke> must not be filled black by SVG's default.
		out.push('fill="none"');
	}
	if (p.stroke) {
		const { fill, opacity } = colour(p.stroke['color']);
		out.push(`stroke="${fill}"`);
		if (opacity !== 1) {
			out.push(`stroke-opacity="${opacity}"`);
		}
		out.push(`stroke-width="${num(p.stroke['thickness'], 1)}"`);
		const cap = CAP[String(p.stroke['cap'] ?? 'BUTT')];
		if (cap !== undefined) {
			out.push(`stroke-linecap="${cap}"`);
		}
	}
	return out.join(' ');
};

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
	const radians = ((deg - 90) * Math.PI) / 180;
	return { x: cx + rx * Math.cos(radians), y: cy + ry * Math.sin(radians) };
};

const arcPath = (attrs: Attrs): string => {
	const cx = num(attrs['centerX']);
	const cy = num(attrs['centerY']);
	const rx = num(attrs['width']) / 2;
	const ry = num(attrs['height']) / 2;
	const from = num(attrs['startAngle']);
	const to = num(attrs['endAngle']);
	const sweep = Math.abs(to - from);
	// A full turn or more cannot be drawn as one SVG arc segment; two halves can.
	if (sweep >= 360) {
		const p0 = onArc(cx, cy, rx, ry, from);
		const halfway = onArc(cx, cy, rx, ry, from + 180);
		return `M ${p0.x} ${p0.y} A ${rx} ${ry} 0 0 1 ${halfway.x} ${halfway.y} A ${rx} ${ry} 0 0 1 ${p0.x} ${p0.y}`;
	}
	const p0 = onArc(cx, cy, rx, ry, from);
	const p1 = onArc(cx, cy, rx, ry, to);
	const large = sweep > 180 ? 1 : 0;
	const dir = to >= from ? 1 : 0;
	return `M ${p0.x} ${p0.y} A ${rx} ${ry} 0 ${large} ${dir} ${p1.x} ${p1.y}`;
};

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
const FORMAT = /%%|%s|%d|%\.(\d+)f/g;

/**
 * The text a Font element carries.
 *
 * <Parameter expression="..."> supplies each specifier in order. [DAY_OF_WEEK_S]
 * is the only STRING source this face reads; it cannot be evaluated, so it comes
 * from opts.display - the same accommodation mock-state.ts makes in TEMPLATE_SWAPS,
 * and for the same reason.
 */
const textOf = (element: Element, opts: RenderOpts): string => {
	let out = '';
	for (const child of element.children) {
		if (isTextNode(child)) {
			out += child.text;
			continue;
		}
		if (child.k !== 'el' || child.tag !== 'Template') {
			continue;
		}

		let template = '';
		const params: Array<string | number> = [];
		for (const part of child.children) {
			if (isTextNode(part)) {
				template += part.text;
			} else if (part.k === 'el' && part.tag === 'Parameter') {
				const expr = String(part.attrs['expression']);
				if (expr.includes('DAY_OF_WEEK_S')) {
					params.push(opts.display?.weekday ?? 'Mon');
				} else {
					params.push(run(asAst(expr), opts.values));
				}
			}
		}

		let paramIndex = 0;
		out += template.replace(FORMAT, (spec, decimals: string | undefined) => {
			if (spec === '%%') {
				return '%';
			}
			// `at`: a Template with more format specifiers than Parameters runs off the end,
			// which is exactly the case the empty return below handles.
			const param = params.at(paramIndex++);
			if (param === undefined) {
				return '';
			}
			if (spec === '%s') {
				return String(param);
			}
			if (decimals !== undefined) {
				return Number(param).toFixed(Number(decimals));
			}
			return String(Math.round(Number(param)));
		});
	}
	return out;
};

/** A <clipPath> id, unique per part. */
let clipSeq = 0;

const render = (node: Node, opts: RenderOpts, defs: string[]): string => {
	if (node.k !== 'el') {
		return '';
	}
	const element = node;
	const { attrs, gyro, paint } = resolve(element, opts);

	const drawnChildren = () =>
		element.children.filter((child) => !(child.k === 'el' && isModifier(child.tag)));
	const inner = () =>
		drawnChildren()
			.map((child) => render(child, opts, defs))
			.join('');

	switch (element.tag) {
		// --- Document scaffolding ------------------------------------------------
		case 'WatchFace':
			return inner();
		case 'Scene': {
			const { fill, opacity } = colour(attrs['backgroundColor']);
			return `<rect x="0" y="0" width="450" height="450" fill="${fill}" fill-opacity="${opacity}" />${inner()}`;
		}
		case 'Metadata':
			return '';

		// --- Structure -----------------------------------------------------------
		case 'Group': {
			const x = num(attrs['x']) + gyro.x;
			const y = num(attrs['y']) + gyro.y;
			const alpha = num(attrs['alpha'], 255) / 255;
			if (alpha === 0) {
				return '';
			}
			const opacity = alpha === 1 ? '' : ` opacity="${alpha}"`;
			return `<g transform="translate(${x} ${y})"${opacity}>${inner()}</g>`;
		}

		/**
		 * A Part CLIPS TO ITS OWN BOX, and implementing that is not optional.
		 *
		 * It is the single most consequential piece of WFF semantics in this face.
		 * `companion_limbs` draws a hand ellipse from local x-2 inside a box that starts at
		 * 0, and the cap arrives FLAT-SIDED on the watch - which is the observation
		 * the entire hero_props restructuring came out of, since a prop centred on the
		 * hero's raised hand would have been cut off the same way. A preview that
		 * skipped clipping would draw that ellipse round, and would therefore hide the
		 * exact class of bug this face has already been bitten by once.
		 */
		case 'PartDraw':
		case 'PartText': {
			const x = num(attrs['x']);
			const y = num(attrs['y']);
			const w = num(attrs['width']);
			const h = num(attrs['height']);
			const alpha = num(attrs['alpha'], 255) / 255;
			if (alpha === 0) {
				return '';
			}

			const id = `clip${clipSeq++}`;
			defs.push(`<clipPath id="${id}"><rect x="0" y="0" width="${w}" height="${h}" /></clipPath>`);

			const transforms = [`translate(${x} ${y})`];
			const angle = num(attrs['angle']);
			if (angle !== 0) {
				transforms.push(
					`rotate(${angle} ${num(attrs['pivotX'], 0.5) * w} ${num(attrs['pivotY'], 0.5) * h})`
				);
			}
			const opacity = alpha === 1 ? '' : ` opacity="${alpha}"`;
			const body = element.tag === 'PartText' ? renderPartText(element, opts, w, h) : inner();
			return `<g transform="${transforms.join(' ')}" clip-path="url(#${id})"${opacity}>${body}</g>`;
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
			const named = new Map<string, string>();
			for (const child of element.children) {
				if (child.k !== 'el' || child.tag !== 'Expressions') {
					continue;
				}
				for (const expression of child.children) {
					if (expression.k !== 'el' || expression.tag !== 'Expression') {
						continue;
					}
					const body = expression.children
						.filter(isTextNode)
						.map((part) => part.text)
						.join('');
					named.set(String(expression.attrs['name']), body);
				}
			}
			for (const child of element.children) {
				if (child.k !== 'el' || child.tag !== 'Compare') {
					continue;
				}
				const expr = named.get(String(child.attrs['expression']));
				if (expr === undefined) {
					throw new Error(`Compare references unknown expression ${child.attrs['expression']}`);
				}
				if (run(asAst(expr), opts.values) !== 0) {
					return child.children.map((branch) => render(branch, opts, defs)).join('');
				}
			}
			for (const child of element.children) {
				if (child.k === 'el' && child.tag === 'Default') {
					return child.children.map((branch) => render(branch, opts, defs)).join('');
				}
			}
			return '';
		}

		// --- Shapes --------------------------------------------------------------
		case 'Ellipse': {
			// WFF gives a bounding box; SVG wants a centre and two radii.
			const w = num(attrs['width']);
			const h = num(attrs['height']);
			const cx = num(attrs['x']) + w / 2;
			const cy = num(attrs['y']) + h / 2;
			return `<ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="${h / 2}" ${paintAttrs(paint)} />`;
		}
		case 'Rectangle':
			return `<rect x="${num(attrs['x'])}" y="${num(attrs['y'])}" width="${num(attrs['width'])}" height="${num(attrs['height'])}" ${paintAttrs(paint)} />`;
		case 'RoundRectangle':
			return (
				`<rect x="${num(attrs['x'])}" y="${num(attrs['y'])}" width="${num(attrs['width'])}" height="${num(attrs['height'])}"` +
				` rx="${num(attrs['cornerRadiusX'])}" ry="${num(attrs['cornerRadiusY'])}" ${paintAttrs(paint)} />`
			);
		case 'Line':
			return (
				`<line x1="${num(attrs['startX'])}" y1="${num(attrs['startY'])}"` +
				` x2="${num(attrs['endX'])}" y2="${num(attrs['endY'])}" ${paintAttrs(paint)} />`
			);
		case 'Arc':
			return `<path d="${arcPath(attrs)}" ${paintAttrs(paint)} />`;

		// --- The clock -----------------------------------------------------------
		case 'DigitalClock':
			return inner();
		case 'TimeText': {
			const alpha = num(attrs['alpha'], 255) / 255;
			if (alpha === 0) {
				return '';
			}
			const w = num(attrs['width']);
			const h = num(attrs['height']);
			const font = element.children.find(isElement('Font'));
			const time = opts.display?.time ?? '10:09';
			const opacity = alpha === 1 ? '' : ` opacity="${alpha}"`;
			return (
				`<g transform="translate(${num(attrs['x'])} ${num(attrs['y'])})"${opacity}>` +
				svgText(time, font?.attrs ?? {}, String(attrs['align'] ?? 'CENTER'), w, h) +
				'</g>'
			);
		}

		default:
			// Unknown tags render their children rather than vanishing, so a new
			// element type shows up as unstyled content instead of a silent hole.
			return inner();
	}
};

/**
 * Text placement is the APPROXIMATE part of this renderer.
 *
 * WFF centres a Part's text within the part box, and the box was sized by
 * estimate in the first place because no text-width source exists (see
 * DATE_WEEKDAY_BOX in geometry.ts). Vertical centring here is
 * dominant-baseline on the box's middle, which is close and not exact, and
 * horizontal placement follows the declared align. Judge layout on the wrist.
 */
const svgText = (content: string, font: Attrs, align: string, w: number, h: number): string => {
	const anchor = ANCHOR[align] ?? 'start';
	const x = anchor === 'middle' ? w / 2 : anchor === 'end' ? w : 0;
	const { fill, opacity } = colour(font['color']);
	const style = [
		`font-family="system-ui, sans-serif"`,
		`font-size="${num(font['size'], 16)}"`,
		`font-weight="${WEIGHT[String(font['weight'] ?? 'NORMAL')] ?? '400'}"`,
		font['slant'] === 'ITALIC' ? 'font-style="italic"' : '',
		`fill="${fill}"`,
		opacity !== 1 ? `fill-opacity="${opacity}"` : ''
	]
		.filter((part) => part !== '')
		.join(' ');
	return (
		`<text x="${x}" y="${h / 2}" text-anchor="${anchor}" dominant-baseline="central" ${style}>` +
		`${esc(content)}</text>`
	);
};

const renderPartText = (element: Element, opts: RenderOpts, w: number, h: number): string => {
	const text = element.children.find(isElement('Text'));
	if (text === undefined) {
		return '';
	}
	const font = text.children.find(isElement('Font'));
	if (font === undefined) {
		return '';
	}
	return svgText(textOf(font, opts), font.attrs, String(text.attrs['align'] ?? 'START'), w, h);
};

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
export const renderSvg = (nodes: Node[], opts: RenderOpts): string => {
	clipSeq = 0;
	const defs: string[] = [];
	const body = nodes.map((node) => render(node, opts, defs)).join('');
	return (
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 450" width="450" height="450" ` +
		`shape-rendering="geometricPrecision">` +
		`<defs>${defs.join('')}</defs>${body}</svg>`
	);
};
