# Authoring the face

`watchface/src/main/res/raw/watchface.xml` is a build artifact. `tools/gen/` is the source of truth,
and a hand edit to the XML survives until the next `npm run gen` and then vanishes.

Why it works this way, with the numbers that justified it, is in
[decisions/2026-08-08-generate-watchface-xml.md](decisions/2026-08-08-generate-watchface-xml.md).
This document is how to work in it today.

```
npm run gen         regenerate watchface.xml
npm run diff        prove it still renders the same as the committed baseline
npm run check       prove the committed XML matches what the generator emits
npm run selftest    prove the differ can still fail
npm run verify      typecheck + lint + test + selftest + diff + check
```

---

## The shape of it

Plain functions returning a small node union, serialised at the end. **Not JSX** — Node's strip-only
mode cannot transform it, which would force a bundler, a `dist/` and source maps. **Not template
literals** — the file is already a string; that buys indentation pain and no type safety. Functions
are precisely the abstraction WFF lacks.

```ts
export type Node =
	| { k: 'el'; tag: string; attrs: Attrs; children: Node[] }
	| { k: 'comment'; text: string; verbatim?: boolean }
	| { k: 'raw'; text: string };
```

`face()` returns `Node[]`; `serialize()` is a pure function of it. Everything else hangs off that.

| module              | what it holds                                                                     |
| ------------------- | --------------------------------------------------------------------------------- |
| `palette.ts`        | the 7 chosen weekday hexes, the HSL derivations, and 30 named fixed colours       |
| `geometry.ts`       | every repeated box — `HERO_BOX` was 31 literal copies, `MINI_BOX` 30, `CANVAS` 26 |
| `expr.ts`           | the closed `Source` union and the ramp/phase/triangle idioms                      |
| `weekday.ts`        | `byWeekday()` — the seven-way fan-out, written once instead of eleven times       |
| `blob.ts`           | shared blob primitives taking explicit geometry                                   |
| `crossfade.ts`      | `FADE_OUT`/`FADE_IN`, one binding for four hand-written `Variant` window sets     |
| `meetings.ts`       | the meeting windows                                                               |
| `data/*.ts`         | tabulated rows — drops, blobs, chips, props, weather, fireworks                   |
| `face/*.ts`         | 19 section modules, one per Scene child, **in draw order**                        |
| `model.ts`          | the semantic model the differ compares                                            |
| `xml.ts` / `svg.ts` | the two serialisers                                                               |
| `eval.ts`           | the expression evaluator behind `--equiv`, the grid checks and the SVG backend    |

### Types that catch what the validator cannot

- **`Source` is a closed union.** `[ANIMATION_VALUE]` was invented, passed the validator and did
  nothing for a whole session. `src('ANIMATION_VALUE')` will not compile.
- **`Transform`/`Variant` targets are a per-element union**, modelled as a keyed object rather than a
  child list. That kills three bugs at once: a misspelled target, two `Transform`s on one target, and
  a `Variant` and a `Transform` fighting over one attribute — which the schema does not settle.
- **`Int` for `Part*` x/y/width/height**, which are `xs:integer` in WFF. A float is a validator
  SEVERE with a line number; here it is an error naming the element and telling you to move the
  fraction into the primitive inside.
- **`Record<Weekday, Hex>`** over a seven-member union — adding or dropping a day fails to compile at
  every site at once. Body and mask take the _same_ argument, so the dark-bar-across-one-weekday
  desync is unrepresentable rather than merely absent.

### Comments are first-class

The ~1670 comment lines are the project's engineering memory, and most of them record things measured
on hardware that cannot be re-derived. They are nodes in the tree, they sit where they sit, and the
serialiser emits them verbatim. Two rules:

- Prose duplicated _because the markup is_ collapses to one canonical copy in the owning module, plus
  a short provenance stub at each emitted site, so someone reading the XML on the wrist is still
  pointed at the reason.
- The header palette table is **generated from `palette.ts`**, so the documentation of the colours
  cannot drift from the colours.

Every emitted file carries a `GENERATED FILE - DO NOT EDIT` header naming the regenerate command.
Without it someone iterating on the wrist edits the XML directly and loses it. That is a certainty.

---

## The gate

`npm run diff` is the one that matters for any refactor. `model.ts` reduces a face to what actually
reaches the screen — element order (which _is_ draw order in WFF), tag, attributes, text — normalises
away what does not (comments, whitespace, attribute order, `1.0` vs `1`, including numeric literals
_inside_ expressions), and compares against the committed snapshot `tools/gen/face.model.json`.

