/**
 * Cycles the watch through every state, holding each one on screen long enough
 * to be looked at, and loops until stopped.
 *
 * capture-states.ts photographs states; this one *shows* them. Anything that
 * moves - the Gyro parallax, the Zzz drift, the falling rain, the sweat drips,
 * the ambient crossfade - is invisible in a screenshot, so the only way to
 * judge it is to put each state on a wrist and tilt. Doing that by hand is a
 * mock/build/install cycle per state.
 *
 * EVERY STATE IS MOCKED WITH --live, which is the whole point: a plain mock
 * pins ACCELEROMETER_ANGLE_* and the clock sources to constants, so the
 * parallax and the drift are both switched off in it. Judging motion on a
 * plain mock is how three non-existent bugs got reported.
 *
 *   node tools/cycle-states.ts                              # loop forever
 *   node tools/cycle-states.ts --laps=1                      # one pass
 *   node tools/cycle-states.ts --only=rainy,thunderstorm,night
 *
 * Ctrl-C is safe: the screen timeout and the real build are restored by a
 * SIGINT handler that shares its cleanup path with normal completion and a
 * thrown error. A HARD KILL IS NOT - the process dies before any handler
 * runs. So the original timeout is written to tools/cycle-states.state before
 * anything changes, and recovery is one command:
 *
 *   node tools/cycle-states.ts --restore
 *
 * which puts the timeout back, reinstalls the real build, and verifies both.
 */

import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
	REPO,
	die,
	findWatch,
	getScreenTimeout,
	installMockedState,
	reinstallRealBuild,
	setScreenTimeout,
	sleepMs,
	wake,
	type Serial
} from './device.ts';

const STATE_FILE = resolve(REPO, 'tools', 'cycle-states.state');

// Ambient is excluded: both blob groups are alpha 0 there, so there is no
// parallax to see and nothing to hold on screen. The two animated ramps get
// MULTIPLE points along their range: rainy/thunderstorm/downpour are
// 50/90/100% precipitation (rain drop count, size and speed);
// sweating/puffing/drenched are 100/135/200bpm (drip speed, forehead pearl
// count). 'headset' is the one pose where an accessory crosses the head
// rather than sitting beside it - worth judging at real size. 'fricontroller'
// is the one new animated element (pulsing face button) - a still frame can't
// show whether the pulse reads as "on" vs a flicker.
const BASE_ORDER = [
	'baseline',
	'night',
	'sunny',
	'uv',
	'cold',
	'gloves',
	'freezing',
	'rainy',
	'thunderstorm',
	'downpour',
	'sweating',
	'puffing',
	'drenched',
	'goal',
	'headset',
	'fricontroller'
];

// --- CLI ---------------------------------------------------------------

const argv = process.argv.slice(2);
const restoreFlag = argv.includes('--restore');
const holdFlag = argv.find((a) => a.startsWith('--hold-seconds='));
const holdSeconds = holdFlag !== undefined ? Number(holdFlag.slice('--hold-seconds='.length)) : 20;
const lapsFlag = argv.find((a) => a.startsWith('--laps='));
const laps = lapsFlag !== undefined ? Number(lapsFlag.slice('--laps='.length)) : 0;
const onlyFlag = argv.find((a) => a.startsWith('--only='));
const onlyRaw =
	onlyFlag !== undefined
		? onlyFlag
				.slice('--only='.length)
				.split(',')
				.map((s) => s.trim())
				.filter((s) => s.length > 0)
		: undefined;

const stray = argv.filter(
	(a) =>
		a !== '--restore' &&
		!a.startsWith('--hold-seconds=') &&
		!a.startsWith('--laps=') &&
		!a.startsWith('--only=')
);
if (stray.length > 0) {
	die(`Unexpected argument(s): ${stray.join(' ')}. Use --only=a,b (no bare positionals).`);
}
if (Number.isNaN(holdSeconds) || holdSeconds < 0) {
	die(`--hold-seconds must be a non-negative number, got "${String(holdFlag)}"`);
}
if (Number.isNaN(laps) || laps < 0) {
	die(`--laps must be a non-negative integer, got "${String(lapsFlag)}"`);
}

