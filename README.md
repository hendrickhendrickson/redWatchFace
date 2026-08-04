# redPlant Blob — Pixel Watch 4 watch face

A Watch Face Format (WFF) **v5** watch face, built around the redPlant blob characters.
Shows digital time, weekday + day of month, weather, heart rate, steps and battery
percentage. Developed against a Pixel Watch 4 on **Wear OS 7 / API 37**.

> **v5 means Wear OS 7 in practice.** `minSdk` is still 36, so a Wear OS 6 watch will
> happily install this and then fail to render. The format had to go to v5 because
> `[WEATHER.*]` never publishes at v4 — see the weather finding in
> [TODO.md](TODO.md). If this ever goes to anyone else, raise `minSdk` to 37 (which
> also means `compileSdk`/`targetSdk` 37 and a higher AGP pin).

Everything visual is declarative XML — there is no code in this project (WFF forbids it),
and the blobs are drawn from primitives (ellipses, round rectangles, arcs, capsule lines)
rather than bitmaps, so they stay sharp at any resolution and cost almost nothing against
the memory budget.

![preview](watchface/src/main/res/drawable/preview.png)

---

## Prerequisites

Setting up is **per machine**, and it has been done twice now. Android Studio is
*optional* — the CLI toolchain alone gives a green build. What is actually required:

1. **JDK 21.** Not 25: Android Studio's bundled JBR is 25 and Gradle 8.11.1's embedded
   Kotlin compiler dies on it with `IllegalArgumentException: 25.0.2`. Confusingly
   `./gradlew --version` still works, so this looks fine until the first real build.
2. **Android SDK** with `platform-tools` (for `adb`), `platforms;android-36` and
   `build-tools;35.0.0` — via `sdkmanager` from the standalone command-line tools, or
   via Android Studio's SDK Manager.
3. Optional: **Android Studio**, for inline WFF XML validation as you type and the
   emulator GUI. If you use it, *Settings → Build, Execution, Deployment → Build Tools
   → Gradle → Gradle JDK* must also point at 21.

The copy-pasteable headless recipe — no Android Studio, no admin rights — is under
"Bootstrapping on a fresh machine" in [TODO.md](TODO.md), along with the traps
(`winget` hangs on an invisible UAC prompt, `sdkmanager --licenses` can't be scripted
by piping `y`, `Expand-Archive` fails on both zips).

The Gradle wrapper **is** committed — `gradlew`, `gradlew.bat` and
`gradle-wrapper.jar`, taken from the Gradle repo at tag `v8.11.1`. It is not generated
by an Android Studio sync (only `gradle-wrapper.properties` was), and `gradle wrapper`
can't bootstrap it either, since there is no standalone Gradle to run it with.

## Build and install

Open the project, pick the `watchface` run configuration, hit Run — Android Studio builds
the bundle, installs it and activates the face.

From the command line:

```powershell
./gradlew :watchface:installDebug

# make it the active watch face without touching the watch
adb shell am broadcast -a com.google.android.wearable.app.DEBUG_SURFACE `
  --es operation set-watchface `
  --es watchFaceId de.redplant.watchface.blob
```

### Getting adb onto the Pixel Watch 4

The PW4's side-contact charger has **no USB data path**, so the usual "plug the charging
cable into the PC" trick is gone. Use wireless debugging:

1. On the watch: *Settings → System → About → Build number*, tap 7× for developer options.
2. *Settings → Developer options* → enable **ADB debugging** and **Wireless debugging**.
3. *Wireless debugging → Pair new device* gives an IP:port and a 6-digit code.
4. On the PC:
   ```powershell
   adb pair <watch-ip>:<pair-port>      # enter the 6-digit code
   adb connect <watch-ip>:<debug-port>  # the port shown on the Wireless debugging screen
   ```

Watch and PC must be on the same Wi-Fi, and **pairing has to be redone on every new
network**. Two things that are not obvious:

- The **pair port and the debug port are different**, and the pair port changes every
  time you reopen the dialog. The code can be passed inline to skip the prompt:
  `adb pair 192.168.178.170:40263 806715`.
- After connecting, the watch appears **twice** in `adb devices` — once as `<ip>:<port>`
  and once as `adb-<serial>._adb-tls-connect._tcp` (mDNS). Same device. Prefer the mDNS
  name, since it survives the port changing when the watch sleeps, and **pin it** or
  `installDebug` installs to every connected device including any emulator:
  ```powershell
  $env:ANDROID_SERIAL = "adb-66021WRCVW20GK-QnLLgW._adb-tls-connect._tcp"
  ```