> **A pure refactor must leave `npm run diff` empty.** If it reports a difference, the refactor
> changed the rendering — revert it. `--snapshot` is only for an _intended_ rendering change, and the
> new baseline lands in the same commit as the change that caused it.

`npm run check` is stronger where it applies: it compares the committed XML byte-for-byte against
what the generator emits **without regenerating**, so it proves the file cannot have changed and no
wrist run is needed to know it. Most refactor steps should clear it outright. The known reason not to
is attribute insertion order — `xml.ts` emits attributes in insertion order, so `{ ...box, name }`
and `{ name, ...box }` differ in bytes and not in meaning.

**The differ has a self-test, because a green check proves nothing until you have watched it fail.**
`npm run selftest` mutates the reference in seven ways that would change the rendering — a colour, a
1px move, an expression, a ramp threshold, a dropped element, a rename, a typo'd `Transform` target —
and asserts each is caught, plus two controls (all comments stripped, `72` → `72.0`) that must be
ignored. It runs in a second and it stays.

This was not theoretical. The first `--check` compared the generator's output against its own input,
so it passed on a hand-edited file, and the first `--selftest` reported three false failures because
its mutations were landing in the header comment rather than in markup. Both were found by making the
checks prove themselves.

### What the gate cannot see

The gate's question is "did the output change". It has no way to ask "was it already wrong".

The step-goal flag's pole is authored to be gripped: it runs down x93, the exact centre of the right
arm's cream cap, and spans y19..74, bracketing that cap's centre at y60.5. Until 1.1.0 the flag and
the arm were two independent `<Condition>` elements, so both drew. Removing the salute merged them
into one dispatch, which made the flag _exclusive_ with the arm — so from 1.2.0 the goal state drew a
pole in mid-air, and on a cold day a mitten floating beside it with nothing to sit on.

**Every check in this repo passed throughout, and none could have caught it.** `--check` compares
bytes to the committed file, `--diff` compares to `face.model.json`, and both baselines were taken
_after_ the merge. The screenshot that would have shown it was committed in the same commit, having
been shot before it.

Two things follow, both now in place. The pole is recorded in `data/blobs.ts` next to the arm row it
depends on, with an assertion that it passes through the fist — which fires in all three directions,
including when the _arm_ moves rather than the pole. And **the path-based differ is worth distrusting
on structural change**: inserting one `<Condition>` shifts every sibling index, and it reported 1176
differences for what was a four-element change. The verification that worked was behavioural — render
all 29 states before and after and diff the set of shapes each draws, which reported exactly 3 states
changed by exactly the four elements of `hero_arm_right_out`.

---

## Two hazards the generator introduces

Both are worth knowing before composing expressions, and neither existed when the XML was
hand-written.

**1. Operator precedence survives composition.** `or(a, b, c, d)` builds the flat string
`a || b || c || d` with no parentheses of its own. Passed straight into
`and(days, hourTest, minuteTest)` it parses as `a || b || (d && hourTest && minuteTest)`, because
`&&` binds tighter than `||` and nothing stops the last OR term reaching past its own boundary. The
symptom was two weekdays showing a headset at _every_ hour of the day. **Reading the expression looks
correct**; it was caught by evaluating the emitted text at midnight.

The helpers return strings, so **any `or()` later combined with `and()` needs `group()` around it** —
the type system brands `Expr` but cannot express associativity. This is the one place where the
generator is _more_ dangerous than writing the parenthesis by hand, because composition hides it. See
the comment on `MON_TUE_THU_FRI` in `meetings.ts` and `tools/gen/states.ts`.

**2. `--snapshot` is a ratchet, not a review.** It accepts whatever the generator currently emits.
The gate only works if the diff is read before it is accepted, and a large intended change (design
pass 7 opened with ~900 differences) is exactly when skimming is tempting. `--selftest` proves the
differ _can_ fail; nothing proves the human looked.

---

## Working conventions

### What counts as a magic number

**Literal count is not the defect. A literal with no name, repeated or derivable, is.** `rain.ts` has
~260 numeric literals and nobody would call it a problem, because every one sits in a named field of
a typed row with a comment saying why it is tabulated rather than derived. The goal for any module is
to read like that one.

- **Named** — a value with one meaning gets one binding (`T.NIGHT_FROM`, `GYRO_CLAMP`,
  `MOON.synodicDays`).
