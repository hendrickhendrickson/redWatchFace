/**
 * What the preview claims, checked.
 *
 * WHY THIS EXISTS. Every note in this repo about safety nets says the same thing:
 * a check nobody has watched fail is not a check, and build.ts:156-221 is a whole
 * mutation suite built on that principle. The preview makes four load-bearing
 * claims - that animation animates, that tilt saturates, that clipping is real, and
 * that the ambient crossfade is asymmetric in the direction crossfade.ts documents -
 * and every one of them is the kind of thing that looks right in a screenshot while
 * being wrong.
 *
 * The asymmetry is the one that matters most. crossfade.ts argues at length that
 * going ambient leaves a 0.05 gap with neither clock copy drawn and coming back
 * leaves an overlap with both, and that you cannot gap both directions. Until now
 * that was an argument. This counts the copies.
 *
 * IT RUNS UNDER PLAIN NODE, with no vite, no svelte and no node_modules in
 * tools/preview - it imports src/frame.ts, which imports nothing but the generator.
 * That is deliberate: `npm run preview:check` has to work on a fresh clone, and it
 * is also what keeps the root `npm run verify` honest about not depending on the
 * app's toolchain.
 *
 * NOT IN `npm run verify`. The generator's gate stays about the generator; this is
 * a separate command, and the trade is recorded here so the choice is visible:
 * a check outside the default gate is a check that can rot.
 */

import { messageOf } from '../gen/error.ts';
import { face } from '../gen/face.ts';
import { renderSvg } from '../gen/svg.ts';
import { GYRO_CLAMP } from '../gen/geometry.ts';
import { build, DEFAULTS, STATE_NAMES } from './src/frame.ts';

