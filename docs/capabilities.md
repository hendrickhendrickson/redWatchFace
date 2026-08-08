# What this watch face *could* use — features and data sources

A complete inventory of what Watch Face Format **v5** offers, and what of it the
redPlant Blob face actually uses. Written as the answer to "what else could we do?",
so every row carries a status rather than just a name.

Extracted from the v5 XSD tree on **2026-08-07** — 116 data sources
(`common/simpleTypes/sourceType.xsd`) and 99 schema files. Re-extract with:

```powershell
tar -xf tools/memory-footprint.jar -C $tmp docs.zip; tar -xf $tmp/docs.zip -C $tmp
# then read $tmp/5/common/simpleTypes/sourceType.xsd  (and the rest of the tree)
```

## How to read the status column

| status | meaning |
|---|---|
| **in use** | this face reads it today |
| **proven** | read off *this* Pixel Watch 4 at least once — the value is trustworthy |
| **available** | in the v5 schema, never exercised here |
| ⚠ | has a documented trap; see the note |
| **absent** | does not exist, at any format version |

**"available" is weaker than it sounds.** A green validator run proves the XML parses,
nothing more: `Transform/@value`, `Variant/@target` and the whole expression type are
plain `xs:string`, so a misspelled source or an unimplemented function passes validation
and then **fails silently at runtime**. That is exactly how `[ANIMATION_VALUE]` — a source
that has never existed — shipped and did nothing. Anything moved from *available* to *in
use* has to be seen on the wrist.

---

# Part 1 — Data sources

116 total: 100 plain enumerations plus 16 regex patterns for the forecast arrays.

## 1.1 Clock (19)

| source | note |
|---|---|
| `MILLISECOND` | available |
| `SECOND`, `SECOND_Z` | **in use** (`SECOND` in every phase formula) |
| `SECOND_MILLISECOND` | **in use, proven** — float 0.0–59.999, the **only** sub-second source. Every animation in this face runs off it. ⚠ wraps 59.999 → 0, so `60 × rate` must be a whole number in a `fract()` phase |
| `MINUTE`, `MINUTE_Z` | **in use** |
| `MINUTE_SECOND` | available |
| `HOUR_0_23`, `HOUR_0_23_Z` | **in use** (`HOUR_0_23` gates the night state) |
| `HOUR_0_11`, `HOUR_0_11_Z`, `HOUR_1_12`, `HOUR_1_12_Z`, `HOUR_1_24`, `HOUR_1_24_Z` | available — four separate hour conventions, `_Z` zero-padded |
| `HOUR_0_11_MINUTE`, `HOUR_1_12_MINUTE`, `HOUR_0_23_MINUTE`, `HOUR_1_24_MINUTE` | available — combined hour+minute, intended for smooth analog hands. **The exact scaling is not documented and has not been read here**; print it before building on it |

## 1.2 Date (24)

| source | note |
|---|---|
| `DAY`, `DAY_Z` | **in use** (day of month in the date row) |
| `DAY_OF_WEEK` | **in use, proven** — ⚠ **1 = Sunday**, not Monday. Measured on the watch (read `5` on Thursday 2026-08-06); Java/ICU `Calendar` convention, not ISO 8601. Drives the whole weekday colour scheme |
| `DAY_OF_WEEK_S` | **in use** (`Sat`) |
| `DAY_OF_WEEK_F` | available (`Saturday`) |
| `MONTH`, `MONTH_Z`, `MONTH_F`, `MONTH_S` | available — numeric, padded, full name, short name |
| `YEAR`, `YEAR_S` | available — `2026` / `26` |
| `DAY_OF_YEAR`, `WEEK_IN_MONTH`, `WEEK_IN_YEAR` | available — week number is the interesting one for a European face |
| `DAYS_IN_MONTH`, `FIRST_DAY_OF_WEEK` | available — both are what you need to draw a real month calendar |
| `DAY_0_30`, `MONTH_0_11` | available — zero-based variants |
| `DAY_HOUR`, `DAY_0_30_HOUR`, `MONTH_DAY`, `MONTH_0_11_DAY`, `YEAR_MONTH`, `YEAR_MONTH_DAY` | available — combined fields, same undocumented-scaling caveat as the hour+minute pairs |

