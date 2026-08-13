# Calendar states: costumes, a second props group, and the hands that hold them

**Status: accepted, implemented 2026-08-11.** Seven calendar dates join the New Year fireworks. Three
structural things came with them: a module for what the blobs _wear_, a props group for the
_companion_, and two predicates naming what each hand is holding.

This is the record of _why_. For how to add a state today, see [../authoring.md](../authoring.md);
for what each one draws, see the reaction-state table in [../../README.md](../../README.md).

---

## The case

`fireworks` proved a calendar state was possible and left three questions unanswered, because it is
the easiest possible one: it is a canvas overlay that touches neither blob, it lasts four hours, and
those four hours are in the middle of the night.

The seven that followed are none of those things.

## 1. Costumes are additive, not branches

A Santa hat, a ghost sheet and a pumpkin all cover a blob. The obvious implementation is a branch —
`whenElse(HALLOWEEN, [ghost], [the normal blob])` — and the face already contains exactly one
Condition shaped that way: the storm X-ray, which swaps the companion's body for a skeleton.

That one is right because **a skeleton IS the body**. A costume is not. The distinction matters
because of what this repo has already paid for it: the step-goal flag was made a branch of the arm
switch, and from 1.2.0 the goal state drew a pole with no arm behind it and, on a cold day, a mitten
floating beside it with nothing to be on. Three releases, and nothing reported it — the gate proves
the output has not changed and cannot notice that it was already wrong.

So every costume is its own `<Condition>` drawn **over** the blob, and the blob underneath is
untouched. The cost is that the sheet must be big enough to hide what is under it, which is now
asserted against `HERO_BOX` rather than eyeballed. The first cut was 14px short and the blob's own
red showed through the hem.

## 2. The companion needed a props group

The companion "carries nothing" was recorded as a measured difference between the two blobs. It
carried nothing because nothing had been put in its hand; 1 May put a sickle there.

It cannot go in `blob_companion`. That group is exactly as wide as its limbs — 62 — and the hand
that takes the sickle sits at group-local x56.5, five and a half pixels from the edge. A 24-wide
blade centred there runs to x68.5, and **content past a part's edge is not drawn and not reported**.
The companion already demonstrates the failure in the shipped face: `COMPANION_LIMBS[0]` draws its
cream cap from x-2 and the cap arrives flat-sided.

`face/companion-props.ts` is therefore `hero-props.ts` one blob down — a sibling of the blob,
absolute canvas coordinates, `companionGyro()` repeated by hand because `<Gyro>` is not inherited
between siblings. `COMPANION_HAND` is derived from the two anchors and the limb row and asserted
against its shipped value, exactly as `HAND` is, so moving the companion cannot leave the sickle
hanging in mid-air.

**The alternative was worse.** Growing `ANCHORS.COMPANION` would have changed the coordinate space
every existing companion part is authored in.

## 3. `HANDS_FULL` and `HOLDS_POLE`, and the bug they found

Every prop that existed before the calendar — the Wednesday cup, the Friday controller, the warm-day
cocktail, the step-goal pennant — is gated on something that implies daylight. The arms rest only at
night. So "the hand is there to hold it" was true, by accident, and nothing said so.

An all-day celebration breaks it: a birthday cake at 23:30 on a dry night is drawn beside a lowered
arm. That is the floating-pole bug again, in a new place.

The fix is two predicates naming everything each hand holds, tested ahead of the resting pose, and a
proof over every hour of every celebration day. **`== 0` is the one negation on this face** — every
other priority is expressed by Compare order — and it is used here because the two branches draw the
_same pose_, so ordering them would mean emitting that pose twice under two part names in a face
whose parts must all be uniquely named.

### What the proof found

`HOT_AND_SUNNY` gates on `WEATHER.IS_DAY` — the forecast's opinion — while the arm rests on
`HOUR_0_23`. **These are not the same thing.** Wherever the sun does not follow office hours, or the
forecast is simply stale, they disagree: at 00:35 with `IS_DAY` still reporting 1, the shipped face
drew a cocktail beside a lowered arm. Rare, silent, and years old. The cocktail is in `HANDS_FULL`
now.

