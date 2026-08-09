/**
 * The generator entry point.
 *
 *   node tools/gen/build.ts                 regenerate watchface.xml
 *   node tools/gen/build.ts --check         fail if the committed XML is stale
 *   node tools/gen/build.ts --diff          fail if the face RENDERS differently
 *   node tools/gen/build.ts --snapshot      accept the current rendering as the baseline
 *   node tools/gen/build.ts --selftest      prove the differ can still fail
 *   node tools/gen/build.ts --audit         report remaining duplication
 *   node tools/gen/build.ts --equiv A B     do two expressions compute the same?
 *   node tools/gen/build.ts --svg STATE     render a state to SVG, for looking at
 *
 * HOW THE TWO CHECKS DIFFER, because it matters.
 *
 * --check is about staleness: is watchface.xml what tools/gen currently emits?
 * It compares bytes, and it only ever fires because someone edited the XML by
 * hand or forgot to regenerate.
 *
 * --diff is about behaviour: does the face still draw what it drew before? It
 * compares SEMANTIC MODELS against a committed snapshot, so reflowed markup,
 * reordered attributes and 1.0-vs-1 are invisible while a moved shape, a
 * changed colour or an altered expression is not. When a change to the
 * rendering is intended, --snapshot accepts it and the new baseline lands in
 * the same commit as the change that caused it.
 *
 * WHY --equiv IS A THIRD THING. Both checks above compare expression STRINGS.
 * That is right for detecting a changed rendering and wrong for reviewing a
 * refactor: rewriting a hand-typed expression through expr.ts can add a
 * parenthesis without changing the arithmetic, and --diff correctly calls that a
 * difference. --equiv answers the other question - "is this the same
 * computation?" - by EVALUATING both over a grid of source values. It is not a
 * gate; it is what makes an intended expression change reviewable before
 * --snapshot is reached for.
 */

import { objectEntries, objectKeys } from 'hhson-lib';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { messageOf } from './error.ts';
import { parse, walk } from './parse.ts';
import { serialize } from './xml.ts';
import { face } from './face.ts';
import { modelOf, diff, isModel, report, type ModelEntry } from './model.ts';
import { verifyDerivation } from './palette.ts';
import { extract, summarise } from './extract.ts';
import { diverges, selfCheck } from './eval.ts';
import { BASE_DISPLAY, EVAL_GRID, STATES, valuesFor } from './fixtures.ts';
import { PREDICATE_COUNT, verifyPredicates } from './states.ts';
import { renderSvg } from './svg.ts';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const facePath = resolve(repo, 'watchface/src/main/res/raw/watchface.xml');
const mockBackup = resolve(repo, 'watchface/build/mock-state-backup.xml');

/**
 * The rendering baseline.
 *
 * Replaced a frozen copy of the pre-migration watchface.xml once the migration
 * was done and verified on the wrist. A semantic snapshot answers the same
 * question - "does this still render the same?" - without keeping 260 KB of
 * superseded markup around, and unlike the XML it keeps answering it for every
 * future change rather than only for the migration.
 */
const snapshotPath = resolve(repo, 'tools/gen/face.model.json');

/**
 * The type annotation is on the CONST, not just on the arrow.
 *
 * TypeScript only treats a call as terminating control flow when the thing being called has an
 * explicit type annotation at its declaration - a return type on the arrow itself is not enough
 * for a `const`. Without this, code after `fail(...)` stays reachable to the checker, and
 * loadSnapshot below could not return its narrowed value.
 */
const fail: (msg: string) => never = (msg) => {
	console.error(`\n  ${msg}\n`);
	process.exit(1);
};

/**
 * mock-state rewrites watchface.xml in place, substituting every [SOURCE] for a
 * literal. Regenerating on top of that would discard the mock, and every
 * snapshot taken afterwards would silently be of the un-mocked face. After a
 * capture run a mocked tree is the NORMAL state, so this is not a corner case.
 */
const refuseIfMocked = () => {
	if (existsSync(mockBackup)) {
		fail(
			'A mock is in place - generating now would discard it.\n' +
				'  node tools/mock-state.ts off      then try again.'
		);
	}
};

const readFace = (): string => {
	if (!existsSync(facePath)) {
		fail(`not found: ${facePath}`);
	}
	return readFileSync(facePath, 'utf8');
};

const loadSnapshot = (): ModelEntry[] => {
	if (!existsSync(snapshotPath)) {
		fail(
			`no rendering baseline at ${snapshotPath}\n` +
				'  Create one with: node tools/gen/build.ts --snapshot'
		);
	}
	// `unknown`, then narrowed. JSON.parse returns `any`, and asserting the shape here is how a
	// truncated baseline turns into a thousand-element diff instead of one clear message.
	const parsed: unknown = JSON.parse(readFileSync(snapshotPath, 'utf8'));
	if (!isModel(parsed)) {
		fail(
			`the rendering baseline is not a model: ${snapshotPath}\n` +
				'  Regenerate it with: node tools/gen/build.ts --snapshot'
		);
	}
	return parsed;
};