const failed: string[] = [];
const ok = (label: string, cond: boolean, detail = ''): void => {
	console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`);
	if (!cond) {
		failed.push(label);
	}
};
const count = (text: string, pattern: RegExp): number => (text.match(pattern) ?? []).length;

// --- Every state renders, and renders clean --------------------------------

{
	const bad: string[] = [];
	for (const state of STATE_NAMES) {
		try {
			const frame = build({ ...DEFAULTS, state });
			if (!frame.svg.startsWith('<svg')) {
				bad.push(`${state}: not an svg`);
			}
			if (frame.svg.includes('NaN')) {
				bad.push(`${state}: NaN in output`);
			}
			// An unformatted specifier means the Template handling missed a case, which
			// is how the battery once rendered as "88%%" and the heart rate as the
			// literal text "%.0f".
			if (/%[sd]|%\.\d+f|%%/.test(frame.svg)) {
				bad.push(`${state}: unformatted format specifier`);
			}
		} catch (error) {
			bad.push(`${state}: ${messageOf(error)}`);
		}
	}
	ok(`all ${STATE_NAMES.length} states render clean`, bad.length === 0, bad.join('; '));
}

// --- Animation -------------------------------------------------------------

{
	const before = build({ ...DEFAULTS, state: 'rainy', secondsOfDay: 100 });
	const after = build({ ...DEFAULTS, state: 'rainy', secondsOfDay: 100.4 });
	ok('a 0.4s step moves the rain', before.svg !== after.svg);
}

// --- Tilt ------------------------------------------------------------------

/**
 * The hero anchor is x207 and its gain is 0.229, so a full tilt puts its group at
 * 207 + 35*0.229 = 215.015 and NO FURTHER, because <Gyro> clamps before it scales.
 * A preview that kept scaling past the clamp would show parallax the watch cannot.
 */
{
	const heroX = (svg: string): number | null => {
		const match = svg.match(/translate\((21[0-9.]+|207) 26[0-9.]+\)/);
		return match?.[1] === undefined ? null : Number(match[1]);
	};
	const flat = heroX(build({ ...DEFAULTS, tiltX: 0 }).svg);
	const full = heroX(build({ ...DEFAULTS, tiltX: GYRO_CLAMP }).svg);
	const past = heroX(build({ ...DEFAULTS, tiltX: GYRO_CLAMP * 6 }).svg);
	ok('tilt moves the hero', flat === 207 && full !== null && full > 207, `${flat} -> ${full}`);
	ok(
		'tilt saturates at GYRO_CLAMP',
		full === past,
		`${GYRO_CLAMP}deg -> ${full}, ${GYRO_CLAMP * 6}deg -> ${past}`
	);
}

// --- Ambient ---------------------------------------------------------------

{
	const live = build({ ...DEFAULTS, ambient: 0 });
	const amb = build({ ...DEFAULTS, ambient: 1 });
	ok(
		'ambient drops the drawn face entirely',
		count(amb.svg, /<ellipse/g) === 0 && count(live.svg, /<ellipse/g) > 20,
		`${count(live.svg, /<ellipse/g)} ellipses -> ${count(amb.svg, /<ellipse/g)}`
	);
	ok('ambient still shows the time', amb.svg.includes(amb.display.time));
}

/**
 * THE CROSSFADE IS ASYMMETRIC, and this is what proves it.
 *
 * The clock is two TimeText copies at the same origin in two weights, cross-faded
 * against each other. One pair of windows serves both directions, so:
 *
 *   going ambient    out falls [0, 0.45], in rises [0.50, 1.00]  -> a 0.05 GAP
 *   coming back      out rises [0, 0.45], in falls [0.50, 1.00]  -> an OVERLAP
 *
 * Counting visible copies at points across the transition is the only way to see
 * that without a wrist and 200ms of patience.
 */
{
	const visible = (svg: string): number =>
		[...svg.matchAll(/<g transform="translate\([^"]*\)"(?: opacity="([^"]*)")?><text/g)].filter(
			// The opacity group is optional, so it really is undefined when the group did not
			// participate - which is the "fully opaque, no attribute emitted" case. `at` says so;
			// `m[1]` would claim a string is always there.
			(m) => {
				const opacity = m.at(1);
				return opacity === undefined || Number(opacity) > 0.004;
			}
		).length;
	const copiesAt = (progress: number, toAmbient: boolean): number =>
		visible(build({ ...DEFAULTS, ambient: progress, toAmbient }).svg);

	const progressPoints = [0.2, 0.46, 0.48, 0.55, 0.7];
	const out = progressPoints.map((progress) => copiesAt(progress, true));
	const back = progressPoints.map((progress) => copiesAt(progress, false));
	console.log(`        t ${progressPoints.join('  ')}`);
	console.log(`        going ambient -> ${out.join('     ')}  clock copies drawn`);
	console.log(`        coming back   -> ${back.join('     ')}  clock copies drawn`);
	ok(
		'going ambient hands over cleanly: a gap with NEITHER copy',
		out.includes(0) && !out.includes(2)
	);
	ok('coming back overlaps: BOTH copies drawn', back.includes(2) && !back.includes(0));
	ok(
		'both ends of the transition draw exactly one',
		copiesAt(0, true) === 1 && copiesAt(1, true) === 1
	);
}

// --- Clipping --------------------------------------------------------------

/**
 * A Part clips to its own box, and the companion proves it: `companion_limbs` row 0 draws
 * a cream cap centred at local x4.5 with rx 6.5, so it starts at x-2 - OUTSIDE the
 * box - and arrives FLAT-SIDED on the watch. That observation is what the entire
 * hero_props restructuring came out of. A preview that drew it round would hide the
 * one bug class this face has already been bitten by.
 */
{
	const svg = build({ ...DEFAULTS }).svg;
	const clips = count(svg, /<clipPath /g);
	ok(
		'every clipPath is referenced and every clipped group has one',
		clips > 0 && clips === count(svg, /clip-path="url\(#clip\d+\)"/g),
		`${clips} clipPaths, ${count(svg, /clip-path="url\(#clip\d+\)"/g)} references`
	);
	ok(
		'every clip rect starts at its part origin',
		count(svg, /<clipPath id="clip\d+"><rect x="0" y="0"/g) === clips
	);

	const cap = /<ellipse cx="4\.5" cy="38" rx="6\.5" ry="6"/.test(svg);
	const box = /<clipPath id="clip\d+"><rect x="0" y="0" width="62" height="72"/.test(svg);
	ok(
		'the companion cap that overhangs its box is drawn, and the box cuts it',
		cap && box,
		cap
			? box
				? 'cap spans x-2..11 in a 62x72 box starting at 0'
				: 'limb box missing'
			: 'cap missing'
	);
}

// --- One renderer ----------------------------------------------------------

/**
 * THE APP MUST ADD NOTHING OF ITS OWN. Feed the values and display strings it
 * computed straight to renderSvg and the bytes have to match - which is what makes
 * the preview a view of the second backend rather than a third implementation of
 * WFF semantics.
 */
{
	const tree = face();
	const bad: string[] = [];
	for (const state of ['baseline', 'night', 'rainy', 'thunderstorm', 'friday']) {
		const frame = build({ ...DEFAULTS, state });
		const direct = renderSvg(tree, { values: frame.values, display: frame.display });
		if (direct !== frame.svg) {
			bad.push(`${state}: ${direct.length} vs ${frame.svg.length} chars`);
		}
	}
	ok('the app is a view of renderSvg, not a second renderer', bad.length === 0, bad.join('; '));
}

console.log(
	failed.length
		? `\n  ${failed.length} preview check(s) FAILED`
		: '\n  OK  the preview animates, clamps, clips, and crossfades asymmetrically'
);
process.exit(failed.length ? 1 : 0);
