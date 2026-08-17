/**
 * Shared adb/gradle/mock-state device orchestration, used by capture-states.ts
 * and cycle-states.ts.
 *
 * EXTRACTED FROM TWO POWERSHELL SCRIPTS THAT DUPLICATED IT NEARLY VERBATIM -
 * adb/repo/JAVA_HOME resolution, device discovery (incl. the mDNS reconnect,
 * since the watch's wireless-debugging port rotates every time it sleeps), the
 * wake sequence, gradlew invocation and mock-state.ts invocation. Both scripts
 * are gone now; this is the one place that logic lives.
 *
 * REINSTALL VERIFICATION IS THE MD5 COMPARE. capture-states.ps1 used to check
 * `dumpsys package … lastUpdateTime` instead; cycle-states.ps1's md5 compare
 * against the freshly built local APK is the more rigorous of the two - it
 * cannot be fooled by a build that reports success but never actually reaches
 * the device - so both callers use it now.
 *
 * gradlew.bat IS SPAWNED WITH AN ABSOLUTE PATH AND shell:true, NOT `cmd /c`.
 * Node refuses to spawn a .bat directly (throws EINVAL) - `shell: true` is
 * required, not optional, and it builds the `cmd.exe /d /s /c "…"` invocation
 * itself, so the `cmd /c` vs `cmd \c` typo the PowerShell version had to guard
 * against cannot happen here. A RELATIVE path under shell:true gets mangled by
 * Node's Windows quoting (`.\gradlew.bat` loses its leading `.\`) - verified,
 * not assumed - so GRADLEW below is resolved absolute.
 */

import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type Serial = string;

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ADB = resolve(process.env.LOCALAPPDATA ?? '', 'Android/Sdk/platform-tools/adb.exe');
export const GRADLEW = resolve(REPO, 'gradlew.bat');
export const WATCHFACE_APK = resolve(REPO, 'watchface/build/outputs/apk/debug/watchface-debug.apk');
export const APP_ID = 'de.redplant.watchface.blob';

if (!existsSync(ADB)) {
	throw new Error(`adb not found at ${ADB}`);
}

/** `die(msg): never` - shared with mock-state.ts's own copy in spirit, not import: that file is a standalone CLI. */
export const die: (msg: string) => never = (msg) => {
	console.error(msg);
	process.exit(1);
};

/** Same defence both scripts had: Gradle 8.11.1's embedded Kotlin compiler dies on anything but JDK 21. */
export function ensureJavaHome(): void {
	if (process.env.JAVA_HOME === undefined) {
		process.env.JAVA_HOME = resolve(process.env.USERPROFILE ?? '', '.jdks/jdk-21.0.12+8');
	}
}

