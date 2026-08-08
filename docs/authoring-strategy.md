# Authoring strategy: should watchface.xml be generated?

Analysis, 2026-08-08. Numbers taken against the **working tree** (4185 lines), which is well
ahead of `d06d0bb` — `watchface.xml` is +1983/-238 against HEAD, so nothing here reproduces
from a clean checkout of the last commit.

## The question

`watchface.xml` is 4185 lines of hand-authored WFF v5. `TODO.md` opens its list with the reason:
the seven-colour weekday table is written out **nine times** because WFF has no variables, and
"the generator that produced all nine lives in the session scratchpad rather than the repo."

Would authoring in TypeScript and emitting the XML from `node` improve **readability** and
**maintainability**? And is there something better?

## Verdict

**Maintainability: yes, for a minority of the edits this file actually receives.** The duplication
is real and a generator would collapse it. It is also concentrated almost entirely in the parts of
the face that are *finished* — the weekday tables and the rain field, together about 11% of the
file. The edits that dominate real sessions are bespoke geometry tuning, where a generator saves
nothing.

**Readability: no, and slightly negative.** The 4185 lines are hard to navigate, not hard to
understand. Understanding is carried by ~1670 lines of adjacent prose that record measurements
and rejected alternatives; a generator moves the authoring surface away from the artifact you
actually read while debugging on a wrist, and puts that prose through a reflow to save it.

**Recommendation: don't generate. Fix navigation, and make the invariants checkable.** Codegen
stays available behind a written trigger (§6) — the work a checker needs is the same spec a
generator would need, so nothing is wasted if the trigger fires.

The strongest evidence for that recommendation is already in `TODO.md`: **two checking tools have
been written for this face and neither was committed** — the palette generator behind open item 2,
and the expression-agreement evaluator behind open item 1, which found nothing and whose own note
explains why that was the point. The gap this project has is not missing abstraction. It is that the
checks keep getting written in a scratchpad and thrown away.

One thing this analysis found on the way, which is the sharpest argument for where the effort
should go instead: **a live inconsistency in the date crossfade** (§5) that the validator, all 24
mock states, the memory-footprint tool, and 1670 lines of careful prose all miss — and that a
generator would have emitted just as faithfully.

---

## 1. What maintainability actually costs here

Maintainability is not "how many lines are duplicated." It is "what does the next change cost."
So here are the changes this face actually receives, costed.

| Change | Today | With a generator | Helps? |
|---|---|---|---|
| Revise the palette (7 hexes) | derive 21 colours by hand, edit 63 literals across 11 sites | edit 7 lines | **massively** |
| Retune the precipitation ramp | 73 identical edits | 1 | **massively** |
| Change a gyro gain | 3 or 4 sites, found by walking the tree | 1 | **yes** |
| Change the phase idiom | 20 copies, 4 of them inside one attribute | 1 | **yes** |
| Add/move a rain drop | edit a 14-line block | edit a table row | mildly |
| **Nudge a blob's arm 2px** | edit 1-2 numbers | edit 1-2 numbers, regenerate | **no** |
| **Add a reaction state** | new bespoke `Condition` + geometry | same, in TS | **no** |
| **Tune a crossfade** | 4 `Variant` elements | 4 `Variant` calls | **no** |
| **Fix a shape that clips** | adjust a `PartDraw` box | same | **no** |
| **Work out why it looks wrong on the wrist** | read the XML + adjacent prose | read the XML, then find the TS | **negative** |

The top four rows are the generator's case and it is a genuinely strong one. But look at what they
have in common: **they are all global constant changes to finished subsystems.** The rain field is
done. The weekday palette has been revised once. The gyro gains are tuned.

The bottom six rows are what a working session on this face actually looks like, and the current
uncommitted work measures it directly. Of **2192 added lines** since `d06d0bb`, the ones naming a
weekday-table or rain-drop element — `hero_body_*`, `hero_mouth_*`, `mini_*`, `date_chip_*`,
`rain_drop_*`, `rain_shape_*` — number **127. That is 5.8%.**

So on the largest body of recent work available, **94% of the editing happened in exactly the
regions a generator would not have helped with.** This is the single most decisive number in the
analysis, and it is the one that should be re-measured before the trigger in §6 is judged: if a
future work batch inverts that ratio, the verdict inverts with it.

### The 11%

Of 331 colour literals, 61 are distinct. Of the ~2143 markup lines, the mechanically-derivable
regions — 11 weekday tables plus 24 rain drops — are roughly 450 lines, about 21% of markup and
**11% of the file**. Everything else is one-of-a-kind geometry that exists because someone looked
at a watch and moved something.

