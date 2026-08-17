# Open

What is actually outstanding. Closed work is in [CHANGELOG.md](CHANGELOG.md); the reference material
that used to live here is in [docs/wff-findings.md](docs/wff-findings.md).

## Needs the wrist, or the weather

- [ ] **Neither tap target has been tapped.** `date_interactive` → `CALENDAR` and `chip_heart_rate`
      → `HEALTH_HEART_RATE` are schema-valid and nothing more; a wrong `@target` validates and does
      nothing, so PASS is not evidence here. Three things to see at once: that each opens the right
      app, whether the tappable region is the group's declared box or only its drawn content, and
      whether the date row's full-width band fights the top-edge system gesture. The heart-rate chip
      is the smaller target at 70 × 36 canvas px — 66 × 34 on the device.

- [ ] **The thunderstorm `CONDITION` code is still unknown.** The bolt is gated on
      `CHANCE_OF_PRECIPITATION >= 90`, so it fires in any downpour rather than strictly during
      thunder. One equality test replaces that once the code is seen — and it needs an actual
      thunderstorm, which cannot be faked. Probe recipe in
      [docs/wff-findings.md](docs/wff-findings.md#reading-a-code-off-the-wrist).
- [ ] **Nothing has been seen with live weather or a live pulse.** Every reaction was judged against
      mocked literals. The two that could still surprise are the UV branch (does the provider publish
      a usable index?) and the rain, whose density depends on a `CHANCE_OF_PRECIPITATION` that has
      only ever been read as 0 here.
- [ ] **Settle `PartDraw` clipping with one throwaway build**, a shape deliberately hanging out of
      its box. Three existing shapes quietly depend on the answer and the step-goal flag is 12px wide
      rather than 14 because of it.
- [ ] **`[MONTH]` is assumed to be 1 = January, and has never been read off the watch.** All eight
      calendar states now depend on it, so if it is zero-based every one of them fires a month early —
      and each is invisible for 364 days a year, so nothing would report it until the wrong day.
      `MONTH_0_11` existing as a separate source is strong evidence `MONTH` is 1-based, but that is an
      inference, not a measurement. `[DAY_OF_WEEK]` was assumed to be ISO once too, and was not.
      Same probe recipe as the `CONDITION` code:
      [docs/wff-findings.md](docs/wff-findings.md#reading-a-code-off-the-wrist). One throwaway
      `PartText` reading `[MONTH]` settles it, and the cheapest moment to look is any capture run.

## Face

- [ ] **`hero_hatted` is an empty `Compare`, and it fails the schema.** `blob-hero.ts:530` is
      `{ name: 'hero_hatted', when: WEARS_HAT, then: [] }`, which serialises to
      `<Compare expression="hero_hatted" />` with no children. `validateWatchFaceXml` rejects it —
      _"the content of element 'Compare' is not complete"_ at line 538 — and `checkMemoryFootprint`
      then cannot parse the file at all, so **both jar-gated checks fail on `HEAD` today**. On
      birthday and over Christmas the hero therefore has no leaves rather than a hat. The semantic
      differ cannot see it: the empty `Compare` is in `face.model.json` as the committed baseline, so
      `npm run diff` is clean. Found 2026-08-16 by `npm run validate`, which is the only thing in the
      repo that can find it. Either fill the branch with the hat, or drop it until the hat exists.

- [ ] **The moon's `RadialGradient` and craters have never been seen on the wrist.** Checked against
      the `nighthalf` / `nightfull` / `nightnew` preview states and the schema validator, neither of
      which can tell a real gradient from a silently-ignored one - `Fill/@color` is still `required`
      and present as a fallback, so a watch that does not implement `RadialGradient` would just show
      the flat colour, and nothing would report that as a failure. One capture sweep settles it.
- [ ] **The companion's headset comes back** once the hero's shape is judged final — see the note in
      `tools/gen/face/blob-companion.ts`. It is also the thing that would demonstrate `meetings.ts`
      doing its job, since `HEADSET_WINDOW` is currently emitted exactly once.
- [ ] **The moon's lit limb is always on the left**, so a waxing moon is mirrored. Fixing it needs a
      second mirrored copy behind a `Condition` on the phase. The `nighthalf` frame in `docs/states/`
      is the waxing half, so the sheet now shows the defect rather than only describing it here.
- [ ] **~15 `<Variant>` elements are still on default timing** (blobs, chips, weather). They only
      fade out, so they cannot ghost, but a shorter `EASE_OUT` would get them off screen early
      instead of lingering through the whole ramp.
- [ ] **The forehead pearls flicker by construction.** The middle pearl is lit 100–119, off 120–149
      and on again from 150, exactly as requested, so a pulse hovering on 119 or 149 blinks it. The
      fix that keeps the 1-2-3 count is to leave the middle pearl lit in every band and add the right
      pearl at 120 — one branch, no geometry.
- [ ] **The snow proxy**: `TEMPERATURE <= 0 && CHANCE_OF_PRECIPITATION >= 50`. Both terms are already
      in the face, so it costs one expression — and today a freezing wet day gets blue rain next to a
      snowflake, which reads as _deliberately_ wrong.

## Build and tooling

- [ ] **Make the missing verification jars fail rather than skip.** Highest value-per-hour item in
      the repo and unrelated to anything else: a `-Pwff.tools.required` property makes "I chose not to
      verify" explicit instead of silent. Today a clone without the jars reports `BUILD SUCCESSFUL`
      having verified nothing.
- [ ] **Re-shoot `preview.png` on a dry day**, if the picker should show the baseline pair rather
      than the rain state. The current one is honest — it was raining — and shows the face has
      personality.

## Considered, not committed to

- [ ] A `<UserConfigurations>` colour theme picker. `[CONFIGURATION.<id>]` reads back into
      expressions, so it could drive more than a hex swap.
- [ ] Swapping one stat for a tappable `ComplicationSlot`, which is the only door to calendar,
      sunrise/sunset, contacts and third-party data.
- [ ] Play Store distribution, if the face ever wants an update channel rather than a sideload. It
      would need an AAB, a developer account and a `versionCode` that moves. The signing and the
      `minSdk` floor it depends on are already done — see
      [docs/device.md](docs/device.md#handing-the-face-to-someone-else).

The ranked list of unused WFF features worth acting on is
[docs/capabilities.md](docs/capabilities.md) Part 3 — `renderMode="MASK"` and `Reference` are the two
at the top, and both remove something currently painful.