/** Genuinely blocks the calling thread - no async Start-Sleep equivalent exists, and this repo's tools/ stay synchronous. */
export function sleepMs(ms: number): void {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// --- adb ---------------------------------------------------------------

export function adb(serial: Serial | null, ...args: string[]): SpawnSyncReturns<string> {
	const fullArgs = serial === null ? args : ['-s', serial, ...args];
	return spawnSync(ADB, fullArgs, { cwd: REPO, encoding: 'utf8' });
}

const firstRealDevice = (devicesOutput: string): Serial | null => {
	for (const line of devicesOutput.split(/\r?\n/)) {
		if (!/\sdevice$/.test(line)) {
			continue;
		}
		const serial = line.trim().split(/\s+/)[0];
		if (serial && !serial.startsWith('emulator')) {
			return serial;
		}
	}
	return null;
};

/** `adb devices`, falling back to an mDNS reconnect if nothing is already attached. */
export function findWatch(): Serial | null {
	const direct = firstRealDevice(adb(null, 'devices').stdout);
	if (direct !== null) {
		return direct;
	}
	const svcLine = adb(null, 'mdns', 'services')
		.stdout.split(/\r?\n/)
		.find((line) => line.includes('_adb-tls-connect._tcp'));
	if (svcLine === undefined) {
		return null;
	}
	const parts = svcLine.trim().split(/\s+/);
	const svc = parts[parts.length - 1];
	if (!svc) {
		return null;
	}
	adb(null, 'connect', svc);
	sleepMs(1200);
	return firstRealDevice(adb(null, 'devices').stdout);
}

export function getScreenTimeout(serial: Serial): number | null {
	const v = adb(serial, 'shell', 'settings', 'get', 'system', 'screen_off_timeout')
		.stdout.split(/\r?\n/)[0]
		?.trim();
	return v && /^\d+$/.test(v) ? Number(v) : null;
}

export function setScreenTimeout(serial: Serial, ms: number): void {
	adb(serial, 'shell', 'settings', 'put', 'system', 'screen_off_timeout', String(ms));
}

/**
 * KEYCODE_WAKEUP ALONE DOES NOT LIFT THE WATCH OUT OF AOD (dumpsys power
 * reports mWakefulness=Dozing). A TAP wakes it. The tap is sent AFTER the
 * set-watchface broadcast so the face is the foreground surface when it lands.
 */
export function wake(serial: Serial): void {
	adb(serial, 'shell', 'input', 'keyevent', 'KEYCODE_WAKEUP');
	adb(
		serial,
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
	sleepMs(400);
	adb(serial, 'shell', 'input', 'tap', '213', '213');
	sleepMs(900);
}

/** KEYCODE_HOME TOGGLES on Wear OS: from the face it opens the launcher, from the launcher it returns. */
export function nudge(serial: Serial): void {
	adb(serial, 'shell', 'input', 'keyevent', 'KEYCODE_WAKEUP');
	adb(serial, 'shell', 'input', 'keyevent', 'KEYCODE_HOME');
	sleepMs(1300);
}

// --- gradle / mock-state.ts ---------------------------------------------

/**
 * stdio:'inherit', NOT captured. Two reasons: a swallowed exit code once hid a
 * build that silently never ran (see docs/device.md), and if CTRL_C_EVENT ever hits
 * cmd.exe mid-batch it prints "Terminate batch job (Y/N)?" and blocks on
 * stdin - inherited stdio at least makes that prompt visible and answerable
 * instead of hanging forever.
 */
export function runGradle(...args: string[]): boolean {
	ensureJavaHome();
	const r = spawnSync(GRADLEW, [...args, '--console=plain'], {
		shell: true,
		cwd: REPO,
		stdio: 'inherit'
	});
	return r.status === 0;
}

export function runGradleInstall(): boolean {
	return runGradle(':watchface:installDebug');
}

export function mockOn(state: string, opts: { live?: boolean } = {}): void {
	const args = ['tools/mock-state.ts', 'on', state, ...(opts.live === true ? ['--live'] : [])];
	const r = spawnSync('node', args, { cwd: REPO, encoding: 'utf8' });
	if (r.status !== 0) {
		spawnSync('node', args, { cwd: REPO, stdio: 'inherit' });
		throw new Error(`mock-state.ts failed for "${state}"`);
	}
}

/** Best-effort - `off` exits 1 when the tree is already clean, which is the normal case on restore. Never throws. */
export function mockOff(): boolean {
	return (
		spawnSync('node', ['tools/mock-state.ts', 'off'], { cwd: REPO, encoding: 'utf8' }).status === 0
	);
}

/** mock on -> gradle install -> mock off, `off` always running even if the install failed. */
export function installMockedState(mockName: string, opts: { live?: boolean } = {}): void {
	mockOn(mockName, opts);
	let ok: boolean;
	try {
		ok = runGradleInstall();
	} finally {
		mockOff();
	}
	if (!ok) {
		throw new Error(`install failed for "${mockName}"`);
	}
}

/**
 * mock off -> gradle install -> md5-verify against the device. Returns whether
 * the watch can be trusted to be running the real, unmocked build: true only
 * when the build succeeded AND (no device to check against, or its installed
 * APK's md5 matches the one just built locally).
 */
export function reinstallRealBuild(serial: Serial | null): boolean {
	mockOff();
	const ok = runGradleInstall();
	if (!ok) {
		return false;
	}
	if (serial === null) {
		return true;
	}
	const remotePath = adb(serial, 'shell', 'pm', 'path', APP_ID)
		.stdout.replace('package:', '')
		.trim();
	if (!remotePath) {
		return false;
	}
	const onWatch = adb(serial, 'shell', 'md5sum', remotePath).stdout.trim().split(/\s+/)[0];
	if (!existsSync(WATCHFACE_APK)) {
		return false;
	}
	const local = createHash('md5').update(readFileSync(WATCHFACE_APK)).digest('hex');
	return onWatch === local;
}
