# TODO — getting redPlant Blob onto the watch

Ordered so that nothing blocks on the watch until the face already works in an emulator.

## Start here (as of 2026-08-08, design pass 7 — the salute retired, headset/coffee/controller added, then revised after the first shoot)

**The salute is gone. In its place: a headset for every digital meeting, a coffee
cup for Wednesday's in-person one, and a game controller for the back half of
Friday's game time.** The wearer's actual weekly schedule turned out not to match
what the face had been showing: the two daily windows were digital standups (a
headset fits, a salute never did), Friday's afternoon window is a shared game
session rather than a second standup, and Wednesday - previously saluting twice a
day like everyone else - actually has no digital standup at all, only a single
in-person 10:30-10:45 one. All of this lives in `tools/gen/meetings.ts` now
(replaces `salute.ts`), and the arm-routing machinery the salute needed
(`HANDS_FULL`/`SALUTE_BUSY`, the two "which arm" Conditions, the palm-on-the-brow
PartDraws) is deleted rather than left dormant - nothing in the new schedule ever
raises an arm, so there was nothing left for it to route between.

**A REAL BUG WAS CAUGHT BEFORE IT SHIPPED, and it is worth reading regardless of
whether you touch this area again:** `or(eq(DOW,2), eq(DOW,3), eq(DOW,5),
eq(DOW,6))` builds a flat `A || B || C || D` with no parentheses of its own, and
pasting that straight into `and(days, eq(HOUR,9), ...)` parses as `A || B || (D &&
HOUR==9 && ...)` - `&&` binds tighter than `||` with nothing grouping the OR chain.
The symptom was Monday and Tuesday showing a headset at every hour of the day,
found by evaluating `HEADSET_WINDOW` at midnight rather than by reading the
expression - reading it looks fine. Fixed by wrapping both day-lists in `group()`.
The lesson generalises: any `or()` result that is later ANDed with something else
needs `group()` around it, and this is why - see the comment now sitting on
`MON_TUE_THU_FRI` in meetings.ts.

Priority for the one new collision - a hot, sunny Wednesday 10:30-10:45, or a hot,
sunny Friday 15:30-16:00, where the weather-driven cocktail and a meeting-time prop
would otherwise both want the same fist - is resolved the same no-negation way the
salute's busy test used to be: the coffee cup and the controller are tested AHEAD
of the cocktail in one `Condition`, so the cocktail's own `Compare` means "hot and
sunny AND NOT coffee-time AND NOT controller-time" for free. `wedcoffeehot` in
`mock-state.ts` exists to prove it.

**THE ART TOOK THREE SHOOTS, and the lesson is in how the third one differed.**
Passes one and two were drawn from reasoning and judged after the fact; pass three
was drawn from *measurements* - a photograph of the real controller for its layout,
and the face's own committed geometry for every anchor point - and then **asserted
before the build**, by a throwaway script that checked all 28 claims the code
comments make (buttons contained against the shell's rounded *corner arcs*, not its
bounding box; the handle tangent to the cup wall at 16.97 against a wall at 17; the
mic's arc endpoints landing inside the ear cup's lower half and beside the mouth
rather than over it). Every one held, and the shoot confirmed it. The two earlier
passes each cost a full build-shoot-review cycle to discover things that were
arithmetic all along.

The first-shoot feedback, and what each item became:

- **The controller was unrecognisable, twice.** Pass one packed the whole layout
  into ~30x24 *device* pixels (the design canvas is ~5% larger than the wrist, so
  "design pixels" overstate real size) and it read as a smudge with coloured dots.
  Pass two overshot to 52x42 - legible, but too big, still with the wrong internal
  proportions and with buttons poking out through the shell's rounded corners. **Pass
  three is traced off a photograph**: every offset is a measured fraction of the body
  width (left stick 0.204 across / 0.191 down, d-pad 0.355 / 0.388, right stick
  0.691 / 0.382, ABXY centre 0.822 / 0.204, grips 0.145 and 0.855, body height 0.55
  of its width), and those fractions are written into the comment on
  `hero_controller` so the next person can check them rather than re-judge them.
  **The d-pad sits INBOARD of the left stick** - 0.355 against 0.204 - which is the
  single most recognisable thing about the layout and the thing both earlier passes
  had backwards. Final size 28 wide. Only the buttons are exaggerated: true scale is
  0.079 of the body width, or 2.2px, below the point where a colour reads at all, so
  they are 3.2px with the diamond's spread opened to match. Everything else is
  honest. It is WHITE for contrast against black, with Xbox's own ABXY colours reused
  from hexes the palette already had (A green, B coral, X the scarf blue, Y the sun's
  yellow) rather than four new ones.
- **The coffee cup's steam read as an arrowhead, then as a kink.** Two lines
  converging on a shared point above the cup *is* an arrowhead, geometrically; two
  disjoint one-bend wisps still read as two bent wires. Three segments each - **two
  direction changes** - is where it starts reading as vapour. They are also now
  translucent (`C.STEAM`, alpha 0x99), the only translucent colour on the face. The
  cup body is centred on the hand's centre with its **base exactly on that centre**,
  and the handle's 60-degree gap faces the cup so the ring's leftmost pixel lands
  *on* the cup's right wall rather than inside it - that overlap was what made the
  wall look twice as thick on one side.
- **The headset was the worst of the three, and is the only one still
  single-blob.** The companion's version is SCRAPPED FOR NOW, deliberately, so this
  shape could be judged and fixed on its own rather than two shapes' problems being
  tangled together - see the note in blob-companion.ts for what comes back once the
  hero's is settled. Pass two made the cups a narrow standing oval, which
  over-corrected into a sliver and left a **1px gap** between cup and body - and at
  this scale a hairline of black between two shapes separates them completely, which
  is exactly what "not attached" meant. Pass three widens them to 10, drops them 6px
  to y60..80 (straddling the eyes at y62 and the mouth at y84..94, the way an ear
  does), and **overlaps them 3px into the body's outline** rather than abutting it.
  The band is thinner (4, was 5) and its peak at y40 sits *inside* the body's
  outline, with the leaf tuft ending at exactly y40 so the leaves rest on the band
  rather than being cut by it. The boom mic keeps pass two's single smooth `Arc` -
  that part was right - but both ends moved: it now leaves the cup's lower half and
  finishes at (67,88), level with the mouth and 7px clear of its right edge, instead
  of stopping above it.

**PASS FOUR FIXED THE THING PASS THREE CALLED UNFIXABLE, and the lesson is that the
constraint was real but the framing was wrong.** Pass three left the controller 3.5px
right of the hand and wrote that off: the hand sits at x10.5 in the hero group's own
coordinates, a `PartDraw` cannot start left of the group origin, and content there is
clipped - which is true, and the companion's left hand demonstrates it (its cream cap
is drawn from x-2 and arrives flat-sided). What that reasoning missed is that **the
group is not the only coordinate space available**. The umbrella, the bolt, the burst
and both sets of Zzz are all *siblings* of the blob rather than children of it,
positioned in absolute canvas coordinates, each repeating the blob's Gyro gain by hand
so it still tracks the wrist.

