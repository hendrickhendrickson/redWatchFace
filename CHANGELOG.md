# Changelog

What changed and why, newest first. Design passes are dated by the day they were judged on the
wrist, not the day they were written.

Findings that outlived the change that produced them live in [docs/wff-findings.md](docs/wff-findings.md);
open work is in [TODO.md](TODO.md).

---

## Unreleased

### The moon gets a RadialGradient and two craters

- **The lit disc is shaded, not flat-filled.** A `RadialGradient` — in the v5 schema since the
  inventory in `docs/capabilities.md` was written, never previously exercised anywhere in this face —
  gives the disc a lit-sphere read instead of a coin. Two static `Ellipse` craters sit between the
  disc and the travelling shadow, so the shadow still covers them correctly as it crosses.
- **Deliberately not a bitmap.** The disc is 24px; a PNG would buy detail antialiasing already loses,
  and it would be the face's first raster asset in a project that is otherwise 100% generated vector
  primitives. `tools/gen/svg.ts` grew `RadialGradient` support to keep the preview loop honest about
  it — see `docs/capabilities.md` §2.1/§2.2, moved from "available and unused" to "in use".
- **⚠ Unproven on the wrist.** Checked against the `nighthalf` / `nightfull` / `nightnew` preview
  states and the semantic differ; not yet seen on the Pixel Watch 4. See `TODO.md`.

### The contact sheet, reordered — and three moons

- **`all-states.png` is five thumbnails wide**, up from three. Thirty-six frames in a 3-wide grid is
  twelve rows of a 426px-square face, taller than any screen it is read on, so the side-by-side
  comparison the sheet exists for was happening by scrolling and remembering.
- **Night is photographed three times** — half, full and new moon. The moon mark is the one element
  driven by a source that cannot be provoked: `MOON_PHASE_POSITION` moves the shadow 1.6px a day
  across a 24px disc, so a single night frame documented one arbitrary night of twenty-nine. The `night` state is
  gone; `nighthalf`, `nightfull` and `nightnew` replace it and differ from each other by that one
  source. `cycle-states.ts` and the preview's self-check take `nightfull`, since nothing about the
  motion at those three stops differs.
- **The three phases are derived from the synodic month**, not typed as 0 / 7.38 / 14.77, and each
  frame is checked against the face's OWN shadow expression — covering the disc, half across it,
  clear of it. A frame filed under the wrong phase would look exactly like a correct one, because
  the shadow is black on a black sky and nothing else on screen contradicts it.
- **The sheet opens with the setup**: ambient, baseline, the three moons, then the seven weekday
  frames, and every reaction after them. Monday is what all the reaction frames hold fixed, so the
  palette reads as part of the setup rather than as an appendix.
- **The weekday frames are rows of `CAPTURE_ORDER` itself.** They were a second list numbered off the
  end of the first, which expressed "last" and could not express "third". `WEEKDAY_CAPTURES` is gone,
  `numberedFile()` has one caller, and only the seven state names are still derived from `STATES`.

### Two tap targets

- **The date row opens the calendar and the heart-rate chip opens the health app.** Two `<Launch>`
  elements, the first interaction of any kind this face has had. Both are the enumerated system
  shortcuts, so neither depends on the undocumented arbitrary-app-id form of `@target`.
- **`tools/gen/launch.ts` restates the eight-shortcut enumeration as a union type**, because the
  schema does not: `launchTargetType` unions in `xs:string`, and a typo'd target validates and then
  does nothing. Measured, both spellings, in [docs/wff-findings.md](docs/wff-findings.md).
- **The date's tap region is the whole 450 × 80 top band**, not the ~90px the row draws in. The seven
  weekday copies sit inside a `Condition` with their own boxes, so there is no single element with
  the row's real bounds; narrowing `DATE_GROUP` would clip the glyphs. Nothing else is drawn above
  y=80.
- **The ambient date copy has no `Launch`**, since in ambient the first tap wakes the watch rather
  than reaching the face.

### Thresholds and frame naming

