# How WFF actually behaves — findings from the wrist

Things this project learned the hard way, each one measured rather than reasoned. They are here
because none of them is in the schema, the published reference, or anywhere the validator can see.

`docs/capabilities.md` is the _inventory_ — what exists, what is in use, what is absent. This file is
the _behaviour_: what the inventory does not tell you about the entries it lists. Where the two
overlap, capabilities.md is the authority and this file carries the experiment behind it.

---

## The thing to internalise first: what a green signal proves

Three separate bugs in one session were invisible to the validator _and_ to `screencap`, and one of
them was invisible to both while being reported as three different bugs in the face.

| what was trusted            | what it actually proves                                                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| validator PASSED            | the XML parses. Source names inside a `Transform/@value` are **not** keyref-checked, so `[ANIMATION_VALUE]` — a source that has never existed — passed and did nothing for a whole session |
| a screenshot                | one frame. Not motion, and not which APK produced it                                                                                                                                       |
| `mock-state status` "clean" | the **working tree**. It says nothing about the watch, and after a capture run the watch is normally still on a mock                                                                       |
| a Gradle exit code          | that Gradle ran. `& cmd \c` (backslash) never runs the command and still exits 0                                                                                                           |
| an offline rasteriser       | geometry at one instant. It knows nothing about `Variant`, `Gyro`, font metrics, antialiasing, or whether the watch implements a given expression at all                                   |

The checks that do settle it: **compare the installed APK's md5 against the clean build**
(`tools/cycle-states.ts --restore` does this), and **look at the watch** for anything that moves.

## Validator PASS proves almost nothing about expressions

`Variant/@target` and `Transform/@target` are plain `xs:string` with no enumeration, and
`arithmeticExpressionType` unions in `xs:string`. Confirmed empirically:

- `<Variant target="totalNonsenseAttr" value="7"/>` → **PASSES**
- `<Transform target="bogusAttr" value="[NOT_A_SOURCE] @@@ ###"/>` → **PASSES**

A misspelled `target` is silently ignored at runtime with no build-time signal. The validator checks
structure — element nesting, required attributes, types — and that is all. Anything expression-level
has to be seen on the watch.

`Compare/@expression` **is** keyref-checked against the source list, which is the one exception.

### `Launch/@target` is the same hole in a different element

`launchTargetType` is `<xs:union memberTypes="_systemShortcutType xs:string"/>`, so the eight-value
enumeration buys nothing at all. Measured against validator 1.7.0 on an isolated two-group probe:

- `<Launch target="HEALTH_HEART_RATE"/>` → **PASSES**
- `<Launch target="HEALTH_HEARTRATE"/>` → **PASSES** — same file, one letter removed

A dead tap is therefore the expected failure mode, and it is silent: nothing is drawn differently, so
a face whose shortcut does nothing looks exactly like a face whose shortcut works until a finger is
on it. `tools/gen/launch.ts` restates the enumeration as a TypeScript union so the typo is a
typecheck error; that is the only thing between an authored target and the wrist.

The whole list is `ALARM` `BATTERY_STATUS` `CALENDAR` `MESSAGE` `MUSIC_PLAYER` `PHONE` `SETTINGS`
`HEALTH_HEART_RATE`. **There is no weather shortcut**, and the arbitrary-app-id form the union allows
is documented nowhere in the XSD tree — package name, component and intent are all equally plausible
and equally unverifiable from a PASS.

---

# Expressions and motion

## `<Gyro>` and `<Animation>`

Both exist, both are cheap, and neither costs anything against the memory budget. What the names do
not tell you:

- **`<Gyro>`** is a child of a Group or Part (max one) and _offsets_ its parent's `x`, `y`, `scaleX`,
  `scaleY`, `angle` or `alpha` from an expression over the `ACCELEROMETER_*` sources. Child order
  matters: it comes before `Transform`, which comes before `Variant`.
- **The gain has to be big enough to see.** The first version used ±2.5px of travel on a 426px
  screen, which reads as no parallax at all. It is now ±8 / ±5 for the hero and ±5.5 / ±3.5 for the
  companion; worst-case corner is radius 198 against the 225 bezel. **What sells the depth is the
  ratio between the two**, about 0.7, not the absolute size.