- **Tabulated** — a list of things becomes rows in `data/*.ts`, read by a builder.
- **Derived** — a value that _follows_ from another is computed, and the derivation is asserted.
- **Not** collapsed into parameterised mega-builders. `blob.ts` argues at length that the companion
  is not the hero scaled down, and that argument holds: the two blobs get two row sets and two call
  sequences. **A helper has to remove a repetition or a hazard to earn its place.** One written
  during that pass — a `cloud()` for `chip-weather` — was removed again on that rule: single caller,
  and the three clouds have genuinely different geometry.

What is left in `blob-hero.ts`, `blob-companion.ts` and `chip-weather.ts` is shapes that are
genuinely one-of-a-kind: the X-ray skeleton, the eyes, the shades, the scarves, and four weather
icons whose clouds are three different sizes because each is composed against different neighbours.
Those are candidates for another pass, not evidence one is owed.

**`--audit`'s output-side numbers must not improve.** WFF has no variables, so the emitted
duplication — 31 copies of `HERO_BOX`, ~2562 literals, 35 repeated expressions — is unavoidable and is
_supposed_ to stay exactly where it is. An improving `--audit` would mean the output had changed.

### Assertions, not comments

The idiom is `crossfade.ts` proving its window invariant at module load and `palette.ts` reproducing
all 21 derived colours. The rule that emerged is narrower than "assert things": **assert the property
that makes the shape read as what it is**, and then go and watch it fail.

- The heart is two lobes and a rotated square, and the square's upper corners must stay _hidden
  behind the lobes_ — that is what makes three shapes read as one heart instead of a diamond parked
  under two circles.
- The snowflake's three axes must span all six arms exactly once; getting it wrong draws one axis
  twice and leaves a gap.
- The controller's ABXY diamond carries a 1.5px nudge, and the assertion checks **both** that the
  shipped position clears the shell edge **and** that the un-nudged position does not — so the nudge
  cannot be mistaken for an unexplained fudge and removed.
- The battery bar's housing must sit inside the shell's stroke, because WFF centres a stroke on its
  path and a bar flush to the shell's bounds paints over its own outline.

**Mutation-test every assertion by breaking the input and watching the message.** Two probes written
during that pass were _too weak to breach the invariant they targeted_ — dropping the heart's point
by 12px still tucks it under the lobes — and both passed, which proved nothing until they were re-run
at values that actually cross the line. **A probe that passes is not evidence about the assertion.**

### Recorded, not fixed

Five places where the shipped drawing is not what a clean derivation would produce. All five are what
the watch has been drawing, so all five are recorded next to the constant with the measurement, and
none was quietly corrected — growing a box or nudging a coordinate is a design decision, not a
tidy-up.

| what                              | measured                                               |
| --------------------------------- | ------------------------------------------------------ |
| companion's scarf tail            | runs 11px past its part box, clipped                   |
| companion's first limb cap        | starts at local x−2, arrives flat-sided                |
| coffee cup's tallest steam wisp   | round cap overshoots the box top by 0.2px              |
| storm burst's four longest spokes | SQUARE caps reach 54.5 in a box whose half-width is 52 |
| step icon's heel                  | centres on 14 where the ball and arch centre on 13     |

### Geometry that can be stated in a comment can be asserted in a script

The generator has nothing to say about whether a shape _reads_ at 426×426 — that still costs a build,
an install and a look at a wrist. What shortened design pass 7's last two rounds was writing a
throwaway script asserting the claims the code comments were already making: buttons contained
against a shell's rounded _corner arcs_ rather than its bounding box, a handle tangent at 16.97
against a wall at 17, steam wisps' stroke-inflated bands not touching, a band's clearance over the
head sampled across its whole span, and — the one that would never have been checked by eye — that
the band's colour differed from the arms' by a luma of 2.8, i.e. was the same colour. Thirty
assertions, all green before the build, and the shoot confirmed them. That is what turns "shoot and
see" into "shoot to confirm".

### The group is not the only coordinate space available

A `PartDraw` cannot start left of its parent group's origin — content there is clipped, as the
companion's left hand demonstrates. The hero's raised hand sits at group-local `x10.5`, so a prop
wider than 21px could not be centred on it, and a round of art was shipped 3.5px off-centre on the
strength of that **and documented as unfixable**. That is the part worth flinching at: a correct
premise carried to a false conclusion and then written down as a constraint.

