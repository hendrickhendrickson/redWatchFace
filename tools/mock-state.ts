/**
 * Freezes the face at one named state with fixed, readable values, so the
 * snapshots in docs/states/ and preview.png are deterministic.
 *
 *   node tools/mock-state.ts list
 *   node tools/mock-state.ts on <state>
 *   ./gradlew :watchface:installDebug
 *   ... screenshot ...
 *   node tools/mock-state.ts off
 *   ./gradlew :watchface:installDebug        # <- do not skip this
 *
 *   node tools/mock-state.ts status
 *
 * IT PATCHES DATA, NOT TRIGGERS. An older sweep forced each reaction by
 * rewriting its trigger EXPRESSION and then setting one source from the host.
 * That broke the relationships BETWEEN triggers: freezing is a subset of cold,
 * so driving them independently produced a snowflake above two blobs wearing no
 * scarves - a state the watch can never actually be in. Replacing every source
 * token with a literal lets the real Conditions evaluate normally, so nesting
 * takes care of itself: set the temperature to 0 and both the cold and the
 * freezing branches fire, exactly as they would outdoors.
 *
 * The cost is a build per state. Correctness is worth the three minutes.
 *
 * IT OPERATES ON THE GENERATED watchface.xml, by design. Mocking the generator
 * instead would be tidier and would destroy the guarantee: the leftover scan at
 * the bottom of this file works precisely BECAUSE it runs on finished markup and
 * cannot be fooled by what the author meant. Every substitution asserts
 * something, so an edit to the face fails here loudly instead of silently
 * producing a wrong snapshot.
 *
 * THE STATE TABLE ITSELF LIVES IN gen/fixtures.ts. It used to live here, when
 * this was the only thing that needed it; build.ts --equiv and tools/preview now
 * read the same table, so the three cannot disagree about what "cold" means. What
 * stayed in this file is everything that knows about MARKUP - the Template swaps,
 * the clock block, the leftover scan.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { objectEntries, objectKeys } from 'hhson-lib';
import {
	BASE,
	BASE_DISPLAY,
	isNumericSource,
	LIVE_SOURCES,
	NOT_A_VALUE,
	STATES,
	type NumericSource
} from './gen/fixtures.ts';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const face = resolve(repo, 'watchface/src/main/res/raw/watchface.xml');
// Under build/ because aapt rejects a resource filename containing a dot.
const backup = resolve(repo, 'watchface/build/mock-state-backup.xml');

// Partial: keyed by source name, and `values['DAY']` is a lookup that can miss.
type Values = Partial<Record<string, number | string>>;

/**
 * Templates that cannot become numeric literals.
 *
 * MATCHED AS EXACT STRINGS, which couples this to the generator's formatting.
 * That coupling is deliberate and it fails loudly: when the serialiser briefly
 * indented Template's CDATA onto its own line, `on rainy` aborted here rather
 * than producing 24 wrong screenshots. The generator now renders any element
 * with text content inline, partly for this reason.
 */
const TEMPLATE_SWAPS = (values: Values): Array<[string, string]> => [
	// %s cannot take a number, so the weekday is replaced wholesale. Static text
	// has to be bare Font content: a Template requires at least one Parameter.
	[
		`<Template><![CDATA[%s]]><Parameter expression="[DAY_OF_WEEK_S]" /></Template>`,
		`<![CDATA[${values['weekday']}]]>`
	],
	[
		`<Template><![CDATA[%s %d]]><Parameter expression="[DAY_OF_WEEK_S]" /><Parameter expression="[DAY]" /></Template>`,
		`<![CDATA[${values['weekday']} ${values['DAY']}]]>`
	]
];

/**
 * TimeText renders the system clock, has no literal mode, and its <Font> is a
 * restricted definition that accepts no children - so it cannot even hold a
 * Transform. The whole DigitalClock block is swapped for PartTexts.
 */
const CLOCK_RE = /<DigitalClock\b[\s\S]*?<\/DigitalClock>/;

/**
 * BOTH COPIES, not one.
 *
 * The first version collapsed the clock to a single bold cream PartText, which
 * is what interactive looks like - and made every ambient snapshot a lie,
 * because ambient is a LIGHTER weight in plain white. `0-ambient.png` shipped
 * with the wrong font weight and was reported as a bug in the watch face rather
 * than in this file. So the two-copy crossfade is mirrored here exactly, Variant
 * timings included.
 */