- **The sunglasses come out at `UV_INDEX >= 3`**, down from 4 — the bottom of the WHO/EPA "moderate"
  band rather than its middle. Two expressions in the emitted face, hero and companion; the pinned
  literal in `SHIPPED` moved with them in the same commit, which is what the diff shows.
- **`BASE`'s UV drops to 2**, because it has to stay under the gate: the base "good day" is the frame
  every other state inherits from, and at 3 the whole contact sheet would have put on sunglasses. The
  grid in `CANDIDATES` now brackets 2/3 rather than 3/4, so the operator is still tested at its edge.
- **The `sunny` frame shows the cocktail alone.** `HIGH_UV` and `HOT_AND_SUNNY` are independent and
  still are — a real hot, high-UV day gets both — but the frame that fired both documented neither,
  since nothing in it said which trigger owned which prop. `sunny` is now a temperature change and
  nothing else; `uv` is the sunglasses' frame.
- **The base step count reads 2011**, in `BASE` and in the `CANDIDATES` grid that had been left
  behind at 1912.
- **The weekday frames are numbered like every other state**, instead of carrying a `w-` prefix of
  their own. The prefix sorted all seven after `all-states.png` and gave `docs/states/` two naming
  schemes to explain; being a theme rather than a reaction is a fact about the frame, not about its
  file name. (They were numbered off the end of `CAPTURE_ORDER` at this point; the reordering above
  made them rows of it.)

### The calendar states, third pass

Another round against renderings. Two of these are the same bug found in a new place.

- **4 May is two friendly Jedi, not a villain.** The hero's narrowed eyes and downturned mouth are
  gone and its face is the ordinary one; the sabers carry the whole idea. Both blades are now the
  same length — the companion's was scaled down to match the smaller blob, which made the pair read
  as an adult's and a child's toy. Both lean less far right, which also takes the hero's blade off
  its own leaf tuft.
- **The hammer's peen is a triangle.** Three hand-tabulated thicknesses read as three chunks; it is a
  stack of rows now, the party hat's construction rotated onto the head's axis, with the same
  assertion holding the step finer than the device can resolve.
- **The sickle's blade meets the END of its handle.** Putting the arc's centre on the handle's top
  puts its foot `radius` back down the handle — so the blade attached partway along and nine pixels
  of stick carried on past it into the air. The centre is `radius` beyond the top instead.
- **The ghost's eye and mouth holes are `#000000`.** They are holes in a sheet, and a hole shows the
  background; the navy the blobs' own eyes use read as two ovals painted on.
  - **And its hem no longer shows red.** The previous fix checked that the torso _plus the scallops_
    reached the body's bottom edge, which is not the same thing: the scallops are half-circles, so
    the blob showed through every notch between them as a red tooth. The torso alone now covers the
    body, with the 2px overshoot `HERO_MOUTH_MASK` needs for the same antialiasing reason.
- **The party hats lost their brim.** They inherited the Santa hat's white band because they shared a
  builder, and at 40 wide against a 34-wide cone it was the biggest thing on the blob's head.
- **The Santa hats' crown is inset by the brim's corner radius**, because the brim is a
  `RoundRectangle` and a crown exactly as wide as it left two red nicks poking past the curve. The
  dome is also as deep as the crown is tall now — anything shallower leaves a straight shoulder where
  the ellipse stops, and the flop springing off it read as a notch cut out of the hat.
- **The Christmas tree stands on the same ground line as the blobs**, 62x112 at (80,282) against
  60x84 at (78,254). Its base was at y338 against feet at y394, so it hung in the air.
  - **The companion's sleep z's stay exactly where they were, and the tree overlaps them.** They moved
    twice to get out of its way — to (150,282), where they read as three z's coming off the moon, and
    then to a tall narrow (130,294), where they read as a column standing to attention — and both
    made `night` worse. `night` is on for a third of every day and `christmas` for three days a year,
    so the three-day state absorbs the collision: on Christmas night the z's drift across the canopy,
    which is what z's do. The rule this settles is written at `ANCHORS.COMPANION_SLEEP_ZZZ`.
  - **The assertion that the two must be apart is gone, deliberately.** It could only ever be satisfied
    by moving the z's, since the bezel pins the tree, so it was a build-time check casting a vote on
    a question about which state matters more. That belongs in a comment.
  - **What replaced it is the check that would have caught both bad positions**: the smallest z has to
    touch the blob it comes out of. Nothing said so — the z's are their own section and the body is
    the blob's — so every box fitted, the validator passed, and the render showed z's rising out of
    the sky. Measured against the body ELLIPSE, because both trios set off from a corner, which is
    precisely where a bounding box calls empty background "inside".

