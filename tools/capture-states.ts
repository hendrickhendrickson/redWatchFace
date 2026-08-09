/**
 * Captures one screenshot per state into docs/states/, with fixed values.
 *
 *   node tools/capture-states.ts
 *   node tools/capture-states.ts --only=4-cold,4b-gloves
 *   node tools/capture-states.ts --sheet-only
 *
 * HOW THE STATES ARE FORCED - and why this changed on 2026-08-04
 *
 * Previously each reaction was forced by rewriting its trigger expression to
 * `[BATTERY_PERCENT] == N` and setting the battery from the host. One build,
 * nine adb calls, fast - but wrong in two ways. The numbers on screen were
 * whatever the watch happened to report, so the "sunny" frame showed 24
 * degrees and 0 steps; and forcing triggers individually broke the
 * relationships between them, most visibly producing a freezing frame with a
 * snowflake above two blobs wearing no scarves, which the watch can never do.
 *
 * Now tools/mock-state.ts patches the DATA instead - temperature, heart rate,
 * hour, and so on - and the real Conditions evaluate normally, so nesting
 * takes care of itself. The cost is one BUILD PER STATE, about nine minutes
 * for the full set. Correctness is worth more than the time saved.
 *
 * --only re-captures a subset. It skips the orphan prune, the ambient shot
 * and the contact sheet, since all three are whole-set operations.
 *
 * THE CONTACT SHEET HAS NO CAPTIONS. It used to draw a label under each
 * thumbnail via System.Drawing; the TypeScript rewrite uses sharp, which has
 * no text-rendering API, and captions were deliberately scrapped rather than
 * solved a second way - the sheet is a grid of images now, nothing more.
 */

import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import sharp from 'sharp';
import {
	numberedCaptures,
	WEEKDAY_CAPTURES,
	type NumberedCapture
} from './gen/data/capture-states.ts';
import {
	REPO,
	adb,
	die,
	findWatch,
	getScreenTimeout,
	installMockedState,
	nudge,
	reinstallRealBuild,
	setScreenTimeout,
	sleepMs,
	wake,
	type Serial
} from './device.ts';

// --- CLI ---------------------------------------------------------------

const argv = process.argv.slice(2);
const sheetOnly = argv.includes('--sheet-only');
const onlyFlag = argv.find((a) => a.startsWith('--only='));
const only =
	onlyFlag !== undefined
		? onlyFlag
				.slice('--only='.length)
				.split(',')
				.map((s) => s.trim())
				.filter((s) => s.length > 0)
		: undefined;
const outDirFlag = argv.find((a) => a.startsWith('--out-dir='));
const outDir = outDirFlag !== undefined ? outDirFlag.slice('--out-dir='.length) : 'docs/states';

const stray = argv.filter(
	(a) => a !== '--sheet-only' && !a.startsWith('--only=') && !a.startsWith('--out-dir=')
);
if (stray.length > 0) {
	die(`Unexpected argument(s): ${stray.join(' ')}. Use --only=a,b (no bare positionals).`);
}
if (sheetOnly && only !== undefined) {
	die('--sheet-only rebuilds the sheet from every state on disk; --only makes no sense with it.');
}

const dir = resolve(REPO, outDir);
mkdirSync(dir, { recursive: true });

const states: NumberedCapture[] = [...numberedCaptures(), ...WEEKDAY_CAPTURES];
const expected = [...states.map((s) => `${s.file}.png`), '0-ambient.png', 'all-states.png'];
const sheetOrder = ['0-ambient', ...states.map((s) => s.file)];

// --- Contact sheet -------------------------------------------------------

const CELL = 220;
const PAD = 6;
const BG = { r: 18, g: 18, b: 18 };

type Written = { path: string; file: string };

async function writeContactSheet(written: Written[], outPath: string): Promise<void> {
	const rank = new Map(sheetOrder.map((name, i) => [name, i]));
	const ordered = [...written].sort(
		(a, b) => (rank.get(a.file) ?? 999) - (rank.get(b.file) ?? 999)
	);
	const cols = Math.min(3, ordered.length);
	const rows = Math.ceil(ordered.length / cols);
	const overlays: { input: Buffer; left: number; top: number }[] = [];
	for (const [i, entry] of ordered.entries()) {
		const thumb = await sharp(entry.path)
			.resize(CELL - PAD * 2, CELL - PAD * 2, { fit: 'contain', background: BG })
			.toBuffer();
		overlays.push({
			input: thumb,
			left: (i % cols) * CELL + PAD,
			top: Math.floor(i / cols) * CELL + PAD
		});
	}
	await sharp({ create: { width: cols * CELL, height: rows * CELL, channels: 3, background: BG } })
		.composite(overlays)
		.png()
		.toFile(outPath);
	console.log(`  wrote ${relative(REPO, outPath)}`);
}