## 1.3 Epoch and monotonic counters (5)

| source | note |
|---|---|
| `UTC_TIMESTAMP` | available |
| `SECONDS_IN_DAY` | available — 0–86399, a single ramp across the whole day. **The cleanest driver for anything that should move once per day** (a sun arc, a slow colour shift) |
| `SECONDS_SINCE_EPOCH`, `MINUTES_SINCE_EPOCH`, `HOURS_SINCE_EPOCH` | available — monotonic, never wrap. Useful for cycles longer than a minute, which `SECOND_MILLISECOND` cannot express |

## 1.4 Locale and format (18)

| source | note |
|---|---|
| `IS_24_HOUR_MODE` | available — the `<DigitalClock>` already follows the system setting without reading this; you only need it to *branch* on the format |
| `IS_DAYLIGHT_SAVING_TIME` | available |
| `TIMEZONE`, `TIMEZONE_ABB`, `TIMEZONE_ID` | available — strings |
| `TIMEZONE_OFFSET`, `TIMEZONE_OFFSET_DST`, `TIMEZONE_OFFSET_MINUTES`, `TIMEZONE_OFFSET_MINUTES_DST` | available — numeric, so these *can* be compared in a `Condition` |
| `AMPM_STATE`, `AMPM_POSITION` | available — numeric |
| `AMPM_STRING`, `AMPM_STRING_ENG`, `AMPM_STRING_SHORT` | available — strings |
| `LANGUAGE_CODE`, `LANGUAGE_COUNTRY_CODE`, `LANGUAGE_LOCALE_NAME`, `LANGUAGE_TEXT_DIRECTION` | available — the last one is the RTL flag |

## 1.5 Battery (5)

| source | note |
|---|---|
| `BATTERY_PERCENT` | **in use, proven** — matched `dumpsys battery` exactly |
| `BATTERY_IS_LOW` | **in use, proven** — fires around 6–8%; drives the coral text and gauge. Note Wear OS paints its *own* low-battery mark near the bottom edge, which is not part of the face |
| `BATTERY_CHARGING_STATUS` | available. ⚠ **near-useless in practice** — docking hands the display to privileged system UI and the face is not rendered at all, so there is no charging screen to decorate |
| `BATTERY_TEMPERATURE_CELSIUS`, `BATTERY_TEMPERATURE_FAHRENHEIT` | available — untouched. The only body-adjacent temperature the face can read |

## 1.6 Moon (3)

| source | note |
|---|---|
| `MOON_PHASE_POSITION` | **in use, proven** — ⚠ **in days, 0–29.53**, not a 0–1 fraction. Probed at 19.79. Assuming 0–1 pinned the mask 246 px off-screen and showed a permanent full moon |
| `MOON_PHASE_TYPE` | available — integer 0–7. Probe read 5 (waning gibbous), consistent with the position |
| `MOON_PHASE_TYPE_STRING` | available — string, printable only |

## 1.7 Accelerometer (8) — the whole sensor surface

| source | note |
|---|---|
| `ACCELEROMETER_ANGLE_X`, `ACCELEROMETER_ANGLE_Y` | **in use, proven** — degrees; the parallax on both blobs |
| `ACCELEROMETER_ANGLE_Z`, `ACCELEROMETER_ANGLE_XY` | available |
| `ACCELEROMETER_X`, `ACCELEROMETER_Y`, `ACCELEROMETER_Z` | available — raw axes |
| `ACCELEROMETER_IS_SUPPORTED` | available — the guard for watches without one |

⚠ **`<Gyro>` can read *only* these eight.** Its `gyroArithmeticExpressionType` unions
`sensorSourceType`, which is exactly this list — so a `<Gyro>` cannot reference the
clock, weather or heart rate. Value-driven motion from anything else has to go through
`<Transform>` instead.

There is **no gyroscope, no magnetometer/compass, no barometer, no ambient light sensor,
no GPS or location, and no skin temperature** — despite the element being called `Gyro`.

## 1.8 Health (5)