- **`<Animation>` is a child of `<Transform>`, and it is a tween — not a clock.** It smooths a value
  the Transform has _already changed for some other reason_:
  ```xml
  <Transform target="x" value="[SECOND] % 2 == 0 ? 0 : 200">
    <Animation duration="1" interpolation="EASE_IN_OUT" />
  </Transform>
  ```
  `repeat="-1"` loops forever, `repeat="0"` (the default) plays once, `fps` defaults to 15.
- **There is no `[ANIMATION_VALUE]` data source.** This project once believed there was and that
  `<Animation>` ramped it 0..1. The Zzz drift built on it did nothing on the wrist and **passed the
  validator**. Motion is only ever verified on the watch.

### `<Gyro>` is inherited by children, and the accessories are not children

This is the trap. `hero_umbrella`, `sleep_zzz`, `companion_burst`, `companion_lightning` and
`mini_sleep_zzz` are top-level _siblings_ of the blob groups — they have to be, because each is
gated by its own `Condition` — so they inherit nothing, and the umbrella slid out of the fist by up
to 16px across a full tilt sweep. Each now repeats its blob's gain verbatim. WFF has no variables, so
that duplication is unavoidable **in the output**; all seven sites are emitted from `GYRO_HERO` /
`GYRO_COMPANION` in `tools/gen/geometry.ts`, so changing a gain is one edit rather than seven.

Things genuinely inside the groups — leaves, limbs, gloves, scarf, cocktail, goal flag — need
nothing. `freeze_mark` and `moon_mark` are deliberately left with **no** Gyro: nothing joins to them,
and holding them in the clock's plane is what makes them read as sky.

To audit this, walk the element tree rather than reading it — a `<Gyro>` sitting behind a 12-line
comment is easy to miss and easy to regex wrong.

## `fract()` works, and it is worth more than it looks

**Verified on the Pixel Watch 4 on 2026-08-06.** It removes the single biggest constraint on
animation in this face.

The problem it solves: with only the proven whole-second formula, phase offsets are available only in
whole seconds, which couples the number of distinct phases to the period. The first rain attempt
crawled at 30px/s for exactly that reason, and its drops had to be grouped into waves sharing a
phase — which meant sharing an alpha, which is what made them visibly breathe in unison.

```
p = (([SECOND] % N) + [SECOND_MILLISECOND] - [SECOND]) / N   # offsets in whole seconds only
p = fract([SECOND_MILLISECOND] * rate + offset)              # any offset, any rate
```

The rain went from three waves of identical drops to 24 fully independent ones.

**`60 * rate` must be a whole number.** `[SECOND_MILLISECOND]` wraps 59.999 → 0, so a rate that does
not divide evenly into the minute produces a visible hiccup once a minute — the sort of thing noticed
a week later and blamed on the sensor. 0.6, 0.75, 0.7 and 0.9 are fine; anything derived from a live
reading is almost never fine, which is why **the rain scales its speed through travel and never
through rate**.

Take the fraction as `SECOND_MILLISECOND - SECOND` rather than a float modulo — integer `%` is the
documented case, float `%` is not.

**How it was verified, because "it looked right" would not have been enough.** A dead `Transform`
leaves its shapes at their authored positions, so the two cases are distinguishable by measurement
rather than by eye. With the mock's frozen clock the three rain waves had to land at y +48, +80 and
+16; a dead `fract()` would have stacked all thirty drops at +0 in one opaque row. Every drop
measured within 1px of the live prediction, on all three phase offsets and in both columns. **That is
the standard any newly used function should be held to here** — only `clamp` and `fract` have ever
been exercised on this watch, and an unimplemented function inside a `Transform` fails silently while
passing the validator.

### Envelope shapes, since there is no `min`/`max`

```
triangle   2p - clamp(4p - 2, 0, 2)               0 at p=0, 1 at p=0.5, 0 at p=1
trapezoid  clamp(4p, 0, 1) - clamp(4p - 3, 0, 1)  rise, hold at 1, fall
```

The triangle is right when the sawtooth reset must happen at zero opacity (the Zzz, the moon mask).
The trapezoid is the better envelope when the thing should be _fully_ visible for most of its cycle —
the rain and the sweat drips use it, because with a triangle the drops read as flickering.