A generator is a permanent tax on all edits in exchange for a large discount on a small,
already-stable minority of them.

---

## 2. What readability actually costs here

The file is not hard to read locally. Any given 40 lines is clear, because it is preceded by prose
explaining what was tried and why it lost. It is hard to **navigate**: 4185 lines, 32
banner-delimited sections, and the only way to find one is search.

A generator does not fix that. It relocates it — you now navigate a TS module tree *and* a 4185-line
generated XML file, because the XML is still what you read when the watch shows the wrong thing.

Two things genuinely do fix it, neither of which is codegen:

- **An outline.** Walk the tree, print the banner sections and top-level groups with line ranges,
  and assert the banner convention holds. ~1 h, no build step. Makes 4185 lines feel like 32
  sections. This is the single cheapest readability win available.
- **Leave the prose where it is.** 40% comments looks like bloat and is the opposite. The blocks
  run 30-85 lines and record things that cannot be re-derived: the v1/v2/v3 crossfade history, the
  1px "accidental nose" from a flush mask, why `[IS_AMBIENT]` does not exist, that `[DAY_OF_WEEK]`
  is 1=Sunday *measured on the watch*. This is the file's most valuable property and the thing a
  migration most endangers.

### Where a generator would read better, honestly

The authoring surface for the fanned-out regions really is dramatically nicer — 59 lines of
`<Condition>` becomes about 7:

```ts
byWeekday('body', d => HERO[d], (d, c) => [
  PartDraw({ name: `hero_body_${d}`, ...HERO_BOX }, [
    RoundRectangle({ x: 0, y: 0, width: 72, height: 80, cornerRadiusX: 36, cornerRadiusY: 34 },
      [Fill(c)]),
  ]),
])
```

And because the body and its mask would take the *same* `c`, the failure `TODO.md` calls the
dangerous one — "a dark bar across a face on exactly one weekday" — becomes unrepresentable rather
than merely absent. That is a real gain. §6 says when it is worth 30-40 hours.

---

## 3. The evidence: the duplication is consistent

The case for urgency rests on the nine tables being a live hazard. They are not, today. Measured:

**There are 11 sites, not nine.** `TODO.md` counts the date row as one; it is three. The full list
of `Part*` sites carrying all seven weekdays:

```
date_chip          #563b39 #564f39 #4d5639 #394456 #564639 #394656 #473956
date_weekday       #d3bcbb #d3cebb #cbd3bb #bbc4d3 #d3c6bb #bbc6d3 #c7bbd3
date_day           #d3bcbb #d3cebb #cbd3bb #bbc4d3 #d3c6bb #bbc6d3 #c7bbd3
hero_body          #ee4e43 #f5c92e #a5d63a #6b9df2 #f0862f #8fa3bc #b07ce4
hero_mouth_round   #5b2622 #594c1e #3f4c24 #273f69 #57381f #3a434d #482e62
hero_mouth_open    #5b2622 #594c1e #3f4c24 #273f69 #57381f #3a434d #482e62
hero_mouth_mask    #ee4e43 #f5c92e #a5d63a #6b9df2 #f0862f #8fa3bc #b07ce4
mini_body          #f5c92e #a5d63a #6b9df2 #f0862f #8fa3bc #b07ce4 #ee4e43
mini_mouth_sleep   #594c1e #3f4c24 #273f69 #57381f #3a434d #482e62 #5b2622
mini_mouth_open    #594c1e #3f4c24 #273f69 #57381f #3a434d #482e62 #5b2622
mini_mouth_mask    #f5c92e #a5d63a #6b9df2 #f0862f #8fa3bc #b07ce4 #ee4e43
```

That the documented count is already off by two is itself a small maintainability finding: the
prose describing the duplication has drifted from the duplication.

**Every invariant a generator would enforce holds right now:**

- `hero_mouth_mask === hero_body` and `mini_mouth_mask === mini_body`, all seven days. The
  dangerous mismatch is not present.
- `mini_body[d] === hero_body[next(d)]`, all seven — the "companion wears tomorrow's colour" rule.
- All 21 derived hexes reproduce **byte-for-byte** from the 7 body colours using standard HSL and
  `Math.round` with the documented ratios (mouth S×0.55/L×0.41, chip S 0.20/L 0.28, text S
  0.22/L 0.78). **21 match, 0 mismatch. No fudge factor.**

So the scratchpad generator's output is intact and self-consistent months later. That is evidence
*against* the urgency, not for it — and it means the derivation is cheap to re-implement whenever
it is wanted, which is the thing `TODO.md` was actually worried about losing.