## Permissions

`[HEART_RATE]` and `[STEP_COUNT]` are the only permission-gated data sources used.
Wear OS 6 replaced `BODY_SENSORS` with the granular `android.permission.health.*`
permissions, so the manifest declares both (legacy capped at API 35).

**In practice no prompt appears and none is needed.** On the PW4, `dumpsys package
de.redplant.watchface.blob` reports all three health permissions `granted=false` and
heart rate and steps both render anyway — the WFF runtime reads the sensors and feeds
the declarative face, which has no code of its own to hold a permission. The
`uses-permission` lines are left in place in case other watches or OS versions gate on
them. Heart rate is sampled by the platform, not continuously by the face, so it updates
every few seconds rather than every beat, and briefly shows `--` between reads.

## Weather

Weather needs **WFF v5** — not v2+ as the schema implies. The v4 XSD lists
`WEATHER.IS_AVAILABLE`, `WEATHER.TEMPERATURE` and `WEATHER.CONDITION_NAME`, so the
validator passes at v4, but the runtime reports `IS_AVAILABLE = false` permanently
until `format.version` is 5. It also needs a weather provider plus location on the
watch, which comes from the paired phone or the network, not from watch GPS. It is
**not** a permission problem — `RECEIVE_WEATHER` is `signature|privileged` and a
sideloaded face can never hold it.

Two operational notes:

- `IS_AVAILABLE` **goes false on its own** after a while, even on a watch that had live
  weather minutes earlier. So gate every weather-driven branch on it, or the face
  flickers between states as availability comes and goes.
- **`IS_DAY` reads 1 while weather is unavailable**, not 0. The no-data fallback is a
  confident, wrong "daytime" — measured at 22:47 on a watch with no weather. Everything
  else reads 0 in that state (`TEMPERATURE`, `CONDITION`, `CHANCE_OF_PRECIPITATION`), so
  a `CONDITION` of 0 means "no data", not a real condition code. This is the trap that
  once put a crescent moon on screen in broad daylight.
- **On an emulator, weather never resolves.** `adb emu geo fix <lon> <lat>` returns `OK`
  but nothing consumes the fix (the gps provider sits at `ProviderRequest[OFF]`), so
  `--°` is the expected emulator state. Weather is only provable on a real watch.

## Layout

Design canvas is **450 × 450**; the platform scales it to the device. The PW4's display
is **426 × 426** (measured — the XML header used to claim 456 × 456), so the canvas
scales *down* by ~0.95 and nothing needs a per-size variant. Worth remembering when
iterating in the emulator: the Wear OS round AVD is 454 × 454, which renders everything
about 6% larger than the wrist does. If you later want size-specific artwork, add
`res/xml/watch_face_shapes.xml`.

| y range   | element                                    |
|-----------|--------------------------------------------|
| 42 – 74   | weekday + day of month (`Sat 1`)           |
| 68 – 188  | time (`hh:mm`, follows the 12/24 h setting) |
| 184 – 216 | weather (temperature + condition)          |
| 216 – 252 | heart rate · steps · battery               |
| 262 – 392 | hero blob + companion blob                 |

**Ambient / always-on mode** keeps only the date and the time, thin and white on black,
via `<Variant mode="AMBIENT">`. Everything else fades to alpha 0. That is both the
battery-friendly choice and roughly what the platform expects of an AOD.

## Reaction states

The blobs react to the data. Every accessory is an independent `<Condition>`, so
they **stack** — a wet night shows both sleeping blobs and the umbrella — and the only
thing deciding what covers what is document order.

| # | state | trigger |
|---|-------|---------|
| 0 | ambient | display mode, not data |
| 1 | baseline | nothing firing |
| 2 | night | `HOUR_0_23 >= 23 \|\| HOUR_0_23 < 7` |
| 3 | sunny | `CONDITION == 1 && IS_DAY && TEMPERATURE >= 25` |
| 4 | cold | `TEMPERATURE <= 10` — scarf + gloves |
| 5 | freezing | `TEMPERATURE <= 0` — adds a snowflake |
| 6 | rainy | `CHANCE_OF_PRECIPITATION >= 50` |
| 7 | thunderstorm | `CHANCE_OF_PRECIPITATION >= 90` |
| 8 | sweating | `HEART_RATE >= 120` |

