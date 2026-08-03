# TODO — getting redPlant Blob onto the watch

Ordered so that nothing blocks on the watch until the face already works in an emulator.

## Start here (as of 2026-08-04)

The design backlog is empty. Eight requested changes went in on 2026-08-04 and
are all verified on the watch — see the session log at the top of Findings. The
states are renumbered into reading order (`0-ambient` … `8-sweating`) and
`docs/states/` is current. `preview.png` is a deterministic mock shot through
the new `tools/preview-mock.mjs`.

Genuinely left:

1. **Judge the ambient transition by eye.** The crossfade windows are now
   disjoint, so the halo is structurally impossible — but that is reasoning,
   not observation, and measurement cannot check it (see the `<Variant>`
   finding for why `screencap` is too slow).
2. **The thunderstorm condition code** still needs an actual thunderstorm.
3. Smaller: lowering the companion's arms at night so the pair can sit closer,
   and the ~15 `Variant` elements still on default timing.

Optional, if you want them: the preview carries a Wear OS system dot near the
bottom edge (it is a system overlay, not part of the face), and the `docs/`
history directory `verified-2026-08-03/` is now redundant.

## Superseded — earlier "start here" (2026-08-03, third session)

**Almost everything on the old list is closed.** The toolchain was rebuilt from
scratch on the second machine (see "Bootstrapping on a fresh machine"), the face
validates against v5 / assembles / passes the memory footprint check here, and
the whole design backlog has now been seen on hardware. `git init` is done; the
repo starts at `cd4d3ca`.

Closed this session, all on the real watch: the **full state sweep** (all seven
states plus a genuine greyscale AOD frame, in `docs/states/`), the **operator
question** (`<`, `<=`, `!=` all work — the reversed-operand workaround is
unnecessary), the **date chip centring** (−2.5px, fine), a **real
`preview.png`**, and a **broken umbrella** that the sweep exposed and that is now
fixed.

**Section 5 is now closed** — outdoor legibility at 3000 nits was confirmed good
on 2026-08-03, so nothing is gating the design any more.

What is genuinely left:

1. **Judge the ambient transition by eye.** Measurement could not settle it:
   `screencap` costs ~300ms a frame, which is the same order as the whole
   transition, so a burst of 60 frames across several transitions never caught
   an intermediate one. See the `<Variant>` finding.
2. **The thunderstorm condition code is still unknown** — it needs an actual
   thunderstorm. Codes 1, 12 and 14 are now recorded; the probe technique for
   reading more is written up under "WEATHER.CONDITION codes".
3. **The umbrella canopy has a flat top** and reads as an awning rather than a
   dome. Judgement call, not a defect — see the session log.
4. Smaller: lowering the companion's arms at night so the pair can sit closer,
   and the ~15 `Variant` elements still on default timing.

Note the watch has to be **re-paired on every new network** — wireless debugging
is the only transport (the PW4 charger has no data path), and the pairing is
per-network. A new *machine* additionally needs the package uninstalled from the
watch first; see "A new machine cannot update the watch's existing install".

## 1. Toolchain (per machine, ~30–60 min mostly downloads) — DONE

**This is per machine, not once ever.** It was redone from scratch on 2026-08-03
for the second machine, headlessly and without Android Studio — that recipe is in
"Bootstrapping on a fresh machine" under Findings, and it is the one to follow
next time. The checklist below is the original Android Studio route, kept because
the gotchas in it still apply.

- [x] Install **Android Studio** (brings its own JDK + Gradle). Nothing else on this
      machine has Java, so this is the hard prerequisite.
      **Not actually required** — the CLI toolchain alone gives a green build. Studio
      buys the inline WFF XML validator and the emulator GUI, nothing the build needs.
- [x] **You also need a second JDK.** Android Studio's bundled JBR is **JDK 25**, and
      Gradle 8.11.1 cannot run on it — the Kotlin compiler it embeds (2.0.20) throws
      `IllegalArgumentException: 25.0.2` while compiling the `.gradle.kts` files.
      `./gradlew --version` still works, which makes this look fine until the first
      real build. Installed **Temurin JDK 21** to `~/.jdks/jdk-21.0.12+8` and set
      `JAVA_HOME` + `PATH` to it. In Android Studio, *Settings → Build, Execution,
      Deployment → Build Tools → Gradle → Gradle JDK* must also point at 21 or the
      IDE sync fails the same way.
- [x] ~~*SDK Manager → SDK Platforms* → install **Android 16 / API 36**~~ — not needed
      by hand. The first `assembleDebug` auto-installed platform 36 and build-tools 35
      and accepted the licences itself.
      (Staying on 36 is deliberate: it installs on Wear OS 6 *and* 7 watches. Going
      `compileSdk = 37` instead also needs the AGP pin in `build.gradle.kts` raised.)
- [x] *SDK Manager → SDK Tools* → confirm **Android SDK Platform-Tools** (gives you `adb`)
      and add its path to `PATH`.
- [x] Open `redWatchFace/` in Android Studio, let it sync. Accept the AGP/Gradle upgrade
      prompt if it appears — the pinned AGP 8.10.1 / Gradle 8.11.1 are just a floor.
- [x] Verify the wrapper got generated: `./gradlew --version` should work afterwards.
      The wrapper was **not** generated by the sync — only `gradle-wrapper.properties`
      existed. `gradle wrapper` can't help either (there is no standalone Gradle on this
      machine and Android Studio hasn't bundled one for years); `gradlew`, `gradlew.bat`
      and `gradle-wrapper.jar` were fetched from the Gradle repo at tag `v8.11.1`.
- [x] *Emulator only* — the SDK ships no `cmdline-tools`, so there is no `sdkmanager`
      or `avdmanager`. Installed rev 22 into `<sdk>/cmdline-tools/latest`.

## 2. First build (~10 min) — DONE

- [x] `./gradlew :watchface:assembleDebug` — must succeed with zero resource errors.
- [x] Watch the Android Studio editor for inline WFF schema warnings in
      `res/raw/watchface.xml`. Fix anything it flags; the XML was schema-checked by hand
      against the v4 XSDs but never run through the real validator.
      **The hand-check had missed two real violations** — the validator caught both:
      - `<Template>` with no `<Parameter>` (the `--°` and `--` placeholders). Static
        text has to be `Font` content directly; the schema requires ≥1 `Parameter`.
      - `Arc` has no `sweepAngle` attribute. Per `arcElement.xsd` both `startAngle`
        and `endAngle` are `use="required"`. The 4 eye/brow arcs now use
        `270→450` and `282→438` — deliberately left past 360 rather than wrapped, so
        the sweep stays unambiguously positive and clockwise.