| source | note |
|---|---|
| `HEART_RATE` | **in use, proven** — read 92 bpm. ⚠ blinks to `--` between platform samples; that is a sensor gap, not a failure. Drives the three-band sweat ramp |
| `HEART_RATE_Z` | available — zero-padded |
| `STEP_COUNT` | **in use, proven** — read 1676, increases when walking |
| `STEP_GOAL` | **proven** — the wearer's *real* goal, measured 10000. No need to hardcode |
| `STEP_PERCENT` | **in use** — drives the step-goal flag at `>= 100`. ⚠ **the 0–100 range is an assumption, not a measurement**; if the flag misbehaves, print the raw value first |

**No calories, no distance, no floors, no sleep, no active minutes, no VO2, no SpO2, no
stress, no exercise state.** Steps and heart rate are the entire health surface.

⚠ Permissions: `HEART_RATE` and `STEP_COUNT` are the only permission-gated sources, and
on this watch **all three `android.permission.health.*` grants read `granted=false` and
both render anyway** — the WFF runtime reads the sensors and feeds the declarative face.
The `uses-permission` lines are kept in case another watch or OS version gates on them.

## 1.9 Notifications (1)

| source | note |
|---|---|
| `UNREAD_NOTIFICATION_COUNT` | available — untouched. The one genuinely unused *system* signal with obvious character potential (the blob noticing you have mail) |

## 1.10 Weather — current conditions (12)

Needs **format.version 5** — at v4 the sources validate but `IS_AVAILABLE` is permanently
false. Also needs a provider plus location from the paired phone or the network; watch GPS
is not involved, and it is *not* a permission issue (`RECEIVE_WEATHER` is
`signature|privileged` and a sideloaded face can never hold it).

| source | note |
|---|---|
| `WEATHER.IS_AVAILABLE` | **in use, proven** — ⚠ **gate every weather branch on this.** It goes false on its own after a while even on a watch that had live weather minutes earlier |
| `WEATHER.TEMPERATURE` | **in use, proven** — read 30°. ⚠ reads **0** when unavailable, which satisfies `<= 10`, so an ungated cold trigger puts scarves on every dropout |
| `WEATHER.CHANCE_OF_PRECIPITATION` | **in use** — drives the 24-drop rain field. ⚠ **has only ever been read as 0 here**; the rain's density has never been seen against a live figure |
| `WEATHER.IS_DAY` | **in use, proven** — ⚠ **reads 1, not 0, while weather is unavailable.** The no-data fallback is a confident, wrong "daytime". Measured at 22:47. This is what once put a crescent moon on screen in broad daylight |
| `WEATHER.CONDITION` | **in use** — ⚠ undocumented integer. Only **1 = clear**, **12** and **14 = partly cloudy** have ever been observed here. A `CONDITION` of 0 means "no data", not a real code. The thunderstorm code is still unknown and needs an actual thunderstorm |
| `WEATHER.UV_INDEX` | **in use** — drives the sunglasses at `>= 6` (WHO/EPA "high"). Integer, 0–11+. ⚠ **the branch is proven, the provider is not**: the capture sweep mocks it to a literal 8, and no live reading has ever been seen |
| `WEATHER.CONDITION_NAME` | **in use** (printed). ⚠ a **string** — WFF expressions are arithmetic only, so a name can be printed but never compared in a `Condition` |
| `WEATHER.TEMPERATURE_UNIT` | available — °C/°F. Worth wiring if this ever leaves Germany |
| `WEATHER.TEMPERATURE_LOW`, `WEATHER.TEMPERATURE_HIGH` | available — today's range, untouched |
| `WEATHER.IS_ERROR` | available — distinct from `!IS_AVAILABLE`; never probed |
| `WEATHER.LAST_UPDATED` | available — the honest way to show staleness instead of hiding it |

## 1.11 Weather — hourly forecast (6 patterns)

`WEATHER.HOURS.<n>.…` — `n` is `\d+` in the schema, so **the depth the provider actually
publishes is unknown and must be probed.**

`IS_AVAILABLE` · `CONDITION` · `CONDITION_NAME` · `IS_DAY` · `TEMPERATURE` · `UV_INDEX`