const clockMock = (values: Values): string =>
	`<Group name="mock_time_interactive" x="0" y="0" width="450" height="450" alpha="255">
      <Variant mode="AMBIENT" target="alpha" value="0"
               duration="0.45" startOffset="0" interpolation="EASE_IN" />
      <PartText name="mock_time" x="0" y="68" width="450" height="120">
        <Text align="CENTER">
          <Font family="SYNC_TO_DEVICE" size="100" weight="BOLD" slant="NORMAL" color="#fff6e8"><![CDATA[${values['time']}]]></Font>
        </Text>
      </PartText>
    </Group>
    <Group name="mock_time_ambient" x="0" y="0" width="450" height="450" alpha="0">
      <Variant mode="AMBIENT" target="alpha" value="255"
               duration="0.50" startOffset="0.50" interpolation="EASE_OUT" />
      <PartText name="mock_time_amb" x="0" y="68" width="450" height="120">
        <Text align="CENTER">
          <Font family="SYNC_TO_DEVICE" size="100" weight="LIGHT" slant="NORMAL" color="#ffffff"><![CDATA[${values['time']}]]></Font>
        </Text>
      </PartText>
    </Group>`;

// --- CLI --------------------------------------------------------------------

const argv = process.argv.slice(2);
const live = argv.includes('--live');
const positional = argv.filter((arg) => !arg.startsWith('--'));
const cmd = positional[0] ?? 'status';
const stateName = positional[1];

/**
 * The type annotation is on the CONST, not just on the arrow: TypeScript only treats a call as
 * terminating control flow when the callee has an explicit type annotation at its declaration.
 * Without it, every value checked by a `die()` guard stays possibly-undefined afterwards.
 */
const die: (msg: string) => never = (msg) => {
	console.error(msg);
	process.exit(1);
};

/**
 * Ad-hoc overrides:  --set=WEATHER.CHANCE_OF_PRECIPITATION=70
 *
 * Repeatable. Exists because the rain's density, drop size and speed are all
 * continuous functions of CHANCE_OF_PRECIPITATION, so judging it means looking
 * at points BETWEEN the named states - and adding a named state per value you
 * want to eyeball once turns STATES into a junk drawer.
 *
 * ONE TOKEN, not "--set KEY=VALUE": a bare KEY=VALUE would land in `positional`
 * and be read as the state name.
 *
 * The key must already exist in BASE. A typo would otherwise be accepted,
 * substitute nothing, and leave the source LIVE - the exact failure the leftover
 * scan exists to prevent.
 */
const overrides: Partial<Record<NumericSource, number>> = {};
for (const arg of argv.filter((candidate) => candidate.startsWith('--set='))) {
	// `at`, not destructuring: `--set=` with nothing after it splits to a one-element array, so
	// both halves are genuinely optional and the checks below are real.
	const parts = arg.slice('--set='.length).split('=');
	const key = parts.at(0);
	const value = parts.at(1);
	if (key === undefined || !isNumericSource(key)) {
		console.error(`ABORT: --set key "${key}" is not a known source. One of:`);
		die(`  ${objectKeys(BASE).join(', ')}`);
	}
	if (value === undefined || value === '' || Number.isNaN(Number(value))) {
		die(`ABORT: --set ${key} needs a numeric value, got "${value}"`);
	}
	overrides[key] = Number(value);
}

if (cmd === 'list') {
	console.log('States:');
	for (const [name, delta] of objectEntries(STATES)) {
		if (delta === undefined) {
			continue;
		}
		const summary = objectEntries(delta)
			.map(([key, val]) => `${key}=${val}`)
			.join('  ');
		console.log(`  ${name.padEnd(13)} ${summary === '' ? '(base values)' : summary}`);
	}
	process.exit(0);
}

if (cmd === 'status') {
	console.log(existsSync(backup) ? 'MOCK is IN PLACE (backup exists)' : 'real values (clean)');
	if (existsSync(backup)) {
		console.log(`  backup: ${backup}`);
	}
	// THIS COMMAND CANNOT SEE THE WATCH. It reports on the working tree only, and
	// a clean tree says nothing about which APK is installed - `off` restores the
	// file but does not reinstall. Reading "clean" as "the watch is showing real
	// data" is wrong, and was wrong in a way that produced three bug reports
	// against the watch face for what was a leftover mock build.
	console.log('  (working tree only - says NOTHING about which APK is on the watch;');
	console.log('   reinstall to be sure: ./gradlew :watchface:installDebug)');
	process.exit(0);
}