### The calendar states, second pass

Everything below is a change to the seven states in the entry under it, made after seeing them
rendered. Most of it is one bullet per thing that was wrong.

- **`cannabis` is now `weed` and `unity` is now `reunification`.** State names, predicate names and
  part names all follow; the capture frames renumber themselves on the next sweep.
- **The weed tuft is derived rather than tabulated.** `fan()` in `data/blobs.ts` takes a root, a
  spread and two sizes and produces the blades, so the three properties that make it read — one
  shared origin, symmetry, and a size falling off smoothly from the middle outward — are each one
  line instead of ten hand-typed boxes. The blades now radiate from the **top of the body** rather
  than from a point 4px inside it, which needed `leafPart()` to take a pivot; the companion's are
  proportionally fatter than the hero's, which is the one place the two fans deliberately disagree.
- **The hammer and the sickle lean towards each other**, ~20° off vertical, so the pair crosses the
  gap between the blobs the way the emblem does. The hammer's head tapers over three collinear
  strokes to a pointed peen; the sickle is mirrored about its own handle, sweeps 200° rather than
  155°, and tapers the other way to a point at its free end. Neither needed a rotated `PartDraw`: a
  thick `Line` with BUTT caps is a rectangle at any angle, and a rotated **circular** arc is the same
  arc at shifted angles.
- **The lightsaber is longer, held in the middle, and no longer looks like plastic.** The grip is the
  hilt's centre rather than wherever the fist happened to land on it (81% of the way up, as shipped);
  the blade went from 25 to 33 by leaning further, which cost `ANCHORS.HERO_PROPS` 14px of width; and
  the hilt is three tones — a dark body, two darker grip rings, a light emitter shroud — because a
  single pale grey beside the brightest object on the face reads as plastic.
  - **The companion draws one too, in green.** `face/saber.ts` owns the six strokes both share.
  - **The evil eyes lost their coral core** and gained weight instead: 1.8px of anything is a
    scratch at this size, not a glow. Two plain angled bars.
  - **The hero scowls.** Angled eyes over its ordinary grin read as a blob pulling a face; the
    downturned mouth is the same `270 → 450` arc the awake eyes are drawn with, which is a smile
    when it is an eye and a scowl when it is a mouth.
- **The tricolour flies to the RIGHT of its pole, and behind it.** Both are conventions for every
  flag this face grows, not facts about this one — a flag streams away from its bearer, and the pole
  passes in front of the cloth. Flying it left was a workaround for a limb box that was too small, so
  `HERO_LIMB_BOX` went from 106 to 122 instead. Nothing was previously being clipped at 106, so the
  everyday face renders identically.
- **Both Halloween faces are symmetric.** The ghost's eyes were centred on x53 against a sheet
  centred on 50, and the pumpkin's on 27 against a gourd on 30. Both are now mirrored about their own
  costume's centre line by construction, and asserted.
- **The party hats are cones.** They were stroked arcs — a band of constant width pretending to
  narrow. A filled triangle is not a WFF primitive and a rotated square cannot be cut in half, since
  a `PartDraw`'s clip box turns with its contents; so the cone is a stack of overlapping rectangles,
  one per row, each as wide as the triangle is at that height. The row count is asserted to keep the
  step in the silhouette finer than the device can resolve. Gold stripes and a pompom come free, cut
  to the cone's own width by the same function.