So the three hand props moved out of `blob_hero` into their own top-level section,
`tools/gen/face/hero-props.ts`, at canvas (199,262) - which puts the hand at
group-local (18.5,35) with room on every side. The controller is now centred on the
hand **exactly**, and so is the cup. Two things made this safe rather than risky:
the new section is registered immediately after `blobHero()` in `face/index.ts`,
which is where those Conditions used to sit as its last children, so **draw order is
unchanged**; and the cocktail's part box moved from the hero group's (0,6) to the new
group's (8,6), which is the same canvas position, (207,268) - asserted in the geometry
check and confirmed by reshooting `3-sunny` as a regression.

The general lesson for this face: **"a Part cannot go there" is a statement about one
group, not about the canvas.** Anything that needs to overhang a blob belongs beside
it, not inside it - and `heroGyro()` is what makes that free.

**Pass four's other three fixes**, all from the same round of feedback:

- **The cup's base was flat and its rim had vanished.** It was a RoundRectangle,
  which bottoms out flat - wrong in a view looking down far enough to see into the
  cup at all: if the rim reads as an ellipse the base has to as well. It is now a rim
  ellipse, a straight-sided body and a bottom ellipse stacked, which gives a CONVEX
  base. The rim is a separate white ellipse *under* the coffee, inset 1.75px
  horizontally and 1px vertically; without it the liquid touched open background on
  both sides and the cup had no wall at the top, reading as a bowl of brown.
- **A third steam wisp**, and the constraint that they must never touch is now
  arithmetic rather than eyeballed: centrelines at 5..7, 9.5..11.5 and 14..16, each
  growing 0.7 per side at 1.4 thick, leaving 1.1px gaps.
- **The controller's sides angle out.** A single rounded rectangle gave dead-vertical
  sides, which read as a slab; the real shell is 0.67 of its maximum width at the top
  edge. Built as a 24-wide shell with the grip ellipses reaching 28 at their widest,
  so the silhouette runs 15 across the very top, 24 by y4.5 and 28 by y13.5.
- **The band was invisible against the arms**, and this one is worth a number: the
  old band `#2b3a4a` differed from the limbs' `#23384f` by a **luma of 2.8** - not
  "similar", effectively identical - and the arms cross the band. It is now
  `C.HEADSET_LIGHT`, the headset's own cushion tone, at a luma gap of 73.7. It is
  also drawn *behind* the cups, which it always was; that only became visible once it
  stopped being the same colour as them. And its peak moved from y40 to y36, which is
  the body's topmost point, so the band rides ON the crown instead of cutting a chord
  through the head - checked across the whole span, worst clearance 0.00px at the
  crown and positive everywhere else.