Two more rules that came out of building these:

- **Do not put an animated `Transform` and an AMBIENT `Variant` on the same attribute of the same
  element.** Which wins in ambient is not something the schema settles. Put the animation on an inner
  Group; the outer one keeps the Variant.
- **Two animated things on the same cycle should be phase-offset**, or they read as one mechanism
  blinking.

## The `<`, `<=`, `!=` claim was wrong — settled on the watch

`common/simpleTypes/arithmeticExpressionType.xsd`'s `_operatorType` enumeration does omit `<`, `<=`
and `!=`. That file is **byte-identical from v1 to v5** and is not enforced anyway: `_arithmeticType`
unions in `xs:string`, so a deliberately nonsense expression passes validation.

Four throwaway `PartText` elements were dropped in on 2026-08-03, each gated on one expression, with
the reversed form as the control:

| label | expression            | rendered |
| ----- | --------------------- | -------- |
| REV   | `200 > [HEART_RATE]`  | yes      |
| LT    | `[HEART_RATE] < 200`  | yes      |
| LTE   | `[HEART_RATE] <= 200` | yes      |
| NE    | `[HEART_RATE] != 999` | yes      |

All four rendered. **The reversed-operand workaround is unnecessary.** Nothing was rewritten on the
back of it — the reversed form is correct and consistently used, and churning ~20 working expressions
is risk without benefit. What it buys is that _new_ expressions can be written the readable way round.

In XML the operators need escaping: `&lt;`, `&lt;=`. `!=` needs none.

## `<Transform>` is the escape hatch for value-driven geometry

`x`/`y`/`width`/`height` on `Part*` elements really are authoring-time integers, **but any of them
can be re-bound at render time**:

```xml
<RoundRectangle x="3.5" y="3.5" width="15.5" height="8" cornerRadiusX="1.5" cornerRadiusY="1.5">
  <Transform target="width" value="1 + [BATTERY_PERCENT] * 0.145" />
  <Fill color="#5fb874" />
</RoundRectangle>
```

- Shapes accept it on `x`, `y`, `width`, `height`, `cornerRadiusX/Y`.
- `Part*` elements accept it on `x`, `y`, `width`, `height`, `pivotX`, `pivotY`, `angle`, `alpha`,
  `scaleX`, `scaleY` and `tintColor`. Not on `name`.
- `<Fill>`'s `color` is transformable too (v4+), so a `Condition` is not the only way to recolour.
- **Keep the authored attribute equal to the 100% case.** Anything that renders the XML without
  honouring Transform falls back to the literal, so an authored `width="15.5"` still looks like a
  full battery rather than an empty one. Android Studio's inline preview has this blind spot.

Related and still unexploited: there is **no rendered-text-width source**. `textLength()` counts
_characters_, not pixels, which is why the date chip is centred by estimate.

## `<Variant>` animates, and every one of ours was using the worst default

This is the answer to "why does the clock transition look so much worse than the stock face". It is
not that WFF snaps and the stock face animates — `Variant` tweens on both. It is that `Variant` has
timing attributes **from v4 onward** and we were setting none of them:

| attr             | type                                                                        | default           |
| ---------------- | --------------------------------------------------------------------------- | ----------------- |
| `duration`       | `xs:float` 0.0–1.0, **normalised** to the vendor's transition time          | `1.0`             |
| `startOffset`    | `xs:float` 0.0–1.0; **silently ignored if `duration + startOffset > 1.0`**  | `0.0`             |
| `interpolation`  | `LINEAR`, `EASE_IN`, `EASE_OUT`, `EASE_IN_OUT`, `OVERSHOOT`, `CUBIC_BEZIER` | `LINEAR`          |
| `controls`       | `vector4fType`, `CUBIC_BEZIER` only                                         | `0.5 0.5 0.5 0.5` |
| `angleDirection` | `NONE`, `CLOCKWISE`, `COUNTER_CLOCKWISE`                                    | `NONE`            |

With `duration="1.0"` and `LINEAR`, the two clock copies both sat near alpha 128 at the midpoint —
and since `BOLD` (700) and `THIN` (100) are six enum steps apart, the thin white stem sat inside a
much wider semi-transparent cream stem. That halo is the "smear".