⚠ **There is no hourly `CHANCE_OF_PRECIPITATION`.** "Will it rain in two hours" is not
answerable; the hourly array carries UV and temperature but not precipitation.

## 1.12 Weather — daily forecast (10 patterns)

`WEATHER.DAYS.<n>.…`, same unknown depth.

`IS_AVAILABLE` · `CONDITION_DAY` · `CONDITION_DAY_NAME` · `CONDITION_NIGHT` ·
`CONDITION_NIGHT_NAME` · `TEMPERATURE_LOW` · `TEMPERATURE_HIGH` ·
`CHANCE_OF_PRECIPITATION` · `CHANCE_OF_PRECIPITATION_NIGHT` · `UV_INDEX`

Note the asymmetry: daily splits condition and precipitation into day/night halves but has
**no plain `TEMPERATURE` and no `IS_DAY`**, where hourly has both and no precipitation.

## 1.13 Three source namespaces that are *not* in `sourceType.xsd`

Easy to miss, because they are created by elements rather than enumerated:

| namespace | how you get it |
|---|---|
| `[REFERENCE.<name>]` | a `<Reference name="…" source="…" defaultValue="…"/>` under any element that supports `Transform` **publishes one of its transformable attributes as a readable source**. Since WFF v4. ⚠ no cross-references, no cycles — a circular reference updates once and then freezes |
| `[CONFIGURATION.<id>]` | a `<ColorConfiguration>` / `<ListConfiguration>` / `<BooleanConfiguration>` under `<UserConfigurations>`. The user's pick is readable in expressions and colour lists (`CONFIGURATION.themeColor.1` indexes into a colour set) |
| `[COMPLICATION.*]` | inside a `<ComplicationSlot>`, the provider's payload. ⚠ **only three names are attested anywhere in the XSD tree** — `COMPLICATION.WEIGHTED_ELEMENTS_COLORS` and `COMPLICATION.RANGED_VALUE_COLOR_INTERPOLATE` in `primitiveListTypes.xsd`. The rest (text, title, ranged value, goal progress) exist but must be taken from the WFF reference docs and probed, not guessed |

`[REFERENCE.*]` is the closest thing WFF has to a **variable**, which matters a lot here:
the seven-colour weekday table is currently written out **nine times** because there are
none. Whether a `Reference` can carry a colour through nine call sites is untested and
would be the single highest-value experiment on this list.

## 1.14 Absent — asked for, confirmed not to exist

Checked against the full v5 tree; none of these appears at any format version, current or
forecast.

- **Wind** — no speed, direction or gust. Asked twice, re-verified 2026-08-06.
- **Precipitation type** — no `IS_SNOWING`, no `IS_RAINING`. The only handles are the
  undocumented `CONDITION` integer and the uncomparable `CONDITION_NAME` string. The
  usable proxy is `TEMPERATURE <= 0 && CHANCE_OF_PRECIPITATION >= 50` — precipitation at
  freezing is snow or sleet in practice. Not built; both terms are already in the face, so
  it costs one expression.
- **Humidity, air pressure, air quality, dew point.**
- **Sunrise / sunset time** — note `SUNRISE_SUNSET` *is* a complication provider policy, so
  it is reachable as a complication but not as a data source.
- **`[IS_AMBIENT]`** — no ambient-state source exists, so no `Transform` can track it.
  Ambient is reachable **only** through `<Variant mode="AMBIENT">`.
- **`[ANIMATION_VALUE]`** — never existed. `<Animation>` is a tween, not a clock.
- **Location, altitude, compass bearing.**
- **Calendar events, alarms, music, messages** — as *sources*. All four are reachable as
  complications or `<Launch>` shortcuts.

---

# Part 2 — Rendering and structural features

99 schema files. Grouped by whether this face touches them.

## 2.1 In use

