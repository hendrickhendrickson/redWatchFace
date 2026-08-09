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

**The palette changes with the weekday.** The hero blob, both mouths, the date row and the
companion all key off `[DAY_OF_WEEK]`, and the companion always wears _tomorrow's_ hero
colour — so the small blob is a preview of the next day and the pair never share a hue. See
[Weekday colours](#weekday-colours).

![preview](watchface/src/main/res/drawable/preview.png)

---

## Prerequisites

Setting up is **per machine**, and it has been done twice now. Android Studio is
_optional_ — the CLI toolchain alone gives a green build. What is actually required:

1. **JDK 21.** Not 25: Android Studio's bundled JBR is 25 and Gradle 8.11.1's embedded
   Kotlin compiler dies on it with `IllegalArgumentException: 25.0.2`. Confusingly
   `./gradlew --version` still works, so this looks fine until the first real build.
2. **Android SDK** with `platform-tools` (for `adb`), `platforms;android-36` and
   `build-tools;35.0.0` — via `sdkmanager` from the standalone command-line tools, or
   via Android Studio's SDK Manager.
3. Optional: **Android Studio**, for inline WFF XML validation as you type and the
   emulator GUI. If you use it, _Settings → Build, Execution, Deployment → Build Tools
   → Gradle → Gradle JDK_ must also point at 21.

The copy-pasteable headless recipe — no Android Studio, no admin rights — is under
"Bootstrapping on a fresh machine" in [TODO.md](TODO.md), along with the traps
(`winget` hangs on an invisible UAC prompt, `sdkmanager --licenses` can't be scripted
by piping `y`, `Expand-Archive` fails on both zips).

The Gradle wrapper **is** committed — `gradlew`, `gradlew.bat` and
`gradle-wrapper.jar`, taken from the Gradle repo at tag `v8.11.1`. It is not generated
by an Android Studio sync (only `gradle-wrapper.properties` was), and `gradle wrapper`
can't bootstrap it either, since there is no standalone Gradle to run it with.

## watchface.xml is generated — do not edit it

`watchface/src/main/res/raw/watchface.xml` is a build artifact produced from
`tools/gen/*.ts`. Edit the TypeScript, then regenerate. A hand edit to the XML survives
until the next `node tools/gen/build.ts` and then vanishes.

```bash
npm ci                              # links hhson-lib and installs the dev toolchain
node tools/gen/build.ts             # regenerate watchface.xml
npm run verify                      # typecheck + lint + test + selftest + diff + check, the whole gate
node tools/gen/build.ts --diff      # prove it still renders the same as before the migration
node tools/gen/build.ts --selftest  # prove the differ can still fail
node tools/gen/build.ts --equiv "<a>" "<b>"   # do two expressions agree over a 783-row grid?
npm run typecheck                   # type-check the generator
npm run lint                        # prettier --check + eslint
npm run format                      # prettier --write
npm run test                        # vitest, for the pure modules with specs
```

**`watchface.xml` is not the only compilation target.** `face()` returns `Node[]` and
`serialize()` is a pure function of it, so a second pure function of the same tree renders
it to SVG instead — `tools/gen/svg.ts`. `npm run preview` puts that behind a Svelte app
with a state picker, a scrubbable clock, an ambient transition scrubber and a tilt pad, so
a change can be seen in a browser instead of costing a Gradle build, an install, a
broadcast and a wake. It is **not pixel truth** — text metrics belong to the device and
the easing curves are approximated — and the wrist stays the arbiter.

```bash
cd tools/preview && npm install     # once, isolated from the root package.json
npm run preview                     # the authoring loop
npm run preview:check               # prove the preview animates, clamps, clips and crossfades
node tools/gen/build.ts --svg       # the same renderer, straight to a file
```

`:watchface:validateWatchFaceXml` depends on `checkWatchFaceXmlUpToDate`, so a stale
committed file fails the build rather than shipping. That task **throws** if the generator
is missing, unlike the two jar-gated verification tasks which skip — a missing jar is a
separate download, a missing generator is a broken checkout.

Where things live:

| File                           | Holds                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `tools/gen/palette.ts`         | the 7 chosen weekday hexes; the other 21 are derived by HSL ratio                                    |
| `tools/gen/geometry.ts`        | every named box, plus `ANCHORS` — where each section sits on the canvas                              |
| `tools/gen/expr.ts`            | the closed `Source` union and the ramp / phase / triangle idioms                                     |
| `tools/gen/states.ts`          | the 24 named predicates and the `T` threshold table — the night window alone was written out 9 times |
| `tools/gen/condition.ts`       | `when()` / `whenElse()` / `switchOn()`, replacing 25 hand-written `Condition` scaffolds              |
| `tools/gen/type.ts`            | `FONT_FAMILY`, the type scale, and `font()` — 15 inline `<Font>` blocks                              |
| `tools/gen/crossfade.ts`       | `AMBIENT_HIDE` and the two fade windows, with the asymmetry argument                                 |
| `tools/gen/weekday.ts`         | `byWeekday()`, the seven-way fan-out that was written 11 times                                       |
| `tools/gen/blob.ts`, `chip.ts` | shared primitives; the two blobs stay separate call sequences                                        |
| `tools/gen/data/*.ts`          | the row tables — blobs, props, weather, chips, zzz                                                   |
| `tools/gen/face/*.ts`          | 17 section modules, one per Scene child, **in draw order**. Builders only                            |
| `tools/gen/eval.ts`            | a WFF expression interpreter, shared by `--equiv` and the preview                                    |
| `tools/gen/fixtures.ts`        | `BASE` + the 27 named states, shared by `mock-state.ts` and the preview                              |
| `tools/gen/svg.ts`             | the second backend: the same `Node[]`, rendered to SVG                                               |
| `tools/preview/`               | the Svelte app around it. Its own `package.json`; `npm run verify` never touches it                  |

**The gate is a semantic differ, not a byte comparison.** `tools/gen/model.ts` compares draw
order, tags, attributes and text against the committed baseline `tools/gen/face.model.json`,
normalising away comments, whitespace and `1.0` vs `1`. When a rendering change is intended,
`node tools/gen/build.ts --snapshot` accepts it and the new baseline lands in the same commit
as the change that caused it. The generated file looks nothing like
the hand-authored one — 4381 lines became **2189**, and the design notes moved onto the constants
they explain — but it must render identically. See `docs/authoring-strategy.md`.

There is also a **byte** check, `node tools/gen/build.ts --check`, which the semantic differ
does not replace: `--check` passing _without_ regenerating is proof that a refactor changed
nothing at all, which is a stronger claim than "renders the same" and the one the data-driven
pass was held to. Note that it was quietly broken for three releases by a line-ending
mismatch — see the emitter note in `tools/gen/xml.ts`.

The design prose that used to sit in the XML is now TSDoc in those modules. That was the
point: the palette table in the old XML header had already drifted, still listing the retired
navy `#8fa9c6` as the limb colour.

## hhson-lib

`submodules/hhson-lib` is a git submodule: shared coding rules (loaded into Claude Code as
`CLAUDE.md` + `.claude/skills/`) plus a small TypeScript utility library, imported flat from
the bare specifier `hhson-lib` (`objectKeys`, `objectEntries`, `assert`, `assertUnreachable`,
`isDefined`, `Collection`, …). It resolves through a `file:` dependency in `package.json` —
`npm ci`/`npm install` links it, which is also what makes the bare specifier work under plain
`node`, under `tsc`, and under Vite in `tools/preview`.

```bash
git submodule update --init          # once, after a fresh clone
npm ci                               # links hhson-lib and re-symlinks its skills
```

Two of the repo's own strictness flags are relaxed to match `hhson-lib`'s tsconfig —
`noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are both off. The reasoning and
what replaces them (index only where the surrounding code guarantees the element exists; wrap
an infinite-key `Record` in `Partial`) is written out in `tsconfig.json` and in
`/hhson-typescript`. Project-specific conventions that sit on top of the shared rules — module
filenames stay `kebab-case.ts`, `.svelte` files are not ESLint-linted — are in `CLAUDE.md`.

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

1. On the watch: _Settings → System → About → Build number_, tap 7× for developer options.
2. _Settings → Developer options_ → enable **ADB debugging** and **Wireless debugging**.
3. _Wireless debugging → Pair new device_ gives an IP:port and a 6-digit code.
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

### What the weather bundle does and does not contain

Re-checked against `sourceType.xsd` in the v5 tree on 2026-08-06. The complete set is
`IS_AVAILABLE`, `IS_ERROR`, `CONDITION`, `CONDITION_NAME`, `IS_DAY`, `TEMPERATURE`,
`TEMPERATURE_UNIT`, `TEMPERATURE_LOW`, `TEMPERATURE_HIGH`, `CHANCE_OF_PRECIPITATION`,
**`UV_INDEX`** and `LAST_UPDATED`, plus hourly (`WEATHER.HOURS.n.*`) and daily
(`WEATHER.DAYS.n.*`) forecasts of the same.

- **`UV_INDEX` is real and is now used** — it drives the sunglasses. It is an integer on
  the standard 0–11+ scale. **What has been proved on hardware is the branch, not the
  provider**: the sweep mocks the source to a literal 8, so `3b-uv.png` shows the shades
  firing correctly, but no live UV reading has been seen yet. If the shades never appear
  outdoors on a bright day, print `[WEATHER.UV_INDEX]` in a temporary `PartText` before
  touching the threshold — same caveat as `STEP_PERCENT`'s 0–100 assumption.
- **There is still no wind.** Not speed, not direction, not gust, and not in the hourly or
  daily patterns either. Also absent: humidity, pressure, air quality, sunrise/sunset.
- **There is no "is it snowing" flag.** The only handle on precipitation _type_ is
  `CONDITION`, an undocumented integer of which exactly two values have ever been observed
  on this watch (1 = clear, 14 = partly cloudy), and `CONDITION_NAME`, a string — and WFF
  expressions are arithmetic only, so a name cannot be compared in a `Condition` (it can
  only be _printed_). The available proxy is `TEMPERATURE <= 0 && CHANCE_OF_PRECIPITATION
  > = 50`: precipitation at or below freezing is snow or sleet in practice. That is not
  > built — today a freezing wet day gets blue rain — see [TODO.md](TODO.md).

## Layout

Design canvas is **450 × 450**; the platform scales it to the device. The PW4's display
is **426 × 426** (measured — the XML header used to claim 456 × 456), so the canvas
scales _down_ by ~0.95 and nothing needs a per-size variant. Worth remembering when
iterating in the emulator: the Wear OS round AVD is 454 × 454, which renders everything
about 6% larger than the wrist does. If you later want size-specific artwork, add
`res/xml/watch_face_shapes.xml`.

| y range   | element                                     |
| --------- | ------------------------------------------- |
| 42 – 74   | weekday + day of month (`Sat 1`)            |
| 68 – 188  | time (`hh:mm`, follows the 12/24 h setting) |
| 184 – 216 | weather (temperature + condition)           |
| 216 – 252 | heart rate · steps · battery                |
| 262 – 392 | hero blob + companion blob                  |

**Ambient / always-on mode** keeps only the date and the time, thin and white on black,
via `<Variant mode="AMBIENT">`. Everything else fades to alpha 0. That is both the
battery-friendly choice and roughly what the platform expects of an AOD.

## Weekday colours

`[DAY_OF_WEEK]` selects the hero's body colour. Everything else in the scheme is _derived_
from it rather than picked separately:

| day       | hero body              | its mouth | companion (tomorrow's hero) |
| --------- | ---------------------- | --------- | --------------------------- |
| Monday    | `#ee4e43` brand red    | `#5b2622` | `#f5c92e` yellow            |
| Tuesday   | `#f5c92e` yellow       | `#594c1e` | `#a5d63a` lime green        |
| Wednesday | `#a5d63a` lime green   | `#3f4c24` | `#6b9df2` medium blue       |
| Thursday  | `#6b9df2` medium blue  | `#273f69` | `#f0862f` orange            |
| Friday    | `#f0862f` orange       | `#57381f` | `#8fa3bc` blueish grey      |
| Saturday  | `#8fa3bc` blueish grey | `#3a434d` | `#b07ce4` purple            |
| Sunday    | `#b07ce4` purple       | `#482e62` | `#ee4e43` brand red         |

The cycle closes: Sunday's companion is Monday's hero, so there is no seam in the week and
the two blobs are never the same colour. Each blob's mouth is derived from **its own** body,
so the companion's mouth is a dark version of tomorrow's colour.

### Everything is derived from one hue, by measured ratios

Only seven values are chosen. The mouth and the date row are computed from each, in HSL,
using ratios **measured off the colours the face already had** — so Monday is unchanged to
within a rounding step and the other six inherit the same relationships:

```
mouth      body hue, S × 0.55, L × 0.41     from #ee4e43 body vs #5a2a22 mouth
date text  body hue, S 0.22,   L 0.78       from the retired ice blue #b9c6d4
date chip  body hue, S 0.20,   L 0.28       from the retired slate    #3a4757
```

A mouth that is merely "dark brown" reads as a smudge on a blue or a lime blob; a mouth that
is a dark version of the body reads as an _opening_ in it. And because the date row keeps the
old scheme's saturation and lightness exactly, only its hue moves — nothing about the row's
weight or contrast changed. On Thursday it lands very nearly back on the original ice blue
and slate, because those were blue to begin with.

**Ambient is deliberately not coloured**: `date_ambient` stays ice blue on black, since
colour costs OLED power on a screen nobody is looking at closely and the documented ambient
budget is 15% of pixels lit. It does keep the chip, as a 2px outline rather than a fill —
both for the pixel budget and because the two date copies are cross-faded against each
other, so they have to occupy the same boxes. See `tools/gen/crossfade.ts`.

### `[DAY_OF_WEEK]` is 1 = Sunday, not 1 = Monday

The source is undocumented in `sourceType.xsd`, so this was _measured_: a temporary
`PartText` printing the raw value read `5` on Thursday 2026-08-06. That is the Java/ICU
`Calendar` convention (`Calendar.SUNDAY == 1`) rather than ISO 8601. Assuming ISO would have
shifted every colour by a day — which looks exactly like a correct implementation six days
out of seven.

**Monday is the `Default` branch rather than a `Compare`**, so the brand red is what shows
for anything unexpected, including a reading of `0` the way `[WEATHER.*]` sources go blank.
Six `Compare`s plus a `Default` cover seven days with no gap and no overlap.

### The trap: the table is written out nine times

WFF has no variables, so the seven colours appear in nine places — hero body, hero round
mouth, hero open mouth, hero mouth **mask**, companion body, companion round mouth,
companion open mouth, companion mouth mask, and the date row.

The masks are the dangerous ones. An open mouth is a dark ellipse whose top half is painted
back over in the _body colour_ — `Arc` takes no `Fill`, so a filled half-moon cannot be drawn
any other way — so if a body and its mask disagree, the symptom is **a dark bar across the
face on exactly one day of the week**. Grep a hex before changing it and expect several hits.

One simplification fell out of this: the hero's round mouth (startled _or_ asleep) used to be
two `Compare` branches with byte-identical bodies, since the eyes above carry the whole
difference between a gasp and a snore. With the mouth colour now varying by weekday that
duplicate would have meant fourteen `PartDraw`s instead of seven, so the two tests are
combined with `||`.

Two collisions to keep an eye on, both against the green leaf tuft (`#4fa968` / `#5fb874`):
Wednesday's lime hero, and Tuesday's companion, which wears the same lime. The lime is
deliberately far yellower than the leaves so they still read as the darker green.

## Reaction states

The blobs react to the data. Every accessory is an independent `<Condition>`, so
they **stack** — a wet night shows both sleeping blobs and the umbrella — and the only
thing deciding what covers what is document order. **The one meeting-time prop is the
exception**: the coffee cup, the game controller and the cocktail all anchor to the
same fist, so only one of the three is ever drawn, in that priority order — see
[The meeting schedule](#the-meeting-schedule).

| #   | state             | trigger                                                                 |
| --- | ----------------- | ----------------------------------------------------------------------- |
| 0   | ambient           | display mode, not data                                                  |
| 1   | baseline          | nothing firing                                                          |
| 2   | night             | `HOUR_0_23 >= 23 \|\| HOUR_0_23 < 7`                                    |
| 3   | sunny             | `CONDITION == 1 && IS_DAY && TEMPERATURE >= 25` — cocktail              |
| 3b  | high UV           | `UV_INDEX >= 6 && IS_DAY` — sunglasses                                  |
| 4   | cold              | `TEMPERATURE <= 10` — scarf                                             |
| 4b  | gloves            | `TEMPERATURE <= 5` — adds mittens                                       |
| 5   | freezing          | `TEMPERATURE <= 0` — adds a snowflake                                   |
| 6   | rainy             | `CHANCE_OF_PRECIPITATION >= 50` — umbrella + falling rain               |
| 7   | thunderstorm      | `CHANCE_OF_PRECIPITATION >= 90`                                         |
| 8   | sweating          | `HEART_RATE >= 100` — one forehead pearl, drips begin                   |
| 8b  | puffing           | `HEART_RATE >= 120` — the outer pair of pearls                          |
| 8c  | drenched          | `HEART_RATE >= 150` — all three pearls, drips at full ramp by 200       |
| 10  | headset           | digital standup, `09:05–09:20` and `16:00–16:30` — hero only, no hand   |
| 10b | Friday headset    | Friday's game-time window, `15:00–15:30` — headset, hand still empty    |
| 10c | Friday controller | Friday `15:30–16:00` — a controller replaces the empty hand             |
| 10d | Wednesday coffee  | the in-person standup, `10:30–10:45` — no headset, a coffee cup instead |

The lettered rows are **sub-states split out of the row above them**, not new
mechanisms. What used to be one "sunny" Condition is now two: the sunglasses answer
`WEATHER.UV_INDEX` (6 is where the WHO/EPA scale calls the index "high") while the
cocktail keeps its original warm-and-clear trigger, so a bright cold March afternoon gets
shades and no drink. Cold splits the same way — 10° is scarf weather, 5° is gloves. Row
10 used to be the salute; see [The meeting schedule](#the-meeting-schedule) for why it
is a headset now.

Cold's steps are strict subsets of one another, so nothing has to exclude anything: 3° is
scarf _and_ gloves _and_ snowflake. The sweat bands are **not** subsets — the middle pearl
is deliberately absent from the 120–149 band, which is what makes the pearl count read
1 → 2 → 3 rather than 1 → 3 → 3.

**Two reactions are continuous ramps rather than states**, and the table flattens them:
rain scales with `CHANCE_OF_PRECIPITATION` and sweat with `HEART_RATE`. Their rows are
sample points, not switches.

Plus two marks that are not full states: a **step-goal flag** in the blob's left hand at
`STEP_PERCENT >= 100` (against the wearer's real `STEP_GOAL`) — which stands down for the
45 minutes a day the same hand is saluting — and a **moon phase** in the gap above the
companion at night, which the snowflake displaces when it is freezing.

Four bits of motion, none of them visible in a still: the blobs shift with wrist tilt via
`<Gyro>` over the accelerometer (±8px on the hero, ±5.5 on the companion — the ratio is
what reads as depth); the Zzz drift upward while fading in and out, the two sets a second
out of phase; **rain** falls in two columns whenever the umbrella is up; and **sweat beads
run down both cheeks**, faster and in greater number the higher the heart rate.

**Rain — 24 independent drops.** Every drop has its own track, start height, fall length,
rate, phase, size and precipitation threshold; nothing is shared between any two, so there
is no wave structure and the field's period is the lcm of 24 different cycles. Drop
**count, size and speed all scale with `CHANCE_OF_PRECIPITATION`** off one term,
`g = clamp((precip - 50) / 50, 0, 1)`: about 7 drops at the 50% gate against 24 at 100%,
3.0–3.8px wide against 3.9–4.9, and 66–74 px/s against 89–100. Count comes from each drop
carrying its own threshold (20, 25, … 92) folded into the alpha it already had, so drops
_fade_ in as the chance rises instead of popping.

The two columns **bracket the umbrella canopy**: it spans x 137–297, no drop ends after 137
on the left or starts before 297 on the right, so the wet strips are exactly what the canopy
does not cover and the dry band between them is its shadow. Drops deliberately cross the
raised hand, the step-goal flag, both Zzz chains and the burst's outer spokes — all at the
correct depth, since the rain is declared after the blobs and before the umbrella. The one
line held is that **no drop crosses either blob's body**; they are the characters.

**Sweat.** Drips scale linearly from 100 bpm to 200 —
`travel = 12 + 18 * clamp((HEART_RATE - 100) / 100, 0, 1)` — and since the period is fixed,
travel is also speed (6 px/s at the floor, 15 at the ceiling). A second bead per cheek fades
in across 140–160, and the static forehead cluster fills in three steps at 100 / 120 / 150.

Every drop and drip stays inside the round bezel at full travel, checked per element rather
than in aggregate, because the outer tracks sit lowest in the display's taper: worst case is
radius 213 of 225.

The accessories that _attach_ to a blob — umbrella, lightning bolt, burst, both sets of
z's — each repeat their blob's Gyro gain by hand, because they are siblings of the blob
groups rather than children and inherit nothing. The snowflake, the moon and the rain
deliberately have none: they float, so holding them still is what puts them in the sky.
**Changing a blob's gain means changing every accessory that tracks it** — WFF has no
variables. The sweat drips are the exception that needs no repetition: they live _inside_
the hero and companion groups, so they inherit the Gyro they belong to.

Every animation runs off `[SECOND_MILLISECOND]`. There is **no `[ANIMATION_VALUE]`
source**, and `<Animation>` is a tween rather than a clock — see the motion section in
[TODO.md](TODO.md), since the wrong version of that passed the validator and shipped.

Two phase formulas are in use, and the difference matters if you add anything:

```
p = (([SECOND] % N) + [SECOND_MILLISECOND] - [SECOND]) / N     # Zzz, sweat drips
p = fract([SECOND_MILLISECOND] * rate + offset)                # rain
```

The first only offers offsets in **whole seconds**, via `([SECOND] + k) % N`, which couples
the number of distinct phases to the period — three staggered things force a 3-second cycle,
and a 3-second cycle cannot be fast without a fall too long to fit the screen. That is why
the first rain attempt crawled and had to group drops into waves that shared a phase, and so
shared an alpha, and so visibly breathed in unison.

**`fract()` is verified on this watch** (2026-08-06) and removes that constraint: any
constant offset, any rate, so every element can have its own. The catch is that **`60 × rate`
must be a whole number**, since `[SECOND_MILLISECOND]` wraps 59.999 → 0 — which is why the
rain scales its speed through _travel_ and never through rate. Nothing else from the
schema's function list has been exercised here, and an unimplemented function inside a
`Transform` fails _silently_ while passing the validator.

To look at either one on the wrist, mock with `--live` (below). A plain mock pins the
accelerometer and the clock to constants, so both features are switched off in it.

Screenshots are in [docs/states/](docs/states/) with `all-states.png` as a contact sheet:
seventeen reaction frames plus ambient, and then **seven `w-<weekday>` frames** for the colour
scheme. The weekday frames are a theme dimension rather than reactions — each is the baseline
face differing only in hue — and all seven are kept rather than a sample, because the pairing
is the point: the only way to check the cycle closes is to see Sunday's companion match
Monday's hero. The set is current as of 2026-08-08 — row 10 was reshot after the salute
was replaced by the headset/coffee/controller schedule (see
[The meeting schedule](#the-meeting-schedule)); the four frames the old salute showed are
deleted rather than left stale under their old names. The step-goal flag gets its own frame
(`9-step-goal`) even though it is a mark rather than a state, because unlike the snowflake
and the moon it shows up in no other frame — and a reaction with no screenshot gets taken
for a reaction that was never built.

Sub-states are lettered (`3b-uv`, `4b-gloves`, `8b-puffing`, `8c-drenched`) rather than
renumbered, which avoids renaming everything downstream of an insertion. It was also meant to
avoid two-digit names, where `10-x` sorts before `2-x` — and row 10 has spent that budget
twice now: first on the salute (`10-salute`, `10b-salute-blocked`, `10c-friday-salute`,
`10d-friday-drink`, 2026-08-07), then on what replaced it (`10-headset`,
`10b-friday-headset`, `10c-friday-controller`, `10d-wednesday-coffee`, 2026-08-08). The
only cost is how the folder lists, since the contact sheet's order has come from the
declaration order rather than from filenames since the collation bug below.

**The sheet's order comes from the order the states are declared in, not from the
filenames**, and that is a correction rather than a preference: `Sort-Object` is
culture-aware and gives the hyphen almost no weight, so `3b-uv` collates as "3buv" against
"3sunny" and the first sheet put every sub-state _ahead of its own parent_. Reasoning from
the ASCII codes says the opposite ('-' is 0x2D, 'b' is 0x62) and is exactly what made the
naming scheme look safe before it was looked at.

**Every weather-driven trigger must be gated on `IS_AVAILABLE`** — not for tidiness but
because the no-data values are not neutral. `TEMPERATURE` reads 0, which satisfies
`<= 10`, so an ungated cold trigger puts scarves on the blobs every time weather drops
out, which it does routinely.

To review the states without waiting for the weather, `tools/mock-state.ts` patches the
**data** — temperature, hour, heart rate — into `watchface.xml`, so the real Conditions
evaluate against known values, and `tools/capture-states.ts` drives a build per state:

```bash
node tools/capture-states.ts                            # all twenty-four + ambient
node tools/capture-states.ts --only=4b-gloves            # one
node tools/capture-states.ts --sheet-only                # redraw the contact sheet from disk
node tools/mock-state.ts list                            # what each state sets

# any point BETWEEN the named states - both new reactions are continuous ramps
node tools/mock-state.ts on sweating --set=HEART_RATE=150 --live
node tools/mock-state.ts on rainy --set=WEATHER.CHANCE_OF_PRECIPITATION=70 --live
```

`--set=KEY=VALUE` is repeatable and exists because rain and sweat are functions of a
reading, not switches: judging them means sampling the middle of a ramp, and adding a named
state per value you want to eyeball once turns `STATES` into a junk drawer. It must be one
token — a bare `--set KEY=VALUE` would be read as the state name — and an unknown key aborts
rather than silently substituting nothing and leaving the source live.

**Two things can put a wrong frame on disk, and only one of them is the script's fault.**

_The screen dims and the check misses it._ `capture-states.ts` rejects a capture that is
not the interactive face, and until 2026-08-07 it tested `max luminance >= 240` — which a
half-brightness frame passed, because the watch draws a small pure-white system indicator
near the bottom of the screen and that pins `max` at 255 no matter how dark the face is.
The test is now the _fraction_ of pixels above luminance 200: 3.7–5.3% across every good
frame, 0.3% for the dimmed one. It was caught by comparing a body pixel — `(122,40,34)`
where every other frame reads `(238,78,67)`, exactly 51% — so **if a frame looks off, probe
a pixel rather than trusting the guard**.

_A notification chip lands on the face._ An ongoing notification (a Fitbit "Morning Brief",
in the case that produced this note) renders as a glyph over the bottom of the watch face
and appears in every frame shot while it is up. Nothing in the script can tell that apart
from the face, and dismissing it is a decision about someone's watch rather than a build
step. `adb shell cmd notification snooze --for <ms> '<key>'` parks it for the length of a
sweep and `unsnooze` puts it back; get the key from `adb shell dumpsys notification`. The
small white dot at the bottom of most frames is a different thing — that is the unread
indicator, it is in the older frames too, and it is left alone.

`-Only` deliberately leaves `all-states.png` alone, so follow it with `-SheetOnly` —
which touches no device and builds nothing — rather than re-shooting twenty unchanged
states to refresh one tile. `-Only 0-ambient` re-shoots just the ambient frame.

**A capture run installs a mock APK on the watch, and the script now reinstalls the real
build afterwards** — it verifies the package timestamp actually moved rather than
trusting an exit code. If you ever kill a run part-way, reinstall by hand. Note that
`mock-state.ts status` reads the _working tree only_ and will happily say
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

To put one state on a wrist and _watch_ it rather than photograph it:

```powershell
node tools/mock-state.ts on night --live   # keeps accelerometer + clock live
./gradlew :watchface:installDebug
node tools/mock-state.ts off               # ...and reinstall afterwards
```

`--live` exists because the defaults are tuned for stills: a plain mock freezes
`ACCELEROMETER_ANGLE_*` and `SECOND_MILLISECOND` so snapshots are byte-comparable, which
also means the parallax and the Zzz drift are both dead in it.

Every snapshot shows the same 19:12 / Mon 19 / 88 bpm / 1912 steps / 88% except for the
one value that state is about. Because the conditions are real, states that nest do so
in the snapshots too — freezing shows scarves and gloves _and_ the snowflake, and a
thunderstorm shows the umbrella and the rain, since 90% precipitation also clears the 50%
threshold both of those use.

The frozen clock in a mock is chosen so the animations are _visible_ in a still, which is
why `SECOND` is 1 and `SECOND_MILLISECOND` 1.0 rather than 0. Because every alpha here is
zero at both ends of its cycle, **a phase that lands on 0 at that instant renders nothing
at all** — so the constant is load-bearing, and anything new with a periodic alpha has to
be checked against it or its frame comes out empty.

At 1.0 the Zzz sit at alpha 170, and the leading sweat drip is mid-run at full alpha (its
2-second cycle puts it at p = 0.5; the trailing bead's is at p = 0 and is invisible, which
is correct for a still). The rain needs no such care since `fract()` gave every drop its own
rate and offset — they land scattered across their cycles by construction, so some are
bright, some are fading and a few are absent, which is what rain looks like anyway.

Traps, all hit in practice, are in [TODO.md](TODO.md).

### The meeting schedule

**Replaces the salute**, retired 2026-08-08 because it never fit what the windows actually
were: two of them were digital standups (a hand to the brow doesn't read as "on a call"),
Friday's afternoon window is a shared game session rather than a second standup, and
Wednesday — which had been saluting on the same schedule as everyone else — actually has no
digital standup at all, only a single in-person one. The full construction (the rotated-capsule
hand, the arm-asymmetry measurements, the busy-hand routing between two arms) is not reproduced
here since none of it ships any more; see the 2026-08-07 entries in `TODO.md` if you want the
hand-attachment technique for something else later, since a rotated capsule landing cleanly on a
limb is a genuinely reusable trick.

Four windows, all defined once in `tools/gen/meetings.ts` and restated at every site that reacts
to them, the same way the salute's window used to be — WFF still gives no way to reference one
Condition's expression from another:

|                    | window      | the hero gets                                           |
| ------------------ | ----------- | ------------------------------------------------------- |
| Mon, Tue, Thu, Fri | 09:05–09:20 | a headset                                               |
| Mon, Tue, Thu      | 16:00–16:30 | a headset                                               |
| Friday             | 15:00–16:00 | a headset throughout, plus a game controller from 15:30 |
| Wednesday          | 10:30–10:45 | **no headset** — a coffee cup instead                   |

The companion sits these out entirely for now — its headset is scrapped, see
[the revision note](#the-first-shoot-was-bad-and-here-is-what-changed) below.

Windows are half-open, same convention as before — 09:05:00 through 09:19:59 — and Wednesday is
excluded from both digital windows on purpose, not folded into a range: `MON_TUE_THU_FRI` and
`MON_TUE_THU` are each an explicit `OR` of the days they cover, because "which days" is exactly
what a reader needs at a glance and a range-with-a-hole makes them do the subtraction themselves.

**A real bug shipped in draft form here and is worth stating plainly, because it will recur if
the pattern recurs.** `or(a, b, c, d)` builds a flat `a || b || c || d` with no parentheses of
its own. Pasting that straight into `and(days, hourTest, minuteTest)` parses as
`a || b || (d && hourTest && minuteTest)` — `&&` binds tighter than `||`, and nothing in the
ungrouped OR chain stops it reaching past its own boundary. The symptom was two of the four
weekdays showing a headset at _every_ hour of the day, not just the meeting windows — found by
evaluating the real expression at midnight, not by reading it; reading it looks correct. **Any
`or()` result that is later combined with `and()` needs `group()` around it.** Fixed, and the
comment sits on the two day-lists in `meetings.ts` so the next multi-day window doesn't repeat it.

**The one prop-collision left is resolved the same no-negation way the salute's busy test used
to be.** The coffee cup, the controller and the cocktail each anchor near the same hand, and a
hot, sunny Wednesday standup or a hot, sunny Friday game hour would otherwise want two of them at
once. One `Condition`, three `Compare`s, coffee and controller listed _ahead_ of the cocktail: the
cocktail's own branch means "hot and sunny AND NOT coffee-time AND NOT controller-time" for free,
no De Morgan required. `wedcoffeehot` in `mock-state.ts` mocks exactly that overlap. This
`Condition` is drawn **after** the headset one, not before — see the revision note below.

**The headset is the only accessory since the salute itself to cross the head rather than sit
beside it**, so it inherited the same category of question: what does it do to the leaf tuft and
the forehead sweat pearls, both of which occupy almost the same pixels the band does. Resolved by
draw order rather than by carving the shape around them — the headset Condition is added before
the hand-prop one, so it draws behind whatever is in the hand but in front of the leaf and the
pearls, which is also just what a headband actually worn over hair (or a hot forehead) looks
like. See the comment on `hero_headset_band` in `blob-hero.ts`.

**Verified the same way the salute's windows were**: `HEADSET_WINDOW`, `WEDNESDAY_MEETING` and
`FRIDAY_GAME_ICON` evaluated straight out of the generated expression text — not reimplemented —
across all 7 days, every hour, and eleven boundary minutes (:00/:04/:05/:09/:19/:20/:29/:30/:44/
:45/:59), which is what caught the precedence bug above.

#### The art took three shoots

Worth reading before drawing anything else at this scale, because the third pass differed from
the first two in _method_, not just in effort. Passes one and two were drawn from reasoning and
judged after the build; pass three was drawn from **measurements** — a photograph of the real
controller for its layout, the face's own committed geometry for every anchor — and then
**asserted before the build** by a throwaway script checking all 28 claims the code comments make.
Every one held and the shoot confirmed it. The two earlier passes each burned a full
build-shoot-review cycle discovering things that were arithmetic all along.

**The controller** went 30×24 (a smudge with coloured dots) → 52×42 (legible but oversized, wrong
internal proportions, buttons poking through the shell's rounded corners) → 28 wide with every
offset a measured fraction of the body width, written into the comment on `hero_controller` so the
next person can check them rather than re-judge them. The headline one: **the d-pad sits inboard
of the left stick** — 0.355 across against 0.204 — which is the most recognisable thing about the
layout and the thing both earlier passes had backwards. Only the buttons are exaggerated (true
scale is 2.2px, below where a colour reads at all). It's white for contrast, with Xbox's own ABXY
colours reused from hexes the palette already had.

**The coffee steam** read as an arrowhead (two lines converging on a point _is_ an arrowhead),
then as two bent wires (one direction change each). Three segments — two direction changes — is
where it starts reading as vapour. It's also translucent now, the only translucent colour on the
face. The cup body is centred on the hand with its base exactly on the hand's centre, and the
handle's gap faces the cup so its ring lands _on_ the cup wall instead of inside it — that overlap
was what made one wall look twice as thick.

**The headset** was the worst of the three, and the companion's version is **scrapped for now** —
deliberately, so the hero's could be judged on its own; see `blob-companion.ts`. Pass two's narrow
cups left a **1px gap** to the body, and at this scale a hairline of black between two shapes
separates them completely — that is what "not attached" meant. They're now wider, 6px lower
(straddling the eyes and the mouth the way an ear does), and overlapping 3px _into_ the body. The
band is thinner and its peak sits inside the body's outline, with the leaf tuft ending at exactly
the band's height so the leaves rest on it rather than being cut by it. The boom mic keeps pass
two's single smooth `Arc` — that part was right — but now leaves the cup's lower half and finishes
level with the mouth, 7px clear of it, instead of stopping above it.

#### "A Part cannot go there" is about one group, not the canvas

Pass three left the controller 3.5px right of the hand and called it unfixable: the hand sits at
x10.5 in the hero group's coordinates, a `PartDraw` cannot start left of the group origin, and
content there is clipped. All true — the companion's left hand proves the clipping (its cream cap
is drawn from x−2 and arrives flat-sided). What the reasoning missed is that **the group is not the
only coordinate space available.** The umbrella, the bolt, the burst and both sets of Zzz are all
_siblings_ of the blob rather than children, positioned in absolute canvas coordinates, each
repeating the blob's Gyro gain by hand so they still track the wrist.

So the three hand props moved into their own top-level section, `face/hero-props.ts`, at canvas
(199,262) — which puts the hand at group-local (18.5,35) with room on every side. The controller
and the cup are now centred on the hand **exactly**. Two things made that safe: the section is
registered immediately after `blobHero()`, which is where those Conditions used to sit as its last
children, so **draw order is unchanged**; and the cocktail's box moved from the hero group's (0,6)
to the new group's (8,6) — the same canvas position, (207,268) — which is asserted in the geometry
check and was confirmed by reshooting `3-sunny` as a regression. **Anything that needs to overhang
a blob belongs beside it, not inside it.**

Pass four also fixed three drawing errors worth naming, because each is a _class_ of mistake:
a **RoundRectangle bottoms out flat**, which is wrong in any view looking down far enough to see
into a cup — if the rim reads as an ellipse the base must too, so the cup is now a rim ellipse, a
straight body and a bottom ellipse stacked, with the rim drawn as a separate white ellipse _under_
the coffee so the wall is visible at the top. **A single rounded rectangle gives dead-vertical
sides**, which read as a slab; the controller's shell is now 24 wide with grips reaching 28, so the
silhouette tapers 15 → 24 → 28 down its height. And **the band was invisible against the arms** —
its old `#2b3a4a` differed from the limbs' `#23384f` by a luma of **2.8**, effectively identical,
and the arms cross it. It now uses the headset's own cushion tone at a luma gap of 73.7, and its
peak moved to the body's topmost point so it rides _on_ the crown instead of cutting a chord
through the head.

`headset` and `fricontroller` are both in `cycle-states.ts` if either accessory changes again — a
still frame shows the controller's pulse at one arbitrary phase, not its cadence.

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
  requires `startAngle` _and_ `endAngle`. Angle 0 is 12 o'clock sweeping clockwise, so
  the upper half is `startAngle="270" endAngle="450"` — deliberately left past 360
  rather than wrapped to 90, so the sweep stays unambiguously positive and clockwise.
- **Limbs** — `Line` with `cap="ROUND"` plus a small filled `Ellipse` for the hand/foot,
  which is exactly how the CI illustrations are constructed.

Colours live in [tools/gen/palette.ts](tools/gen/palette.ts). Retheming means editing the
seven `HERO` hexes and regenerating — the 21 derived values (both mouths, the date chip and
the date text, per weekday) are computed from them by the documented HSL ratios, and
`verifyDerivation()` fails the build if a ratio stops reproducing the colours that shipped.

This used to be a comment block at the top of `watchface.xml` with the hexes inline, retheme
by search/replace. That block had already drifted: it still listed the retired navy `#8fa9c6`
as the limb colour when the face had been using `#e9dccb` for some time. Generating the
palette documentation from the palette is the fix.

## Preview image

`res/drawable/preview.png` is what the watch face picker shows, and it is **required**:
[watch_face_info.xml](watchface/src/main/res/xml/watch_face_info.xml) references it as
`@drawable/preview`, so aapt fails the build outright if it is missing.

It is a **real screenshot** off the watch (426×426), but a _staged_ one: the readings
are mocked so the picker shows a good day rather than whatever the sky and your pulse
were doing. Currently 19:12, Mon 19, 19° sunny, 88 bpm, 1912 steps, 88%, blobs at
baseline.

Almost none of that is settable from the host — the watch is a production build so the
clock cannot be set, weather cannot be faked at all, and heart rate and step count have
no synthetic providers. So `tools/mock-state.ts` hardcodes the values into the XML
instead, and you build, shoot, and restore:

```powershell
node tools/mock-state.ts on baseline
./gradlew :watchface:installDebug
adb shell input tap 213 213          # wake it - see below
adb shell screencap -p /data/local/tmp/preview.png
adb pull /data/local/tmp/preview.png watchface/src/main/res/drawable/preview.png
node tools/mock-state.ts off
./gradlew :watchface:installDebug    # <- do not skip
```

The preview is just the `baseline` state, so it uses the same `BASE` values as every
snapshot and there is nothing separate to keep in sync. Edit `BASE` to change the
readings. Every substitution asserts, and the script **refuses to run if any source
token is left unmocked**, since an unhandled one would still read live data and could
fire in the preview.

### Judging motion

`capture-states.ts` photographs states; [tools/cycle-states.ts](tools/cycle-states.ts)
_shows_ them. Parallax, the Zzz drift and the ambient crossfade cannot be seen in a
still, so the only way to judge them is on a wrist:

```bash
node tools/cycle-states.ts                          # loop until stopped
node tools/cycle-states.ts --laps=1
node tools/cycle-states.ts --only=rainy,thunderstorm,night
```

Every state is mocked with `--live`, holds for `--hold-seconds` (default 20), and ambient
is skipped since both blob groups are alpha 0 there.

Ctrl-C is safe — a SIGINT handler restores the screen timeout and the real build. **A hard
kill is not**, and that is observed rather than theoretical: killing the owning process skips
the handler entirely and leaves the watch on a 45 s timeout running a mock. The original
timeout is written to `tools/cycle-states.state` first, so recovery is one command:

```bash
node tools/cycle-states.ts --restore
```

It puts the timeout back, reinstalls, and **verifies by comparing the installed APK's md5
against the clean build** rather than trusting an exit code.

For accessory parallax specifically, the states that matter are **rainy** (umbrella in
the fist), **thunderstorm** (bolt tip inside the burst spoke) and **night** (two Zzz
chains 150px apart). The rest are a control — their accessories live inside the blob
groups and were never at risk.

For the two ramps added on 2026-08-06, the cycler covers each at more than one point —
`rainy` / `thunderstorm` / `downpour` are 50 / 90 / 100% precipitation, and `sweating` /
`puffing` / `drenched` are 100 / 135 / 200 bpm. A still frame shows one arbitrary phase and
says nothing about how a ramp reads. `downpour` deliberately has no docs frame: 50% and 90%
already bracket the range.

Worth holding as well: **rainy at night with the step goal met**, which is the busiest frame
the face can produce and the one the rain's placement was chosen against.

For an unstaged shot of the live face, just the two middle lines are enough.

**Do not use `adb exec-out screencap -p > file.png` on Windows.** PowerShell's `>` is
not a byte pipe — it decodes the stream as text and re-encodes it, prepending a BOM and
mangling the binary. The file starts `ef bb bf ef bf bd 50 4e` instead of the required
`89 50 4e 47`, and no decoder will open it. Since `aapt` only needs _a_ file at that
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

`npm run verify` (typecheck, lint, test, selftest, diff, check) is the generator's own gate —
see [watchface.xml is generated](#watchfacexml-is-generated--do-not-edit-it) above. This
section is about the two Gradle-side jars that check the generated XML itself.

Two jars from [google/watchface](https://github.com/google/watchface). They are
`.gitignore`d, so **a clone does not have them** — download them per machine into
`tools/` and the Gradle tasks activate:

| file                         | task                              | what it checks                       |
| ---------------------------- | --------------------------------- | ------------------------------------ |
| `tools/wff-validator.jar`    | `:watchface:validateWatchFaceXml` | XML against the v5 schema            |
| `tools/memory-footprint.jar` | `:watchface:checkMemoryFootprint` | 10 MB ambient / 100 MB active limits |

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
  _tweens_ a value something else changed — for a free-running loop you drive a
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
