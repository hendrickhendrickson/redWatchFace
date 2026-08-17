/**
 * The device commands, as commands.
 *
 * WRITTEN BECAUSE THE INVOCATIONS WERE DOCUMENTED IN SIX PLACES AND HAD
 * ALREADY DRIFTED - README.md carried a `--only=night` example naming a state
 * that does not exist. Anything with a fixed invocation belongs in
 * package.json's scripts, and anything package.json points at belongs here,
 * so there is one copy of each and running it is what proves it right.
 *
 *   node tools/device-cli.ts devices          # which watch, reconnecting over mDNS
 *   node tools/device-cli.ts activate         # make this face the active one
 *   node tools/device-cli.ts install          # build + install, md5-verified
 *   node tools/device-cli.ts uninstall        # for the signature mismatch
 *   node tools/device-cli.ts shot <out.png>   # screencap, byte-safe
 *   node tools/device-cli.ts gradle <task...> # any task, with the JDK 21 guard
 *
 * Every subcommand resolves the watch through findWatch(), so ANDROID_SERIAL
 * never has to be set and an attached emulator is never the target: the port
 * in a wireless-debugging serial rotates whenever the watch sleeps, which is
 * exactly what a pinned env var cannot follow.
 *
 * The orchestration itself lives in device.ts and is shared with
 * capture-states.ts and cycle-states.ts. This file is a front door, not a
 * second implementation.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
	APP_ID,
	REPO,
	adb,
	die,
	findWatch,
	reinstallRealBuild,
	runGradle,
	wake,
	type Serial
} from './device.ts';

const COMMANDS = ['devices', 'activate', 'install', 'uninstall', 'shot', 'gradle'] as const;
type Command = (typeof COMMANDS)[number];

// The cast widens the tuple, not the value: includes() on a `readonly Command[]`
// refuses an arbitrary string, and casting the argument instead would assert the
// very thing this predicate exists to decide.
const isCommand = (v: string | undefined): v is Command =>
	(COMMANDS as readonly string[]).includes(v ?? '');

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

function requireWatch(): Serial {
	const watch = findWatch();
	if (watch === null) {
		die('no watch attached. Pair and connect first - see docs/device.md.');
	}
	return watch;
}

function activate(watch: Serial): void {
	const r = adb(
		watch,
		'shell',
		'am',
		'broadcast',
		'-a',
		'com.google.android.wearable.app.DEBUG_SURFACE',
		'--es',
		'operation',
		'set-watchface',
		'--es',
		'watchFaceId',
		APP_ID
	);
	const out = r.stdout.trim();
	console.log(out);
	if (!out.includes('result=1')) {
		die('activation did not report result=1 - is the face installed?');
	}
	// result=1 Runtime=[2] means "a face with that id is active", NOT "your new
	// build is running" - the broadcast succeeds against whatever is installed.
	console.log(`${APP_ID} is the active face (this says nothing about which build).`);
}

/**
 * screencap-then-pull, never `adb exec-out > file`: in PowerShell `>` decodes
 * the stream as text and re-encodes it with a BOM, and since aapt only needs
 * *a* file at that path a corrupt PNG gets quite far before anything
 * complains. The magic-byte check is the point of the command.
 */
function shot(watch: Serial, out: string | undefined): void {
	if (out === undefined) {
		die('usage: node tools/device-cli.ts shot <out.png>');
	}
	const dest = resolve(REPO, out);
	wake(watch);
	adb(watch, 'shell', 'screencap', '-p', '/data/local/tmp/shot.png');
	const pulled = adb(watch, 'pull', '/data/local/tmp/shot.png', dest);
	if (pulled.status !== 0) {
		die(`adb pull failed: ${pulled.stderr.trim()}`);
	}
	const head = readFileSync(dest).subarray(0, 4);
	if (!PNG_MAGIC.every((byte, i) => head[i] === byte)) {
		die(`${out} is not a PNG (starts ${head.toString('hex')}, wanted 89504e47)`);
	}
	console.log(`${out} written and verified as a PNG.`);
}

const [command, ...rest] = process.argv.slice(2);

if (!isCommand(command)) {
	die(`usage: node tools/device-cli.ts <${COMMANDS.join('|')}>`);
}

switch (command) {
	case 'devices': {
		const watch = findWatch();
		console.log(watch === null ? 'no watch attached' : watch);
		break;
	}
	case 'activate':
		activate(requireWatch());
		break;
	case 'install': {
		// reinstallRealBuild clears any mock first, then compares the installed
		// APK's md5 against the one just built - the only check here that a
		// build reporting success without reaching the device cannot fool.
		const watch = findWatch();
		if (!reinstallRealBuild(watch)) {
			die('install failed, or the APK on the watch does not match the one just built.');
		}
		console.log(
			watch === null ? 'built and installed (no watch to verify against)' : 'installed and verified'
		);
		break;
	}
	case 'uninstall': {
		const r = adb(requireWatch(), 'uninstall', APP_ID);
		console.log(r.stdout.trim() || r.stderr.trim());
		break;
	}
	case 'shot':
		shot(requireWatch(), rest[0]);
		break;
	case 'gradle':
		if (rest.length === 0) {
			die('usage: node tools/device-cli.ts gradle <task...>');
		}
		if (!runGradle(...rest)) {
			die(`gradle ${rest.join(' ')} failed`);
		}
		break;
}