- **The Santa hats' red now sits on the whole white brim.** Same underlying bug as the party hats and
  worse: a stroked arc is a band with a **hole** in it, and the leaf tuft showed through the middle
  of the hat. The crown is a filled dome plus a stem, both running below the brim's top edge with the
  brim drawn over them.
- **Neither blob wears its hair under a hat.** `WEARS_HAT` is a third branch of the tuft switch that
  draws nothing — a cone rising out of a five-blade fan reads as a hat balanced on a bush.
- **The Christmas tree moved in and grew**, from 46x82 at (58,280) to 60x84 at (78,254): 13px from
  the companion instead of 47. It went up to come in, because the sleep z's block it below y338 and
  the heart-rate chip blocks it above y252. Its trunk gained a rounded foot, the coffee cup's trick.

### The calendar states, first pass

- **Seven more calendar states**, joining the New Year fireworks: `weed` (20 Apr), `labour`
  (1 May), `force` (4 May), `reunification` (3 Oct), `halloween` (31 Oct), `birthday` (19 Dec) and
  `christmas` (24–26 Dec). Each is an all-day window except the fireworks, which keep their hour
  clause. `HOLIDAY` in `states.ts` is the one place the dates are written; two build-time proofs walk
  all 372 month/day pairs and fail if any day belongs to two occasions or if a predicate strays
  outside its own row.
- **The two blobs can now be dressed as well as equipped.** `face/costumes.ts` holds the pieces they
  _wear_ — Santa hats, party hats, the ghost sheet, the pumpkin — as additive Conditions drawn over
  the blob rather than as branches that replace it, which is the call the step-goal flag already
  made. The Santa and party hats are the same `Hat` row type at four scales; the ghost and the
  pumpkin are one builder each, because they share nothing.
- **The companion can hold things.** `face/companion-props.ts` mirrors `hero-props.ts` one blob down
  — a sibling group in absolute canvas coordinates with `companionGyro()` repeated by hand — because
  the companion's own group is exactly as wide as its limbs and a 24px sickle in a hand sitting 5px
  from that edge is silently cut in half. See `docs/decisions/2026-08-11-calendar-states.md`.
- **A prop can no longer be left floating.** `HANDS_FULL` and `HOLDS_POLE` name everything either
  hand is holding, and the arm switches test them ahead of their resting poses. Before the calendar,
  every prop was gated on something that implied daylight so the arm was always up; an all-day cake
  at 23:30 is not. A proof over every hour of every celebration day is what holds it.
  - **This exposed a shipped bug.** The warm-day cocktail is gated on `WEATHER.IS_DAY` — the
    forecast's opinion — while the arm rests on `HOUR_0_23`. The two disagree wherever the sun does
    not follow office hours, and at 00:35 with a stale or high-latitude forecast the face drew a
    cocktail beside a lowered arm. The cocktail is now in `HANDS_FULL` too.
- **`pastBezel()` moved from `data/fireworks.ts` to `geometry.ts`**, where the canvas it is a
  property of lives. The Christmas tree is its second user: it stands in the empty lower-left, which
  is exactly where the round bezel cuts a square canvas hardest.
- **Fireworks**, shown only in the small hours of New Year's Day: five independently-phased rockets
  climbing from a shared launch line, each blooming into six varied sparks. A top-level canvas
  overlay like the rain field, drawn last, with no Gyro. Sparks are perturbed by the same seeded LCG
  the evaluation grid uses, so the build stays reproducible without a hand-tabulated column.
- **The sweat ramp gained two bands** — `flushed` (140 bpm, the outer pearls) and `soaked` (160 bpm,
  all three), replacing the single `drenched` frame. `drenched` stays as a 200 bpm cycle state with
  no frame of its own.
- **Heart rate now drives the drip _rate_ as well as its reach** — a bead every five seconds at 100
  bpm against one every 1.7 at 200. That half of the ramp is invisible in a still, so it is judged
  through `cycle-states.ts` rather than the sweep.