**The duplication is near-duplicate, not copy-paste.** Byte-identical 6-line windows: 3%. After
masking numeric literals, hex colours and `name=`/`expression=` attributes: 56% at 6 lines, 38% at
10, 27% at 16. Same shape, different constants. A checker verifies that cheaply; a generator has to
model it in full.

---

## 4. Why a generator loses here

1. **The prose is the asset and the migration is what threatens it.** ~1670 comment lines, adjacent
   to what they explain, recording rejected alternatives. Spending 30-40 hours to protect ~450 lines
   of duplication while reflowing the best 1670 is a bad trade. *Honest counter:* a migration can
   carry comments verbatim, and the prose that is duplicated *because the markup is* should collapse
   to one canonical copy plus pointers. That part would be an improvement.
2. **Generated WFF cannot be reviewed against ground truth.** `hasCode="false"` means no logs; truth
   is a Pixel Watch 4 over wireless adb. A generator bug emits valid, validator-passing,
   semantically-wrong XML that surfaces as a wrong pixel someone eventually notices — the same
   failure mode as the deleted `generate-preview.mjs`, relocated into the shipping artifact.
3. **`generate-preview.mjs` is the precedent.** Deleted for drifting so far behind the face that
   running it would have made the preview worse (`README.md`).
4. **The experiment was already run.** The generator existed and was deliberately not committed.

---

## 5. The defect this analysis found

The date row's ambient crossfade disagrees with its own documentation.

| | out-going | in-coming | overlap |
|---|---|---|---|
| `DigitalClock` `:418` / `:426` | `0.45`, offset `0`, **EASE_IN** | `0.50`, offset `0.50`, **EASE_OUT** | none — disjoint |
| `date_*` `:117` / `:303` | `0.55`, offset `0`, **EASE_OUT** | `0.55`, offset `0.45`, **EASE_IN** | **0.45 – 0.55** |

The clock's note at `:385-413` describes `0.55/0.45` as the **rejected v2**, whose overlap "is
centred exactly on the moment both copies are near half alpha, which is the worst possible place to
put it," and specifies the opposite interpolations for the reason given at `:405-409`. Yet `:114`
claims the date copies get "the same staggered cross-fade as the clock, and for the same reason."

Either the markup or the comment is wrong. Which one is a design call — the date is 26px under a
100px clock and may well want different timing — so this document reports it rather than resolving it.

**Why it belongs in an analysis about maintainability:** the validator passes it (valid floats, both
sums ≤ 1.0); all 24 mock states are steady-state so no screenshot can catch a crossfade midpoint; on
the wrist it lasts ~200 ms. It is invisible to the entire verification stack. It was found by about a
dozen lines of checking — and **a generator would have emitted it unchanged.** The fragility in this
file is in semantics the schema cannot express, not in the line count.

---

## 6. Where a generator genuinely wins, and when to revisit

Being fair to the option, because the trigger matters more than the verdict:

- **Drift becomes structurally impossible.** Every checker is a patch over a duplication a generator
  removes. That is categorical, not a matter of degree.
- **Palette revision** goes from 63 literals to 7.
- **A typed `Source` union makes an invented `[ANIMATION_VALUE]` a compile error.** That mistake cost
  a full session and passed the validator.
- **Typed per-element `Transform`/`Variant` targets** kill a bug class the XSD provably cannot see:
  both attributes are `xs:string`, so `target="hieght"` validates, ships, and does nothing forever.
- **`Part*` `xs:integer` violations** become a build error naming the element.

### Trigger — revisit when any of these is true

- A third fan-out dimension appears — another blob, a seasonal palette, or a `<UserConfigurations>`
  theme picker — multiplying 11 tables by 7 again.
- The palette is revised more than once more.
- A checker actually catches a weekday desync in the wild.
- **The 5.8% in §1 climbs past roughly a third.** That figure is the empirical form of this whole
  verdict, and it is cheap to re-measure: count added lines naming a fanned-out element as a share
  of all added lines, over the last substantial batch of work.

Until then: a checker's data file and invariant list *are* the generator's spec, so building the
checker first is not a detour.

---

## 7. What to do instead, ranked by value ÷ effort