### A `<Variant>` window is used in **both** directions

Judged on the wrist on 2026-08-08, which is the only way any of it is visible: the transition lasts
about 200ms and every mock state is steady-state, so no screenshot can catch a midpoint.

A `Variant` declares the ambient value, and the attribute animates toward whichever value the
destination mode wants — through the same window, with the same curve. **So a gap going one way is an
overlap coming back, and there is no way to have neither.** This is the fact the whole
version-by-version crossfade history was circling without stating.

Which means the timing was never the date row's real problem. The clock has the same overlap and has
never looked wrong, because its two copies are the same string at the same origin — the LIGHT stems
sit inside the BOLD ones and the overlap reads as a weight morph. The date's ambient copy was a
single centred `"%s %d"` while its interactive copy is two parts pinned around a chip, so the overlap
had nothing to hide behind: two dates, side by side. **Congruence is the requirement; the timing is
secondary.** See `tools/gen/crossfade.ts` and `tools/gen/face/date-common.ts`.

### What is not possible, so nobody spends another hour on it

- **No `[IS_AMBIENT]` source.** Ambient is reachable _only_ through `<Variant mode="AMBIENT">`.
- **`Font/@weight` is a closed 12-value enum** with no variable-font axis — grepping the whole v5
  tree for `wght`/`variation`/`axis` returns nothing. `weight` is not transformable; on `Font` only
  `color` is.
- **`TimeText`'s `<Font>` is a different, restricted element** defined locally in `clock/timeText.xsd`.
  It accepts **no child elements at all**, so it cannot even hold a `Transform`. This is why the mock
  swaps the whole `<DigitalClock>` block for `PartText`.

So the stock face's smooth weight morph is native render code animating a real variable-font axis,
which is outside what WFF can express. We can stop the crossfade looking like a crossfade; we cannot
reproduce a morph.

There is also a known **Wear OS 6 platform bug**: if a third-party face's ambient transition does not
finish before the screen suspends, the runtime composites the active _and_ ambient layers at once —
which looks exactly like the ghosting we were chasing. First-party faces are unaffected.

---

# Drawing

## No SVG, and only five drawing primitives

- `substitutionGroup="DrawElement"` across the v5 schemas yields exactly `Line`, `Arc`, `Rectangle`,
  `RoundRectangle`, `Ellipse`. No `Path`, no polygon, in any version. Arbitrary shapes have to be
  pre-rendered to PNG — which is why the electrocution starburst is faked from twelve spokes.
- `Image`/`PartImage`'s `resource` is an **Android drawable id**, not a path.
- SVG is out: aapt does not compile it, so there would be no resource id. VectorDrawable XML is
  undocumented either way, but Google's own Play-gating tool decodes every drawable through
  `javax.imageio.ImageIO`, which cannot read a `<vector>`. Treat it as unsupported.
- **A filled triangle is buildable, and the obvious two ways are not.** There is no polygon; a
  rotated square cannot be cut in half, because a `PartDraw`'s clip box turns _with_ its contents
  (one transform, no way to hold a box still); and painting the corners out in the background colour
  only works where the background is plain, which stops being true the moment anything is drawn under
  it. What does work is a **stack of overlapping `Rectangle`s**, one per row, each as wide as the
  triangle is at that height and each running all the way down to the base. Same colour, overlapping
  rather than abutting, so there is not one internal edge to antialias into a visible seam. The step
  in the silhouette is `halfWidth / rows`; at 450-to-426 scaling anything under ~1.4 design px
  disappears into the antialiasing. The party hats do this, and `data/celebrations.ts` asserts the
  step rather than trusting the row count.

- **A stroked `Arc` is a band with a hole in it, which is not what "cone" means.** Both hat families
  shipped as thick arcs on the reasoning that a curved band is close enough to a tapering shape. It
  is not: the Santa hat's crown had a visible gap through the middle with the blob's leaf tuft
  showing through it, and it touched its own brim at one end only. Anything that should read as
  _solid_ needs a filled primitive and an opaque cover over the joint — the coffee cup's rim-over-body
  construction, which is the general answer to "cut this off" in a format with no clipping but a part
  box.