if (cmd === 'off') {
	if (!existsSync(backup)) {
		die('No backup found - nothing to restore. Values are presumably already real.');
	}
	writeFileSync(face, readFileSync(backup));
	rmSync(backup);
	console.log('Real values restored. REINSTALL so the watch stops showing the mock:');
	console.log('  ./gradlew :watchface:installDebug');
	process.exit(0);
}

if (cmd !== 'on') {
	die(`Unknown command "${cmd}". Use: on <state> | off | status | list`);
}
if (!stateName || !(stateName in STATES)) {
	console.error('Usage: node tools/mock-state.ts on <state>');
	die(`States: ${objectKeys(STATES).join(', ')}`);
}
if (existsSync(backup)) {
	console.error('Already mocked - run "off" first, or delete the backup if you are sure:');
	die(`  ${backup}`);
}

const values: Values = {
	...BASE,
	...BASE_DISPLAY,
	...STATES[stateName],
	...overrides
};

let xml = readFileSync(face, 'utf8');
const fail = (msg: string): never => {
	console.error(`ABORT: ${msg}`);
	return die('watchface.xml has changed. Update tools/mock-state.ts.');
};

// 1. Templates that cannot become numeric literals.
for (const [from, to] of TEMPLATE_SWAPS(values)) {
	if (xml.includes(from)) {
		xml = xml.split(from).join(to);
	}
}
if (xml.includes('DAY_OF_WEEK_S')) {
	fail('a [DAY_OF_WEEK_S] Template was not in the swap table');
}

// 2. Every remaining source token -> a literal.
//    Longest name first so no token is a prefix of another.
const kept = new Set<string>(live ? LIVE_SOURCES : []);
const substitutable = objectKeys(values)
	.filter((key) => key !== 'time' && key !== 'weekday' && !kept.has(key))
	.sort((a, b) => b.length - a.length);
for (const key of substitutable) {
	xml = xml.split(`[${key}]`).join(String(values[key]));
}

// 3. Nothing may be left reading live data. This is the safety net: a source
//    added to the face but not to BASE would still be live, and the snapshot
//    would silently drift with the weather or your pulse.
//
//    COMMENTS ARE STRIPPED FIRST. The generated banner mentions no sources, but
//    this stays because it costs nothing and the rule is "only markup counts".
const markup = xml.replace(/<!--[\s\S]*?-->/g, '');
const leftover = [
	...new Set([...markup.matchAll(/\[([A-Z][A-Z0-9_.]*)\]/g)].map((match) => match[1]))
].filter((source) => !NOT_A_VALUE.has(source) && !kept.has(source));
if (leftover.length) {
	fail(`unmocked source(s) still live: ${leftover.join(', ')}`);
}

// 4. The clock.
if (!CLOCK_RE.test(xml)) {
	fail('no <DigitalClock> block found');
}
xml = xml.replace(CLOCK_RE, clockMock(values));

mkdirSync(dirname(backup), { recursive: true });
writeFileSync(backup, readFileSync(face));
writeFileSync(face, xml);

const overrideNote = objectKeys(overrides).length
	? ` + ${objectEntries(overrides)
			.map(([key, value]) => `${key}=${value}`)
			.join(' ')}`
	: '';
console.log(`Mocked as "${stateName}"${overrideNote}:`);
console.log(`   ${values['time']}  ${values['weekday']} ${values['DAY']}`);
console.log(
	`   ${values['WEATHER.TEMPERATURE']}°  cond=${values['WEATHER.CONDITION']}` +
		`  day=${values['WEATHER.IS_DAY']}  precip=${values['WEATHER.CHANCE_OF_PRECIPITATION']}%` +
		`  uv=${values['WEATHER.UV_INDEX']}`
);
console.log(
	`   ${values['HEART_RATE']} bpm · ${values['STEP_COUNT']} steps` +
		` (${values['STEP_PERCENT']}%) · ${values['BATTERY_PERCENT']}%`
);
console.log(
	live
		? '   motion LIVE - accelerometer and seconds still run'
		: '   motion frozen - deterministic, use --live to watch parallax or the zzz drift'
);
console.log('');
console.log('AFTERWARDS:  node tools/mock-state.ts off   AND REINSTALL.');