/** First differing offset, rendered with enough context to be actionable. */
const firstDiff = (original: string, emitted: string): string => {
	let i = 0;
	while (i < original.length && i < emitted.length && original[i] === emitted[i]) {
		i++;
	}
	const line = original.slice(0, i).split('\n').length;
	const show = (text: string) => JSON.stringify(text.slice(Math.max(0, i - 60), i + 60));
	return `first difference at byte ${i} (line ${line})\n    original: ${show(original)}\n    emitted:  ${show(emitted)}`;
};

/** The palette ratios must still reproduce the colours that shipped. */
const auditPalette = () => {
	const problems = verifyDerivation();
	if (problems.length) {
		fail(`PALETTE DERIVATION DRIFTED\n\n    ${problems.join('\n    ')}`);
	}
	console.log('  OK         21 derived colours still reproduce from the 7 body hexes');
};

/**
 * The composed predicates must still emit what they emitted as literals.
 *
 * Same idea as auditPalette, and the same justification: states.ts keeps the
 * hand-typed string next to the composition that replaced it, so a change to a
 * SHARED helper - and() joining differently, or() gaining parentheses - is
 * reported once, by name, instead of as forty entries in a semantic diff.
 */
const auditPredicates = () => {
	const problems = verifyPredicates();
	if (problems.length) {
		fail(`PREDICATES NO LONGER EMIT WHAT THEY SHIPPED\n\n    ${problems.join('\n\n    ')}`);
	}
	console.log(`  OK         ${PREDICATE_COUNT} predicates emit exactly what they shipped`);
};

/** Structural checks the WFF schema cannot express. */
const auditStructure = (xml: string) => {
	const { nodes } = parse(xml);

	// A duplicated part name is legal XML and a real hazard: every tool in this
	// repo finds things by name. <Expression> names are a SEPARATE namespace and
	// legitimately collide with the parts they gate - hero_eyes_startled is both
	// the predicate and the part - so they are excluded. Counting them together
	// reported three false positives, and a check that cries wolf gets skipped.
	const parts = new Map<string, number>();
	walk(nodes, (element) => {
		if (element.tag === 'Expression') {
			return;
		}
		const name = element.attrs['name'];
		if (typeof name === 'string') {
			parts.set(name, (parts.get(name) ?? 0) + 1);
		}
	});
	const dupes = [...parts].filter(([, count]) => count > 1);
	if (dupes.length) {
		fail(
			`DUPLICATE PART NAMES\n    ${dupes.map(([name, count]) => `${name} x${count}`).join('\n    ')}`
		);
	}
	console.log(`  OK         ${parts.size} part names, all unique`);
};

const semanticDiff = () => {
	auditPalette();
	auditPredicates();
	const generated = serialize(face());
	auditStructure(generated);

	const before = loadSnapshot();
	const after = modelOf(generated);
	console.log(`  baseline   ${before.length} rendering elements  (face.model.json)`);
	console.log(`  generated  ${after.length} rendering elements`);

	const diffs = diff(before, after);
	if (diffs.length) {
		fail(
			`SEMANTIC DIFF - the face would render differently.\n\n  ${report(diffs)}\n\n` +
				'  If this change is intended: node tools/gen/build.ts --snapshot'
		);
	}
	console.log('  OK         renders the same as the committed baseline\n');
};

const snapshot = () => {
	const generated = serialize(face());
	const entries = modelOf(generated);
	// ONE ELEMENT PER LINE. Pretty-printing this costs 100 KB and turns a
	// one-shape change into a 30-line diff; a single line makes it unreviewable
	// in the other direction. One object per line means `git diff` on the
	// baseline reads as "these elements changed", which is exactly the question.
	const body = entries.map((entry) => `  ${JSON.stringify(entry)}`).join(',\n');
	writeFileSync(snapshotPath, `[\n${body}\n]\n`, 'utf8');
	console.log(`  wrote ${snapshotPath}`);
	console.log(`  ${entries.length} rendering elements are now the baseline\n`);
};

/**
 * Prove the differ can fail.
 *
 * --check once shipped in a state where it could not: it compared the
 * generator's output against its own input, so it passed on a hand-edited file.
 * A safety net nobody has watched fail is not a safety net. This mutates the
 * generated XML in ways that WOULD change the rendering and asserts each is
 * caught. It runs in a second and it stays.
 */