The umbrella, the bolt, the burst and both sets of Zzz are already _siblings_ of the blob rather than
children, positioned in absolute canvas coordinates, each repeating the blob's Gyro gain so they
still track the wrist. Moving the three hand props into their own top-level section
(`face/hero-props.ts`, canvas `(199,262)`) centred them exactly. Draw order was preserved by
registering it immediately after `blobHero()`, which is where those `Condition`s had been its last
children.

Generalised: **anything that needs to overhang a blob belongs beside it, not inside it**, and
`heroGyro()` is what makes that free.

---

## The second compilation target

`face()` returns `Node[]` and `serialize()` is a pure function of it, so a second pure function of the
same tree is a second target:

```
                              /-> serialize()  -> watchface.xml   (WFF, ships)
   face()  ->  Node[]  ------<
                              \-> renderSvg()  -> SVG             (tools/preview)
```

**No new intermediate representation** — `model.ts` has been flattening the same tree since the
migration. Everything above the seam is shared: every constant, every table, every predicate, every
section builder. `tools/preview/check.ts` asserts that the app renders byte-identical output to
`renderSvg` fed the same values, so the preview is a _view_ of the backend, not a third
implementation of WFF semantics.

`svg.ts` lives in `gen/` rather than under `tools/preview/` on purpose: it is a peer of `xml.ts`, and
putting it in the app would make `build.ts` import from the thing it must stay independent of.

**The preview is not pixel truth**, and three things guarantee it:

- **Text.** The family is `SYNC_TO_DEVICE`, so glyph advance belongs to the device, and WFF exposes
  no text-width source. Anything text-shaped in the preview is indicative.
- **Easing.** WFF names its interpolation curves and does not specify them. The preview honours the
  _windows_ faithfully and approximates the ramp inside each.
- **Scale.** The design canvas is 450×450, hardware reports 426, the emulator 454. This adds a fourth
  geometry rather than settling the question.

What it is good for is what screenshots cannot show. `crossfade.ts` argues that one pair of
`<Variant>` windows serves both directions, so going ambient leaves a gap with neither clock copy
drawn and coming back leaves an overlap with both. That was an argument until the scrubber; counting
visible copies across the transition gives

```
    t                0.2   0.46   0.48   0.55   0.7
    going ambient      1      0      0      1     1
    coming back        2      2      2      2     2
```

Clipping is implemented in the preview for the same reason and is not optional: `mini_limbs` draws a
cap from local x−2 inside a box starting at 0, and a preview that drew it round would hide the exact
bug class that produced the whole `hero-props` restructuring.

**The wrist stays the arbiter.** `tools/cycle-states.ts` is the final word.

---

## Two things that must not break

**`mock-state.ts` rewrites `watchface.xml` in place.** If generation were wired into the build, a
`mock-state on rainy` followed by `installDebug` would regenerate the file and blow the mock away
before aapt saw it, and every snapshot would silently become the un-mocked face. Therefore: the
generated XML is **committed**, `mock-state.ts` runs as a post-processor, generation is **never**
wired into `assembleDebug`, and `build.ts` aborts if a mock backup exists.

It still broke once, and the fix is instructive. `mock-state.ts` matches a whole `<Template>` as one
exact string when it swaps in literal text, and the serialiser had been indenting `Template`'s CDATA
onto its own line, so the mock refused with _"a [DAY_OF_WEEK_S] Template was not in the swap table"_.
That is the script working as designed. **The fix went into the serialiser, not into
`mock-state.ts`**: any element with text or CDATA content now renders inline.

**A clean clone must still build.** The generated XML is committed — like `docs/states/*.png` and
`preview.png` already are — so a clone with no Node produces a correct APK, and `git diff` on the XML
remains the closest thing this project has to a test suite. The up-to-date check is a separate task,
and it must **fail** rather than skip when the toolchain is absent.

---

## Toolchain

Node executes type-annotated TypeScript with no flag (`--experimental-strip-types` is default since
22.18). `enum` throws `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`, so the constraint is erasable-syntax-only,
and `tsconfig`'s `erasableSyntaxOnly` makes that a compiler error rather than a convention — an
`enum` fails `tsc --noEmit` with `TS1294`, which is a far better failure than a stack trace at run
time.

Stripping does **not** type-check, so `typescript` is a devDependency used solely for `tsc --noEmit`.
Since the types are the entire justification for this approach, that check has to run somewhere
reproducible — it is the first step of `npm run verify`.