Plus two marks that are not full states: a **step-goal flag** in the blob's left hand at
`STEP_PERCENT >= 100` (against the wearer's real `STEP_GOAL`), and a **moon phase** in
the gap above the companion at night, which the snowflake displaces when it is freezing.

Two bits of motion, neither visible in a still: the blobs shift with wrist tilt via
`<Gyro>` over the accelerometer (±8px on the hero, ±5.5 on the companion — the ratio is
what reads as depth), and the Zzz drift upward while fading in and out, the two sets a
second out of phase.

The accessories that *attach* to a blob — umbrella, lightning bolt, burst, both sets of
z's — each repeat their blob's Gyro gain by hand, because they are siblings of the blob
groups rather than children and inherit nothing. The snowflake and the moon deliberately
have none: they float, so holding them still is what puts them in the sky. **Changing a
blob's gain means changing every accessory that tracks it** — WFF has no variables. The drift runs off `[SECOND_MILLISECOND]`; there is **no
`[ANIMATION_VALUE]` source**, and `<Animation>` is a tween rather than a clock — see the
motion section in [TODO.md](TODO.md), since the wrong version of this passed the
validator and shipped.

To look at either one on the wrist, mock with `--live` (below). A plain mock pins the
accelerometer and the clock to constants, so both features are switched off in it.

Freezing is a strict subset of cold, so a real freezing day shows scarves *and* the
snowflake. Current screenshots of all ten frames are in [docs/states/](docs/states/),
with `all-states.png` as a contact sheet. The step-goal flag gets its own frame
(`9-step-goal`) even though it is a mark rather than a state, because unlike the
snowflake and the moon it shows up in no other frame — and a reaction with no
screenshot gets taken for a reaction that was never built.

**Every weather-driven trigger must be gated on `IS_AVAILABLE`** — not for tidiness but
because the no-data values are not neutral. `TEMPERATURE` reads 0, which satisfies
`<= 10`, so an ungated cold trigger puts scarves on the blobs every time weather drops
out, which it does routinely.

To review the states without waiting for the weather, `tools/mock-state.mjs` patches the
**data** — temperature, hour, heart rate — into `watchface.xml`, so the real Conditions
evaluate against known values, and `tools/capture-states.ps1` drives a build per state:

```powershell
powershell -File tools/capture-states.ps1                          # all ten
powershell -Command "& tools/capture-states.ps1 -Only 4-cold"      # one
powershell -Command "& tools/capture-states.ps1 -SheetOnly"        # redraw the contact
                                                                   #   sheet from disk
node tools/mock-state.mjs list                                     # what each state sets
```

`-Only` deliberately leaves `all-states.png` alone, so follow it with `-SheetOnly` —
which touches no device and builds nothing — rather than re-shooting eight unchanged
states to refresh one tile. `-Only 0-ambient` re-shoots just the ambient frame.

**A capture run installs a mock APK on the watch, and the script now reinstalls the real
build afterwards** — it verifies the package timestamp actually moved rather than
trusting an exit code. If you ever kill a run part-way, reinstall by hand. Note that
`mock-state.mjs status` reads the *working tree only* and will happily say
`real values (clean)` while the watch is still showing a mock: a mock build looks
completely normal apart from frozen motion, a dead accelerometer and a bold ambient
clock, which is exactly the set of symptoms that reads as "the watch face is broken".

To settle it definitively — better than squinting at a screenshot, since a mock differs
only in its data:

```powershell
adb shell md5sum $(adb shell pm path de.redplant.watchface.blob | % { $_ -replace 'package:' })
(Get-FileHash watchface/build/outputs/apk/debug/watchface-debug.apk -Algorithm MD5).Hash.ToLower()
```

Equal means the watch is running exactly what a clean tree builds.

To put one state on a wrist and *watch* it rather than photograph it:

```powershell
node tools/mock-state.mjs on night --live   # keeps accelerometer + clock live
./gradlew :watchface:installDebug
node tools/mock-state.mjs off               # ...and reinstall afterwards
```

`--live` exists because the defaults are tuned for stills: a plain mock freezes
`ACCELEROMETER_ANGLE_*` and `SECOND_MILLISECOND` so snapshots are byte-comparable, which
also means the parallax and the Zzz drift are both dead in it.

Every snapshot shows the same 19:12 / Mon 19 / 88 bpm / 1912 steps / 88% except for the
one value that state is about. Because the conditions are real, states that nest do so
in the snapshots too — freezing shows scarves *and* the snowflake, and a thunderstorm
shows the umbrella, since 90% precipitation also clears the 50% rain threshold.

Traps, all hit in practice, are in [TODO.md](TODO.md).

### How the blobs are built

Worth knowing before you edit them, because WFF has **no `<Path>` element**:

- **Body** — `RoundRectangle` with corner radii near half the width.
- **Leaf tuft** — three `PartDraw` layers, each rotated via `angle` about `pivotX/pivotY`.
  Each leaf's box is an oversized 80 × 80 square centred on the tuft base, so rotation
  never clips the shape.
- **Open mouth** — a dark `Ellipse` with its top half painted back over in the body
  colour. `Arc` accepts only `Stroke`, never `Fill`, so a filled half-moon has to be
  faked this way. **The mask has to overshoot the shape it cuts** — start it ~3px above
  the ellipse, not at the same y. Both mouths originally started flush, their
  antialiased top edges did not cancel, and the surviving 1px sliver read convincingly
  as a little nose.
- **Closed happy eyes** — stroked `Arc`. There is **no `sweepAngle`**; `arcElement.xsd`
  requires `startAngle` *and* `endAngle`. Angle 0 is 12 o'clock sweeping clockwise, so
  the upper half is `startAngle="270" endAngle="450"` — deliberately left past 360
  rather than wrapped to 90, so the sweep stays unambiguously positive and clockwise.
- **Limbs** — `Line` with `cap="ROUND"` plus a small filled `Ellipse` for the hand/foot,
  which is exactly how the CI illustrations are constructed.

Colours live at the top of [watchface.xml](watchface/src/main/res/raw/watchface.xml) as a
comment block; they are inline attribute values, so search/replace on the hex is the way
to retheme.

## Preview image

`res/drawable/preview.png` is what the watch face picker shows, and it is **required**:
[watch_face_info.xml](watchface/src/main/res/xml/watch_face_info.xml) references it as
`@drawable/preview`, so aapt fails the build outright if it is missing.

It is a **real screenshot** off the watch (426×426), but a *staged* one: the readings
are mocked so the picker shows a good day rather than whatever the sky and your pulse
were doing. Currently 19:12, Mon 19, 19° sunny, 88 bpm, 1912 steps, 88%, blobs at
baseline.

Almost none of that is settable from the host — the watch is a production build so the
clock cannot be set, weather cannot be faked at all, and heart rate and step count have
no synthetic providers. So `tools/mock-state.mjs` hardcodes the values into the XML
instead, and you build, shoot, and restore:

```powershell
node tools/mock-state.mjs on baseline
./gradlew :watchface:installDebug
adb shell input tap 213 213          # wake it - see below
adb shell screencap -p /data/local/tmp/preview.png
adb pull /data/local/tmp/preview.png watchface/src/main/res/drawable/preview.png
node tools/mock-state.mjs off
./gradlew :watchface:installDebug    # <- do not skip
```

The preview is just the `baseline` state, so it uses the same `BASE` values as every
snapshot and there is nothing separate to keep in sync. Edit `BASE` to change the
readings. Every substitution asserts, and the script **refuses to run if any source
token is left unmocked**, since an unhandled one would still read live data and could
fire in the preview.

### Judging motion

`capture-states.ps1` photographs states; [tools/cycle-states.ps1](tools/cycle-states.ps1)
*shows* them. Parallax, the Zzz drift and the ambient crossfade cannot be seen in a
still, so the only way to judge them is on a wrist:

```powershell
powershell -File tools/cycle-states.ps1                          # loop until stopped
powershell -Command "& tools/cycle-states.ps1 -Laps 1"
powershell -Command "& tools/cycle-states.ps1 -Only rainy,thunderstorm,night"
```

Every state is mocked with `--live`, holds for `-HoldSeconds` (default 20), and ambient
is skipped since both blob groups are alpha 0 there.

Ctrl-C is safe — the screen timeout and the real build come back in a `finally`. **A hard
kill is not**, and that is observed rather than theoretical: killing the owning job skips
`finally` and leaves the watch on a 45 s timeout running a mock. The original timeout is
written to `tools/cycle-states.state` first, so recovery is one command:

```powershell
powershell -Command "& tools/cycle-states.ps1 -Restore"
```

It puts the timeout back, reinstalls, and **verifies by comparing the installed APK's md5
against the clean build** rather than trusting an exit code.

For accessory parallax specifically, the states that matter are **rainy** (umbrella in
the fist), **thunderstorm** (bolt tip inside the burst spoke) and **night** (two Zzz
chains 150px apart). The rest are a control — their accessories live inside the blob
groups and were never at risk.

For an unstaged shot of the live face, just the two middle lines are enough.

**Do not use `adb exec-out screencap -p > file.png` on Windows.** PowerShell's `>` is
not a byte pipe — it decodes the stream as text and re-encodes it, prepending a BOM and
mangling the binary. The file starts `ef bb bf ef bf bd 50 4e` instead of the required
`89 50 4e 47`, and no decoder will open it. Since `aapt` only needs *a* file at that
path, a corrupt one gets surprisingly far before anything complains. Check the header,
not the file size.

Two more things for a re-shoot: the watch must be tapped awake (`adb shell input tap
213 213`) because `KEYCODE_WAKEUP` does not lift it out of AOD, and heart rate blinks to
`--` between sensor reads, so capture in a short retry loop and keep a frame where the
value is actually a number.

The old `tools/generate-preview.mjs`, which rasterised the XML geometry in plain Node,
has been **deleted**. It had drifted so far behind the face (it still drew the
pre-redesign cream disc, peach hill, navy text and body speckles) that running it would
have made the preview worse rather than better.

## Verification tools

Two jars from [google/watchface](https://github.com/google/watchface). They are
`.gitignore`d, so **a clone does not have them** — download them per machine into
`tools/` and the Gradle tasks activate:

| file                      | task                                    | what it checks                          |
|---------------------------|-----------------------------------------|-----------------------------------------|
| `tools/wff-validator.jar` | `:watchface:validateWatchFaceXml`       | XML against the v5 schema               |
| `tools/memory-footprint.jar` | `:watchface:checkMemoryFootprint`    | 10 MB ambient / 100 MB active limits    |

Both tasks are `onlyIf`-gated on the jar existing, so without them they log one
`Skipping:` line and the build **still reports `BUILD SUCCESSFUL`**. Look for the
`PASSED` / `PASS` lines, not the build result.

Two things the tasks work around, both fixed in `watchface/build.gradle.kts`:
the validator prints `SEVERE` but **exits 0**, so `Exec` alone would let an invalid
face through (the output is buffered and inspected instead); and
`checkMemoryFootprint` needs its `dependsOn("assembleDebug")` or it races the APK it
wants to measure and silently skips. It also deliberately passes **no**
`--schema-version` — that tool only accepts up to 4 and rejects 5 outright, so it reads
the version from the manifest and can never drift.

A green validator run proves less than it looks like. `Variant/@target`,
`Transform/@target` and the whole arithmetic expression type are plain `xs:string`, so
a misspelled target or outright nonsense passes validation and is then silently ignored
at runtime. Anything expression-level has to be seen on the watch.

Android Studio, if you have it, also validates WFF XML inline as you type, which catches
structural mistakes before a build.

This face uses no bitmaps and no embedded fonts, so the memory footprint is effectively
zero — the budget only becomes a concern if you add image assets or animation frames.

## Things WFF will not let you do

Relevant if you want to extend this:

- No code, no network, no custom data. Dynamic values come only from the platform data
  sources (`[…]` expressions) or from complications provided by other apps.
- Expressions are arithmetic/conditional only — no loops, no state between frames.
  The operator set **does** include `<`, `<=` and `!=`, verified on the watch — the
  XSD enumeration that omits them is not authoritative and is not enforced.
- Animation is limited to declarative `<Animation>`/`<Sweep>`/`<Gyro>` and image
  sequences; long PNG sequences hit the memory ceiling fast. `<Animation>` only
  *tweens* a value something else changed — for a free-running loop you drive a
  `Transform` off `[SECOND_MILLISECOND]` yourself.
- Ambient mode updates roughly once a minute, so no sweeping second hand there.
- Targeting v5 means Wear OS 7 in practice (see the note at the top). Lower
  `format.version` in the manifest **and** `minSdk` together if you ever need older
  watches — but v4 and below lose weather entirely.
- Debugging is guess-and-check: a code-free APK produces no logs.
- **No `[IS_AMBIENT]` data source exists**, so no `<Transform>` can track ambient state.
  Ambient is reachable only through `<Variant mode="AMBIENT">`.
- `Font/@weight` is a **closed 12-value enum** with no variable-font axis, and it is not
  transformable. The stock face's smooth weight morph is native render code and cannot
  be reproduced in WFF — see the `<Variant>` finding in [TODO.md](TODO.md).
- **No `<Path>` and no SVG** — the only draw primitives are `Line`, `Arc`, `Rectangle`,
  `RoundRectangle` and `Ellipse`, in every format version. Arbitrary shapes have to be
  pre-rendered to PNG.
- **The charging screen is not yours.** Docking hands the display to privileged system
  UI; the face is not rendered at all, and there is no hook to influence it.
