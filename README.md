# redPlant Blob — Pixel Watch 4 watch face

A Watch Face Format (WFF) **v4** watch face for Wear OS 6, built around the redPlant blob
characters. Shows digital time, weekday + day of month, weather, heart rate, steps and
battery percentage.

Everything visual is declarative XML — there is no code in this project (WFF forbids it),
and the blobs are drawn from primitives (ellipses, round rectangles, arcs, capsule lines)
rather than bitmaps, so they stay sharp at any resolution and cost almost nothing against
the memory budget.

![preview](watchface/src/main/res/drawable/preview.png)

---

## Prerequisites

Neither Android Studio nor a JDK is installed on this machine yet. You need:

1. **Android Studio** (any recent stable). It brings its own JDK and Gradle.
2. **SDK Platform 36** (Android 16 / Wear OS 6) via *SDK Manager → SDK Platforms*.
3. Optional but recommended: a **Wear OS 6 (API 36) emulator** image for fast iteration.

There is deliberately **no `gradlew`/`gradle-wrapper.jar`** committed (it's a binary).
Open the project in Android Studio and it will set the wrapper up, or run `gradle wrapper`
once if you install Gradle separately.

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

Watch and PC must be on the same Wi-Fi. The watch drops the connection when it sleeps;
just `adb connect` again.

## Permissions

`[HEART_RATE]` and `[STEP_COUNT]` are the only permission-gated data sources used.
Wear OS 6 replaced `BODY_SENSORS` with the granular `android.permission.health.*`
permissions, so the manifest declares both (legacy capped at API 35).

The system asks for these the first time the face is applied. If heart rate stays at `--`,
check *Settings → Apps → Permissions* on the watch. Heart rate is sampled by the platform,
not continuously by the face, so it updates every few seconds rather than every beat.

## Weather

Weather needs WFF v2+ (fine here) **and** a weather provider plus location on the watch —
which comes from the paired phone or the network, not from watch GPS. Until that resolves,
`[WEATHER.IS_AVAILABLE]` is false and the face shows `--°`. On an emulator, feed it a
location with `adb emu geo fix <lon> <lat>` or pair a phone emulator.

## Layout

Design canvas is **450 × 450**; the platform scales it to the device. Your 41 mm PW4 is
456 × 456 (same pixel count as the 45 mm — only the physical size differs), so the scale
factor is ~1.013 and nothing needs a per-size variant. If you later want size-specific
artwork, add `res/xml/watch_face_shapes.xml`.

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

### How the blobs are built

Worth knowing before you edit them, because WFF has **no `<Path>` element**:

- **Body** — `RoundRectangle` with corner radii near half the width.
- **Leaf tuft** — three `PartDraw` layers, each rotated via `angle` about `pivotX/pivotY`.
  Each leaf's box is an oversized 80 × 80 square centred on the tuft base, so rotation
  never clips the shape.
- **Open mouth** — a dark `Ellipse` with its top half painted back over in the body
  colour. `Arc` accepts only `Stroke`, never `Fill`, so a filled half-moon has to be
  faked this way.
- **Closed happy eyes** — stroked `Arc`. Angle 0 is 12 o'clock sweeping clockwise, so
  `startAngle="270" sweepAngle="180"` traces the upper half.
- **Limbs** — `Line` with `cap="ROUND"` plus a small filled `Ellipse` for the hand/foot,
  which is exactly how the CI illustrations are constructed.

Colours live at the top of [watchface.xml](watchface/src/main/res/raw/watchface.xml) as a
comment block; they are inline attribute values, so search/replace on the hex is the way
to retheme.

## Preview image

`res/drawable/preview.png` is what the watch face picker shows, and it is **required**:
[watch_face_info.xml](watchface/src/main/res/xml/watch_face_info.xml) references it as
`@drawable/preview`, so aapt fails the build outright if it is missing.

Update it with a screenshot of the real face:

```powershell
adb exec-out screencap -p > watchface/src/main/res/drawable/preview.png
```

The current file is still a generated placeholder from before the face ran on hardware, so
it does not match what the watch draws. It was produced by a `tools/generate-preview.mjs`
that rasterised the XML geometry in plain Node — that script has been **deleted**. It had
drifted so far behind the face (it still drew the pre-redesign cream disc, peach hill, navy
text and body speckles) that running it would have made the preview worse rather than
better, and a screenshot is strictly better than a reimplementation of the renderer now
that there is a watch to take one on.

## Verification tools

Two optional jars from [google/watchface](https://github.com/google/watchface). Drop them
into `tools/` and the Gradle tasks activate:

| file                      | task                                    | what it checks                          |
|---------------------------|-----------------------------------------|-----------------------------------------|
| `tools/wff-validator.jar` | `:watchface:validateWatchFaceXml`       | XML against the v4 schema               |
| `tools/memory-footprint.jar` | `:watchface:checkMemoryFootprint`    | 10 MB ambient / 100 MB active limits    |

Android Studio also validates WFF XML inline as you type, which catches most mistakes
before a build.

This face uses no bitmaps and no embedded fonts, so the memory footprint is effectively
zero — the budget only becomes a concern if you add image assets or animation frames.

## Things WFF will not let you do

Relevant if you want to extend this:

- No code, no network, no custom data. Dynamic values come only from the platform data
  sources (`[…]` expressions) or from complications provided by other apps.
- Expressions are arithmetic/conditional only — no loops, no state between frames.
- Animation is limited to declarative `<Animation>`/`<Sweep>`/`<Gyro>` and image
  sequences; long PNG sequences hit the memory ceiling fast.
- Ambient mode updates roughly once a minute, so no sweeping second hand there.
- Targeting v4 means Wear OS 6+ only. Lower `format.version` in the manifest **and**
  `minSdk` together if you ever need older watches, dropping the v2+ weather sources.
- Debugging is guess-and-check: a code-free APK produces no logs.
