---
name: wff-device
description: Building, installing and reviewing this face on a real Pixel Watch 4 — the per-machine toolchain, wireless adb pairing, the state capture and cycle tools, and the many ways a capture or an install reports success without having worked. Load before building, installing, capturing states, re-shooting the preview, judging anything that moves, or when debugging something that only appears on hardware.
---

# The watch

Full detail in **`docs/device.md`** — the headless bootstrap recipe, the emulator's limits, every
device trap. Read the relevant section before running any of this; most of the failures here report
success.

## The commands

```powershell
npm run build          # :watchface:assembleDebug
npm run validate       # :watchface:validateWatchFaceXml  -> PASSED against version #5
npm run footprint      # :watchface:checkMemoryFootprint  -> PASS
npm run release        # signed APK for someone else's watch; needs keystore.properties
npm run devices        # which watch, reconnecting over mDNS if none is attached
npm run deploy         # build + install, md5-verified against the APK just built
npm run deploy:fresh   # uninstall first, for the per-machine signature mismatch
npm run activate       # make this face the active one
npm run preview:png    # re-shoot res/drawable/preview.png, byte-verified

node tools/capture-states.ts                  # photograph every state into docs/states/
node tools/capture-states.ts --only=cold,gloves
node tools/cycle-states.ts                    # show every state on the wrist, looping
node tools/cycle-states.ts --restore          # recover after a hard kill
node tools/mock-state.ts on <state> | off | status | list
```

**Do not hand-assemble a `gradlew` or `adb` line.** The scripts wrap `tools/device-cli.ts`, which
defaults `JAVA_HOME` to JDK 21 and resolves the watch itself — so `ANDROID_SERIAL` needs no pinning
and a running emulator is never the target, which bare `installDebug` cannot promise. The three
tools that take arguments stay direct, since npm would need a `--` in the middle of each.

**Always name a state, never a number.** Every tool takes the state name — `gloves`, `wedcoffee` —
and `node tools/mock-state.ts list` prints the full set. The digits in `docs/states/05-gloves.png`
exist only so a file explorer lists the frames in reading order; they are positional, a full sweep
recalculates every one of them, and a number written into a doc, a comment or a commit message goes
stale silently. Do not introduce one.

## Nothing that moves can be judged from a screenshot

Parallax, the Zzz drift, the falling rain, the sweat drips, the ambient crossfade — all invisible in
a still, and all invisible to the validator. **Three features once shipped broken for exactly this
reason.** `cycle-states.ts` mocks every state `--live` so the accelerometer and clock stay real; that
is the only way to judge motion, and the wrist is the final word.

## What a green result does not prove

- **A Gradle exit code** proves Gradle ran. A swallowed exit code once hid a build that never ran.
- **`result=1 ... Runtime=[2]`** from the activation broadcast means "a face with that id is now
  active", **not** "your new build is running". It succeeds against whatever is already installed.
- **`BUILD SUCCESSFUL`** with the verification jars absent means nothing was verified — they are
  gitignored, so a fresh clone skips both tasks silently. Check for the `PASSED` / `PASS` lines.
- **`mock-state status` "clean"** describes the **working tree**. After a capture run the watch is
  normally still on a mock, which pins the clock, zeroes the accelerometer and swaps the clock block
  — a combination that once produced three separate bug reports, none of them in the face.

The check that settles it: **compare the installed APK's md5 against the clean build**
(`cycle-states.ts --restore` does this).

## Capture traps

- **`KEYCODE_WAKEUP` does not wake the watch out of AOD** — with always-on display the screen is
  already on, so it is a no-op and every capture comes back ambient. **A tap wakes it**:
  `input tap 213 213`, sent _after_ the `set-watchface` broadcast.
- **`KEYCODE_HOME` toggles** between the face and the launcher. It is the fix when a capture comes
  back wrong, not something to send pre-emptively.
- **A capture can land mid ambient crossfade**, and that frame looks like a deliberate design
  decision. Discriminate by measurement, not by eye: an undimmed frame renders cream at luminance
  **247 exactly**.
- **`dumpsys battery set` survives a disconnect**, leaving the watch on a fake level indefinitely.
  Always finish with `reset` and check it landed.
- **`adb exec-out ... > file.png` corrupts the PNG in PowerShell** — `>` is not a byte pipe. Use
  `screencap` to the device and `pull` it back.

## Per machine, not once ever

JDK **21** (not 25 — Gradle 8.11.1's Kotlin compiler dies on it, and `./gradlew --version` still
works, so it looks fine until the first real build). The two verification jars are gitignored and
re-downloaded per machine. Wireless debugging only — the PW4 charger has no data path — and the
**pairing is per network**. A new machine additionally needs the package uninstalled from the watch
first, since debug keystores are per machine.