// --- Frame quality ---------------------------------------------------------
//
// Three distinct bad captures had to be told apart from a real one, and none
// is obvious from the file: a black frame (screen off or mid transition), the
// app launcher or a notification on top, or the AMBIENT face (bright and
// sparse, easy to mistake for good), or a frame caught mid ambient crossfade.
//
// Thresholds are measured, not guessed. Across a full sweep:
//     good states      bright 3.7-5.3%   lit 9-12%   sat 4.3-6.0%
//     dimmed           bright 0.3%       lit 5.4%    sat 3.7%
//     true ambient     bright 1.3%       lit 2.0%    sat 0.00%
//
// BRIGHT (fraction of pixels over luminance 200) is the sharp signal: a
// `max >= 240` test let a half-brightness capture through, because the watch
// draws a small pure-white system indicator near the bottom of the screen
// regardless of how dark the face is - only the COUNT of bright pixels
// notices. The dimmed frame also passed on lit and sat (dimming scales every
// channel, so saturation barely moves) - caught by comparing the hero's body
// pixel: (122,40,34) dimmed vs (238,78,67) good, i.e. 51%. sat separates the
// face (colourful) from ambient (strictly greyscale).
type FrameStats = { max: number; brightFraction: number; litFraction: number; satFraction: number };

async function getFrameStats(path: string): Promise<FrameStats | null> {
	try {
		const { data, info } = await sharp(path)
			.removeAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true });
		const { width, height } = info;
		let max = 0;
		let bright = 0;
		let lit = 0;
		let sat = 0;
		let n = 0;
		for (let y = 0; y < height; y += 6) {
			for (let x = 0; x < width; x += 6) {
				const idx = (y * width + x) * 3;
				const r = data[idx];
				const g = data[idx + 1];
				const b = data[idx + 2];
				const l = 0.299 * r + 0.587 * g + 0.114 * b;
				if (l > max) {
					max = l;
				}
				if (l > 200) {
					bright++;
				}
				if (l > 60) {
					lit++;
				}
				const hi = Math.max(r, g, b);
				const lo = Math.min(r, g, b);
				if (hi - lo > 40) {
					sat++;
				}
				n++;
			}
		}
		return { max, brightFraction: bright / n, litFraction: lit / n, satFraction: sat / n };
	} catch {
		return null;
	}
}

// 0.02 sits an order of magnitude clear of a dimmed frame's 0.003 and well
// under the 0.037 the darkest good frame manages, and above settled ambient's
// 0.013 - this asks "is the interactive face on screen", and ambient is not.
async function testIsFace(path: string): Promise<boolean> {
	const s = await getFrameStats(path);
	return s !== null && s.brightFraction >= 0.02 && s.litFraction < 0.14 && s.satFraction > 0.035;
}

async function testIsAmbient(path: string): Promise<boolean> {
	const s = await getFrameStats(path);
	return s !== null && s.litFraction < 0.035 && s.satFraction < 0.005;
}

// --- Sheet-only: no device, no build, no mock. Reads what is already on disk. ---

async function sheetOnlyRun(): Promise<never> {
	const onDisk: { file: string }[] = [{ file: '0-ambient' }, ...states];
	const written: Written[] = [];
	for (const s of onDisk) {
		const p = join(dir, `${s.file}.png`);
		if (existsSync(p)) {
			written.push({ path: p, file: s.file });
		} else {
			console.warn(`missing ${s.file}.png - it will be absent from the sheet`);
		}
	}
	if (written.length === 0) {
		die(`no state PNGs in ${dir} - run a full sweep first.`);
	}
	await writeContactSheet(written, join(dir, 'all-states.png'));
	process.exit(0);
}

// --- Capture ---------------------------------------------------------------

let problems = 0;
const written: Written[] = [];

async function grab(serial: Serial, file: string): Promise<void> {
	const remote = `/data/local/tmp/wf_${file}.png`;
	const local = join(dir, `${file}.png`);
	let ok = false;
	for (let attempt = 0; attempt < 4; attempt++) {
		adb(serial, 'shell', 'screencap', '-p', remote);
		adb(serial, 'pull', remote, local);
		adb(serial, 'shell', 'rm', remote);
		if (existsSync(local) && (await testIsFace(local))) {
			ok = true;
			break;
		}
		console.log(`  retry ${file} (not the watch face)`);
		nudge(serial);
		wake(serial);
	}
	if (!ok) {
		console.warn(`  ${file} may show the launcher, a notification or ambient - not the face`);
		problems++;
	}
	if (existsSync(local)) {
		written.push({ path: local, file });
		console.log(`  wrote ${outDir}/${file}.png`);
	} else {
		console.warn(`  failed: ${file}`);
		problems++;
	}
}