| feature | note |
|---|---|
| `Ellipse` `Line` `Rectangle` `RoundRectangle` `Arc` | **all five** primitives. ⚠ `Arc` takes `Stroke` only, never `Fill`; and it requires both `startAngle` **and** `endAngle` — there is no `sweepAngle` |
| `Fill`, `Stroke` | solid only, no gradient yet. Caps `BUTT`/`ROUND`/`SQUARE`, joins `MITER`/`ROUND`/`BEVEL` |
| `PartDraw`, `PartText`, `Group` | 145 / 28 / 48 instances |
| `Condition` / `Compare` / `Default` | 45 conditions. ⚠ `Compare/@expression` **is** keyref-checked against the source list — unlike `Transform/@value` |
| `Expressions` / `Expression` | 43 — named sub-expressions, the only reuse mechanism available |
| `Transform` | 113 — the escape hatch for all value-driven geometry |
| `Gyro` | 11 — ⚠ each accessory that is a *sibling* of a blob group repeats its blob's gain by hand. Changing a gain means changing every one |
| `Variant mode="AMBIENT"` | 19 — the only route to ambient. ⚠ ~15 are still on default timing |
| `Animation` | 5 — tween only |
| `DigitalClock` / `TimeText` | 2 `TimeText` (interactive + ambient). ⚠ renders the system clock, has **no literal mode**, and its `<Font>` accepts no children — which is why the mock swaps the whole block for `PartText` |
| `Font`, `Text`, `Template` / `Parameter` | ⚠ `Template` requires ≥1 `Parameter`; static text must be `Font` content directly |
| `Metadata`, `Scene`, `WatchFace` | 450 × 450 canvas, `clipShape` defaults to `CIRCLE` |

## 2.2 Available and unused — the actual opportunity list

Ordered roughly by value to this face.