- `Arc` takes `Stroke` only, never `Fill`, and requires both `startAngle` **and** `endAngle` — there
  is no `sweepAngle`. The eye/brow arcs use `270→450` and `282→438`, deliberately left past 360 so
  the sweep stays unambiguously positive and clockwise.

  **What happens if you don't**, measured 2026-08-11 while building the Santa hat: written `270→45`
  instead of `270→405`, the arc sweeps the _long_ way — down through 180, the bottom of the ellipse
  — and the hat rendered draped across the hero's face. Nothing catches this. Both numbers are legal
  angles, the shape still passes a bounds check (it is the same ellipse either way), and anything
  derived from the end angle lands in exactly the right place, because `sin(435°)` **is** `sin(75°)`.
  It survived every assertion in the file and was found by looking at a rendering. There is now a
  check in `data/celebrations.ts` that a hat's `from → mid → to` strictly increases; any new arc
  crossing 12 o'clock needs the same discipline.

- `<Template>` requires at least one `<Parameter>`, and goes **inside** `<Font>`, not beside it.
  Static text has to be `Font` content directly.

## `Part*` x/y are integers

`x="1.5"` on a `PartDraw`/`PartText` fails validation with `'1.5' is not a valid value for 'integer'`.
Only the primitives inside take floats. Sub-pixel placement has to be done by moving the shapes
within the box, not by moving the box.

## `PartDraw` rotation: `angle` is clockwise-positive, and the box has to fit the diagonal

- **Positive is clockwise.** `leaf_left` has carried `angle="-36"` since the first pass and leans
  _left_, which settles it.
- **The box has to be sized for the diagonal.** A 20 × 14 capsule at 37° occupies 24 × 23, so its box
  is 34 square. A snug box shaves the corners off the shape — the steps icon's taper measurably
  vanished this way, twice.

## `PartDraw` content is clipped to its box

Believed real, demonstrated indirectly, never isolated. The direct evidence is the rotation finding
above; the companion's left hand is drawn from local `x-2` and arrives flat-sided.

Three existing shapes quietly depend on the answer — `mini_limbs` puts a hand ellipse at local x−2
and another reaching local x 63 in a 62-wide box, and `mini_scarf`'s tail runs to local y 51 in a
40-tall box — and the step-goal flag is 12px wide rather than 14 specifically to stay inside its box.
It also rules out a tempting rain implementation: moving shapes inside a _static_ box and letting the
clip hide the wrap is a silent catastrophe if the box does not clip, since drops would appear up the
canvas in the stat row. The rain therefore moves whole groups with bounded travel and fades at both
ends, depending on no clipping at all.

**One throwaway build with a shape deliberately hanging out of its box settles this.**

## A mask must overshoot the shape it is cutting

Both mouths are a dark ellipse with a body-coloured `Rectangle` masking the top half. Both started
the mask at the _same_ y as the ellipse, and their antialiased top edges did not cancel — a 1px
sliver of `#5a2a22` survived and read convincingly as a little nose dash. Each mask now starts 3px
above its ellipse.

The corollary is the failure mode that makes masks expensive here: a body/mask colour mismatch shows
up as a dark bar across a face on exactly one weekday. `renderMode="MASK"` exists and would replace
every hand-built overshooting rectangle in this face — see `docs/capabilities.md` §Part 3.

## Two hands are cheap to draw and expensive to attach

The retired salute took four attempts and every failure was about **attachment** rather than the hand:

1. A 22 × 11 palm against an 8px arm read as a dart. A hand has to be about twice the limb it hangs
   off — the round fists are 19 wide against the same arm.
2. An elbow giving the two limbs equal lengths and mirrored slopes reads as an arrowhead pointing
   away from the blob. The fix was asymmetry, not size.
3. Running the palm's dark core flush with its cream, and then 2px past it, both merged hand and
   forearm into one tapered paddle. **The pale seam a closed 2px rim leaves across the wrist is what
   makes the hand read as a hand.**
4. The pose cannot be drawn in one pass at all. Limbs draw before the body so shoulders read as
   joints, so anything touching the _face_ has to be drawn a second time after it.

None of that is visible in the markup; it is four renders. **Render a new pose before believing the
arithmetic** — and note the arithmetic was wrong once here too, when a leaf collision was computed
against the tip of a round cap instead of its centre.