async function main(): Promise<void> {
	if (sheetOnly) {
		await sheetOnlyRun();
		return;
	}

	let wantAmbient = false;
	let onlyFiles = only;
	if (onlyFiles !== undefined && onlyFiles.includes('0-ambient')) {
		wantAmbient = true;
		onlyFiles = onlyFiles.filter((f) => f !== '0-ambient');
	}
	let partial = false;
	let activeStates = states;
	if (onlyFiles !== undefined || wantAmbient) {
		const filterSet = onlyFiles ?? [];
		activeStates = states.filter((s) => filterSet.includes(s.file));
		if (activeStates.length === 0 && !wantAmbient) {
			die(
				`--only matched no states. Valid: ${expected.filter((e) => e !== 'all-states.png').join(', ')}`
			);
		}
		partial = true;
		const names = [...activeStates.map((s) => s.file), ...(wantAmbient ? ['0-ambient'] : [])];
		console.log(`  partial run: ${names.join(', ')}`);
	}

	if (!partial) {
		for (const entry of readdirSync(dir)) {
			if (entry.endsWith('.png') && !expected.includes(entry)) {
				console.log(`  removing orphaned ${entry} (state renamed or dropped)`);
				rmSync(join(dir, entry), { force: true });
			}
		}
	}

	let w = findWatch();
	let origTimeout = w !== null ? getScreenTimeout(w) : null;
	if (origTimeout === null || origTimeout >= 300000) {
		origTimeout = 15000;
	}
	console.log(`  screen timeout was ${origTimeout}ms; holding it open for the sweep`);

	try {
		if (w !== null) {
			setScreenTimeout(w, 600000);
		}
		for (const s of activeStates) {
			console.log(`  building ${s.mock}...`);
			installMockedState(s.mock);
			w = findWatch();
			if (w === null) {
				console.warn(`  no device for ${s.file}, skipping`);
				problems++;
				continue;
			}
			wake(w);
			await grab(w, s.file);
		}
	} catch (err) {
		console.warn(`  sweep aborted: ${String(err)}`);
		problems++;
	}

	// Ambient. A display mode rather than a data state, so it uses the base
	// values and its own timeout dance. Reachable on its own with
	// --only=0-ambient, which matters because it is the one snapshot that can
	// regress from a change to the clock mock without any other state moving.
	if (!partial || wantAmbient) {
		try {
			console.log('  building ambient...');
			installMockedState('ambient');
			w = findWatch();
			if (w !== null) {
				const local = join(dir, '0-ambient.png');
				const remote = '/data/local/tmp/wf_ambient.png';
				// ENTER_AMBIENT does not work: the broadcast is accepted but the
				// display will not dim a screen that was just woken. Shorten the
				// timeout and wait it out instead.
				setScreenTimeout(w, 3000);
				let got = false;
				wake(w);
				for (let attempt = 0; attempt < 5; attempt++) {
					sleepMs(7000);
					adb(w, 'shell', 'screencap', '-p', remote);
					adb(w, 'pull', remote, local);
					adb(w, 'shell', 'rm', remote);
					if (existsSync(local) && (await testIsAmbient(local))) {
						got = true;
						break;
					}
					console.log('  retry ambient (caught the crossfade, not settled AOD)');
					wake(w);
				}
				if (existsSync(local)) {
					written.push({ path: local, file: '0-ambient' });
					console.log(`  wrote ${outDir}/0-ambient.png  (ambient)`);
					if (!got) {
						console.warn('  ambient shot may not be settled AOD');
					}
				}
			}
		} catch (err) {
			console.warn(`  ambient capture failed: ${String(err)}`);
		}
	}

	// THE single timeout restore, retried and verified.
	w = findWatch();
	if (w !== null) {
		let ok = false;
		for (let attempt = 0; attempt < 5; attempt++) {
			setScreenTimeout(w, origTimeout);
			sleepMs(600);
			if (getScreenTimeout(w) === origTimeout) {
				ok = true;
				break;
			}
		}
		if (ok) {
			console.log(`screen timeout restored to ${origTimeout}ms`);
		} else {
			console.warn(
				`could not restore screen_off_timeout - run: adb shell settings put system screen_off_timeout ${origTimeout}`
			);
		}
		wake(w);
	} else {
		console.warn(
			`no device at the end of the run - run: adb shell settings put system screen_off_timeout ${origTimeout}`
		);
	}

	// PUT THE REAL BUILD BACK ON THE WATCH. installMockedState restores
	// watchface.xml after each state but does NOT reinstall, so without this
	// the watch is left running whichever state was captured last - it looks
	// fine, `mock-state.ts status` reports clean, because that only inspects
	// the working tree, never the device. This runs even on a partial run and
	// even if captures failed - it is the last thing this script does to it.
	if (w !== null) {
		console.log('restoring the real build to the watch...');
		if (reinstallRealBuild(w)) {
			console.log('  real build reinstalled - the watch is showing live data again');
		} else {
			console.warn(
				'  REINSTALL FAILED - the watch is STILL RUNNING A MOCK BUILD. Run: .\\gradlew :watchface:installDebug'
			);
			problems++;
		}
	} else {
		console.warn(
			'  no device - the watch may still be running a MOCK build. Run: .\\gradlew :watchface:installDebug'
		);
		problems++;
	}

	if (partial) {
		console.log('  partial run - all-states.png is now stale; refresh it with --sheet-only');
	} else if (written.length > 0) {
		await writeContactSheet(written, join(dir, 'all-states.png'));
	}

	if (problems > 0) {
		console.warn(`${problems} problem(s) above - the sweep did not fully succeed.`);
		process.exit(1);
	}
	process.exit(0);
}

await main();