| feature | what it would buy |
|---|---|
| **`ComplicationSlot`** | a tappable, user-swappable slot. `supportedTypes` from `SHORT_TEXT` `LONG_TEXT` `MONOCHROMATIC_IMAGE` `SMALL_IMAGE` `PHOTO_IMAGE` `RANGED_VALUE` `GOAL_PROGRESS` `WEIGHTED_ELEMENTS` `EMPTY`; bounding shapes `BoundingBox` / `BoundingOval` / `BoundingRoundBox` / `BoundingArc`. `DefaultProviderPolicy` picks a sensible default from `APP_SHORTCUT` `DATE` `DAY_OF_WEEK` `FAVORITE_CONTACT` `NEXT_EVENT` `STEP_COUNT` `SUNRISE_SUNSET` `TIME_AND_DATE` `UNREAD_NOTIFICATION_COUNT` `WATCH_BATTERY` `WORLD_CLOCK` `DAY_AND_DATE` `HEART_RATE` `EMPTY`. **This is the only way to reach calendar, contacts, sunrise/sunset or third-party data at all** |
| **`UserConfigurations`** | `ColorConfiguration` (the light/dark or brand-palette picker), `ListConfiguration`, `BooleanConfiguration`, `PhotosConfiguration`, plus `Flavors` for preset bundles. Reads back as `[CONFIGURATION.<id>]`, so it can drive expressions and not just swap colours |
| **`Reference`** | publishes a transformable attribute as `[REFERENCE.<name>]` — the nearest thing to a variable, and the plausible cure for the nine-times-duplicated colour table |
| **`Launch`** | makes a region tappable. Targets: `ALARM` `BATTERY_STATUS` `CALENDAR` `MESSAGE` `MUSIC_PLAYER` `PHONE` `SETTINGS` `HEALTH_HEART_RATE`, or an arbitrary app string |
| **`ScreenReader`** | accessibility labels with expression parameters. Nothing on this face is currently labelled |
| **`LinearGradient` / `RadialGradient` / `SweepGradient`** | `colors` + `positions`; sweep also takes a direction. A radial gradient is how a blob gets volume without a bitmap |
| **`WeightedStroke`** | a stroke whose colour varies along its length, with `weights`, `discreteGap` and `interpolate`. Built for progress arcs — a step ring, essentially free |
| **`PartImage` / `Images` / `Thumbnail`** | bitmaps. ⚠ **the only route to arbitrary shapes**, since there is no `<Path>` and no SVG. Costs against the memory budget, which is currently ~zero |
| **`HsbFilter`** | `hueRotate` / `saturate` / `brightness` on an image. Would let *one* bitmap serve all seven weekday hues |
| **`PartAnimatedImage` / `AnimatedImages` / `AnimationController`** | frame sequences with `play`, `repeat`, `loopCount`, `delayPlay`, `delayRepeat`, `beforePlaying` / `afterPlaying` (`DO_NOTHING` `HIDE` `FIRST_FRAME` `THUMBNAIL`), and event triggers `TAP` `ON_VISIBLE` `ON_NEXT_SECOND` `ON_NEXT_MINUTE` `ON_NEXT_HOUR`. ⚠ long PNG sequences hit the memory ceiling fast. **`TAP` is the only interaction trigger in the whole format** |
| **`TextCircular`** | text on an arc, with `direction`, `isAutoSize`, `ellipsis` |
| **Text decorations** | `Shadow` `Outline` `OutGlow` `Underline` `Strikethrough` |
| **`Upper` / `Lower` / `InlineImage`** | text formatters; `InlineImage` puts a bitmap inside a string |
| **`BitmapFonts` / `BitmapFont`** | a custom drawn typeface. The only escape from the closed 12-value `Font/@weight` enum |
| **`blendMode`** | 29 modes — `MULTIPLY` `SCREEN` `OVERLAY` `SOFT_LIGHT` `HUE` `SATURATION` `COLOR` `LUMINOSITY`, the whole Porter-Duff set, and more. On `Group`, on every `Part` (via `abstractPartType`) and on `ComplicationSlot` |
| **`renderMode`** | ⚠ **`SOURCE` / `MASK` / `ALL` is real masking**, on `Group`, every `Part`, and all three clock elements. Would replace every hand-built overshooting-rectangle mask in this face, including the two mouth masks that cause the once-a-week dark-bar failure mode |
| **`Font/@width` and `@slant`** | two axes nobody has touched: `width` is a 9-value condensed↔expanded enum, `slant` is `NORMAL`/`ITALIC`. Separate from the `weight` axis below. `minSize` also exists for autosizing |
| **`AnalogClock`** | `HourHand` / `MinuteHand` / `SecondHand`, and `SecondHand` takes `<Sweep>` (with `SYNC_TO_DEVICE`) or `<Tick>` — a real sweeping second hand, which no `Transform` can reproduce |
| **`Photos`** | user-supplied photo source, changing on `TAP` or `ON_VISIBLE`, or every `changeAfterEvery` interval (3–10) |
| **`Localization`** | `locales` and `timeZone` overrides — a second-timezone display |
| **`calendar`** | 15 systems: `GREGORIAN` `BUDDHIST` `CHINESE` `COPTIC` `DANGI` `ETHIOPIC` `ETHIOPIC_AMETE_ALEM` `HEBREW` `INDIAN` `ISLAMIC` `ISLAMIC_CIVIL` `ISLAMIC_UMALQURA` `JAPANESE` `PERSIAN` `ROC` |
| **`clipShape="RECTANGLE"` + `cornerRadius*`** | for square devices |
| **`watch_face_shapes.xml`** | per-size artwork variants. Not needed at 426 × 426, where the 450 canvas just scales ~0.95 |

## 2.3 The expression language, exactly

**Operators**, from `arithmeticExpressionType.xsd`:
`+ - * / % ~ ! | || & && ( ) > >= ? : ==`

⚠ **The enumeration omits `<`, `<=` and `!=` — and it is wrong.** All three are verified
working on this watch, and the XSD does not enforce the list anyway (the type unions
`xs:string`). The reversed-operand workaround is unnecessary.

**Functions**, all 34:

```
round  floor  ceil  fract  abs  clamp  rand  pow  sqrt  cbrt
exp  expm1  log  log2  log10  deg  rad
sin  cos  tan  asin  acos  atan
numberFormat  icuText  icuBestText  subText  textLength
colorArgb  colorRgb  extractColorFromColors  extractColorFromWeightedColors
```

⚠ **No `min` and no `max`** — which is why `clamp` does all the work in this face.
⚠ **Only `clamp` and `fract` have ever been exercised here.** Everything else is unproven,
and an unimplemented function inside a `Transform` fails *silently* while passing the
validator.