- **States are referred to by name, never by number.** `capture-states.ts --only=` now takes the
  state name like its sibling `cycle-states.ts` always has, and an unknown name is an error rather
  than a silently smaller sweep. The digits in a `docs/states/` file name order the directory in a
  file explorer and mean nothing outside it — inserting the fireworks state shifted four frames from
  `10x` to `11x`, which is exactly the kind of churn no reference should be exposed to.
- **`docs/states/` is numbered as one flat, zero-padded run, recalculated on every sweep.** The
  letter suffixes are gone: `4-cold`/`4b-gloves` became `05-cold`/`06-gloves`. Grouping a base state
  with its sub-states encoded a judgement the file name is the wrong place for, it drifted — the
  eight calendar states were crammed into one slot purely to avoid renaming the meeting frames — and
  it made the cost of inserting a state depend on where you inserted it. `CAPTURE_GROUPS` is now a
  flat `CAPTURE_ORDER`, and the sweep's orphan prune turns a renumber into a rename on disk. The
  padding is what makes the number do its one job: `ls`, git and GitHub all sort lexicographically,
  so unpadded they put `10-fireworks` between `1-baseline` and `2-night`, and only Windows Explorer's
  natural sort was hiding it.

## 2026-08-09 — hhson-lib, and the PowerShell tooling in TypeScript

- **`hhson-lib` joins as the generator's one runtime dependency**, as a `file:` link to the
  submodule. Its `rules.md` is `@`-imported by `CLAUDE.md` and its skills are symlinked into
  `.claude/skills/` by a postinstall hook.
- **`capture-states.ps1` and `cycle-states.ps1` are now `.ts`**, run by Node's type stripping like
  the rest of `tools/`. The contact sheet lost its captions in the move: it used `System.Drawing`,
  and `sharp` has no text-rendering API, so captions were scrapped rather than solved a second way.
- **`mini` is `companion` everywhere in the source.** The emitted part names keep their `mini_`
  prefix, so the rendering is unchanged.

## 2026-08-09 — the data-driven pass, and a second compilation target

The migration moved the magic numbers into TypeScript without making them _data_. This pass finished
the job: `el('Condition')` scaffolds 32 → 0, pre-escaped expression literals 37 → 0, XML entities in
source 96 → 0, and numeric literals across the 19 section modules 1806 → 596. `--audit`'s
output-side numbers deliberately did not move.

- **`tools/gen/eval.ts`** — a WFF expression evaluator, built first because it was the instrument
  everything else was measured with. `--equiv` answers whether two expressions agree over a 783-row
  grid and reports where they diverge. The first version of that grid was vacuous: it varied one
  source at a time, so it pronounced the known `or()`/`and()` mis-binding equivalent. It is now named
  states plus boundary sweeps plus 600 seeded combinations, and `--selftest` asserts it still catches
  that mis-binding.
- **An SVG backend** (`svg.ts`) sharing `face()`'s node tree, and `tools/preview` as a view of it
  rather than a third implementation of WFF semantics. It is what finally settled the crossfade
  argument by counting visible clock copies across a transition.
- **`--check` was broken on every fresh clone for three releases**: the line ending was defined
  twice, `xml.ts` as `EOL` and `face.ts` as five hard-coded `"\r\n"`. It failed at byte 38 and took
  `validateWatchFaceXml` with it. One definition now; net content change zero.
- **The step-goal flag got its arm back.** Merging the salute's dispatch had made the flag exclusive
  with the right arm, so from 1.2.0 the goal state drew a pole in mid-air. Every check passed
  throughout and none could have caught it — see [docs/authoring.md](docs/authoring.md), "What the
  gate cannot see".

## 2026-08-08 — design pass 7: the salute retired, meetings arrive (1.2.0)

The wearer's real week turned out not to match what the face was showing. The two daily windows are
digital standups, Friday afternoon is a shared game session, and Wednesday has no digital standup at
all — only an in-person 10:30–10:45 one.

- **A headset for every digital meeting, a coffee cup for Wednesday's in-person one, a controller
  for the back half of Friday's game time.** All of it in `tools/gen/meetings.ts`, replacing
  `salute.ts`. The arm-routing machinery the salute needed is deleted rather than left dormant —
  nothing in the new schedule raises an arm.
