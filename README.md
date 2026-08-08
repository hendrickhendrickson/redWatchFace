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
companion all key off `[DAY_OF_WEEK]`, and the companion always wears *tomorrow's* hero
colour — so the small blob is a preview of the next day and the pair never share a hue. See
[Weekday colours](#weekday-colours).

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
- **There is no "is it snowing" flag.** The only handle on precipitation *type* is
  `CONDITION`, an undocumented integer of which exactly two values have ever been observed
  on this watch (1 = clear, 14 = partly cloudy), and `CONDITION_NAME`, a string — and WFF
  expressions are arithmetic only, so a name cannot be compared in a `Condition` (it can
  only be *printed*). The available proxy is `TEMPERATURE <= 0 && CHANCE_OF_PRECIPITATION
  >= 50`: precipitation at or below freezing is snow or sleet in practice. That is not
  built — today a freezing wet day gets blue rain — see [TODO.md](TODO.md).

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

## Weekday colours

`[DAY_OF_WEEK]` selects the hero's body colour. Everything else in the scheme is *derived*
from it rather than picked separately:

| day | hero body | its mouth | companion (tomorrow's hero) |
|-----|-----------|-----------|------------------------------|
| Monday | `#ee4e43` brand red | `#5b2622` | `#f5c92e` yellow |
| Tuesday | `#f5c92e` yellow | `#594c1e` | `#a5d63a` lime green |
| Wednesday | `#a5d63a` lime green | `#3f4c24` | `#6b9df2` medium blue |
| Thursday | `#6b9df2` medium blue | `#273f69` | `#f0862f` orange |
| Friday | `#f0862f` orange | `#57381f` | `#8fa3bc` blueish grey |
| Saturday | `#8fa3bc` blueish grey | `#3a434d` | `#b07ce4` purple |
| Sunday | `#b07ce4` purple | `#482e62` | `#ee4e43` brand red |

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
is a dark version of the body reads as an *opening* in it. And because the date row keeps the
old scheme's saturation and lightness exactly, only its hue moves — nothing about the row's
weight or contrast changed. On Thursday it lands very nearly back on the original ice blue
and slate, because those were blue to begin with.

**Ambient is deliberately not coloured**: `date_ambient` stays ice blue on black, since
colour costs OLED power on a screen nobody is looking at closely and the documented ambient
budget is 15% of pixels lit.

### `[DAY_OF_WEEK]` is 1 = Sunday, not 1 = Monday

The source is undocumented in `sourceType.xsd`, so this was *measured*: a temporary
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
back over in the *body colour* — `Arc` takes no `Fill`, so a filled half-moon cannot be drawn
any other way — so if a body and its mask disagree, the symptom is **a dark bar across the
face on exactly one day of the week**. Grep a hex before changing it and expect several hits.

One simplification fell out of this: the hero's round mouth (startled *or* asleep) used to be
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
thing deciding what covers what is document order. **The salute is the one exception**: a
hand that is busy saluting cannot also hold the step-goal flag, so that one mark is nested
inside the salute's `Default` rather than standing beside it.

| # | state | trigger |
|---|-------|---------|
| 0 | ambient | display mode, not data |
| 1 | baseline | nothing firing |
| 2 | night | `HOUR_0_23 >= 23 \|\| HOUR_0_23 < 7` |
| 3 | sunny | `CONDITION == 1 && IS_DAY && TEMPERATURE >= 25` — cocktail |
| 3b | high UV | `UV_INDEX >= 6 && IS_DAY` — sunglasses |
| 4 | cold | `TEMPERATURE <= 10` — scarf |
| 4b | gloves | `TEMPERATURE <= 5` — adds mittens |
| 5 | freezing | `TEMPERATURE <= 0` — adds a snowflake |
| 6 | rainy | `CHANCE_OF_PRECIPITATION >= 50` — umbrella + falling rain |
| 7 | thunderstorm | `CHANCE_OF_PRECIPITATION >= 90` |
| 8 | sweating | `HEART_RATE >= 100` — one forehead pearl, drips begin |
| 8b | puffing | `HEART_RATE >= 120` — the outer pair of pearls |
| 8c | drenched | `HEART_RATE >= 150` — all three pearls, drips at full ramp by 200 |
| 10 | salute | weekdays `09:05–09:20` and `16:00–16:30` — a hand to the brow |
| 10b | salute, hand full | same, but the near hand is holding something: the far arm salutes |
| 10c | Friday salute | Friday's afternoon window is `15:00–15:30` instead |
| 10d | Friday drink | Friday `15:30–16:00` — the cocktail replaces it |

The lettered rows are **sub-states split out of the row above them on 2026-08-06**, not
new mechanisms. What used to be one "sunny" Condition is now two: the sunglasses answer
`WEATHER.UV_INDEX` (6 is where the WHO/EPA scale calls the index "high") while the
cocktail keeps its original warm-and-clear trigger, so a bright cold March afternoon gets
shades and no drink. Cold splits the same way — 10° is scarf weather, 5° is gloves.

Cold's steps are strict subsets of one another, so nothing has to exclude anything: 3° is
scarf *and* gloves *and* snowflake. The sweat bands are **not** subsets — the middle pearl
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
*fade* in as the chance rises instead of popping.

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

The accessories that *attach* to a blob — umbrella, lightning bolt, burst, both sets of
z's — each repeat their blob's Gyro gain by hand, because they are siblings of the blob
groups rather than children and inherit nothing. The snowflake, the moon and the rain
deliberately have none: they float, so holding them still is what puts them in the sky.
**Changing a blob's gain means changing every accessory that tracks it** — WFF has no
variables. The sweat drips are the exception that needs no repetition: they live *inside*
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
rain scales its speed through *travel* and never through rate. Nothing else from the
schema's function list has been exercised here, and an unimplemented function inside a
`Transform` fails *silently* while passing the validator.

To look at either one on the wrist, mock with `--live` (below). A plain mock pins the
accelerometer and the clock to constants, so both features are switched off in it.

Screenshots are in [docs/states/](docs/states/) with `all-states.png` as a contact sheet:
seventeen reaction frames plus ambient, and then **seven `w-<weekday>` frames** for the colour
scheme. The weekday frames are a theme dimension rather than reactions — each is the baseline
face differing only in hue — and all seven are kept rather than a sample, because the pairing
is the point: the only way to check the cycle closes is to see Sunday's companion match
Monday's hero. The set is current as of 2026-08-07 and was shot on the watch. The step-goal flag gets its own frame
(`9-step-goal`) even though it is a mark rather than a state, because unlike the
snowflake and the moon it shows up in no other frame — and a reaction with no
screenshot gets taken for a reaction that was never built.

Sub-states are lettered (`3b-uv`, `4b-gloves`, `8b-puffing`, `8c-drenched`) rather than
renumbered, which avoids renaming everything downstream of an insertion. It was also meant to
avoid two-digit names, where `10-x` sorts before `2-x` — and the salute spent that budget on
2026-08-07: `10-salute`, `10b-salute-blocked`, `10c-friday-salute`, `10d-friday-drink`. The only cost is how the
folder lists, since the contact sheet's order has come from the declaration order rather than
from filenames since the collation bug below.

**The sheet's order comes from the order the states are declared in, not from the
filenames**, and that is a correction rather than a preference: `Sort-Object` is
culture-aware and gives the hyphen almost no weight, so `3b-uv` collates as "3buv" against
"3sunny" and the first sheet put every sub-state *ahead of its own parent*. Reasoning from
the ASCII codes says the opposite ('-' is 0x2D, 'b' is 0x62) and is exactly what made the
naming scheme look safe before it was looked at.

**Every weather-driven trigger must be gated on `IS_AVAILABLE`** — not for tidiness but
because the no-data values are not neutral. `TEMPERATURE` reads 0, which satisfies
`<= 10`, so an ungated cold trigger puts scarves on the blobs every time weather drops
out, which it does routinely.

To review the states without waiting for the weather, `tools/mock-state.mjs` patches the
**data** — temperature, hour, heart rate — into `watchface.xml`, so the real Conditions
evaluate against known values, and `tools/capture-states.ps1` drives a build per state:

```powershell
powershell -File tools/capture-states.ps1                          # all twenty-four + ambient
powershell -Command "& tools/capture-states.ps1 -Only 4b-gloves"   # one
powershell -Command "& tools/capture-states.ps1 -SheetOnly"        # redraw the contact
                                                                   #   sheet from disk
node tools/mock-state.mjs list                                     # what each state sets

# any point BETWEEN the named states - both new reactions are continuous ramps
node tools/mock-state.mjs on sweating --set=HEART_RATE=150 --live
node tools/mock-state.mjs on rainy --set=WEATHER.CHANCE_OF_PRECIPITATION=70 --live
```

`--set=KEY=VALUE` is repeatable and exists because rain and sweat are functions of a
reading, not switches: judging them means sampling the middle of a ramp, and adding a named
state per value you want to eyeball once turns `STATES` into a junk drawer. It must be one
token — a bare `--set KEY=VALUE` would be read as the state name — and an unknown key aborts
rather than silently substituting nothing and leaving the source live.

**Two things can put a wrong frame on disk, and only one of them is the script's fault.**

*The screen dims and the check misses it.* `capture-states.ps1` rejects a capture that is
not the interactive face, and until 2026-08-07 it tested `max luminance >= 240` — which a
half-brightness frame passed, because the watch draws a small pure-white system indicator
near the bottom of the screen and that pins `max` at 255 no matter how dark the face is.
The test is now the *fraction* of pixels above luminance 200: 3.7–5.3% across every good
frame, 0.3% for the dimmed one. It was caught by comparing a body pixel — `(122,40,34)`
where every other frame reads `(238,78,67)`, exactly 51% — so **if a frame looks off, probe
a pixel rather than trusting the guard**.

*A notification chip lands on the face.* An ongoing notification (a Fitbit "Morning Brief",
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
in the snapshots too — freezing shows scarves and gloves *and* the snowflake, and a
thunderstorm shows the umbrella and the rain, since 90% precipitation also clears the 50%
threshold both of those use.

The frozen clock in a mock is chosen so the animations are *visible* in a still, which is
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

### The salute

The hero snaps a hand to its brow on weekdays, twice a day:

| | morning | afternoon |
|---|---|---|
| Mon–Thu | 09:05–09:20 | 16:00–16:30 |
| Friday | 09:05–09:20 | **15:00–15:30**, then a **cocktail** until 16:00 |

Friday knocks off early, and the half hour after its salute is a drink instead. Windows are
half-open — 09:05:00 through 09:19:59, 16:00:00 through 16:29:59 — and weekdays
are `DAY_OF_WEEK` **2..6**, because 1 is Sunday (see above; that was measured, not read). The
Friday salute and the Friday drink **abut at 15:30**, which is written in both Conditions and
derived in neither.

#### Which arm, and why it moves

**The blob's right arm — screen left — salutes by preference, and the other one covers when
that hand is full.** The screen-left fist is the one that holds things: the umbrella shaft and
the cocktail both terminate at a *fixed point* in it, drawn by their own Conditions. So the
salute takes that hand when it is free and falls back when it is not:

```
busy = IS_AVAILABLE && (CHANCE_OF_PRECIPITATION >= 50
                        || (TEMPERATURE >= 25 && CONDITION == 1 && IS_DAY))
```

which is the umbrella's own trigger OR the cocktail's *weather* trigger. The cocktail's Friday
trigger is deliberately absent: 15:30 is where the Friday salute stops, so the two cannot be
true at once, and including it would only obscure that. Move either window into the other and
this expression has to grow a term.

**There is no negation anywhere in it, and the branch order is why.** The schema says only the
*first* successful `Compare` is selected, so a branch testing "salute AND busy" placed above a
branch testing "salute" gives the second one the meaning "salute AND NOT busy" for free.
Writing that second test by hand means a De Morgan of the busy expression, kept in step with it
forever, in three places. This way "busy" exists in exactly one form — and the pair of tests
appears in **five** Conditions, because Expressions are scoped to their own Condition: the two
arms' limbs, the hand after the face, and the two mittens.

The price is that **the raised pose and the raised mitten are each written twice** — once as the
"busy, carry on holding it" branch and once as the `Default`. That is the cheaper mistake of the
two: if the copies diverge the arm visibly jumps between states, where a stale negation would
draw *two* left arms at once.

**The step-goal flag now only stands down on the fallback.** It hangs from the screen-right
hand, so when the salute lands there the flag cannot also be held — but on a dry day with no
cocktail the salute goes to the other arm and the flag is untouched, which is the common case.

**The two arms are not mirror images.** The `PartDraw` box is 106 wide with the body at 14..86,
so there are 20px of room on the right and 14 on the left. The far arm's elbow reaches (99,66);
the near one only (5,62), whose cream cap lands on x 1 — the same left margin the raised hand
has always used. Its V is 98° against the other's 113°, a more clipped salute. Only one is ever
on screen, so they have to each read, not to match.

#### The hand

**It is a rotated capsule, not the round fist every other pose uses**, because a circle at the
temple reads as a knock on the head. `PartDraw` takes `pivotX`/`pivotY`/`angle` — the leaves
have used it since the first pass — and **`angle` is clockwise-positive**, which is worth
writing down because it is nowhere in the schema. Mirroring flips the sign, and the capsule
inside is concentric, so identical content serves both hands.

Two numbers came from rendering rather than from reasoning:

* **20 × 14, not 22 × 11.** Three pixels wider than the 8px arm is not a hand; it rendered as a
  tapered dart from elbow to forehead. Every round fist here is 19 wide against the same arm.
* **The far elbow sits at (99,66), not (97,64).** The first try gave both limbs the same length
  and mirrored slopes, and a symmetrical V beside a round head reads as an *arrowhead*. 2px out
  and 2px down flattens the upper arm to 28° against the forearm's 38°, and the shape resolves
  into a shoulder and a bend.

**Attaching the hand took three attempts, and the fix is one extra line.** The hand is drawn
after the face — it has to be, because the limb pass runs *before* the body so that shoulders
read as joints, and a palm on the forehead drawn before the body is a palm the body paints over.
Drawing it late means it lands on top of the forearm, and then:

1. **A plain 2px rim** closes across the wrist and cuts the hand off the arm. Reported from the
   wrist as "the hand looks not attached".
2. **Navy flush with the capsule, or 2px past it**, joins the cores — and merges hand and
   forearm into a single tapered paddle that reads as a spoon held to the head.
3. **A plain rim plus a repeat of the forearm's 4.5px core on top**, which bridges the rim
   exactly the way the round fists do it: their arm line ends *inside* the hand's navy ellipse.
   The wrist is continuous navy and the hand keeps its outline on the other three sides.

The **8px** matters in (3). The first version of that bridge repeated the forearm exactly as the
limb pass has it, ending at the wrist, and changed nothing at all — a concentric 2px inset on a
20-long capsule pulls its navy **5.6px back** from the wrist, so the core stopped short of the
thing it was meant to reach. Redrawing a line is only a bridge if it arrives.

Everything the pose could collide with was measured, not eyeballed: the right eye ends at
(67,56) and the palm's lower flank is at y 50 by then; the shades' right lens is 52..72 × 56..69
and the palm bottoms out at 54 above it; `leaf_right` clears the fingertip cap by 5.5px. That
last one was first recorded as a 1.5px *collision*, from measuring the leaf against the tip of a
round cap instead of its centre — cap geometry is measured from centres.

**The windows and the arm choice were verified by evaluating the real expressions**, pulled out
of the XML rather than reimplemented: every boundary minute (09:04/09:05/09:19/09:20,
15:59/16:00/16:29/16:30, Friday 14:59/15:00/15:29/15:30/15:59/16:00), every day including
Saturday and Sunday, and the fallback against rain at 49% and 70%, 25° clear, 25° cloudy, and no
weather data at all. The same pass checks that **all five copies of the pair agree** across 7
days × 24 hours × 10 minutes × 3 weather variants — which is the only cheap defence against a
hand-copied expression drifting.

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