`colorArgb` / `colorRgb` / `extractColorFrom*` deserve a look: they mean a colour can be
**computed** from a reading rather than selected by a `Compare`. That is the other candidate
cure for the nine-times-duplicated weekday table.

Useful shapes that fall out of `clamp`, since there is no `min`/`max`:

```
triangle   2p - clamp(4p - 2, 0, 2)              0 at p=0, 1 at p=0.5, 0 at p=1
trapezoid  clamp(4p, 0, 1) - clamp(4p - 3, 0, 1) rise, hold at 1, fall
```

Two phase formulas, and the difference matters:

```
p = (([SECOND] % N) + [SECOND_MILLISECOND] - [SECOND]) / N   # offsets in whole seconds only
p = fract([SECOND_MILLISECOND] * rate + offset)              # any offset, any rate
```

## 2.4 Hard limits

- **No code, no network, no custom data.** Dynamic values come only from the source list
  or from complication providers.
- **No loops, no state between frames.** Expressions are arithmetic and conditional only.
- **No `<Path>`, no SVG.** Five primitives, in every format version. Arbitrary shapes must
  be pre-rendered to PNG.
- **No variables** — hence `Expressions`, `Reference`, and nine copies of a colour table.
- **`Part*` `x`/`y` are integers.** Sub-pixel placement has to move the shapes inside the part.
- **`PartDraw` content is clipped to its box** — believed real, never isolated, and three
  existing shapes plus the step-goal flag's 12 px width depend on the answer. One throwaway
  build settles it.
- **Ambient updates roughly once a minute**, so no sweeping second hand there, and the
  documented budget is 15% of pixels lit.
- **`Font/@weight` is a closed 12-value enum** (`THIN` … `EXTRA_BLACK`), not transformable,
  no variable-font axis. The stock face's smooth weight morph is native render code and
  cannot be reproduced. `@width` and `@slant` are likewise closed enums.
- **Memory: 10 MB ambient / 100 MB active.** Currently ~3.2 / 2.4 MB with no bitmaps and no
  embedded fonts, so the budget only starts to matter with images or frame sequences.
  ⚠ ambient is the tighter of the two because the tool disables resource de-duplication there.
- **v5 means Wear OS 7 in practice.** `minSdk` is still 36, so a Wear OS 6 watch will install
  this and then fail to render. Dropping to v4 loses weather entirely.
- **Debugging is guess-and-check** — a code-free APK produces no logs.
- **The charging screen is not yours.**

---

# Part 3 — Where the leverage is

If this list is going to turn into work, these are the entries worth acting on, in order.
Each is cheap and each removes something currently painful or impossible.

1. **`renderMode="MASK"`** — replaces every hand-built overshooting-rectangle mask,
   including the two mouth masks whose body/mask mismatch shows up as a dark bar across a
   face on exactly one weekday.
2. **`Reference` and/or `colorArgb`** — the two candidate cures for the nine-times-written
   colour table, the top item on the open list.
3. **The snow proxy** — `TEMPERATURE <= 0 && CHANCE_OF_PRECIPITATION >= 50`. One expression,
   both terms already present, and today a freezing wet day gets blue rain next to a
   snowflake, which reads as *deliberately* wrong.
4. **`UNREAD_NOTIFICATION_COUNT`** — the one unused system signal with obvious character
   potential, and it needs no permission and no provider.
5. **`ComplicationSlot`** — the only door to calendar, sunrise/sunset, contacts and
   third-party data, and the only way a stat can launch an app.
6. **`WeightedStroke`** — a step-progress ring, essentially free.
7. **Probe the forecast depth** — how many `WEATHER.HOURS.n` / `DAYS.n` the provider
   actually publishes is unknown, and nothing can be designed on the forecast until it is.
8. **`UserConfigurations`** — a colour theme picker; already on the TODO list, and
   `[CONFIGURATION.<id>]` makes it drive expressions rather than only swap hexes.

Two verification notes that apply to all of the above: anything expression-level has to be
seen on the wrist (`tools/cycle-states.ps1`), and anything with a periodic alpha has to be
checked against the mock's frozen `SECOND_MILLISECOND = 1.0` or its capture frame comes out
empty.