What HAS been checked, on the final revision: the validator, the assemble, the
memory footprint, all mock states round-tripping, the generator's own type-check,
**30 geometry assertions** run before the build (containment against the shell's
rounded *corner arcs*, the handle tangent at 16.97 against a wall at 17, steam gaps,
band-vs-head clearance sampled across the span, the colour-contrast claim, and the
cocktail's canvas position being unchanged by the group move), and - **shot on the
watch four times, 2026-08-08**. The last shoot also re-took `3-sunny` as a
regression check on the cocktail, since it changed coordinate spaces. All frames plus
the contact sheet are current. The pulsing controller button is visible in a still,
but `cycle-states.ps1 -Only headset,fricontroller` is still worth a run before
calling the *motion* settled - a still shows the pulse at one arbitrary phase, not
its cadence.

**Genuinely open**: the companion's headset needs to come back once anyone judges
the hero's shape final - see the note in blob-companion.ts. Nothing else from this
pass is outstanding.

## Superseded — start here (as of 2026-08-07, design passes 4–6 — reactions, colour, the salute)

**Nine changes went in across three passes.**
Items 1–7 (reaction split and animation) and item 8 (the weekday colour scheme) went
in on 2026-08-06; item 9, the salute, on 2026-08-07. `docs/states/` is current, the
contact sheet is in reading order, the watch is back on a build whose md5 matches a
clean tree, and the XML validates against v5 / assembles / passes the memory
footprint check.

THE SALUTE WAS REVISED AFTER ITS FIRST SHOOT and the four frames it needs -
`10-salute`, `10b-salute-blocked`, `10c-friday-salute`, `10d-friday-drink` - are NOT
yet on disk; `all-states.png` still shows the first version's windows and only one
arm. Nothing else is stale. The sweep is two commands once a device answers:

```powershell
powershell -Command "& tools/capture-states.ps1 -Only 10-salute,10b-salute-blocked,10c-friday-salute,10d-friday-drink"
powershell -Command "& tools/capture-states.ps1 -SheetOnly"
```

What HAS been checked on the revision: the validator, the assemble, the memory
footprint, all four mock states round-tripping, the geometry in the offline
rasteriser at 9x on both arms, and - the useful one - the windows and the arm choice
evaluated straight out of the XML at every boundary minute and against six weather
variants, including that all five copies of the expression pair agree. What has NOT:
a wrist. `salute` and `salutebusy` are both in `cycle-states.ps1` for that.

TWO CAPTURE TRAPS BIT DURING THAT SWEEP, both now documented in the README, and
neither is about the face:

- **A dimmed frame passed the guard.** `Test-IsFace` tested `max luminance >= 240`,
  and the watch draws a small pure-white system indicator near the bottom of the
  screen that pins `max` at 255 however dark the face is. The test is now the
  FRACTION of pixels over luminance 200 - 3.7-5.3% good, 0.3% dimmed. It was caught
  by probing the hero's body pixel against another frame, (122,40,34) against
  (238,78,67), i.e. 51%. Probe a pixel; do not trust the guard.
- **A notification chip landed on the face** - an ongoing Fitbit "Morning Brief",
  rendered over the bottom of the watch face in all three frames. No check can tell
  that from the face. `cmd notification snooze --for <ms> '<key>'` parks it for a
  sweep and `unsnooze` restores it. Do not confuse it with the small white dot in
  most frames, which is the unread indicator and is in the older frames too.

Passes 4 and 5 were iterated ON HARDWARE rather than designed and shipped: the rain
took five passes and the sweat three, each corrected by looking at it. The verdicts
are recorded in the XML next to the code they changed, because none of them was
predictable from the markup. If you read one thing about this pass, read the
`fract()` finding below — it is the reusable part.

What changed:

1. **Sunny split in two.** Sunglasses now answer `[WEATHER.UV_INDEX] >= 6`
   (`&& IS_DAY`) — 6 is where the WHO/EPA scale calls the index "high". The
   cocktail keeps its original clear-and-25-degrees trigger, untouched as asked.
   `UV_INDEX` was in `sourceType.xsd` all along; it had just never been read.
   **Only the branch is proven, not the provider**: the sweep mocks the source to a
   literal, so no live UV reading has been seen. If the shades never appear on a
   bright day, print the raw value before touching the threshold.
2. **Wind: re-checked, still impossible.** No speed, no direction, no gust, and
   nothing in the hourly or daily patterns either. Second time asked; the answer
   will not change without a new format version.
3. **Cold split in two.** Scarf stays at `<= 10`, gloves moved to `<= 5`. Each step
   is a strict subset of the one above it (scarf ⊃ gloves ⊃ snowflake), so no
   branch excludes another.
4. **Animated rain, five passes.** Now 24 fully independent drops in two columns
   that bracket the umbrella canopy, with **drop count, size and speed all scaled by
   `CHANCE_OF_PRECIPITATION`** — ~7 drops at the 50% gate, 24 at 100%, off one
   `clamp` term. No waves, no shared phases. The long note at `rain_fall` carries
   the whole history; the short version is that every instinct about this was wrong
   in a way only the wrist exposed.
5. **Animated sweat, three passes.** Beads run down both cheeks with speed and
   length ramped **linearly from 100bpm to 200**, a second bead per cheek fading in
   across 140..160, and the forehead cluster filling in three steps (middle pearl at
   100, outer pair at 120, all three at 150).
6. **The step-goal flag faces right and is gripped, not balanced.** The pole runs
   through the hand's centre line and the arm is drawn *after* it, so the fist
   occludes the middle. It had to shrink from 14 to 12 wide: the PartDraw box is the
   group's own 106 and content is clipped to it.
7. **Snow: not directly queryable.** There is no `IS_SNOWING`. `CONDITION` is an
   undocumented integer with two values ever observed here, and `CONDITION_NAME` is
   a string, which WFF's arithmetic-only expressions cannot compare — only print.
   See the open list.

8. **The weekday colour scheme.** `[DAY_OF_WEEK]` picks the hero's body colour;
   everything else is DERIVED from it by ratios measured off the colours the face
   already had — each blob's mouth is its own body hue at S×0.55 / L×0.41, and the
   date row is the body hue at the retired ice-blue and slate's exact S/L, so only
   its hue moves. The companion wears TOMORROW's hero colour, so the pair never
   share a hue and the small blob previews the next day. Seven `w-<weekday>` frames
   in `docs/states/`. **`[DAY_OF_WEEK]` is 1 = Sunday**, measured on the watch with
   a throwaway `PartText`, not ISO 8601 — assuming ISO would have shifted every
   colour by a day, which looks correct six days out of seven. See the README
   section and the note on `hero_body`.

9. **The salute**, 2026-08-07, revised twice the same day. Weekdays 09:05-09:20
   and 16:00-16:30; on Friday the afternoon window is 15:00-15:30 and a cocktail
   takes 15:30-16:00. The two Friday windows ABUT at 15:30, written in both
   Conditions and derived in neither.

   IT PREFERS THE BLOB'S RIGHT ARM (screen LEFT) and falls back to the other one
   when that hand is holding an umbrella or a cocktail - both of which terminate
   at a fixed point in that fist. "Busy" is the umbrella's trigger OR the
   cocktail's WEATHER trigger; the Friday drink is not in it, because that window
   cannot overlap a salute. NO NEGATION anywhere: the schema selects the FIRST
   true Compare, so a "salute AND busy" branch above a "salute" branch gives the
   second one "salute AND NOT busy" for free. The cost is that the raised pose and
   the raised mitten are each written twice, once as the busy branch and once as
   the Default.

   TWO Conditions draw each arm - limbs before the body so the shoulder reads as
   a joint, hand after the face so it sits ON the brow - and the hand is attached
   by redrawing the forearm's core over the capsule, 8px LONGER than the limb
   pass draws it. The step-goal flag only stands down on the FALLBACK now.
   Frames `10-salute`, `10b-salute-blocked`, `10c-friday-salute`,
   `10d-friday-drink`.

Three things that change how you work on this:

- **`fract()` is verified** (see the finding below). Phase offsets are no longer
  locked to whole seconds, which is what made per-drop rain possible. The Zzz drift
  is still on the old whole-second formula and could lose its 3-second period the
  same way.
- **`mock-state.ts` takes `--set=KEY=VALUE`.** Both new reactions are continuous
  functions of a reading, so judging them means looking at points BETWEEN the named
  states — `--set=HEART_RATE=150`, `--set=WEATHER.CHANCE_OF_PRECIPITATION=70`.
  Adding a named state per value you want to eyeball once turns `STATES` into a junk
  drawer. Unknown keys abort rather than silently leaving the source live.
- **Fading beats gating for anything driven by a live reading.** Both reactions
  originally switched sub-parts on at thresholds, and a real pulse or precipitation
  figure sitting on the number makes that flicker. Where a threshold survives it is
  because it was asked for (see the forehead pearls).

**DONE 2026-08-08: `watchface.xml` is now GENERATED from `tools/gen/*.ts`. Do not edit it.**

    node tools/gen/build.ts              regenerate
    node tools/gen/build.ts --diff       prove it still renders the same as before
    node tools/gen/build.ts --selftest   prove the differ can still fail
    npx tsc --noEmit                     type-check the generator

See [docs/authoring-strategy.md](docs/authoring-strategy.md). The case in one line: with comments
stripped the hand-authored file held **3737 numeric literals with only 313 distinct values**, and
the hero's body box alone was typed out 31 times - so moving a blob was up to 31 coordinated edits
that nothing verified.

**The gate is a SEMANTIC differ, not a byte comparison.** The generated XML looks nothing like the
old file - 4381 lines became 2228, and the prose moved into the TypeScript - but it must render
identically. `tools/gen/model.ts` compares draw order, tags, attributes and text, normalising away
comments, whitespace and `1.0` vs `1`. It has a self-test that mutates the reference seven ways and
asserts each is caught, because the first version of `--check` compared the generator's output to
its own input and could never fail.

Two things that must not break, both already handled: `mock-state.ts` matches `<Template>` markup
as an exact string, so the serialiser renders any element with text content inline; and the
generated XML stays committed so a clone without Node still builds.

Items 1 and 2 below are what the generator closes. The date crossfade disagreement was **closed
on the wrist on 2026-08-08** - see the entry below the list.

Still open, most important first:

1. ~~**The salute's window is written out FIVE times, in two forms.**~~
   **CLOSED 2026-08-08 by the generator.** The window and the busy test now live
   in `tools/gen/salute.ts` as `SALUTE_WINDOW` and `SALUTE_BUSY`, and the eight
   copies in the output are all emitted from those two bindings. Expressions
   still cannot be referenced across Conditions, so the duplication is still in
   the XML - it just cannot disagree any more.

   The scratchpad Python checker this entry asked for is no longer needed for
   *this* problem: it evaluated all copies over 7 days x 24 hours x boundary
   minutes and asserted they agreed, which is now structural. A general
   expression evaluator is still worth having for the question it alone answers -
   do the 24 mock states actually exercise every branch - see the open item
   below.
2. **The seven-colour table is written out NINE times** — hero body, hero round
   mouth, hero open mouth, hero mouth mask, companion body, companion round mouth,
   companion open mouth, companion mouth mask, date row — because WFF has no
   variables. The masks are the dangerous ones: an open mouth is a dark ellipse
   whose top half is repainted in the body colour, so a body/mask mismatch shows up
   as a dark bar across a face on exactly one weekday.

   THIS IS WHAT THE GENERATOR CLOSES - see the note at the top of this list. Under
   `palette.ts` the body and its mask take the same argument, so the mismatch becomes
   unrepresentable rather than merely absent, and the seven derived colours are
   computed rather than transcribed. Two things measured on 2026-08-08 are worth
   having here. **It is eleven `Part*` sites, not nine** - the date row is three of
   them (`date_chip`, `date_weekday`, `date_day`), and the companion's four are
   `mini_body`, `mini_mouth_sleep`, `mini_mouth_open`, `mini_mouth_mask`. And
   **all of them agree today**:
   both masks match their bodies on all seven days, `mini_body[d] == hero_body[d+1]`,
   and all 21 derived hexes reproduce byte-for-byte from the seven body colours at the
   documented ratios. So the scheme is intact and the derivation is cheap to rebuild -
   which is what this note was actually worried about losing.
3. **The forehead pearls flicker by construction.** The middle pearl is lit from
   100..119, off from 120..149 and on again from 150, exactly as requested, so a
   pulse hovering on 119 or 149 blinks it. Thresholds flicker and ramps do not. The
   fix that keeps the 1-2-3 count without a disappearance is to leave the middle
   pearl lit in every band and add the right pearl at 120 — one branch, no geometry.
4. **Nothing has been seen with LIVE weather or a live pulse.** Every reaction was
   judged against mocked literals. The two that could still surprise are the UV
   branch (does the provider publish a usable index?) and the rain, whose density
   now depends on a `CHANCE_OF_PRECIPITATION` that has only ever been read as 0 here.
5. **Consider the snow proxy.** `TEMPERATURE <= 0 && CHANCE_OF_PRECIPITATION >= 50`
   is precipitation at freezing, which in practice means snow or sleet. Two
   expressions away from swapping blue drops for white flakes on a freezing wet day —
   currently such a day gets rain, and the snowflake already on screen makes it read
   as *deliberately* wrong. Not built: it was asked as a question, not a request.
6. **`PartDraw` clipping is still unsettled**, and three existing shapes quietly
   depend on the answer while the step-goal flag's 12px width depends on it being
   real. See the finding below; one throwaway build settles it.
7. Everything from pass 3 that is still open: the thunderstorm condition code, the
   moon's mirrored limb, and the ~15 `Variant` elements on default timing. **"Judge
   the ambient transition by eye" is now done** - see below.

### CLOSED 2026-08-08 — the date crossfade, judged on the wrist

Watched in both directions on hardware, which is the only way any of this is
visible: it lasts about 200ms, all 24 mock states are steady-state so no
screenshot can catch a midpoint, and both timings were valid floats so the
validator had nothing to say.

**A `<Variant>` window is used in BOTH directions.** It declares the ambient
value, and the attribute animates toward whichever value the destination mode
wants — through the same window, with the same curve. So a gap going one way is
an overlap coming back, and there is no way to have neither: gapping the wake
needs the ambient copy's window first, gapping the sleep needs the opposite.
This is the fact the whole v1/v2/v3 history was circling without stating.

**Which means the timing was never the date's real problem.** The clock has the
same overlap and has never looked wrong, because its two copies are the same
string at the same origin — the LIGHT stems sit inside the BOLD ones and the
overlap reads as a weight morph. The date's ambient copy was a single centred
`"%s %d"` while its interactive copy is two parts pinned around a chip, so a
centred string distributed its own word space and put the weekday ~16px right of
the interactive one. The overlap had nothing to hide behind: two dates, side by
side. It also made the ambient row shift horizontally between the 1st and the
31st.

Fixed in three parts, all in the generator:

- `tools/gen/crossfade.ts` — `FADE_OUT` / `FADE_IN`, one binding for what was
  four hand-written window sets. The clock and both date copies now share them,
  so date and time transition synchronously. It throws at build time if
  `startOffset + duration > 1.0` (over it the offset is **silently ignored** and
  both copies fade across the whole transition — the v1 smear, unreported) or if
  the windows overlap going into ambient.
- `tools/gen/face/date-common.ts` — the boxes, font and chip radius both copies
  must agree on, so neither gets to state them itself. Congruence is the
  requirement; the timing is secondary.
- The ambient date draws the chip as a **2px outline** (`DATE_CHIP_OUTLINE_SHAPE`,
  inset by half the stroke so the line's outer edge lands on the filled chip's
  edge). Without it, sharing the interactive boxes inherits the chip-sized gap
  between weekday and day number and reads as a typographic error. Outlined
  keeps the lit-pixel budget near the old single-string version.

The interpolations were also inverted on the date — EASE_OUT leaving, EASE_IN
arriving, i.e. drop fast then arrive slowly — which is what made its sleep gap
noticeably longer than the clock's. Now EASE_IN out, EASE_OUT in.

Still true and not worth chasing: waking is a morph rather than a cut. Built-in
faces change weight in code; WFF cannot, so two copies and an overlap is the
whole toolkit. The only lever is where the overlap sits, and narrowing it trades
the morph for a blink.

## Superseded — start here (as of 2026-08-04, design pass 3 — motion)

> Kept for history; the current list is at the top of this file.

**The design backlog is empty and the motion is signed off on the wrist.**
Parallax, the Zzz drift and every accessory that tracks a blob were checked by
cycling the nine live states on hardware and tilting. `docs/states/` holds ten
current frames — those nine plus ambient, which the cycler skips because both
blob groups are alpha 0 there — and a contact sheet.

Three things that change how you work on this:

- **`tools/mock-state.ts` replaces `debug-triggers.mjs` and
  `preview-mock.mjs`, both deleted.** Snapshots patch the DATA (temperature,
  hour, heart rate…) and let the real Conditions evaluate, instead of forcing
  trigger expressions at battery levels. One build per state, ~3 min for the
  set, no battery override.
- **`tools/cycle-states.ps1` is how you judge anything that moves.**
  `capture-states.ps1` photographs states; this one shows them, mocked
  `--live` so the accelerometer and clock stay real. Nothing about motion can
  be judged from a screenshot or from the validator.
- **There is no wind data source in WFF.** See the finding below before
  planning anything else weather-driven. (Re-verified 2026-08-06.)

Still open:

1. **Judge the ambient transition by eye.** The crossfade windows are disjoint
   so the halo is structurally impossible, but that is reasoning rather than
   observation, and `screencap` is too slow to check it. The one motion-adjacent
   thing still unconfirmed.
2. **The thunderstorm condition code** still needs an actual thunderstorm.
3. **The moon's lit limb is always on the left**, so a waxing moon is mirrored.
   Fixing it needs a second mirrored copy behind a Condition on the phase.
4. Smaller: the ~15 `Variant` elements still on default timing.

### If you read one thing in this file

Three separate bugs this session were **invisible to the validator and to
`screencap`**, and one was invisible to both while also being reported as three
different bugs in the watch face. The pattern behind all of them:

| what was trusted | what it actually proves |
|---|---|
| validator PASSED | the XML parses. Source names inside a `Transform value` are **not** checked, so `[ANIMATION_VALUE]` — a source that does not exist — passed and did nothing. |
| a screenshot | one frame. Not motion, and not which APK produced it. |
| `mock-state status` says clean | the **working tree**. Says nothing about the watch, and after a capture run the watch is normally still on a mock. |
| a gradle exit code | that gradle ran. `& cmd \c` (backslash) never runs the command and still exits 0. |

The check that actually settles it: **compare the installed APK's md5 against
the clean build** (`cycle-states.ps1 -Restore` does this), and **look at the
watch** for anything that moves.

**Pass 4 adds a fifth row to that table: an offline rasteriser.** With no watch
connected, the 2026-08-06 geometry was checked by a throwaway ~250-line Python
script that reads the real `watchface.xml`, substitutes the sources the way
`mock-state.ts` does, evaluates the actual `Condition`s and `Transform`s, draws
the primitives with PIL and reports any shape outside its `PartDraw` box or
outside the round bezel. It caught nothing wrong in the end but it *proved* the
placement — including combinations no mock state covers, like rain plus night plus
the step goal, which is where the collisions would have been. It is deliberately
NOT in the repo: `tools/generate-preview.mjs` was deleted for drifting away from
the face it claimed to draw, and the only reason this one cannot drift is that it
parses the XML rather than reimplementing it. What it proves is **geometry at one
instant** — it knows nothing about `Variant`, `Gyro`, font metrics, antialiasing,
or whether the watch implements a given expression at all. It is not a substitute
for the wrist for any of the four rows above.

## Superseded — start here (as of 2026-08-04, design pass 1)

> Kept for history; the current list is at the top of this file. Details below
> describe the state of things after pass 1 and were true then.

The design backlog is empty. Eight requested changes went in on 2026-08-04 and
are all verified on the watch — see the session log at the top of Findings. The
states are renumbered into reading order (`0-ambient` … `8-sweating`) and
`docs/states/` is current. `preview.png` is a deterministic mock.

Genuinely left:

1. **Judge the ambient transition by eye.** The crossfade windows are now
   disjoint, so the halo is structurally impossible — but that is reasoning,
   not observation, and measurement cannot check it (see the `<Variant>`
   finding for why `screencap` is too slow).
2. **The thunderstorm condition code** still needs an actual thunderstorm.
3. Smaller: lowering the companion's arms at night so the pair can sit closer,
   and the ~15 `Variant` elements still on default timing.

Optional, if you want it: the preview carries a Wear OS system dot near the
bottom edge (it is a system overlay, not part of the face). The `docs/` history
directory `verified-2026-08-03/` was deleted on 2026-08-08.

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
- [x] **Motion, verified 2026-08-04.** Gyro parallax, the Zzz drift, and every
      accessory tracking its blob — checked by cycling all nine states with
      `tools/cycle-states.ps1` and tilting. Reported back as "looking great".
      This is the only way to check any of it: see the motion findings for why
      the validator and `screencap` both wave broken motion through.
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

### Session log — 2026-08-04, design pass 2

**Snapshots are now value-mocked.** `tools/mock-state.ts` replaces both
`debug-triggers.mjs` and `preview-mock.mjs`, which are deleted. Instead of
forcing each trigger expression to a battery level, it substitutes the source
tokens with literals for the state being captured and lets the real Conditions
evaluate. Every frame now shows the same 19:12 / Mon 19 / 88 bpm / 1912 steps /
88% except for the one value that state is about — 25° for sunny, 0° for
freezing, 120 bpm for sweating, 23:12 for night.

Two things fall out of that beyond the readability:

- **Nesting is free.** Setting the temperature to 0 fires cold *and* freezing,
  because they are real expressions over real data. The `replaceWith` hack that
  the old script needed for exactly this is gone.
- **It exposes real interactions the old sweep hid.** The thunderstorm frame now
  correctly shows the umbrella up, because 90% precipitation also satisfies the
  50% rain trigger. That was always the watch's behaviour; the old forcing just
  could not show it.

Cost: one build per state instead of one for the set, so about three minutes.
The safety net is a scan for any `[SOURCE]` token left unmocked, which would
mean a snapshot silently drifting with the weather. It strips comments first —
`watchface.xml` discusses `[IS_AMBIENT]`, which does not exist, and the raw
scan reported it.

**The nine changes**, in order asked:

1. Value-mocked snapshots, above.
2. **Both hero arms drop when asleep.** The screen-right arm was the last limb
   still held out; it moved out of `hero_limbs` into its own two-pose Condition,
   mirrored about the BODY centre (x' = 100 - x) rather than the group centre —
   that 3px distinction is already documented for the shoulder. Its glove had to
   follow, or a cold night put a mitten where the raised hand used to be. The
   Zzz then had to move a third time: the lowered hand now occupies where the
   first z was, so the chain shifted up to sit level with the mouth.
3. **Ambient date is one `PartText`, not two.** Interactive needs two because
   the day sits in a chip; ambient draws no chip, so the 23px the chip fills was
   just a hole. Rendering "%s %d" as a single centred string hands the spacing
   to the font and lands the pair exactly on centre, where the interactive row
   measures 2.5px off.
4. **Shortened the burst spoke that crossed the hero.** At full length its far
   corner reached x 222 against a body edge of 221 — SQUARE caps add 4.5 along
   the direction *and* 4.5 perpendicular, which is what put it over.
5. **Cocktail centred on the fist**, moved right 1.5px — via the shapes, since
   `Part*` x/y are integers.
6. **Step-goal flag**, in the blob's left (screen-right) hand, opposite the
   cocktail and umbrella so they can coexist. Uses `STEP_PERCENT >= 100` against
   the real `STEP_GOAL`, measured at 10000. Suppressed at night, since the arm
   it flies from drops.
7. **Wind: not possible.** No wind source exists — see the source list finding.
   Nothing was implemented.
8. **Moon phase**, night only, in the snowflake's slot with the snowflake
   winning. The two are separate Conditions with mutually exclusive expressions
   rather than ordered Compares. `MOON_PHASE_POSITION` turned out to be **in
   days**, not a 0..1 fraction; the probe read 19.79 with `MOON_PHASE_TYPE` 5,
   and 19.79/29.53 = 0.67 which is waning gibbous, so the two agree. An assumed
   0..1 range would have pinned the mask 246px away and shown a permanent full
   moon.
9. **Motion**: `<Gyro>` parallax on both blobs, weaker on the companion so it
   reads as depth; and the Zzz drift upward while fading, on an inner group so
   the animated alpha does not fight the ambient `Variant`.

   **Both shipped broken and were fixed in design pass 3** — see the session log
   below. Neither had been looked at on a wrist, only reasoned about and then
   screenshotted through tooling that had pinned their inputs to constants.

### Session log — 2026-08-04, design pass 3 (motion)

**Outcome: signed off on the wrist.** Parallax, the Zzz drift and every
accessory that tracks a blob were verified by cycling all nine states on
hardware and tilting. Getting there took four rounds, because the three motion
features from pass 2 had been called done on the strength of schema-valid XML
and a still image, and **neither of those can see motion**.

**Round 1 — "the Z's don't move and I can't see any parallax".** Both true, for
two unrelated reasons, with a third hiding one of them.

- **The Zzz were driven by `[ANIMATION_VALUE]`, which does not exist.** I had
  taken `<Animation>` for a clock feeding a 0..1 ramp; it is a *tween* that
  smooths an already-changing value, so with a constant expression there was
  nothing to tween. Rebuilt on `[SECOND_MILLISECOND]` — the only sub-second
  source — with a clamp-built triangle for alpha so the sawtooth reset in `y`
  happens at zero opacity. Verified by burst `screencap`, and later by sampling
  the region's luminance over time: a clean 3.06s rise-and-fall.
- **The parallax was not broken, just far too subtle**: ±2.5px on a 426px
  screen. Gain raised 3.2×. Accelerometer confirmed present via
  `dumpsys sensorservice`.
- **`mock-state` was masking the parallax entirely** — it pins
  `ACCELEROMETER_ANGLE_*` to 0 for snapshot determinism, which is right for a
  still and wrong for a build going on a wrist. Hence `--live`.

**Round 2 — "do the accessories line up with the parallax?" They did not.**
`hero_umbrella`, `sleep_zzz`, `companion_burst`, `companion_lightning` and
`mini_sleep_zzz` are top-level *siblings* of the blob groups, not children —
they have to be, each is gated by its own `Condition` — so none inherited the
`<Gyro>`. The hero's fist would have slid off the umbrella shaft by up to 16px
at full tilt, and the bolt tip out of the burst spoke. Each now repeats its
blob's gain verbatim; WFF has no variables, so that duplication is load-bearing.
(It is now emitted from one constant - see `heroGyro()` / `companionGyro()`.) `freeze_mark` and `moon_mark` stay static on
purpose — nothing joins to them, and holding them in the clock's plane is what
makes them read as sky. **Found by walking the element tree, not by reading it**;
a `<Gyro>` behind a 12-line comment is easy to miss and easy to regex wrong.

**Round 3 — three reported regressions, all of them one self-inflicted cause,
and the most expensive mistake of the session.** Reported: the z's had gone
slow, the parallax had vanished, and the ambient clock was rendering in the
interactive font weight. All three were real, and all three were **the mock
build still sitting on the watch**.

`capture-states.ps1` installs a mocked APK per state and calls
`mock-state.ts off` afterwards — which restores `watchface.xml` but **does not
reinstall**. Re-shooting one snapshot therefore left the watch on that state's
mock, which pins the clock sources (drift frozen), zeroes the accelerometer (no
parallax) and swaps `<DigitalClock>` for a static bold `PartText` (ambient in
the wrong weight). Three symptoms, one cause, none of them in the watch face.

What made it stick: `mock-state.ts status` said **"real values (clean)"** and
that was read as "the watch is fine". It only ever inspected the working tree.
A clean tree and a mocked device are not merely compatible — after a capture run
they are the *normal* combination.

Nearly compounded it, too: the first attempt to measure the frozen drift
returned a dead-flat line that looked like proof the animation was broken. It
was sampling the **ambient** screen — `KEYCODE_WAKEUP` alone does not lift a
Pixel Watch out of AOD, a trap `capture-states.ps1` already documents and the
throwaway probe had skipped.

Fixed at the mechanism, not the symptom:

- `capture-states.ps1` reinstalls the real build as the last thing it does to
  the device — on partial runs and after failures — and verifies the package's
  `lastUpdateTime` actually moved instead of trusting an exit code.
- `mock-state.ts status` now states outright that it cannot see the watch.
- The clock mock emits **both** `TimeText` copies with their real Variant
  timings. The single-copy version had been quietly wrong in *every* ambient
  snapshot since it was written.

**Round 4 — "where's the step-goal screenshot?"** The flag was built in pass 2
and works, but `mock-state.ts` labelled its state "not a snapshot", so it was
never shot and `docs/states/` held no record of it. Reasonably read as never
having been built. Now `9-step-goal`. **If a reaction appears in no snapshot, it
will be believed missing** — the snowflake and the moon get away with being
marks rather than states only because other frames happen to contain them. Its
mock step count was also 10240 (10×1024, a habit rather than a reason); it is
10,000 at exactly 100%, which also puts the `>= 100` trigger on its boundary.

**`tools/cycle-states.ps1` came out of this.** `capture-states.ps1` photographs
states; this one shows them, every one mocked `--live`, holding each long enough
to tilt at. It is the only way to judge motion, and its absence is why three
features shipped broken.

Two smaller findings, both about trusting the wrong signal:

- **`& cmd \c "..."` (backslash) does not run the command.** cmd fails to parse
  the switch, opens an interactive shell, reads EOF, and **exits 0** — so an
  install silently never happens and the exit code still says success.
- **A hard kill skips `finally`.** Observed: killing the job that owned
  `cycle-states.ps1` left the watch on a 45s timeout running a mock, despite the
  cleanup block. Hence `-Restore`, which recovers from the state file and
  **verifies by comparing the installed APK's md5 against the clean build** —
  the only check here that cannot be fooled.

Also cleared out documentation rot this exposed: the README still told you to
run `preview-mock.mjs` and TODO.md still had a live how-to for
`debug-triggers.mjs`, both deleted earlier the same day.

### Session log — 2026-08-04, design pass 1

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

**A staged `preview.png`.** It is what the picker shows, so it should look like
a good day rather than like whatever the sky and your pulse were doing. Almost
none of that is settable from the host, so the values are hardcoded into the XML
and you build, shoot, and restore. (This was `tools/preview-mock.mjs`; it is now
just `mock-state.ts on baseline`, since the preview and the snapshots want the
same values and there is no reason to keep two tables in sync.)

The clock is the one value that cannot be substituted: `TimeText` renders the
system clock, has no literal mode, and its `<Font>` is the restricted
definition that accepts no children at all. The whole `<DigitalClock>` block is
swapped for `PartText` instead — **both copies of it**, interactive and ambient,
with their Variant timings. Emitting only the interactive one is what made every
ambient snapshot render the clock in the wrong font weight.

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
- **`PartDraw` clipping is believed real but has never been isolated, and three
  existing shapes quietly depend on the answer.** The rotation finding above is
  direct evidence *for* it — the steps icon's taper measurably vanished — but
  `mini_limbs` puts a hand ellipse at local x −2 and another reaching local x 63
  in a 62-wide box, and `mini_scarf`'s tail runs to local y 51 in a 40-tall box.
  If clipping is real, all three are losing a slice: 2px off one mitten, 1px off
  the other, and 11px off the scarf tail. That is small enough that nobody has
  ever noticed either way, and small enough that the notes in the XML claiming
  those hands "reach 141" and that the tail "hangs below the body" may be off by
  exactly that slice. **It matters now** because the step-goal flag is 12 wide
  rather than 14 specifically to stay inside the box, and because the tempting
  way to build seamless falling rain is to move shapes inside a *static* box and
  let the clip hide the wrap — which is a silent catastrophe if the box does not
  clip, since drops would then appear up the canvas in the stat row. The rain
  therefore moves whole groups with a bounded travel and fades at both ends
  instead, and it depends on no clipping at all. Settling this needs one throwaway
  build with a shape deliberately hanging out of its box.

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

### The complete data source list — and what is NOT in it

`sourceType.xsd` in the v5 tree enumerates **116** sources — 100 plain
enumerations plus 16 patterns for the hourly and daily forecasts. Worth reading
the list before designing a feature, because two obvious ones are missing and
several useful ones are easy to overlook.

Re-extracted and re-counted on 2026-08-06, when wind was asked about a second
time. Nothing has changed: it is not there, and neither is snow.

**THERE IS NO WIND.** Not speed, not direction, not gust, and not in the
`WEATHER.HOURS.n.*` / `WEATHER.DAYS.n.*` patterns either. The whole weather
bundle is:

```
IS_AVAILABLE  IS_ERROR  CONDITION  CONDITION_NAME  IS_DAY  TEMPERATURE
TEMPERATURE_UNIT  TEMPERATURE_LOW  TEMPERATURE_HIGH  CHANCE_OF_PRECIPITATION
UV_INDEX  LAST_UPDATED
```
plus hourly (`WEATHER.HOURS.n.*`) and daily (`WEATHER.DAYS.n.*`) forecasts of
the same. There is also no humidity, no pressure, no air quality, no sunrise or
sunset time.

**AND THERE IS NO PRECIPITATION TYPE**, which is what "can we tell whether it is
snowing" comes down to. The only handles are:

- `CONDITION` — an undocumented integer. Two values have ever been observed on
  this watch (1 = clear, 14 = partly cloudy), so a snow code cannot be written
  down, only guessed. Reading one off requires it to actually snow while a
  `PartText` printing the raw code is on the wrist.
- `CONDITION_NAME` — a string, and therefore useless to a `Condition`:
  expressions are arithmetic only, so a name can be *printed* but not compared.
  (`subText()` and `textLength()` exist and are string-ish, but they produce
  strings, not booleans, and `Compare` needs a number.)

The usable proxy is `TEMPERATURE <= 0 && CHANCE_OF_PRECIPITATION >= 50` —
precipitation at or below freezing. Both terms are already used elsewhere in the
face, so it costs one expression. Not built; see the open list at the top.

Sources that ARE there and were not being used:

| source | note |
|---|---|
| `STEP_GOAL`, `STEP_PERCENT` | the wearer's real goal — measured 10000 and a 0..100 percentage, so no need to hardcode 10k |
| `MOON_PHASE_POSITION` | **in days, 0..29.53** — not a fraction, see the moon note |
| `MOON_PHASE_TYPE` | integer, 0..7 |
| `ACCELEROMETER_*` | X/Y/Z plus `ANGLE_X/Y/Z/XY`, in degrees — this is what `<Gyro>` reads |
| `UNREAD_NOTIFICATION_COUNT` | untouched so far |
| `WEATHER.UV_INDEX` | **in use since 2026-08-06** — drives the sunglasses at `>= 6`. Integer, standard 0–11+ scale. Its own value has not been read off hardware yet, so if the shades never appear that is the first thing to print. |
| `BATTERY_TEMPERATURE_CELSIUS` | untouched so far |
| `HOURS_SINCE_EPOCH`, `MINUTES_SINCE_EPOCH` | monotonic counters, useful for slow cycles |

Extract the list yourself with:

```powershell
tar -xf tools/memory-footprint.jar -C $tmp docs.zip; tar -xf $tmp/docs.zip -C $tmp
# then read $tmp/5/common/simpleTypes/sourceType.xsd
```

### Motion: `<Gyro>` and `<Animation>`

Both exist, both are cheap, and neither costs anything against the memory
budget. The details that are not obvious from the names:

- **`<Gyro>`** is a child of a Group or Part (max one) and OFFSETS its parent's
  `x`, `y`, `scaleX`, `scaleY`, `angle` or `alpha` from an expression over the
  `ACCELEROMETER_*` sources. Child order matters: it comes before `Transform`,
  which comes before `Variant`. `clamp` is available and the schema's own
  example uses it.
- **The gain has to be big enough to see.** The first version used ±2.5px of
  travel, on the reasoning that the hero group is only 106 wide and its feet sit
  near the bezel. Nothing was ever close to cropping, and ±2.5px on a 426px
  screen reads as no parallax at all. It is now ±8px / ±5px for the hero and
  ±5.5 / ±3.5 for the companion — the worst-case corner is radius 198 against
  the 225 bezel. **What sells the depth is the RATIO between the two**, about
  0.7, not the absolute size.
- **`<Animation>` is a child of `<Transform>`, and it is a TWEEN — not a clock.**
  It smooths a value that the Transform has *already changed for some other
  reason*, the way the docs' own example slides between two positions:
  ```xml
  <Transform target="x" value="[SECOND] % 2 == 0 ? 0 : 200">
    <Animation duration="1" interpolation="EASE_IN_OUT" />
  </Transform>
  ```
  `repeat="-1"` loops forever, `repeat="0"` (the default) plays once, `fps`
  defaults to 15.
- **THERE IS NO `[ANIMATION_VALUE]` DATA SOURCE.** This file used to claim there
  was one and that `<Animation>` ramped it 0..1. That is wrong, it is not in the
  116-entry source list, and the Zzz drift built on it did nothing whatsoever on
  the wrist. Worse, it **passed the validator**: source names inside a Transform
  `value` are not keyref-checked the way `Compare/@expression` is, so an
  invented source there is a *silent* failure. **Motion is only ever verified on
  the watch.**
- **For a free-running ramp, use `[SECOND_MILLISECOND]`** (float, 0.0–59.999) —
  the only source with sub-second precision. Confirmed on hardware to re-render
  smoothly, not in one-second steps. Phase over an N-second period:
  ```
  p = (([SECOND] % N) + [SECOND_MILLISECOND] - [SECOND]) / N
  ```
  Take the fraction as `SECOND_MILLISECOND - SECOND` rather than a float
  modulo — integer `%` is the documented case, float `%` is not. Pick N so that
  `60 % N == 0` or the phase jumps at every minute boundary.
- A triangle wave is not directly available but falls out of a clamp:
  `2p - clamp(4p - 2, 0, 2)` is 0 at p=0, 1 at p=0.5, 0 at p=1. The Zzz alpha
  uses it so the sawtooth reset in `y` happens while they are transparent; the
  moon mask uses the same trick.
- **A trapezoid falls out of two clamps** and is the better envelope when the
  thing should be *fully* visible for most of its cycle rather than only at the
  peak: `clamp(4p, 0, 1) - clamp(4p - 3, 0, 1)` rises over the first quarter,
  holds at 1 across the middle half and falls over the last quarter. The rain and
  the sweat drips use it — with a triangle the drops read as flickering, because
  they are only ever briefly at full strength.
- **The function enumeration in `arithmeticExpressionType.xsd` is longer than you
  would guess.** It lists `round floor ceil fract sin cos tan asin acos atan abs
  clamp rand log log2 log10 sqrt cbrt exp expm1 deg rad pow numberFormat icuText
  icuBestText subText textLength colorArgb colorRgb extractColorFromColors
  extractColorFromWeightedColors`. Notably **there is no `min` or `max`**, which
  is why `clamp` does all the work above. Of the set, only `clamp` and **`fract`**
  have actually been exercised on this watch. Anything else is still unproven, and
  an unimplemented function inside a `Transform` fails *silently* while passing the
  validator — exactly like the non-existent `[ANIMATION_VALUE]` did.

### `fract()` works, and it is worth more than it looks

**Verified on the Pixel Watch 4 on 2026-08-06**, and it removes the single biggest
constraint on animation in this face.

The problem it solves: with only the proven `(([SECOND] % N) + [SECOND_MILLISECOND]
- [SECOND]) / N` formula, **phase offsets are only available in whole seconds**, via
`([SECOND] + k) % N`. That couples the number of distinct phases to the period — so
three staggered things force a 3-second cycle, and a 3-second cycle cannot be fast
without a travel too long to fit the screen. The first rain attempt crawled at
30px/s for exactly this reason, and its drops had to be grouped into "waves" that
shared a phase, which meant sharing an alpha, which is what made them visibly
breathe in unison.

With `fract()` a phase offset is any constant you like:

```
p = fract([SECOND_MILLISECOND] * rate + offset)
```

so every element can have its own phase and its own rate. The rain went from three
waves of identical drops to 24 fully independent ones.

**`60 * rate` must be a whole number.** `[SECOND_MILLISECOND]` wraps 59.999 → 0, so
a rate that does not divide evenly into the minute produces a visible hiccup once a
minute — the sort of thing noticed a week later and blamed on the sensor. 0.6, 0.75
and 0.9 are fine (36, 45, 54); 0.7 is fine (42); anything derived from a live
reading is almost never fine, which is why **the rain scales its speed through
travel and never through rate**.

**How it was verified, because "it looked right" would not have been enough.** A
dead `Transform` leaves its shapes at their authored positions, so the two cases are
distinguishable by measurement rather than by eye. With the mock's frozen clock the
three rain waves had to land at y +48, +80 and +16; a dead `fract()` would have
stacked all thirty drops at +0 in one opaque row. Every drop measured within 1px of
the live prediction, on all three phase offsets and in both columns. That is the
standard any new function should be held to here.
- **Do not put an animated `Transform` and an AMBIENT `Variant` on the same
  attribute of the same element.** Which wins in ambient is not something the
  schema settles. Put the animation on an inner Group instead; the outer one
  keeps the Variant.
- **Two animated things on the same cycle should be phase-offset**, or they read
  as one mechanism blinking. The companion's Zzz run `([SECOND] + 1) % 3`.
- **`<Gyro>` is inherited by children, and the accessories are NOT children.**
  This is the trap. `hero_umbrella`, `sleep_zzz`, `companion_burst`,
  `companion_lightning` and `mini_sleep_zzz` are top-level siblings of the blob
  groups — they have to be, because each is gated by its own `Condition` — so
  they inherit nothing, and the umbrella slid out of the fist by up to 16px
  across a full tilt sweep. Each now repeats its blob's gain verbatim: the hero's
  0.229/0.143 for the umbrella and its z's, the companion's 0.157/0.1 for the
  burst, the bolt and its z's. **There is no variable mechanism in WFF**, so the
  duplication is unavoidable in the output - but since 2026-08-08 all seven sites
  are emitted from `GYRO_HERO` / `GYRO_COMPANION` in `tools/gen/geometry.ts`, so
  changing a gain is one edit rather than seven.
  Things actually inside the groups — leaves, limbs, gloves, scarf, cocktail,
  goal flag — are fine and need nothing.
- `freeze_mark` and `moon_mark` are deliberately left with **no** Gyro: nothing
  joins to them, and holding them in the same plane as the clock is what makes
  them read as sky. Distant things moving least is the effect, not a gap in it.
- To audit this, walk the tree rather than reading it — a `<Gyro>` sitting
  behind a 12-line comment is easy to miss and easy to regex wrong.

**How to verify motion without a wrist.** For a final judgement you need
`tools/cycle-states.ps1` and your arm, but a loop can be *measured*: burst
`screencap` and sample the mean luminance of the element's bounding box across
frames. A working 3s Zzz cycle reads as a clean rise and fall peaking ~3.06s
apart; a broken one is flat to two decimal places. Two rules make it trustworthy —
**check every frame is interactive** (`Test-IsFace`; `KEYCODE_WAKEUP` alone does
not lift the watch out of AOD, so an unchecked probe silently measures the
ambient screen and reports "frozen"), and **confirm which APK is installed**
before believing anything the screen shows.

### `Part*` x/y are integers

`x="1.5"` on a `PartDraw`/`PartText` fails validation with `'1.5' is not a valid
value for 'integer'`. Only the primitives inside — `Ellipse`, `Rectangle`,
`Line`, `Arc`, `RoundRectangle` — take floats. So sub-pixel placement has to be
done by moving the shapes within the box, not by moving the box. Cost one
build to discover.

### `PartDraw` rotation: `angle` is clockwise-positive, and it clips the rotated result

Two facts about `pivotX`/`pivotY`/`angle` that the schema does not state, both needed by
the saluting palm and neither guessable:

* **Positive is clockwise.** `leaf_left` has carried `angle="-36"` since the first pass
  and leans *left*, which settles it: a vector pointing up, rotated by a positive angle,
  goes up-and-right.
* **The box has to be sized for the diagonal.** A 20 x 14 capsule at 37 degrees occupies
  24 x 23, so its box is 34 square. A snug box shaves the corners off the shape.

Both were checked in the offline rasteriser first. That tool is faithful about the
rotation, but do not trust it for single pixels: it supersamples 4x and downsamples with
Lanczos, and the ringing at a cream-on-red edge produces the occasional fully saturated
pixel that does not exist on the device.

### Two hands are cheap to draw and expensive to attach

The salute took four attempts and every failure was about ATTACHMENT rather than the hand:

1. A 22 x 11 palm against an 8px arm read as a dart. A hand has to be about twice the
   limb it hangs off - the round fists are 19 wide against the same arm.
2. An elbow at (97,64) gave the two limbs equal lengths and mirrored slopes, which reads
   as an arrowhead pointing away from the blob. The fix was asymmetry, not size: 2px out
   and 2px down flattens the upper arm to 28 degrees against the forearm's 38.
3. Running the palm's navy flush with its cream, and then 2px past it, both merged hand
   and forearm into one tapered paddle - a spoon held to the head. The pale seam that a
   closed 2px rim leaves across the wrist is what makes the hand read as a hand.
4. The pose cannot be drawn in one pass at all. Limbs draw before the body so shoulders
   read as joints, so anything touching the FACE has to be drawn a second time after it.

None of that is visible in the markup; it is four renders. Render a new pose before
believing the arithmetic - and note that the arithmetic was wrong once here too, when a
leaf collision was computed against the TIP of a round cap instead of its centre.

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

`cold` therefore carried an explicit `replaceWith` in the STATES table covering
both 84 and 85. Any future trigger that nests inside another needed the same.

> **SUPERSEDED, 2026-08-04.** `debug-triggers.mjs` and the whole
> expression-forcing approach are gone, replaced by `tools/mock-state.ts`,
> which patches the **data** and lets the real Conditions evaluate. Nesting then
> takes care of itself — set the temperature to 0 and both the cold and the
> freezing branches fire — so `replaceWith` and the substring-ordering hazard
> below no longer exist. The finding above is kept because the *lesson* stands:
> **a sweep that documents impossible states is not documentation.** For the
> current workflow see "Start here" at the top and the README.

- [x] ~~**RE-RUN THE SWEEP — `docs/states/*.png` are all stale.**~~ **Done
      2026-08-03.** All eight frames in `docs/states/` are current: seven states
      plus a verified-greyscale AOD frame, and `all-states.png` rebuilt. The
      orphaned `2-sunglasses.png` was pruned automatically and `7-cold` is
      present. `docs/verified-2026-08-03/` stopped being the only trustworthy
      record at that point, and was deleted on 2026-08-08.

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