Related: **a union takes the widest shape at each height**, so a taper can be built additively by
stacking parts of decreasing width, and a flat edge comes free from a rectangle exactly as wide as
the part it continues. No masking, so no background-colour dependency and none of the overshoot
caveats above.

---

# Data sources

`docs/capabilities.md` is the complete inventory. What follows is what measurement added to it.

## `WEATHER.CONDITION` codes, as observed

Undocumented integer. Confirmed on a Pixel Watch 4 so far:

| code | meaning                                                                                                                           |
| ---- | --------------------------------------------------------------------------------------------------------------------------------- |
| 0    | **not a condition — this is the "no data" value**                                                                                 |
| 1    | clear                                                                                                                             |
| 12   | observed 2026-08-03 at night, 27°, `CHANCE_OF_PRECIPITATION = 66`. Most likely showers or overcast; not confirmed against a label |
| 14   | partly cloudy                                                                                                                     |

**What the sources read while weather is unavailable**, measured directly in one session that caught
a dropout and a recovery three minutes later:

|                           | unavailable | available |
| ------------------------- | ----------- | --------- |
| `IS_AVAILABLE`            | 0           | 1         |
| `TEMPERATURE`             | 0           | 27        |
| `CONDITION`               | 0           | 12        |
| `IS_DAY`                  | **1**       | 0         |
| `CHANCE_OF_PRECIPITATION` | 0           | 66        |

**`IS_DAY` reads 1 when there is no weather data**, not 0 — the fallback is not "unknown", it is a
confident, wrong "daytime". At 22:47 on a watch with no weather, `IS_DAY` said day. That is the trap
behind the moon-in-daylight bug, and every `IS_DAY` branch must be gated on `IS_AVAILABLE` as well.

**Do not make the moon the `Default` of the icon Condition.** It was, and as the catch-all it fired
for "available, not wet, not code 14, not day" — which includes every moment `IS_DAY` reads falsy
before it has populated. The moon now needs an explicitly clear sky that is also not daytime, and the
`Default` is a plain cloud: right for real overcast, harmless for an unidentified code.

### Reading a code off the wrist

Drop this in just before `</Scene>`, read it off the watch, then delete it:

```xml
<PartText name="probe_values" x="0" y="396" width="450" height="24">
  <Text align="CENTER">
    <Font family="SYNC_TO_DEVICE" size="17" weight="BOLD" slant="NORMAL" color="#5fb874">
      <Template><![CDATA[A=%d T=%d C=%d D=%d P=%d]]><Parameter expression="[WEATHER.IS_AVAILABLE]" /><Parameter expression="[WEATHER.TEMPERATURE]" /><Parameter expression="[WEATHER.CONDITION]" /><Parameter expression="[WEATHER.IS_DAY]" /><Parameter expression="[WEATHER.CHANCE_OF_PRECIPITATION]" /></Template>
    </Font>
  </Text>
</PartText>
```

**Always print `IS_AVAILABLE` alongside.** Without it a reading of `C=0 D=1 P=0` looks like a real
condition code of 0 on a clear day, when it means there is no weather data at all.

A probe with no `<Variant mode="AMBIENT" target="alpha" value="0"/>` stays visible in ambient, which
is handy — but it also means the first capture is likely to be an ambient frame, where the readings
may not be live.

## Weather needed WFF v5, and it cost the Wear OS 6 hedge

`format.version` is **5**, was 4. The `[WEATHER.*]` sources only publish at v5: at v4 the runtime
reported `WEATHER.IS_AVAILABLE = false` permanently, even with the Pixel Weather app on the watch
showing 30° / Düsseldorf. Bumping the one property made the row render immediately.

What made it hard to spot, because nothing in the build complains:

- The **v4 XSD does list** `WEATHER.IS_AVAILABLE`, `WEATHER.TEMPERATURE` and
  `WEATHER.CONDITION_NAME`, so `validateWatchFaceXml` passed against v4 the whole time. The schema
  and the runtime disagree about what v4 supports.
- It is **not** a permission problem. `com.google.wear.permission.RECEIVE_WEATHER` is
  `signature|privileged`, so a sideloaded face can never hold it — the runtime brokers weather the
  same way it brokers heart rate.