- [x] Not optional after all — download the two jars from
      [google/watchface](https://github.com/google/watchface) into `tools/`
      (`wff-validator.jar`, `memory-footprint.jar`), then:
      - [x] `./gradlew :watchface:validateWatchFaceXml` → PASSED against version #4
      - [x] `./gradlew :watchface:checkMemoryFootprint` → PASS
            (ambient 3.18 / 10 MB, active 2.37 / 100 MB — ambient is the tight one
            because the tool disables resource de-duplication there)
- [x] Both Gradle tasks were broken and are now fixed in `watchface/build.gradle.kts`:
      `validateWatchFaceXml` reported `BUILD SUCCESSFUL` over a failing validation
      because the jar prints `SEVERE` but **exits 0**; `checkMemoryFootprint` passed a
      `--apply-v2-features` flag the tool doesn't have and had no `dependsOn`, so it
      raced `assembleDebug` and would silently skip. Both now also use the JDK Gradle
      runs on instead of bare `java` from `PATH`.

## 3. Emulator pass — iterate here, not on the wrist (~20 min) — DONE

- [x] Create a **Wear OS 6 / API 36** round AVD (*Device Manager → Add → Wear OS Round*).
      Done from the CLI as `redwatch_wear6_round` (`wearos_large_round`, 454×454, the
      closest profile to the 456×456 the XML header targets). Two gotchas:
      - For API 36+ the only Wear image is tagged **`android-wear-signed`**, not
        `android-wear`: `system-images;android-36;android-wear-signed;x86_64`.
      - That image ships no `devices.xml`, so `avdmanager` errors on it and **silently
        fails to apply the round shape** — `config.ini` came out with
        `hw.lcd.circular=false`. Set it to `yes` by hand, or the bezel check below is
        meaningless. Boot log should show `androidboot.emulator.circular=1`.
- [x] Run the `watchface` configuration; it installs and activates the face automatically.
      From the CLI, `installDebug` + the DEBUG_SURFACE broadcast from step 4 works;
      a successful activation answers `result=1 ... Runtime=[2]` (2 = the WFF runtime).
      If `adb devices` says `unauthorized`, `adb kill-server && adb start-server`.
- [x] Check the layout at real scale:
      - [x] time doesn't clip at the widest case (`23:58` in 24 h mode)
            Couldn't display `23:58` literally: `android-wear-signed` is a production
            `user` build (`ro.debuggable=0`), so `adb root` is refused and the clock
            can't be set. Measured instead — the colon sits at the identical x range in
            both 12 h and 24 h frames even as the narrow `1` moves between digit
            positions, so the digits are **tabular** and every `HH:MM` is the same
            width. `13:58` renders x 103–351 of 454, ~102 px clear each side.
      - [x] a 5-digit step count (`12345`) doesn't collide with the battery chip
            Verified with a temporary hardcoded `12345` (since reverted). No clipping,
            **23 px clear** of the battery icon — but only **5 px** from its own
            footprint icon, which is the actual tight spot. See findings below.
      - [x] the two blobs' feet aren't clipped by the round bezel — ~28 px of peach
            below the feet.
- [~] Feed the emulator a location so weather resolves: `adb emu geo fix 8.68 50.11`
      (that's Frankfurt — adjust). Until a provider answers, the face shows `--°` by design.
      **`geo fix` alone will never resolve weather here**, and there were *two*
      independent reasons — only the first was visible from the emulator:
      1. No location. `geo fix` returns `OK`, but logcat shows
         `WeatherDataSyncerV2: Failed to sync weather data / Unable to fetch Location`,
         and `dumpsys location` explains why: the gps provider is `ProviderRequest[OFF]`
         with `last location=null` and only passive listeners, so nothing consumes the
         injected fix and fused has nothing either.
      2. The face was on `format.version` 4, at which `[WEATHER.*]` never publishes at
         all — see the weather finding at the bottom of this file. So even a perfect
         location fix here would still have shown `--°`.
      Treat `--°` as the expected emulator state regardless; weather was only provable
      on the real watch.
- [x] Toggle ambient mode and confirm only thin white time + date remain:
      `adb shell am broadcast -a com.google.android.wearable.action.ENTER_AMBIENT`
      (`...EXIT_AMBIENT` to come back). Verified by measurement, not eyeball: zero
      pixels above luminance 12 anywhere below the time band. The faint marks along the
      bottom arc are neutral grey (mean RGB 4/4/3) — that's the emulator's circular-mask
      antialiasing, not the peach hill leaking through.
- [x] Heart rate and steps **cannot be simulated on this image**. `USE_SYNTHETIC_PROVIDERS`
      does switch the HAL, but `dumpsys package com.google.android.wearable.healthservices`
      shows the only synthetic actions registered are `FALL_OVER`, `START_SLEEPING` and
      `STOP_SLEEPING` — there is no `START_WALKING`. So `--` / `0` in the emulator is
      expected; those are step-5-on-the-wrist checks. The three health permissions are
      already granted via `pm grant`, so that prompt won't appear.

## 4. Wire up the Pixel Watch 4 (~15 min) — DONE

Remember: the PW4 charger has **no USB data path**, so this is wireless-only.

- [x] Watch: *Settings → System → About → Build number*, tap 7×.
- [x] *Settings → Developer options* → enable **ADB debugging** + **Wireless debugging**.
- [x] *Wireless debugging → Pair new device* → note IP:port + 6-digit code.
- [x] `adb pair <watch-ip>:<pair-port>` then `adb connect <watch-ip>:<debug-port>`.
      (Same Wi-Fi required. Re-`connect` whenever the watch sleeps.)
      The code can be passed inline — `adb pair 192.168.178.170:40263 806715` — which
      avoids the interactive prompt. The **pair port and the debug port are different**;
      the pair port also changes every time you reopen the dialog.
- [x] After connecting, the watch appears **twice** in `adb devices`: once as
      `<ip>:<port>` and once as `adb-<serial>._adb-tls-connect._tcp` (mDNS). Same
      device. Prefer the mDNS name — it survives the IP:port changing when the watch
      sleeps. **Pin it**, because `installDebug` otherwise installs to every connected
      device including the emulator:
      ```powershell
      $env:ANDROID_SERIAL = "adb-66021WRCVW20GK-QnLLgW._adb-tls-connect._tcp"
      ```
- [x] `./gradlew :watchface:installDebug`
- [x] Activate without touching the watch:
      ```powershell
      adb shell am broadcast -a com.google.android.wearable.app.DEBUG_SURFACE `
        --es operation set-watchface --es watchFaceId de.redplant.watchface.blob
      ```
      A successful activation replies `result=1 ... Runtime=[2]`.
- [x] **This watch is Wear OS 7 / API 37, not Wear OS 6 / API 36**
      (`ro.build.version.release=17`, `sdk=37`, `meridian_btwifi`). `minSdk = 36`
      installed on it without complaint, which is exactly what the `compileSdk = 36`
      hedge was for.
- [x] **Display is 426 × 426**, not the 456 × 456 the XML header claimed (now corrected).
      The 450 canvas therefore scales *down* ~0.95, and the emulator's 454 × 454 renders
      everything ~6% larger than the wrist does.

## 5. Verify on the wrist (~15 min) — mostly DONE

- [x] ~~Grant the health permission prompt when it appears.~~ **No prompt appears and
      none is needed.** `dumpsys package de.redplant.watchface.blob` shows all three
      health permissions `granted=false`, yet heart rate and steps both render — the WFF
      runtime reads the sensors and feeds the declarative face, which has no code of its
      own. The `uses-permission` lines in the manifest appear to be inert here; left in
      place rather than removed, since other watches or OS versions may gate on them.
- [x] Heart rate shows a number, not `--` → **92 bpm**. (It does blink to `--` between
      reads; that is a sensor gap, not a failure.)
- [x] Steps increase after walking around → **1676**.
- [x] Weather populates (needs the paired phone or Wi-Fi for location).
      → **30° Partly cloudy.** This needed a format-version bump; see the finding below.
- [x] Battery % matches the system value → face showed 92% against `dumpsys battery`
      `level: 92`.
- [x] ~~The coral low-battery colour is still unverified (needs a flat watch).~~
      **Verified.** Caught the watch at a real 6-8% on 2026-08-03: `BATTERY_IS_LOW`
      fires, and both the `%` text and the icon's fill bar render coral. Note Wear OS
      also paints its own low-battery indicator near the bottom of the screen at that
      level, which is not part of the face.
- [x] Let the screen go to AOD and confirm it's black + thin white — confirmed on the
      real watch, matching the emulator measurement. Still worth eyeballing for a day
      for actual battery cost.
- [x] ~~Legibility outdoors at 3000 nits: is navy-on-cream still comfortable, or should
      the interactive background go dark?~~ **Confirmed good, 2026-08-03.** The question
      was already half-answered by the dark redesign — the face is cream-on-black now,
      not navy-on-cream — and outdoors it holds up. No background change needed.
      This closes section 5 entirely.

## 6. Finish the preview — DONE

- [x] ~~Replace the generated placeholder with a real screenshot.~~ **Done
      2026-08-03.** `preview.png` is now a real 426×426 capture off the watch:
      HR 107, 3157 steps, 93%, 27° with the umbrella up in genuine rain.
      **Not** with the documented command — `adb exec-out ... > file.png`
      corrupts the PNG under PowerShell; see the finding below. Use:
      ```powershell
      adb shell screencap -p /data/local/tmp/preview.png
      adb pull /data/local/tmp/preview.png watchface/src/main/res/drawable/preview.png
      ```
      Two things worth knowing for the next re-shoot. The heart rate blinks to
      `--` between sensor reads, and a preview showing `--` reads as broken, so
      capture in a short retry loop and keep the frame where the HR box contains
      cream `#fff6e8` rather than placeholder `#c3b1a4`. And the watch must be
      tapped awake first — see the AOD note under the state sweep.
- [x] Rebuild + reinstall so the picker shows it. `checkMemoryFootprint` still
      **PASSES** with a real bitmap in place of the placeholder.
- [ ] The preview happens to show the *rain* state, since it was raining. It is
      honest and it shows the face has personality, but if you would rather the
      picker showed the baseline pair, re-shoot on a dry day.

## 7. Optional / later

- [x] ~~`git init` + first commit — nothing here is version-controlled yet.~~ **Done**
      2026-08-03, `cd4d3ca` "redWatchFace poc". Note `.gitignore` excludes `tools/*.jar`,
      so the two verification jars do **not** come with a clone — re-download them per
      machine (see the bootstrap finding).
- [ ] Design tweaks: colours are inline hex in `res/raw/watchface.xml` (palette listed in
      the header comment).
- [x] ~~`tools/generate-preview.mjs` has fallen a long way out of sync.~~ **Deleted**
      2026-08-03. It still drew the pre-redesign face — cream disc, peach hill, navy text,
      body speckles, eyebrow arcs, coral temperature, un-mirrored hero arms, fixed-width
      battery bar — so running it would have *replaced* a correct `preview.png` with a
      wrong one. Nothing in the build referenced it. A screenshot beats maintaining a
      second renderer now that the face runs on hardware; see step 6.

      Note `preview.png` itself is **required** and was kept: `watch_face_info.xml`
      references it as `@drawable/preview`, and removing it fails `aapt` with
      `resource drawable/preview not found` (verified). It is still the stale generated
      placeholder, so step 6 is the outstanding half of this.
- [ ] Consider a `<UserConfigurations>` colour theme picker (light/dark) instead of
      hard-coded cream — this is where WFF's `ColorConfiguration` earns its keep.
- [ ] Consider swapping one stat for a tappable `ComplicationSlot` so it can launch an app.
- [ ] If anyone else at redPlant wants it, they need a WFF-signed APK sideloaded the same
      way — Play Store distribution would need a separate bundle and a developer account,
      and Watch Face Push (dynamic install) is allowlist-only.

## Findings

### Bootstrapping on a fresh machine (no Android Studio, no admin)

Done end-to-end on 2026-08-03 for the second machine. **No Android Studio and no
elevation** — the whole thing lands under `%USERPROFILE%` and
`%LOCALAPPDATA%`, and it produced a green validate + assemble + memory-footprint
in about 15 minutes, most of it download time.

```powershell
# 1. JDK 21 — the zip, not the installer (see below)
#    https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.12%2B8/
#      OpenJDK21U-jdk_x64_windows_hotspot_21.0.12_8.zip
tar -xf jdk21.zip -C $env:USERPROFILE\.jdks       # -> ~/.jdks/jdk-21.0.12+8

# 2. Android cmdline-tools -> <sdk>/cmdline-tools/latest  (note the rename)
#    https://dl.google.com/android/repository/commandlinetools-win-13114758_latest.zip

# 3. env, user scope, no admin
[Environment]::SetEnvironmentVariable("JAVA_HOME",   "$env:USERPROFILE\.jdks\jdk-21.0.12+8", "User")
[Environment]::SetEnvironmentVariable("ANDROID_HOME","$env:LOCALAPPDATA\Android\Sdk",        "User")
#    + <jdk>\bin, <sdk>\platform-tools, <sdk>\cmdline-tools\latest\bin on PATH

# 4. packages
sdkmanager --sdk_root=$sdk "platform-tools" "platforms;android-36" "build-tools;35.0.0"

# 5. local.properties (gitignored, so it never survives a clone)
"sdk.dir=C:\\Users\\<you>\\AppData\\Local\\Android\\Sdk" > local.properties

# 6. the two jars — gitignored, so re-download per machine
#    gh release view --repo google/watchface   (or the API; assets are on the `release` tag)
```

Four things that cost time and will cost it again:

- **Do not install the JDK with `winget`.** The Temurin package is an MSI, an MSI
  writes to `Program Files`, and that means UAC. In a non-interactive shell the
  install just hangs forever with a `consent.exe` prompt nobody can see — it looks
  like a slow download. The zip to `~/.jdks` needs no elevation and matches the
  path the first machine used anyway.
- **`sdkmanager --licenses` cannot be automated by piping `y`.** It reads the
  console directly, so a non-interactive shell (stdin on the null device) leaves it
  sitting at `Review licenses… (y/N)?` and then reports `7 of 7 SDK package licenses
  not accepted`. Write the hash files into `<sdk>/licenses/` instead —
  `android-sdk-license` holds three SHA1s, one per line, and that is what the
  prompt would have written.
- **`Expand-Archive` fails on both of these zips** and its failure handler then
  spews a screenful of `Cannot find path …` from its own cleanup, which buries the
  real error. `tar -xf` is built into Windows 10+ and handles both fine.
- The two verification jars are `.gitignore`d (`tools/*.jar`), so a clone has the
  LICENSE files but not the jars, and both Gradle tasks then **skip silently** —
  `onlyIf` logs one `Skipping:` line and the build still says `BUILD SUCCESSFUL`.
  Check for the `PASSED` / `PASS` lines, not the build result.

Version drift worth noting against the first machine: cmdline-tools is **rev 19**
here (was 22), and `adb` is **37.0.1**. Neither mattered. The validator is 1.7.0,
which is the one that supports format version 5.

### Session log — 2026-08-04, design pass

Eight requested changes, a state renumbering, and a deterministic preview. All
verified on the watch; the full sweep in `docs/states/` is current.

- **Sweat beads are a triangle**, not a row. Three beads strung out
  horizontally read as three buttons on the forehead; one up and two below
  groups them into a single splash. Still fits the 13px band between the leaf
  tuft and the eye arcs.
- **Umbrella canopy is domed.** The four scallops were at y 2/0/0/2 — all four
  tops within 2px, so the silhouette was a straight 160px line and it read as an
  awning. Outer pair now drops to y 9, inner pair to y 1, and every ellipse
  still bottoms out at exactly 22 so the underside stays flat. It cannot be
  domed the other way (raising the inner pair) because the PartDraw box starts
  at y 0 and clips anything above it.
- **Steps icon is one tilted footprint.** The interesting part: a single ellipse
  plus a heel renders as a circle above a dot, which is exactly how the second
  version of this icon failed. A foot is a *taper*, so the sole is now two
  overlapping ellipses — wide-and-short toe pad over a narrow-and-tall instep.
  Rotation is back (-25°) but with a deliberately oversized 28×34 box; worst-case
  corner is 12.1 from the pivot against 14 to the edge, so it cannot clip.
- **Skeleton face is symmetric.** Eyes were at 16..22 and 23..29 (pair centre
  22.5) and the nose at 22.5, while the skull and the mouth bar were both
  centred on 22. Half a pixel of disagreement is enough to read as crooked once
  antialiasing spreads it.
- **Lightning connects.** The bolt's tip was at absolute (169, 320) and the
  burst's top spoke runs x 170.5..179.5 — so it stopped 1.5px clear and hung in
  mid-air. Group moved from (127, 256) to (133, 264), putting the tip at
  (175, 328): dead centre of the spoke, 20px inside it.
- **Zzz leave from the mouths.** The hero's chain started at y 336, which is
  9.5px *above* its mouth, on a shallow trajectory that extended backwards to
  the shoulder. The old comment claimed a steeper climb "is not available" —
  that was only true because the chain began level with the raised hand.
  Dropping the start to mouth height puts the whole chain below the hand and
  frees it to climb at ~35°.
- **Cold and freezing are separate.** `≤10°` gets scarf and gloves, `≤0°` adds a
  snowflake above the companion. Note this made the `IS_AVAILABLE` guard
  load-bearing: with no weather data `TEMPERATURE` reads 0, and `0 <= 10` is
  true, so without the guard both blobs would put scarves on every time weather
  dropped out. The old `0 > TEMPERATURE` form was false at 0 and so was
  accidentally safe; the new one is not.
- **Clock transition: the two copies no longer overlap at all.** v2's 0.55/0.45
  stagger still overlapped between 0.45 and 0.55, and that window is centred
  exactly on the moment both copies sit near half alpha — the worst possible
  place for it, which is why it read as "different but not smooth". The windows
  are now disjoint (out by 0.45, in from 0.50), so two clocks are never
  simultaneously visible and the halo cannot form at any weight difference.
  BOLD therefore stays; this does not depend on the weights being close.

**Follow-up pass, same day**, after the first round was reviewed on the watch:

- **The snowflake really was lopsided** — not an antialiasing artefact. The
  vertical arm carried two branches at each end while each of the four diagonal
  arms carried one. It is now generated from centre + angle + radius rather
  than eyeballed: six arms at 60° steps, each with a branch pair at ±50°, 9
  from the centre. 50 rather than 60 because at exactly 60 a branch runs
  parallel to the neighbouring arm and the flake closes into a mesh.
- **Sweat went back to a shallow arc.** The triangle grouped the beads but read
  as too deliberate a shape, and it no longer matched the companion. Both blobs
  are now built to one pattern: `mini_sweat` is x 0/6/12 with y offsets 2/0/2,
  and the hero is that figure scaled 1.5× to suit the larger head. Matching the
  two matters more than either arrangement on its own.
- **The steps icon is a shoe print**, fourth and fifth shapes. The flat cut was
  right; the outline was not. Two things were wrong: parallel sides (a capsule,
  not a foot) and, once tapered, proportions — a sole 12 wide by 12.5 tall is
  practically circular and there is no length for a taper to happen over. Now
  11 by 15, about the 1:1.6 of a real sole.

  Worth keeping: **a union takes the widest shape at each height**, so a taper
  can be built additively by stacking parts of decreasing width, and a flat
  edge comes free from a rectangle exactly as wide as the part it continues.
  No masking, so no dependency on the background colour and none of the
  overshoot caveats every masked shape in this file carries.

**`tools/preview-mock.mjs` is new.** `preview.png` is what the picker shows, so
it should look like a good day rather than like whatever the sky and your pulse
were doing. Almost none of that is settable from the host, so the script
hardcodes the values into the XML, and you build, shoot, and restore. It keys
off the `<Expression name="...">` attribute rather than the expression body —
unlike `debug-triggers.mjs`, which has to match bodies and therefore has to
worry about substring ordering — and it **refuses to run if the scene declares
an expression the table does not know about**, since a new trigger would still
read live data and could fire in the preview.

The clock is the one value that cannot be substituted: `TimeText` renders the
system clock, has no literal mode, and its `<Font>` is the restricted
definition that accepts no children at all. The whole `<DigitalClock>` block is
swapped for a `PartText` instead.

Current preview: **19:12, Mon 19, 19° sunny, 88 bpm, 1912 steps, 88%**, blobs at
baseline.

Two bugs found in the tooling while doing this, both mine, both silent:

- The battery-reset verification hardcoded the range `81..87`. Adding level 88
  meant a genuine 82% reading — the watch does drain during a sweep — was
  reported as a stuck override. It now derives the range from the state table,
  and when the real level is legitimately inside the forcing range it says so
  accurately instead of claiming either success or failure.
- `capture-states.ps1 -Only a b c` silently bound `a` to `-Only` and threw `b`
  at `$OutDir`, so it captured one state into a newly created directory called
  `8-sweating` in the repo root — and reported success. The param block is now
  `[CmdletBinding(PositionalBinding = $false)]`, so stray positional arguments
  are an error. Note that under `powershell -File` a comma-separated list
  arrives as one string and matches nothing; use `-Command` for multiple states.

### Session log — 2026-08-03, third session (new machine, new network)

The whole "NOT yet seen on hardware" list below is now seen. Everything in it
survived review except the umbrella.

**The umbrella was broken, and the thing that was measured was not the thing
that was wrong.** The previous session's note worried about the new handle hook
clearing the forearm by ~4px. That checked out exactly — hook right edge at
canvas x 217, forearm at x 220.9 at the hook's depth, **3.9px**. But the shaft
ran from y 268 to y 310 at x 217, and the hero's raised fist is centred
(217.5, 297) spanning y 288–306, so **the shaft ran straight down the middle of
the fist**. Because the umbrella group is declared after `blob_hero`, it painted
*over* the hand. Zoomed in it read as a needle through a bead; at real size the
whole assembly read as a stethoscope.

Fixed by splitting the shaft into two segments with a gap where the fist is, so
the fist occludes it. Occlusion is the only cue available that says "gripped" —
there is no z-order beyond document order, and moving the group before
`blob_hero` would put the canopy behind the leaves, which the existing draw
order deliberately solves. Verified afterwards both in the forced state and in a
genuine 66%-precipitation rain state that happened to roll in during the session.

Two comments in `watchface.xml` were also just wrong arithmetic, both pre-mirror
leftovers: the fist was documented at absolute `(206, 297)` and at `(291, 298)`
in another place, when `blob_hero` is at x 207 and the local x is 10.5, so it is
`217.5`. Both corrected.

**Still open on the umbrella, as a judgement call rather than a defect:** the
canopy has a perfectly flat top. It is a rounded band with four scallop ellipses
whose y-offsets are 2/0/0/2, so the silhouette is an awning rather than a dome.
It could be domed without any masking — just lower the two outer ellipses so
their tops trace an arc — but that is a design decision, not a bug, so it was
left alone.

**Other things established this session**, each written up in its own finding:
the `<` / `<=` / `!=` question is settled (they work); `WEATHER.CONDITION = 12`
observed and, more usefully, the full set of values the weather sources return
while unavailable — including that **`IS_DAY` reads 1, not 0**; the date chip's
guessed centring measures −2.5px on a 426px display; `preview.png` is now a real
screenshot; and the capture script had three separate silent-failure bugs.

**The ambient transition could not be settled by measurement.** `screencap`
costs roughly 300ms a frame, the same order as the whole transition, so a burst
of ~60 frames across several transitions never caught an intermediate one — the
sequence goes straight from `sat 5.97%` to `sat 0.00%` between consecutive
frames. That is weak evidence that it is quick, not proof there is no halo. It
needs an eye, or a high-speed camera.

### Session log — 2026-08-03 (earlier)

Two batches of design changes went in. Everything below **validates against v5,
builds, and passes the memory footprint check**, but only the first batch was
seen on the watch — the battery died partway through the second.

**Verified on the Pixel Watch 4** (screenshots taken, measured where relevant):
battery gauge at 100 / 50 / 7%, the coral low-battery state, the date chip, the
cream temperature, the sweat beads clearing the eyes, and the hero's sleeping arm
(which needed a second pass — the first placement left the hand 2px above the
foot and it read as a third leg).

**NOT yet seen on hardware.** Treat every one of these as unreviewed:
umbrella canopy now over the shaft plus its new half-circle handle hook; the
startled storm face; the sunny cocktail; the companion's round sleeping mouth;
the footsteps icon; the nose fix; the blob repositioning; the rebuilt Zzz; and
the ambient transition change. The first thing to do next session is charge the
watch and run the state sweep.

Three things worth knowing that are not obvious from the diff:

- **The "noses" were an antialiasing artefact, not geometry.** Both mouths are
  built as a dark ellipse with a body-coloured `Rectangle` masking the top half.
  Both started the mask at the *same* y as the ellipse, and their antialiased top
  edges did not cancel — a 1px sliver of `#5a2a22` survived and read convincingly
  as a little nose dash. Fixed by starting each mask 3px above its ellipse. **Any
  mask built this way has to overshoot the shape it is cutting.**
- **The steps icon needed a third attempt.** It has been two teal droplet-ish
  ovals, then one beige sole-plus-heel rotated -24°, and on the watch that second
  version read as nothing but a big circle and a small circle. Two causes: a lone
  print has no context saying it is a print, and the rotation was applied to a
  `PartDraw` whose box was exactly its content, so the corners clipped off the
  taper that was doing the work. It is now two unrotated staggered prints.
  **Rotation on a `PartDraw` needs padding in the box or it silently clips.**
- **How close the blobs can get is capped by a night-only collision.** The
  companion's screen-right hand reaches 11px past its body and the hero's
  *sleeping* screen-left hand reaches 13px past its body the other way, at
  overlapping heights. They now miss by 1.5px. Both hands are also hard against
  their own group's edge, and PartDraw content is clipped to its box, so pulling
  a hand inward is not available either. See the note on `blob_companion`.

### A new machine cannot update the watch's existing install

First `installDebug` from the second machine failed with:

```
INSTALL_FAILED_UPDATE_INCOMPATIBLE: Existing package de.redplant.watchface.blob
signatures do not match newer version; ignoring!
```

Nothing is wrong. A debug APK is signed with `~/.android/debug.keystore`, that
keystore is generated per machine, and Android will not let a differently-signed
build replace an installed package. Uninstall first:

```powershell
adb uninstall de.redplant.watchface.blob
./gradlew :watchface:installDebug
```

The face drops back to a stock one for a few seconds and has to be re-activated
with the `DEBUG_SURFACE` broadcast, which the reinstall step does anyway. Nothing
is lost — a watch face has no user data. Copying `debug.keystore` between machines
would also work and would avoid the uninstall.

Note the **activation broadcast succeeded while the install was still failing**,
because the previous session's build was still on the watch. `result=1 ...
Runtime=[2]` means "a face with that id is now active", not "your new build is
running" — do not read it as confirmation that an install worked.

### `adb exec-out ... > file.png` corrupts the PNG in PowerShell

The command in step 6 and in the README was wrong on Windows:

```powershell
adb exec-out screencap -p > watchface/src/main/res/drawable/preview.png   # BROKEN
```

PowerShell's `>` is not a byte pipe. It decodes the stream as text and re-encodes
it on the way out, which prepends a UTF-8 BOM and mangles the binary — the file
starts `ef bb bf ef bf bd 50 4e` where a PNG must start `89 50 4e 47`. The result
is a `.png` that no decoder will open, and since `aapt` only needs *a* file at
that path, a corrupt one can get quite far before anything complains.

Use `screencap` to the device and `pull` it back, which never passes the bytes
through the shell:

```powershell
adb shell screencap -p /data/local/tmp/preview.png
adb pull /data/local/tmp/preview.png watchface/src/main/res/drawable/preview.png
```

Verify the header rather than the file size — a BOM-mangled PNG is still roughly
the right size.

### Memory footprint: the whole budget is the font

Measured 2026-08-04 with `--verbose`, which the Gradle task does not pass — run
the jar directly to see the breakdown:

```powershell
java -jar tools/memory-footprint.jar --watch-face watchface/build/outputs/apk/debug/watchface-debug.apk `
  --ambient-limit-mb 10 --active-limit-mb 100 --verbose
```

```
Counting resource Roboto; 2371712 bytes, 2.26 mb, 0 x 0 ARGB8888
Number of layers: 1, maximumResourceUsage: 2371712
Total images memory footprint: 2.26 MB
Max memory footprint in active:  2.26 MB   /  100 MB
Max memory footprint in ambient: 3.03 MB   /   10 MB
```

**Exactly one resource is counted, and it is the font.** Every ellipse, line,
arc, rectangle and round rectangle in the face — the blobs, the umbrella, the
starburst, the snowflake, all of it — contributes **zero**. That is the whole
argument for having drawn the characters from primitives instead of shipping
PNGs, and it means the shape budget is effectively unlimited.

Ambient reads higher than active on an identical face because the tool disables
resource de-duplication in ambient. Ambient is therefore the binding limit:
3.03 of 10 MB, about 30%, with ~7 MB spare.

What would actually cost something: a bitmap (`Image`/`PartImage`), an
`AnimatedImage` sequence (a 30-frame 450×450 ARGB8888 animation is ~24 MB and
would blow the ambient limit on its own), or a second embedded font. Note the
`SYNC_TO_DEVICE` family resolves to Roboto here — the "Using system default
font for unknown font family" lines in the output are expected, not a warning
about anything.

### The XSDs are in `memory-footprint.jar`, not the validator

Worth knowing before guessing at the schema again: `wff-validator.jar` contains no
WFF XSDs at all (the `XSD*.class` files in it are Xerces internals). The real
schemas ship inside **`memory-footprint.jar` → `docs.zip`**, one directory per
format version, `1/` through `5/`, rooted at `<version>/watchface.xsd`.

```powershell
# 99 files for v5
Expand-Archive tools/memory-footprint.jar -DestinationPath $tmp
Expand-Archive $tmp/docs.zip -DestinationPath $tmp/docs
```

### `<Transform>` is the escape hatch for value-driven geometry

This is what the "every slot is reserved at authoring time" note in
`watchface.xml` was missing, and it is now used for the battery gauge.

`x`/`y`/`width`/`height` on `Part*` elements really are authoring-time integers,
**but any of them can be re-bound at render time** by a `<Transform target="…"
value="…"/>` child holding an arithmetic expression:

```xml
<RoundRectangle x="3.5" y="3.5" width="15.5" height="8" cornerRadiusX="1.5" cornerRadiusY="1.5">
  <Transform target="width" value="1 + [BATTERY_PERCENT] * 0.145" />
  <Fill color="#5fb874" />
</RoundRectangle>
```

- Shapes accept it on `x`, `y`, `width`, `height` plus `cornerRadiusX/Y`
  (`roundRectangleElement.xsd`, `rectangleElement.xsd`).
- `Part*` elements accept it on `x`, `y`, `width`, `height`, `pivotX`, `pivotY`,
  `angle`, `alpha`, `scaleX`, `scaleY` and `tintColor`. Not on `name`.
- `<Fill>`'s `color` is transformable too (v4+), so a Condition is not the only
  way to recolour something.
- Keep the authored attribute equal to the **100% case**. Anything that renders
  the XML without honouring Transform falls back to that literal value, so an
  authored `width="15.5"` still looks like a full battery rather than an empty
  one. (The one such tool in this repo, `tools/generate-preview.mjs`, has since
  been deleted — but the convention costs nothing and Android Studio's own
  inline preview has the same blind spot.)

Related, and still unexploited: there is **no rendered-text-width source** in WFF.
The nearest thing is `textLength()`, which counts *characters*, not pixels. That
is why the new date chip is centred by estimate — see the comment on it.

### The "no `<`, `<=` or `!=`" claim WAS wrong — settled on the watch

`watchface.xml` carried this in two comments and worked around it by reversing
operands everywhere. The likely source is
`common/simpleTypes/arithmeticExpressionType.xsd`, whose `_operatorType`
enumeration does omit `<`, `<=` and `!=` — but that file is **byte-identical from
v1 to v5** and is not enforced anyway: `_arithmeticType` unions in `xs:string`,
so the validator accepts literally any expression string. A deliberately
nonsense expression passes validation.

The published reference lists the full set: `+ - * / %`, `~ | &`, `! || &&`,
`< <= > >= == !=`, `? :`, and functions from `round`/`clamp` to `icuText` and
`colorArgb`.

- [x] **Verified on the Pixel Watch 4, 2026-08-03.** Four throwaway `PartText`
      elements were dropped in, each gated on one expression, with the reversed
      form as the control:

      | label | expression | rendered |
      |-------|--------------------------|-----|
      | REV   | `200 > [HEART_RATE]`     | yes |
      | LT    | `[HEART_RATE] < 200`     | yes |
      | LTE   | `[HEART_RATE] <= 200`    | yes |
      | NE    | `[HEART_RATE] != 999`    | yes |

      All four rendered together. **`<`, `<=` and `!=` work.** The XSD
      enumeration is not authoritative and the reversed-operand workaround is
      unnecessary.

      Nothing was rewritten on the back of this, deliberately: the reversed form
      is correct, it is used consistently, and churning ~20 working expressions
      to save a few characters is risk without benefit. What this buys is that
      *new* expressions can be written the readable way round, and that the two
      long apologetic comments about it in `watchface.xml` are now just wrong.
      They are left in place only where they explain a specific existing
      expression; see the note on `hero_arm_rest`.

      In XML the operators need escaping: `&lt;`, `&lt;=`. `!=` needs none.

### `<Variant>` animates, and every one of ours was using the worst default

This is the answer to "why does the clock transition look so much worse than the
stock face". It is not that WFF snaps and the stock face animates — `Variant`
tweens on both. It is that `Variant` has timing attributes **from v4 onward** and
we were not setting any of them, so every transition ran on the defaults:

| attr | type | default |
|---|---|---|
| `duration` | `xs:float` 0.0–1.0, **normalized** to the vendor's transition time — not seconds | `1.0` |
| `startOffset` | `xs:float` 0.0–1.0; **silently ignored if `duration + startOffset > 1.0`** | `0.0` |
| `interpolation` | `LINEAR`, `EASE_IN`, `EASE_OUT`, `EASE_IN_OUT`, `OVERSHOOT`, `CUBIC_BEZIER` | `LINEAR` |
| `controls` | `vector4fType`, `CUBIC_BEZIER` only | `0.5 0.5 0.5 0.5` |
| `angleDirection` | `NONE`, `CLOCKWISE`, `COUNTER_CLOCKWISE` | `NONE` |

(`common/variant/variantElements.xsd`. In v1–v3 only `target`/`value`/`mode`
exist, so this is genuinely new capability we were not using.)

With `duration="1.0"` and `LINEAR`, the two clock copies both sat near alpha 128
at the midpoint — and since `BOLD` (700) and `THIN` (100) are six enum steps
apart, the thin white stem sat *inside* a much wider semi-transparent cream stem.
That halo is the "smear". The clock and date now stagger 0.55/0.45 with
`EASE_OUT`/`EASE_IN`, and ambient is `LIGHT` rather than `THIN` so any residual
overlap misaligns by two steps instead of six.

- [ ] **Still not settled — but not for lack of trying.** Measurement cannot
      resolve this. `screencap` costs ~300ms a frame, which is the same order as
      the entire transition, so bursts run on-device (no per-frame USB round
      trip, ~30 frames back to back) still stepped straight from interactive to
      ambient with nothing in between:

      ```
      f05  max 253  sat 6.49%   <- interactive
      f06  max 247  sat 5.97%
      f07  max 247  sat 5.97%
      f08  max 217  sat 0.00%   <- ambient, no intermediate frame
      ```

      Across ~60 sampled frames spanning several transitions, not one caught the
      crossfade. That is weak evidence the transition is quick; it is **not**
      proof the double-stem halo is gone, because the sampling interval cannot
      resolve it. This one genuinely needs an eye on the watch.

      If it is still not smooth, the next lever is `MEDIUM` (500) interactive /
      `LIGHT` (300) ambient, which nearly coincides. The OLED cost of a heavier
      ambient weight is negligible: the documented budget is 15% of pixels lit
      and this layer is a couple of per cent either way.
- [ ] The ~15 remaining `Variant` elements (blobs, chips, weather) are still on
      the defaults. They only fade out, so they cannot ghost, but a shorter
      `EASE_OUT` would get them off screen early instead of lingering through the
      whole ramp.

**What is NOT possible, so nobody spends another hour on it:**

- There is **no `[IS_AMBIENT]` source.** `sourceType.xsd` has exactly 100
  entries and ambient is not among them, so no `<Transform>` can track ambient
  state. Ambient is reachable *only* through `<Variant mode="AMBIENT">`.
- **`Font/@weight` is a closed 12-value enum** (`THIN` 100, `ULTRA_LIGHT` 150,
  `EXTRA_LIGHT` 200, `LIGHT` 300, `NORMAL` 400, `MEDIUM` 500, `SEMI_BOLD` 600,
  `BOLD` 700, `ULTRA_BOLD` 750, `EXTRA_BOLD` 800, `BLACK` 900, `EXTRA_BLACK`
  1000) with **no variable-font axis** — grepping the whole v5 tree for
  `wght`/`variation`/`axis` returns nothing. `weight` is not transformable; on
  `Font` only `color` is.
- **`TimeText`'s `<Font>` is a different, restricted element** defined locally in
  `clock/timeText.xsd`, not the one from `fontElement.xsd`. It accepts **no child
  elements at all**, so it cannot even hold a `Transform`. The validator rejects
  it outright.

So the stock face's smooth weight morph is almost certainly a real variable-font
axis animated by native render code, which is outside what WFF can express. We
can stop the crossfade looking like a crossfade; we cannot reproduce a morph.

There is also a **known Wear OS 6 platform bug**: if a third-party face's ambient
transition does not finish before the screen suspends, the runtime gets stuck
compositing the active *and* ambient layers at once — which looks exactly like
the ghosting we were chasing. First-party faces are unaffected. Staggering
shortens the window but cannot close it, so some of this may never be fixable
from XML.

### Validator PASS proves almost nothing about expressions

Worth internalising before trusting a green build. `Variant/@target` and
`Transform/@target` are plain `xs:string` with no enumeration, and
`arithmeticExpressionType` unions in `xs:string`. Confirmed empirically:

- `<Variant target="totalNonsenseAttr" value="7"/>` → **PASSES**
- `<Transform target="bogusAttr" value="[NOT_A_SOURCE] @@@ ###"/>` → **PASSES**

A misspelled `target` is silently ignored at runtime with no build-time signal.
The validator checks structure — element nesting, required attributes, types —
and that is all. Anything expression-level has to be seen on the watch.

### The charging screen is not ours

Docking hands the display to privileged system UI — on Wear OS 5 the redesigned
charging screen, on Wear OS 6 / Pixel Watch 4 the Material 3 landscape "bedside
clock" with the blue ring. The watch face is **not rendered at all**, and after
roughly half a minute the display simply turns off rather than falling back to
ambient. There is no API, intent or manifest entry to influence or replace it,
and `watchface.xsd`'s root element accepts only `Scene`, `BitmapFonts`,
`Metadata` and `UserConfigurations` — there is no dock or charging scene.

`[BATTERY_CHARGING_STATUS]` (boolean, v1+; **not** `IS_CHARGING`) does exist, but
it is only useful for styling the face while the face is the visible surface,
i.e. on the wrist. Also note `BATTERY_IS_LOW` is forced false while charging.

### No SVG, and only five drawing primitives

- `Image`/`PartImage`'s `resource` is an **Android drawable id**, not a path, and
  `AnimatedImage` restricts it to `[a-z_]+[a-z0-9_]*`. PNG is what every official
  example uses; `AnimatedImage` enumerates `IMAGE | AGIF | WEBP`.
- SVG is out — aapt does not compile it, so there would be no resource id.
- VectorDrawable XML is not documented either way, but Google's own Play-gating
  tool decodes every drawable through `javax.imageio.ImageIO`, which cannot read
  a `<vector>`. Treat it as unsupported.
- `substitutionGroup="DrawElement"` across the v5 schemas yields exactly
  `Line`, `Arc`, `Rectangle`, `RoundRectangle`, `Ellipse`. No `Path`, no polygon,
  in any version. Arbitrary shapes have to be pre-rendered to PNG — which is why
  the electrocution starburst is faked from twelve spokes.

### Weather needed WFF v5 — resolved, but it cost the Wear OS 6 hedge

`format.version` is now **5**, was 4. The `[WEATHER.*]` data sources only publish at v5:
at v4 the runtime reported `WEATHER.IS_AVAILABLE = false` permanently, even with the
Pixel Weather app on the watch showing 30° / Düsseldorf. Bumping the one property to 5
made the row render immediately.

What made this hard to spot — worth remembering, because nothing in the build complains:

- The **v4 XSD does list** `WEATHER.IS_AVAILABLE`, `WEATHER.TEMPERATURE` and
  `WEATHER.CONDITION_NAME`, so `validateWatchFaceXml` passed against v4 the whole time.
  The schema and the runtime disagree about what v4 supports.
- It is **not** a permission problem. `com.google.wear.permission.RECEIVE_WEATHER` exists
  but is `signature|privileged`, so a sideloaded face can never hold it — the runtime
  brokers weather the same way it brokers heart rate.
- The failure mode is indistinguishable from "no location yet", which is what the old
  note in step 3 assumed.

Consequences now carried in the code:

- **`minSdk` is still 36 while the format is v5.** A Wear OS 6 watch can install this and
  then fail to render. If it ever goes to anyone else, raise `minSdk` to 37 — which also
  needs `compileSdk`/`targetSdk` 37 and therefore the AGP pin raised.
- `checkMemoryFootprint` **no longer passes `--schema-version`**. That tool only accepts
  up to 4 and rejects 5 outright; without the flag it reads the version from the manifest,
  so it can't drift. The validator jar (1.7.0) does support 5.

### Weather availability is intermittent

`WEATHER.IS_AVAILABLE` goes false on its own after a while, even on a watch that had
live weather minutes earlier and still shows it in the Pixel Weather app. Re-opening
that app repopulates it. So the fallback branch is not just a cold-start state — the
face will drop to dashes periodically during normal use.

Practical consequence for anything weather-driven: gate **every** branch on
`IS_AVAILABLE`, or it will flicker between states as availability comes and goes.
The icon Condition in `watchface.xml` does this deliberately rather than using a
single `!IS_AVAILABLE` branch.

### Stepping through the blob states without waiting for the weather

`adb shell dumpsys battery set level N` **works on the watch without root**, and it is
the only host-settable value with a WFF data source behind it (`BATTERY_PERCENT`) - the
clock can't be set (production build, no root) and weather can't be faked at all. So to
review the reaction states, temporarily repoint each trigger at a battery level, build
once, and then switch states with a single command each:

| level | file | state |
|-------|------|------------------------------------------|
| —     | `0-ambient`       | display mode, not a data state      |
| 81    | `1-baseline`      | nothing firing                      |
| 82    | `2-night`         | closed eyes, round mouths, Zzz      |
| 83    | `3-sunny`         | shades + cocktail                   |
| 84    | `4-cold`          | ≤10° — scarf + gloves               |
| 85    | `5-freezing`      | ≤0° — snowflake                     |
| 86    | `6-rainy`         | umbrella up                         |
| 87    | `7-thunderstorm`  | bolt + startled face                |
| 88    | `8-sweating`      | heart rate ≥120                     |

Renumbered 2026-08-04 into reading order — quietest first, then time of day,
then weather by increasing severity, then the body-driven one. Ambient is 0
because it is the state the watch spends most of its time in.

**Where the real expressions nest, the forced ones have to nest too.** Freezing
(≤0°) is a strict subset of cold (≤10°), so a real freezing day shows scarves
and gloves *and* the snowflake. Mapping the two expressions to two distinct
battery levels broke that: level 85 rendered a snowflake above two blobs wearing
nothing, a state the watch can never actually be in — and it was written up as a
deliberate "lets each piece be reviewed alone" artefact, which was the wrong
call. A sweep that documents impossible states is not documentation.

`cold` therefore carries an explicit `replaceWith` in the STATES table covering
both 84 and 85. Any future trigger that nests inside another needs the same.

`tools/debug-triggers.mjs` does the repointing and `tools/capture-states.ps1`
drives the sweep into `docs/states/*.png`. Do not hand-edit the triggers: two of
them are compound expressions that contain a shorter trigger as a substring, so
substitution order matters and a hand edit can half-substitute one into something
that still validates but never fires. Full loop:

```powershell
node tools/debug-triggers.mjs on
./gradlew :watchface:installDebug
pwsh tools/capture-states.ps1
node tools/debug-triggers.mjs off
./gradlew :watchface:installDebug     # do not skip - otherwise the watch keeps
                                      # a build whose states are wired to battery
```

`node tools/debug-triggers.mjs status` says which state the working tree is in.
The `on`/`off` round trip is byte-identical (verified by checksum), and every
substitution asserts its own hit count, so editing a trigger in `watchface.xml`
without updating the script's `STATES` table fails loudly instead of silently
producing a sweep where one state is missing.

- [x] ~~**RE-RUN THE SWEEP — `docs/states/*.png` are all stale.**~~ **Done
      2026-08-03.** All eight frames in `docs/states/` are current: seven states
      plus a verified-greyscale AOD frame, and `all-states.png` rebuilt. The
      orphaned `2-sunglasses.png` was pruned automatically and `7-cold` is
      present. `docs/verified-2026-08-03/` is now redundant history rather than
      the only trustworthy record.

      **The sweep needed three fixes to the capture script before it produced a
      trustworthy set**, and all three failed *silently* — every bad frame landed
      on disk under a plausible name and looked deliberate in the contact sheet.
      Written up in "Three ways the capture script lied" below.

**Use levels well clear of the low-battery threshold.** The first version used
10 to 15 and every screenshot came back polluted: Wear OS enabled battery saver
and drew its own indicator over the face, and `BATTERY_IS_LOW` flipped the
face's battery text to coral. None of that is the state under review.

Three more traps, all hit in practice:

- **`dumpsys battery set` survives a disconnect.** Wireless debugging drops whenever the
  watch sleeps, and if that happens mid-session the watch is left reporting a fake
  battery level indefinitely. Always finish with `dumpsys battery reset`, and check it
  actually landed.
- **Reconnect using the mDNS serial**, `adb-<serial>._adb-tls-connect._tcp`, not
  `<ip>:<port>` - the port changes after every sleep, so the IP entry goes stale while
  the mDNS one keeps working. `adb mdns services` re-resolves the current port.
- **`KEYCODE_HOME` toggles.** From the watch face it opens the app launcher; from the
  launcher it returns to the watch face. So it is the *fix* when a capture comes back
  wrong, not something to send pre-emptively — sending it before every capture is what
  produced a whole run of app-icon grids.
  `KEYCODE_BACK` does **not** get out of the launcher (tried five times in a row, the
  lit-pixel fraction never moved off 0.32), and neither does an edge swipe.
  Always verify the frame: the face is almost entirely black, so a lit-pixel fraction
  above ~14% means the launcher or a notification is covering it. Then press HOME and
  retry — because it toggles, alternating converges in a couple of attempts.
- **`KEYCODE_WAKEUP` does not wake the watch out of AOD.** With always-on display
  the screen is already on — `dumpsys power` reports `mWakefulness=Dozing` — so the
  keyevent is a no-op and every capture comes back as an ambient frame. **A tap
  wakes it**: `input tap 213 213`. Send it *after* the `set-watchface` broadcast so
  the face is guaranteed to be the foreground surface, because this face declares no
  `ComplicationSlot` and a tap on it does nothing, whereas a tap on the launcher
  opens whatever icon is under that point.

### Three ways the capture script lied

All three produced files that looked like successful captures. Worth reading
before trusting any future sweep, and before "simplifying" `capture-states.ps1`.

1. **The screen dimmed mid-sweep and two states came back as ambient frames.**
   `Wake()` only sent `KEYCODE_WAKEUP`, which does nothing to the display
   timeout. The validation at the time was "bright somewhere, and mostly dark",
   which is *exactly* the signature of a thin-white-on-black AOD frame, so
   `5-night` and `7-cold` were written out as plausible-looking ambient shots.
   Fixed by holding the timeout open across the loop **and** by adding a colour
   test — ambient is strictly greyscale, the face has a coral heart and a green
   battery gauge, so chroma separates them where brightness cannot.

2. **Restoring the screen timeout silently left the watch never sleeping.** The
   first version of that fix read the "previous" value in two places and restored
   in two places. Wireless debugging drops constantly, one restore hit a moment
   when `Get-Watch` returned nothing and did nothing, and the *next* section then
   read the elevated 600000 as its original and faithfully put that back. The
   watch was left at a ten-minute screen timeout. Now: exactly one read, exactly
   one restore, retried and verified, and a guard that refuses to adopt any
   value ≥ 300000 as the thing to restore.

3. **A capture can land mid ambient crossfade.** Wear OS drives AOD from
   wrist-down detection, **not** from `screen_off_timeout`, so holding that
   setting open stops the screen blanking but not dimming. The resulting frame —
   blobs already faded, umbrella canopy not yet — is neither the face nor
   ambient, and is the worst kind of bad capture because it looks like a
   deliberate design decision. Caught by measuring rather than guessing:

   | frame | max | lit% | sat% |
   |---|---|---|---|
   | good states | 247 | 10–11 | 4.3–5.9 |
   | mid-transition | 217 | 3.72 | 1.49 |
   | dimmed-but-not-out | 255 | 7.31 | 2.99 |
   | true ambient | 217 | 2.37 | **0.00** |

   `max` is the sharp discriminator: an undimmed frame renders cream `#fff6e8` at
   luminance **247 exactly**, and any dimming drags it down. The thresholds in
   the script are those measurements, not guesses.

Also added: **`-Only 5-night,7-cold`** re-captures a subset. It deliberately skips
the orphan prune, the ambient shot and the contact sheet, since all three are
whole-set operations a partial run would corrupt.

And the header's claim that it needs **pwsh 7+ was wrong** — every sweep this
session ran on Windows PowerShell 5.1.

`ENTER_AMBIENT` does **not** work for capturing AOD: the broadcast is accepted but the
display will not dim a screen that was just woken, and capturing requires waking it.
Shortening `screen_off_timeout` and waiting it out is the only reliable route, and even
that sometimes catches the dimming transition rather than true AOD.

### WEATHER.CONDITION codes, as observed

Undocumented integer. Confirmed on a Pixel Watch 4 so far:

| code | meaning |
|------|---------------------------------------------|
| 0    | **not a condition — this is the "no data" value**, see below |
| 1    | clear         |
| 12   | observed 2026-08-03 at night, 27°, `CHANCE_OF_PRECIPITATION = 66`. Most likely showers or overcast; the icon Condition was on its rain branch at the time. Not confirmed against a label. |
| 14   | partly cloudy |

**What the sources read while weather is UNAVAILABLE**, measured directly in the
same session (the probe happened to catch a dropout, then recover three minutes
later):

| | unavailable | available |
|---|---|---|
| `IS_AVAILABLE` | 0 | 1 |
| `TEMPERATURE` | 0 | 27 |
| `CONDITION` | 0 | 12 |
| `IS_DAY` | **1** | 0 |
| `CHANCE_OF_PRECIPITATION` | 0 | 66 |

**`IS_DAY` reads 1 when there is no weather data**, not 0. That is the trap
behind the moon-in-daylight bug recorded below, and it is worse than it looks:
the fallback is not "unknown", it is a confident, wrong "daytime". At 22:47 on a
watch with no weather, `IS_DAY` said day. Every `IS_DAY` branch must therefore
be gated on `IS_AVAILABLE` as well - which is what the icon Condition already
does, but for a reason that was only half understood.

Finding `1` let the sunglasses trigger become exact (`CONDITION == 1 && IS_DAY &&
TEMPERATURE >= 25`) instead of the old warm-and-dry proxy, which could put shades on
during a warm overcast day.

- [ ] **Thunderstorm code still unknown.** The lightning bolt is gated on
      `CHANCE_OF_PRECIPITATION >= 90`, so it fires in any downpour rather than strictly
      during thunder. One equality test replaces it once the code is seen. This
      needs an actual thunderstorm; there is no way to fake it.

To probe, drop this in just before `</Scene>`, read it off the watch, then delete it.
Note `Template` goes **inside** `Font`, not beside it — the other way round fails
validation with `Invalid content was found starting with element 'Template'`:

```xml
<PartText name="probe_values" x="0" y="396" width="450" height="24">
  <Text align="CENTER">
    <Font family="SYNC_TO_DEVICE" size="17" weight="BOLD" slant="NORMAL" color="#5fb874">
      <Template><![CDATA[A=%d T=%d C=%d D=%d P=%d]]><Parameter expression="[WEATHER.IS_AVAILABLE]" /><Parameter expression="[WEATHER.TEMPERATURE]" /><Parameter expression="[WEATHER.CONDITION]" /><Parameter expression="[WEATHER.IS_DAY]" /><Parameter expression="[WEATHER.CHANCE_OF_PRECIPITATION]" /></Template>
    </Font>
  </Text>
</PartText>
```

**Always print `IS_AVAILABLE` alongside.** Without it a reading of `C=0 D=1 P=0`
looks like a real condition code of 0 on a clear day, when it actually means
there is no weather data at all. That misreading cost time before the table
above existed.

A probe element with no `<Variant mode="AMBIENT" target="alpha" value="0"/>`
stays visible in ambient, which is handy — the values can be read off an AOD
frame without waking the watch — but it also means the first capture is likely
to be an ambient frame, where the readings may not be live.

**Do not make the moon the `Default` of the icon Condition.** It was, and it put a
crescent on screen in broad daylight: as the catch-all it fired for "available, not wet,
not code 14, not day", which includes every moment `IS_DAY` reads falsy before it has
populated. The moon now needs an explicitly clear sky that is also not daytime, and the
Default is a plain cloud — right for real overcast, harmless for an unidentified code.

### Layout — both resolved by the dark redesign

- [x] ~~A 5-digit step count sits 5 px from its own footprint icon.~~ Fixed structurally:
      all three stat numbers are now `align="START"` instead of `CENTER`, so the
      icon-to-number gap no longer depends on digit count. Measured on the watch:
      10 / 8 / 8 device px for heart rate / steps / battery, against 21 / 10 / 2 before.
      A 5-digit count now ends ~19 design px clear of the battery icon.
- [x] ~~The `--°` weather placeholder is nearly invisible at 1.9:1.~~ Fixed for free by
      the dark background: `#d9a695` against black is roughly **8:1** rather than 1.9:1
      against cream. The colour did not need to change; the background did.
**Everything measured at real scale, 2026-08-03**, off `0-baseline.png` on the
426×426 device. Screen centre is x 213:

| element | x range | centre | offset |
|---------|---------|--------|--------|
| date row (`Mon 3` + chip) | 163–258 | 210.5 | **−2.5** |
| time | 95–330 | 212.5 | −0.5 |
| stat row | 87–339 | 213 | 0 |
| blob pair | 133–292 | 212.5 | −0.5 |

**The date chip's guessed centring is fine.** −2.5px on a 426px display is under
a percent and invisible in the hand — a good outcome for a layout that had to be
estimated, since WFF has no rendered-text-width source and `textLength()` counts
characters, not pixels. No change needed.

Lowest lit row is device y 373, which maps to canvas y 394 — exactly the bottom
of the `blob_hero` group (y 262 + height 132). The round bezel at that row spans
x 72–354, and the blobs span 133–292, so the feet clear it comfortably. The
render matches the coordinate model exactly, which is a useful thing to know:
canvas → device is a clean ×0.9467 with no surprises.

Both were still listed as open below this line until 2026-08-03, describing geometry
the file no longer has (`steps_value` at `x="26"` in a 66 px box, `chip_battery` at
`x="298"`). The current file has `steps_value` at `x="28" width="70" align="START"`
inside `chip_steps` at `x="172" width="98"`, with `chip_battery` at `x="280"` — a
10 px group-to-group gap. Deleted rather than left to be re-read as live.