| # | Change | Est. | Buys |
|---|---|---|---|
| 1 | Missing verification jars **fail** instead of skip | 0.5 h | the build stops lying |
| 2 | `--outline` mode over the XML | 1 h | **the readability win** |
| 3 | Invariant checker, tier A | 4 h | catches §5; makes the 11 tables safe to leave duplicated |
| 4 | Palette + ratios as one data file (**with** #3, never alone) | 1 h | `TODO.md`'s actual complaint |
| 5 | Wire the checker into Gradle `check` | 0.5 h | it runs |
| 6 | Comment↔markup lint | 1.5 h | stale prose in a 40%-comment file |
| 7 | `Transform`/`Variant` `@target` legality, hand-curated | 1.5 h | silent no-op typos |
| 8 | `[SOURCE]` legality against the vendored v5 enum | 0.5 h | invented sources |
| 9 | `docs/face-model.json` semantic snapshot | 2 h | reviewable diffs |
| 10 | Expression evaluator + **state-coverage report** | 6 h | untested branches |
| 11 | Palette expander printing to stdout, never writing | 1.5 h | the scratchpad generator, safely |
| 12 | Marker-delimited region generation | 4 h | little — recommend against |
| 13 | Full TypeScript codegen | 30-41 h | deferred, see §6 |

**#1** is the highest value-per-hour item in the repo and has nothing to do with codegen.
`watchface/build.gradle.kts:63-67` and `:96-100` gate both verification tasks on gitignored jars, so
a clean clone prints two `Skipping:` lines and reports BUILD SUCCESSFUL having verified nothing.
`README.md` documents the footgun; documenting is not removing. A `-Pwff.tools.required` property
makes "I chose not to verify" an explicit flag rather than a silent default.

**#3** must be **read-only** — `mock-state.mjs` mutates the face, this never does, so it needs no
backup dance and can run on every build. Collect every problem and exit once rather than fail-fast; a
palette revision would otherwise mean 21 edit-run cycles. Checks worth having: the 11 tables agree;
derived colours match the ratios; `mini_body[d] === hero_body[next(d)]`; `duration + startOffset <= 1.0`
(exceeding it means the offset is **silently ignored**); crossfade pairs consistent across the file
(this is the one that finds §5); `<Compare expression="X">` resolves within its **own** `<Condition>`,
not merely globally; expressions sharing a name stem are byte-identical; all 73 copies of the
precipitation ramp identical. One trap to record: a naive extractor reads `wx_icon_sun` as Sunday —
require all seven day suffixes present, which is what produced the clean list in §3.

**#7/#8:** do **not** build an XSD reader. Full resolution chases element → named complexType →
recursive `attributeGroup ref` → global `attribute ref` (`alpha` on `Group` sits three hops away in
`abstractPartType.xsd`) — roughly 3 h and a source of false positives. WFF v5 is frozen; hand-curate
~20 lines, and vendor the 100 `sourceType.xsd` enumerations with a provenance comment. Reading them
out of the gitignored jar at runtime would re-create problem #1 exactly.

**#10 is the one addition worth arguing for — and the repo has already half-built it.** `TODO.md`
open item 1 describes exactly this tool for the salute: pull the `<Expression>` bodies out of the XML
with a regex, unescape, evaluate over 7 days × 24 hours × boundary minutes × three weather variants,
and assert that all five copies agree. Its own verdict is the argument: *"It found nothing this time,
which is the point — it is what makes 'I copied it correctly five times' a checked claim rather than a
hope."* And like the palette generator, **it is sitting in a session scratchpad rather than the repo.**

Two tools now, both written, both discarded, both solving the same category of problem. That is the
actual maintainability finding of this analysis: the missing thing is not abstraction, it is a home
for the checks.

Generalising it is cheap. The expression grammar is tiny — `clamp` ×185, `fract` ×75, `rand` ×2,
`sqrt` ×1, `textLength` ×1, plus arithmetic, comparison and boolean operators and `[SOURCE]` tokens.
A Pratt parser is ~150 lines, and it then answers a question nothing else can: *do the 24 states in
`mock-state.mjs` actually exercise every branch?* — reporting never-true and never-false expressions,
and states sitting exactly on a threshold (`cold` = 10 = the scarf gate; `goal` = 100; `rainy` = 50,
all currently boundary cases). It also finds non-monotonic predicates mechanically, without a watch —
which is precisely open item 3, the forehead pearls that flicker by construction. Hard line:
**predicates only.** No geometry, no compositing, no drawing. That is `generate-preview.mjs` again.

**#12, recommend against:** rain is the most *stable* region in the file, and its 24 x-positions are a
hand-placed scatter with repeated values and no formula, so the spec table would be as long as the
interesting part of the output. Regions worth generating are ones that churn; these do not.

---

## 8. The rot rule

The most reusable thing this analysis produced, and the reason #4 above carries a condition.

`generate-preview.mjs` died because it **restated** the face — it held its own copy of the geometry,
the face moved, the copy did not, and nothing said so. It kept producing a plausible-looking PNG.
`mock-state.mjs` has survived the same period because it **derives**: it string-matches the actual
current markup and calls `fail()` when reality does not match. Its own header says so — "every
substitution asserts something, so an edit to watchface.xml fails here loudly instead of silently
producing a wrong snapshot."

Three properties:

- **P1 derivation** — takes `watchface.xml` as input; holds no second copy of the face.
- **P2 loud failure** — aborts naming the file; never degrades to plausible-but-wrong output.
- **P3 always runs** — cheap enough to wire into `check`, so divergence surfaces within one commit.

| | P1 | P2 | P3 |
|---|---|---|---|
| `mock-state.mjs` | yes | yes | no — only on capture |
| `generate-preview.mjs` (deleted) | no | no | no |
| invariant checker (#3) | yes | yes | yes |
| palette data file **alone** | no | no | no |
| palette data file **+ checker** | yes | yes | yes |
| `face-model.json` dumped and diffed | yes | yes | yes |
| expression harness (parses the file) | yes | yes | yes |
| palette expander (stdout only) | no | yes, via the checker | no, by design |
| full codegen | inverted | partly | yes |

**The rule, for `README.md`'s tool section:** *a tool may restate a fact about the face only if
something asserts the restatement, on every build.* That one sentence licenses the palette data file,
forbids a second rasteriser, and explains the difference. It also means **#4 and #3 land together or
not at all** — a palette data file without the checker is strictly worse than today.

Full codegen sits outside the table because it inverts the relationship: with one source, file-vs-tool
drift is definitionally impossible. That is a real advantage and it is the strongest thing in §6.

---

## 9. XSLT, XInclude, preprocessing — not viable

Three independent blockers, any one fatal:

- **`res/raw/` is copied verbatim** — that is the definition of `raw` versus `res/xml`, and
  `watchface/build.gradle.kts:29-31` (`noCompress += listOf("xml")`) guarantees byte passthrough.
  No XInclude processor ever sees the file.
- **The consumer is the Wear OS WFF runtime**, with its own parser, not a general XML parser. It does
  not implement XInclude, entities, or `xsl:` anything.
- **WFF's XSDs use closed `xs:all` particles**, so any foreign element fails validation before it
  reaches a watch.

Running XSLT as a Gradle pre-step would work, but that is codegen in a worse language with all of §4's
review problems. If the goal was splitting the file for readability, #2 gets it without a build step.

---

## 10. Toolchain, if tooling is built

**Decided: TypeScript with `package.json`.**

Node 22.21.1 (this machine) executes type-annotated TS with no flag — `--experimental-strip-types` has
been default since 22.18 — and `enum` throws `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`, so the constraint is
erasable-syntax-only; `tsconfig`'s `erasableSyntaxOnly` makes that a compiler error rather than a
convention. But **stripping does not type-check**, so `typescript` as a devDependency is what makes
the types real.

The cost, stated once: the repo's first `package.json`, lockfile and `node_modules`, against a current
convention of zero-dependency `.mjs`. One consequence to plan around — a task needing `npm ci` cannot
be unconditionally wired into Gradle the way a zero-dep script could, so it inherits the same
`onlyIf`-gating that already lets a clean clone build green having verified nothing (§7 #1). Wire it so
that a missing toolchain *fails* rather than skips, or the checker acquires the exact problem it was
built to remove.

---

## Reproducing these numbers

- **Composition** — 4185 lines, 2143 markup, ~40% comment. Any XML parser over the working tree.
- **Derivation, 21/21** — read the 7 `hero_body` hexes, convert to HSL, apply the three documented
  ratio pairs, `Math.round` back to hex, compare against the file's 21 derived values. If this ever
  prints anything but 21/21, §3's central claim is dead and the verdict in §6 should flip.
- **The 11 tables** — extract every `<PartDraw|PartText name="BASE_DAY">` block's `color=`, group by
  `BASE`, keep only groups having all seven day suffixes.
- **§5** — read the four `Variant` elements at `:117`, `:303`, `:418`, `:426` against the prose at
  `:114` and `:385-413`. One minute, no tooling.
- **Edit-cost surface** — 331 colour literals / 61 distinct; 73 precipitation-ramp copies; 20 phase-idiom
  copies; gyro gains at 3 and 4 sites; 32 banner sections.
- **The 5.8%** — `git diff -U0 -- watchface/src/main/res/raw/watchface.xml`, count `^+` lines, then
  count those matching `hero_body_|hero_mouth_|mini_body_|mini_mouth_|date_chip_|date_weekday_|date_day_|rain_drop_|rain_shape_`.
  127 of 2192 at the time of writing.

Nothing here needs a build, an install, or a watch.