let order = BASE_ORDER;
if (onlyRaw !== undefined) {
	order = BASE_ORDER.filter((s) => onlyRaw.includes(s));
	if (order.length === 0) {
		die(`--only matched nothing. Valid: ${BASE_ORDER.join(', ')}`);
	}
}

// --- Restore -------------------------------------------------------------

function restoreDevice(serial: Serial | null, origTimeout: number | null): void {
	if (serial !== null && origTimeout !== null) {
		for (let attempt = 0; attempt < 5; attempt++) {
			setScreenTimeout(serial, origTimeout);
			sleepMs(500);
			if (getScreenTimeout(serial) === origTimeout) {
				break;
			}
		}
		const now = getScreenTimeout(serial);
		if (now === origTimeout) {
			console.log(`  screen timeout back to ${String(now)}ms`);
		} else {
			console.warn(`  timeout is ${String(now)}ms, wanted ${origTimeout}ms`);
		}
	}
	// Verify against the DEVICE via md5, not an exit code: an exit code cannot
	// tell a mock from a real build; this can.
	if (reinstallRealBuild(serial)) {
		console.log('  real build reinstalled and verified');
	} else {
		console.warn(
			'  REINSTALL FAILED or COULD NOT BE VERIFIED. Run: .\\gradlew :watchface:installDebug'
		);
	}
	rmSync(STATE_FILE, { force: true });
}

if (restoreFlag) {
	const w = findWatch();
	if (w === null) {
		die('no watch connected');
	}
	const orig = existsSync(STATE_FILE) ? Number(readFileSync(STATE_FILE, 'utf8').trim()) : 15000;
	console.log(`restoring after an interrupted cycle (original timeout ${orig}ms)...`);
	restoreDevice(w, orig);
	process.exit(0);
}

// --- Cycle -----------------------------------------------------------------

const w0 = findWatch();
if (w0 === null) {
	die('no watch connected');
}

// Hold the screen open for a bit longer than one state, so a tilt-and-look is
// not racing the display timeout. Deliberately modest: an earlier version of
// the capture script left this at ten minutes and it took a while to notice.
let origTimeout = getScreenTimeout(w0);
if (origTimeout === null) {
	origTimeout = 15000;
}
if (origTimeout >= 300000) {
	console.warn(
		`screen_off_timeout was already ${origTimeout}ms - treating 15000 as the real value`
	);
	origTimeout = 15000;
}
writeFileSync(STATE_FILE, String(origTimeout), 'utf8');
const hold = Math.max((holdSeconds + 10) * 1000, 45000);

let restoring = false;
function restoreAndExit(code: number): never {
	if (restoring) {
		process.exit(code);
	}
	restoring = true;
	console.log('\nrestoring...');
	try {
		restoreDevice(findWatch(), origTimeout);
	} finally {
		process.exit(code);
	}
}
process.on('SIGINT', () => restoreAndExit(130));

try {
	setScreenTimeout(w0, hold);
	console.log(`screen timeout ${origTimeout}ms -> ${hold}ms for the cycle`);
	console.log(`cycling: ${order.join(' -> ')}`);
	console.log(
		`holding each for ${holdSeconds}s. Tilt your wrist - every state is mocked --live.\n`
	);

	let lap = 0;
	for (;;) {
		lap++;
		for (const st of order) {
			try {
				installMockedState(st, { live: true });
			} catch (err) {
				console.warn(`mock/install failed for ${st}, skipping: ${String(err)}`);
				continue;
			}
			const w = findWatch();
			if (w !== null) {
				wake(w);
			}
			console.log(`[lap ${lap}] ${st}  - holding ${holdSeconds}s`);
			sleepMs(holdSeconds * 1000);
		}
		if (laps > 0 && lap >= laps) {
			break;
		}
	}
	restoreAndExit(0);
} catch (err) {
	console.error(`sweep aborted: ${String(err)}`);
	restoreAndExit(1);
}