### And what mutation testing found in the proof

The first version of that proof pinned the temperature at `T.COCKTAIL_C` on a clear day, so that
`HOT_AND_SUNNY` would be exercised. `HANDS_FULL` is a disjunction, so that made it true in **every**
row — and the proof passed with `BIRTHDAY` deleted from it. Two deliberate breakages went unreported
before the grid was widened to include a row where the cocktail is _not_ out.

A probe that passes is not evidence about the assertion.

## What this cost that a reader should know about

- **The semantic differ over-reports these changes badly.** Wrapping the leaf tufts in a `<Condition>`
  shifts every sibling index inside `blob_hero`; `npm run diff` reported 1749+ differences for what
  was five moved elements. The changes were reviewed by comparing the two models **keyed by part
  name** instead, which is immune to index shifts, and by rendering each state.
- **One bug survived every assertion and was caught only by looking.** The Santa hat's cone was
  written `270 -> 45`. Every number is a legal angle, the shape passes its bounds check, and the
  bobble — derived from the end angle — lands in exactly the right place, because `sin(435°)` is
  `sin(75°)`. But WFF sweeps an `Arc` from `startAngle` _upward_, so it went the long way round the
  ellipse, through the bottom, and the hat rendered draped across the hero's face. A sweep crossing
  12 o'clock has to be written past 360. There is now an assertion for it.

`hasCode="false"` means no logs, and a green result is the normal appearance of a broken thing here.

---

## What the second pass changed, and the two rules that came out of it

Everything above survived a review of the rendered states. Three shapes did not, and two of the
fixes are conventions rather than repairs.

### A flag flies right of its pole, and is drawn behind it

Both halves apply to every flag this face grows. **Right**, because a flag streams away from whoever
carries it, and the hero carries this pole on the right of its own body. **Behind**, because the pole
passes in front of the cloth — drawn over it, the hoist covers the staff and the whole thing reads as
a sticker beside a stick. Since WFF has no z-index, the second half is document order in
`face/blob-hero.ts`, which means it is a thing a reader has to know rather than a thing the type
system enforces; `data/celebrations.ts` asserts the first half.

The first cut flew it **left**, and the reasoning is worth recording because it was locally correct:
the limb box was 106 wide, the pole is at x93, and three legible bands need twenty. Flying left fits.
But "the box is too small" is a reason to grow the box, not to reverse the flag — `HERO_LIMB_BOX` is
122 now, nothing was previously being clipped at 106, and the everyday face renders identically.

### A stroked arc is not a cone, and both hat families were built out of one

A thick curved band looks like a tapering shape in the source and is a band with a **hole** through
it on the screen. The Santa hat's crown showed the leaf tuft through the middle of itself and touched
its 46px brim at one end only. The party hat's read as a horn.

The replacements are the two general answers to shapes WFF does not have:

- **Solid with a hidden joint** — a filled dome plus a stem, both running below the brim's top edge,
  with the opaque brim drawn over them. This is the coffee cup's rim-over-body construction: in a
  format whose only clipping is a part box, "cut this off" is always "draw something over it".
- **A shape the primitives cannot express, stacked out of ones they can** — the party hat's cone is a
  run of overlapping rectangles, one per row. Not a compromise: there is no polygon, and a rotated
  square cannot be cut in half because a `PartDraw`'s clip box turns _with_ its contents. The step in
  the silhouette is asserted to stay finer than the device resolves, so widening a hat without adding
  rows fails the build rather than shipping a ziggurat.

### Symmetry has to be built, not typed

Both Halloween faces were asymmetric — the ghost's eyes centred three pixels off its sheet, the
pumpkin's three off its gourd — and both looked completely deliberate as a pair of x coordinates.
Nobody sees three pixels in a table; everybody sees them on a face. Every feature is now mirrored
about the costume's own centre line by construction, and the assertion pairs them off and checks the
midpoints.

The same move fixed the weed tuft: `fan()` takes a root, a spread and two sizes, so "all the blades
share an origin" and "the sizes fall off smoothly from the middle" stopped being properties anyone
could get wrong. The hand-typed version had five bases spread over a pixel and two size steps that
jumped.