const selftest = () => {
	const generated = serialize(face());
	const base = modelOf(generated);
	let failures = 0;

	// The evaluator first, because everything below is about trusting a checker and
	// it is the checker with the most to lose from being wrong: --equiv and the
	// preview share it, so a bad answer is wrong twice and agrees with itself both
	// times. Every expectation in selfCheck() was computed by hand.
	const evalCheck = selfCheck();
	if (evalCheck.problems.length === 0) {
		console.log(
			`  ok    the expression evaluator agrees with ${evalCheck.checks} hand-computed cases`
		);
	} else {
		for (const problem of evalCheck.problems) {
			console.log(`  FAIL  evaluator: ${problem}`);
		}
		failures += evalCheck.problems.length;
	}

	// The GRID has to be able to fail too, and specifically on a COMBINATION.
	// `a || b && c` and `(a || b) && c` differ only where `a` is true and `c` is
	// false - two sources at once - so a grid built from one-factor sweeps calls
	// them equivalent. The first version of EVAL_GRID did, for this exact pair,
	// which would have waved through the documented mis-binding that put headsets
	// on at every hour. This is the guard on the grid, not on the evaluator.
	const grid = EVAL_GRID();
	const flat = '[HOUR_0_23] &gt;= 23 || 7 &gt; [HOUR_0_23] &amp;&amp; [WEATHER.IS_AVAILABLE]';
	const grouped = '([HOUR_0_23] &gt;= 23 || 7 &gt; [HOUR_0_23]) &amp;&amp; [WEATHER.IS_AVAILABLE]';
	if (diverges(flat, grouped, grid)) {
		console.log(`  ok    the ${grid.length}-row grid catches an or()/and() mis-binding`);
	} else {
		console.log('  FAIL  the grid does not vary two sources at once - combinations uncovered');
		failures++;
	}

	// Mutate MARKUP, never prose. The first version of this replaced '#ee4e43'
	// and '- 50) / 50', both of which occurred first inside comments, so the
	// mutations landed in prose, the differ correctly ignored them, and the test
	// reported the differ as broken. Stripping comments first makes "did the
	// mutation apply" mean what it looks like it means.
	const markup = generated.replace(/<!--[\s\S]*?-->/g, '');

	const control = diff(base, modelOf(markup));
	if (control.length === 0) {
		console.log('  ok    all comments stripped -> correctly ignored');
	} else {
		console.log(`  FAIL  comment-only change reported ${control.length} diff(s)`);
		failures++;
	}

	const cases: Array<[string, (xml: string) => string]> = [
		['a colour changes', (xml) => xml.replace('color="#ee4e43"', 'color="#ee4e44"')],
		[
			'a shape moves 1px',
			(xml) =>
				xml.replace('x="14" y="36" width="72" height="80"', 'x="15" y="36" width="72" height="80"')
		],
		['an expression changes', (xml) => xml.replace('[DAY_OF_WEEK] == 3', '[DAY_OF_WEEK] == 4')],
		[
			'a ramp threshold changes',
			(xml) => xml.replace(/value="([^"]*?)- 50\) \/ 50/, 'value="$1- 40) / 50')
		],
		['an element is dropped', (xml) => xml.replace('<Fill color="#7fb6d9" />', '')],
		['a part is renamed', (xml) => xml.replace('name="hero_body_mon"', 'name="hero_body_monday"')],
		["a transform target is typo'd", (xml) => xml.replace('target="alpha"', 'target="alhpa"')]
	];

	for (const [label, mutate] of cases) {
		const mutated = mutate(markup);
		if (mutated === markup) {
			console.log(`  FAIL  ${label} - mutation did not apply, fixture drifted`);
			failures++;
			continue;
		}
		const found = diff(base, modelOf(mutated));
		if (found.length === 0) {
			console.log(`  FAIL  ${label} - NOT DETECTED`);
			failures++;
		} else {
			console.log(
				`  ok    ${label} -> ${found.length} diff(s), first: ${found[0].detail.slice(0, 56)}`
			);
		}
	}

	// Formatting churn the generator produces, which must stay invisible.
	const cosmetic = markup.replace(/width="72"/g, 'width="72.0"');
	const cosmeticDiff = diff(base, modelOf(cosmetic));
	if (cosmeticDiff.length === 0) {
		console.log('  ok    72 -> 72.0 correctly ignored');
	} else {
		console.log(`  FAIL  cosmetic-only change reported ${cosmeticDiff.length} diff(s)`);
		failures++;
	}

	if (failures) {
		fail(`${failures} self-test failure(s) - the differ cannot be trusted.`);
	}
	console.log('\n  OK  the differ detects rendering changes and ignores cosmetic ones\n');
};

/**
 * What is still typed out more than once.
 *
 * Not a gate - repetition in the OUTPUT is unavoidable, since WFF has no
 * variables and that is the whole reason this generator exists. It reports on
 * the generated XML so that a box or an expression that has quietly grown a
 * dozen copies becomes a candidate for a name in geometry.ts or expr.ts.
 */