- The failure mode is indistinguishable from "no location yet".

Consequences carried in the code: **`minSdk` is 37 to match the format**, since at 36 a Wear OS 6
watch installs this and then fails to render — which also puts the face out of reach of an API 36
emulator; and `checkMemoryFootprint` no longer passes `--schema-version`, because that tool only
accepts up to 4 and rejects 5 outright.

## Weather availability is intermittent

`WEATHER.IS_AVAILABLE` goes false on its own after a while, even on a watch that had live weather
minutes earlier and still shows it in the Pixel Weather app. Re-opening that app repopulates it. The
fallback branch is therefore not just a cold-start state — the face will drop to dashes periodically
during normal use.

**Gate every weather branch on `IS_AVAILABLE`**, or it will flicker between states as availability
comes and goes.

## The charging screen is not ours

Docking hands the display to privileged system UI — on the Pixel Watch 4 the Material 3 landscape
"bedside clock" with the blue ring. The watch face is **not rendered at all**, and after roughly half
a minute the display turns off rather than falling back to ambient. There is no API, intent or
manifest entry to influence it, and `watchface.xsd`'s root accepts only `Scene`, `BitmapFonts`,
`Metadata` and `UserConfigurations` — there is no dock scene.

`[BATTERY_CHARGING_STATUS]` (boolean, v1+; **not** `IS_CHARGING`) exists, but it is only useful for
styling the face while the face is the visible surface. Note `BATTERY_IS_LOW` is forced false while
charging.

---

# Budget and tooling

## Memory footprint: the whole budget is the font

Measured 2026-08-04 with `--verbose`, which the Gradle task does not pass — run the jar directly:

```powershell
java -jar tools/memory-footprint.jar --watch-face watchface/build/outputs/apk/debug/watchface-debug.apk `
  --ambient-limit-mb 10 --active-limit-mb 100 --verbose
```

```
Counting resource Roboto; 2371712 bytes, 2.26 mb, 0 x 0 ARGB8888
Max memory footprint in active:  2.26 MB   /  100 MB
Max memory footprint in ambient: 3.03 MB   /   10 MB
```

**Exactly one resource is counted, and it is the font.** Every ellipse, line, arc, rectangle and
round rectangle in the face contributes **zero**. That is the whole argument for having drawn the
characters from primitives instead of shipping PNGs, and it means the shape budget is effectively
unlimited.

Ambient reads higher than active on an identical face because the tool disables resource
de-duplication there, so ambient is the binding limit. What would actually cost something: a bitmap,
an `AnimatedImage` sequence (a 30-frame 450×450 ARGB8888 animation is ~24 MB and would blow the
ambient limit on its own), or a second embedded font. The `SYNC_TO_DEVICE` family resolves to Roboto
here, so the "Using system default font for unknown font family" lines are expected.

## The XSDs are in `memory-footprint.jar`, not the validator

`wff-validator.jar` contains no WFF XSDs at all — the `XSD*.class` files in it are Xerces internals.
The real schemas ship inside **`memory-footprint.jar` → `docs.zip`**, one directory per format
version, `1/` through `5/`, rooted at `<version>/watchface.xsd`. 99 files for v5.

```powershell
Expand-Archive tools/memory-footprint.jar -DestinationPath $tmp
Expand-Archive $tmp/docs.zip -DestinationPath $tmp/docs
```

## Canvas → device is a clean ×0.9467

Measured at real scale on 2026-08-03 against the 426 × 426 device. Screen centre is x 213:

| element                   | x range | centre | offset   |
| ------------------------- | ------- | ------ | -------- |
| date row (`Mon 3` + chip) | 163–258 | 210.5  | **−2.5** |
| time                      | 95–330  | 212.5  | −0.5     |
| stat row                  | 87–339  | 213    | 0        |
| blob pair                 | 133–292 | 212.5  | −0.5     |

The lowest lit row is device y 373, which maps to canvas y 394 — exactly the bottom of the
`blob_hero` group. **The render matches the coordinate model exactly**, with no surprises, which is
what makes offline geometry checks worth writing.

The date chip's guessed centring is fine: −2.5px on a 426px display is under a percent and invisible
in the hand — a good outcome for a layout that had to be estimated, since there is no rendered-text-width
source.