- **A real bug caught before it shipped:** `or(...)` builds a flat `A || B || C || D` with no
  parentheses, and ANDing that parses as `A || B || (D && …)`. Two weekdays showed a headset at every
  hour. Found by evaluating the emitted text at midnight, not by reading it — reading it looks fine.
- **The art took four shoots**, and the useful difference is that pass three was drawn from
  measurements (a photograph of the real controller; the face's own committed geometry) and
  **asserted before the build** — 30 claims, all green, all confirmed by the shoot. The two earlier
  passes each cost a full build-shoot-review cycle to discover things that were arithmetic all along.
- **Pass four fixed what pass three called unfixable.** A `PartDraw` cannot start left of its group's
  origin — true — but the group is not the only coordinate space available. The three hand props
  moved into `face/hero-props.ts` at canvas `(199,262)`, centred exactly, draw order unchanged.
- The companion's headset was scrapped mid-pass so the hero's shape could be judged alone.

## 2026-08-08 — watchface.xml becomes generated (1.1.0)

4381 hand-authored lines became 2189 generated ones plus TypeScript, with the semantic differ
reporting zero differences against the pre-migration face. The case, the counter-argument and the
measurements are in
[docs/decisions/2026-08-08-generate-watchface-xml.md](docs/decisions/2026-08-08-generate-watchface-xml.md).

- The gate is a **semantic** differ, not a byte comparison: `model.ts` compares draw order, tags,
  attributes and text, normalising away comments, whitespace and `1.0` vs `1`. It has a self-test
  that mutates the reference seven ways and asserts each is caught, because the first `--check`
  compared the generator's output to its own input and could never fail.
- The eleven weekday colour sites collapse to one `byWeekday()`; the precipitation ramp's 73 verbatim
  copies to one binding; `HERO_BOX`'s 31 literal copies to one constant.
- **The date crossfade, closed on the wrist.** A `<Variant>` window is used in _both_ directions, so
  a gap going one way is an overlap coming back and no timing avoids both. The date's real problem
  was never the timing but that its two copies were not congruent. Fixed in `crossfade.ts` (one
  binding, which throws at build time if the windows overlap into ambient) and `face/date-common.ts`.

## 2026-08-07 — the salute

Weekdays 09:05–09:20 and 16:00–16:30, with Friday's afternoon window at 15:00–15:30 and a cocktail
taking 15:30–16:00. It preferred the blob's right arm and fell back to the other when that hand held
an umbrella or a cocktail, with **no negation anywhere** — the schema selects the first true
`Compare`, so a "salute AND busy" branch above a "salute" branch gives the second one "AND NOT busy"
for free. Retired the following day.

## 2026-08-06 — design passes 4–6: reactions, colour, animation

Passes 4 and 5 were iterated **on hardware** rather than designed and shipped: the rain took five
passes and the sweat three, each corrected by looking at it.

- **`fract()` verified on the watch**, which removed the biggest constraint on animation here — phase
  offsets are no longer locked to whole seconds. The rain went from three waves of identical drops to
  24 fully independent ones, with count, size and speed all scaled by `CHANCE_OF_PRECIPITATION`.
- **Animated sweat**: beads down both cheeks with speed and length ramped linearly from 100 to
  200 bpm, and the forehead cluster filling in three steps.
- **Sunny split in two** — sunglasses answer `UV_INDEX`, the cocktail keeps its clear-and-warm
  trigger. **Cold split in two** — scarf at ≤10°, gloves at ≤5°, each a strict subset of the one
  above.
- **The weekday colour scheme.** `[DAY_OF_WEEK]` picks the hero's body colour and everything else is
  derived from it by ratios measured off the colours the face already had. The companion wears
  _tomorrow's_ hero colour, so the pair never share a hue. **`[DAY_OF_WEEK]` is 1 = Sunday**,
  measured on the watch — assuming ISO 8601 would have shifted every colour by a day, which looks
  correct six days out of seven.
- **Fading beats gating for anything driven by a live reading.** Both new reactions originally
  switched sub-parts on at thresholds, and a real pulse sitting on the number makes that flicker.

## 2026-08-04 — design pass 3: motion, signed off on the wrist

Four rounds, because the three motion features from pass 2 had been called done on the strength of
schema-valid XML and a still image, and **neither of those can see motion**.

- **The Zzz were driven by `[ANIMATION_VALUE]`, which does not exist.** `<Animation>` is a tween, not
  a clock. Rebuilt on `[SECOND_MILLISECOND]`.
- **The parallax was not broken, just far too subtle** at ±2.5px on a 426px screen. Gain raised 3.2×.
- **The accessories are siblings of the blobs, not children**, so none inherited the `<Gyro>` — the
  hero's fist would have slid off the umbrella shaft by up to 16px at full tilt. Each now repeats its
  blob's gain.
- **Three reported regressions turned out to be one cause**: the mock build still sitting on the
  watch. `mock-state off` restores the tree but does not reinstall, and `status` only ever inspected
  the working tree. Both fixed at the mechanism.
- **`cycle-states` came out of this session** — the only way to judge anything that moves, and its
  absence is why three features shipped broken.

## 2026-08-04 — design pass 2 (1.0.0)

- **Snapshots became value-mocked.** `mock-state.ts` replaces `debug-triggers.mjs` and
  `preview-mock.mjs`: it patches the data and lets the real `Condition`s evaluate, so nesting takes
  care of itself and a sweep can no longer document a state the watch cannot be in.
- Both hero arms drop when asleep; the ambient date became one `PartText`; the cocktail centred on
  the fist; a **step-goal flag** in the other hand.
- **Moon phase**, night only. `MOON_PHASE_POSITION` turned out to be **in days, 0–29.53**, not a 0–1
  fraction — assuming a fraction would have pinned the mask 246px off-screen and shown a permanent
  full moon.
- **Gyro parallax on both blobs** and the Zzz drift — both of which shipped broken and were fixed in
  pass 3.

## 2026-08-04 — design pass 1 (0.1.0)

Eight requested changes, all verified on the watch, plus the sweep reordered into reading order —
quietest first, then time of day, then weather by increasing severity, then the body-driven one —
which is the order `docs/states/` still lists in.

Sweat beads became a shallow arc; the umbrella canopy domed; the steps icon became a shoe print on
its fifth attempt; the skeleton face made symmetric; the lightning connected to the burst; the Zzz
moved to leave from the mouths; cold and freezing separated. The clock transition's two copies were
made disjoint, which is what stopped the halo — and made the `IS_AVAILABLE` guard load-bearing, since
`TEMPERATURE` reads 0 with no weather and `0 <= 10` is true.

## 2026-08-03 — on hardware, on a second machine, and on v5

- **First real build, first install, first wrist.** Heart rate, steps, battery and the coral
  low-battery state all confirmed; outdoor legibility at 3000 nits confirmed good.
- **Weather needed `format.version` 5.** At v4 the sources validate but `IS_AVAILABLE` is permanently
  false, even with the Pixel Weather app showing 30°. The cost is that a Wear OS 6 watch can install
  this and fail to render, since `minSdk` is still 36.
- **`<`, `<=` and `!=` all work**, settled on the watch with four throwaway `PartText` elements. The
  XSD enumeration that omits them is not authoritative and is not enforced.
- **The toolchain was rebuilt from scratch on a second machine**, headlessly and without admin — the
  recipe and its four traps are in [docs/device.md](docs/device.md).
- **The first state sweep**, which needed three fixes to the capture tooling before it produced a
  trustworthy set. All three failed silently, every bad frame landing on disk under a plausible name.
- **A real `preview.png`**, shot on the watch. `generate-preview.mjs` was deleted for having drifted
  far enough out of sync that running it would have replaced a correct preview with a wrong one.
- **`git init`** — the repo starts at `cd4d3ca`.