const audit = () => {
	auditPalette();
	auditPredicates();
	const generated = serialize(face());
	auditStructure(generated);
	console.log();
	console.log(summarise(extract(generated)));
	console.log();
};

/**
 * Do two expressions compute the same thing?
 *
 * The grid comes from fixtures.ts, which derives it from the same named states
 * docs/states/ is shot on plus the boundaries no named state sits on. So "these
 * agree" means "they agree on every state the face is ever looked at, and on both
 * sides of every threshold" - not "they agree on the good day I typed them for".
 */
const equiv = (exprA: string | undefined, exprB: string | undefined) => {
	if (exprA === undefined || exprB === undefined) {
		fail('usage: build.ts --equiv "<expression>" "<expression>"');
	}
	const grid = EVAL_GRID();
	let divergence;
	try {
		divergence = diverges(exprA, exprB, grid);
	} catch (e) {
		return fail(`could not evaluate: ${messageOf(e)}`);
	}
	if (divergence !== undefined) {
		const shown = objectEntries(divergence.values)
			.filter(([key]) => exprA.includes(`[${key}]`) || exprB.includes(`[${key}]`))
			.map(([key, value]) => `${key}=${value}`)
			.join('  ');
		fail(
			`NOT EQUIVALENT over ${grid.length} value sets.\n\n` +
				`    first divergence at ${shown || '(no shared sources)'}\n` +
				`      A = ${divergence.a}\n      B = ${divergence.b}`
		);
	}
	console.log(`  OK  equivalent over ${grid.length} value sets\n`);
};

/**
 * Render one state to an SVG file, for looking at.
 *
 * THE OTHER COMPILATION TARGET, on the command line. tools/preview wraps the same
 * renderSvg() in a Svelte app with controls; this is the thin version, and it
 * exists first because the renderer is the risky part and a UI would only hide it.
 * It needs no dependencies and no dev server, so it also works on a clone that has
 * never run npm install.
 *
 *   node tools/gen/build.ts --svg baseline
 *   node tools/gen/build.ts --svg night --ambient
 */
const svg = (stateArg: string | undefined) => {
	const state = stateArg ?? 'baseline';
	if (!(state in STATES)) {
		fail(`unknown state "${state}"\n  one of: ${objectKeys(STATES).join(', ')}`);
	}
	const ambient = process.argv.includes('--ambient');
	const delta = STATES[state] ?? {};
	const out = renderSvg(face(), {
		values: valuesFor(state),
		ambient,
		display: {
			time: delta.time ?? BASE_DISPLAY.time,
			weekday: delta.weekday ?? BASE_DISPLAY.weekday
		}
	});
	const dest = resolve(repo, `watchface/build/preview-${state}${ambient ? '-ambient' : ''}.svg`);
	mkdirSync(dirname(dest), { recursive: true });
	writeFileSync(dest, out, 'utf8');
	console.log(`  wrote ${dest}  (${(out.length / 1024).toFixed(1)} KB)`);
	console.log('  NOT pixel truth - text metrics belong to the device. The wrist decides.\n');
};

const generate = (checkOnly: boolean) => {
	refuseIfMocked();
	const src = readFace();
	// NOTE the asymmetry, it is the whole point: the tree comes from face(),
	// never from the file being checked. An earlier version parsed `src` here, so
	// output equalled input by construction and --check could not fail.
	const out = serialize(face());

	if (checkOnly) {
		if (out !== src) {
			fail(
				`watchface.xml is out of date with tools/gen.\n    ${firstDiff(src, out)}\n\n` +
					'  Run: node tools/gen/build.ts'
			);
		}
		console.log('  OK  watchface.xml is up to date.\n');
		return;
	}

	if (out === src) {
		console.log('  OK  watchface.xml unchanged.\n');
		return;
	}
	writeFileSync(facePath, out, 'utf8');
	console.log(`  wrote ${facePath}\n`);
};

// `at`, not `[2]`: running with no arguments at all is the normal case, so undefined is a
// value to handle rather than a bound to assume.
const arg = process.argv.at(2);
if (arg === '--selftest') {
	selftest();
} else if (arg === '--diff') {
	semanticDiff();
} else if (arg === '--snapshot') {
	snapshot();
} else if (arg === '--audit') {
	audit();
} else if (arg === '--equiv') {
	equiv(process.argv[3], process.argv[4]);
} else if (arg === '--svg') {
	svg(process.argv[3]);
} else if (arg === '--check') {
	generate(true);
} else if (arg === undefined) {
	generate(false);
} else {
	fail(
		`unknown argument: ${arg}\n  usage: build.ts ` +
			'[--check|--diff|--snapshot|--selftest|--audit|--equiv A B|--svg STATE [--ambient]]'
	);
}
