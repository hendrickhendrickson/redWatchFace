# Authoring strategy: generating watchface.xml from TypeScript

**Decision, 2026-08-08: switch to a TypeScript generator.** `watchface.xml` becomes a build
artifact emitted by `node tools/gen/build.ts`; the magic numbers move into a concise collection of
typed constants.

> **Status: done, and since built on.** The migration landed the same day and the first feature
> authored *in* the generator rather than migrated into it followed immediately — see
> §"After the migration", which is the part to read if you are about to add something rather than
> to understand how the tree got here. Everything before that section is the case for the decision
> and the record of executing it, kept because the reasoning is still load-bearing.
>
> This document is about *authoring*. For how the face behaves, see `README.md`; for the running
> engineering log and open items, `TODO.md`.

Numbers below are measured against `watchface.xml` as committed in **`9aa11c9` ("1.1.0")** —
4185 lines, md5 `e2b772c9a2046c202b034a3a204272ef`. They reproduce from a clean checkout of that
commit, and are historical: they describe the file the migration started from, not today's.

## Why

WFF has no variables, no functions and no constants. Every number is written where it is used. The
result, with comments stripped:

| | total | distinct |
|---|---|---|
| numeric literals in attributes | **3737** | **313** |
| `x` | 433 | 89 |
| `y` | 433 | 79 |
| `width` | 437 | 56 |
| `height` | 437 | 52 |
| `cornerRadiusX` / `Y` | 68 / 68 | 16 / 16 |
| `thickness` | 100 | 15 |
| `alpha` | 50 | **2** |
| colour literals | 331 | 61 |

**About 3400 of the 3737 literals are repeats of a value already written elsewhere.**

It is not diffuse repetition either — it clusters into a handful of boxes that are typed out over
and over:

```
31 x  x="14" y="36" width="72" height="80"     the hero's body box
30 x  x="8"  y="20" width="44" height="42"     the companion's body box
26 x  x="0"  y="0"  width="450" height="450"   the canvas
20 x  x="0"  y="0"  width="106" height="132"   the drip box
```

and whole primitive lines recur verbatim 7-8 times:

```
8 x  <RoundRectangle x="0" y="0" width="44" height="42" cornerRadiusX="22" cornerRadiusY="20">
7 x  <RoundRectangle x="0" y="0" width="72" height="80" cornerRadiusX="36" cornerRadiusY="34">
7 x  <Ellipse x="30" y="42" width="11" height="11">
7 x  <Rectangle x="22" y="35" width="26" height="13">
```

**The maintainability consequence is direct:** moving the hero's body is not a one-line edit, it is
up to 31 coordinated edits that nothing verifies. Retuning the precipitation ramp is 73. Changing
the phase idiom is 20, four of them inside a single attribute. Under a generator each is one edit
to one named constant.

The second half of the case is the conditional logic. WFF's only branching construct is
`<Condition>` / `<Expressions>` / `<Compare>` / `<Default>`, which cannot be factored, parameterised
or referenced across conditions. So a seven-way weekday choice costs ~45-70 lines of markup, and the
face pays that **eleven times** (§"the eleven sites"). The salute's window is written out five times
in two forms for the same reason. In TypeScript a seven-way choice is a `Record<Weekday, T>` and a
loop.

> The salute was retired on 2026-08-08 and its five window copies went with it. The measurement
> stands as history — it is what the file looked like at `9aa11c9` — and the pattern outlived the
> feature: the meeting windows that replaced it are restated four times from one binding in
> `meetings.ts`. See §"After the migration".

### The counter-argument, and why it lost

An earlier draft of this document recommended *against* generating, on the grounds that ~450 lines
of structurally-duplicated markup (the weekday tables and the rain field) were only 11% of the file,
were internally consistent, and were already finished — while the bulk of real editing was
one-of-a-kind geometry a generator would not help with.

That reasoning had a hole. It counted *structural block* duplication and colour literals, and
treated everything else as un-abstractable bespoke geometry. But bespoke geometry is exactly where
the 3737 literals live, and `HERO_BOX` repeated 31 times is abstractable by any standard. The 11%
figure measured the wrong thing.

What survives from that draft, because it is still true and still shapes the design:

- **The ~1670 comment lines are the project's engineering memory** and must survive the migration
  intact. §"Comments" makes that a hard requirement, not a best effort.
- **There is no ground truth except a wrist.** `hasCode="false"` means no logs, and the validator
  cannot type-check `Transform/@target`, `Variant/@target` or any expression — all three are
  `xs:string`, so a typo validates, ships and silently does nothing. A generator can therefore emit
  valid, validator-passing, semantically-wrong XML. This is the migration's central risk and
  §"Byte-identity" is the answer to it.
- **`generate-preview.mjs` was deleted for drifting** out of sync with the face. A generator is
  immune to that specific failure — it inverts the relationship, so file-vs-tool drift becomes
  impossible — but only once a region is fully migrated. Half-migrated regions have the old problem.
- **Two checking tools were written for this face and neither was committed** (`TODO.md` open items
  1 and 2: the palette generator, and the expression-agreement evaluator that "found nothing, which
  is the point"). Whatever else happens, those belong in the repo.

---

## The eleven sites

`TODO.md` says the seven-colour table is written out nine times. Measured, it is **eleven `Part*`
sites** — the date row is three, not one:

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

All eleven agree today: both masks match their bodies on all seven days, and
`mini_body[d] === hero_body[next(d)]`. **All 21 derived hexes reproduce byte-for-byte** from the
seven body colours using standard HSL and `Math.round` at the documented ratios — mouth
S×0.55/L×0.41, chip S 0.20/L 0.28, text S 0.22/L 0.78. 21 match, 0 mismatch, no fudge factor.

That matters twice over: it confirms the scratchpad generator's output is intact, and it means the
derivation is ~12 lines to re-implement, so `palette.ts` can compute all 21 rather than tabulate
them.

---

## Design

### Source of truth: typed builder functions → node tree → serialiser

**Not JSX** — Node's strip-only mode cannot transform it, which would force a bundler, a `dist/` and
source maps. **Not template literals** — the file is already a string; that buys indentation pain
and no type safety. Plain functions returning a small node union. Functions are precisely the
abstraction WFF lacks.

```ts
export type Node =
  | { k: 'el';      tag: string; attrs: Attrs; children: Node[] }
  | { k: 'comment'; text: string; verbatim?: boolean }
  | { k: 'raw';     text: string }   // migration escape hatch
```

### Constants — the point of the exercise

```ts
// geometry.ts — each box named once, used everywhere it is used today
export const CANVAS    = { x: 0,  y: 0,  width: 450, height: 450 } as const  // 26 sites
export const HERO_BOX  = { x: 14, y: 36, width: 72,  height: 80  } as const  // 31 sites
export const MINI_BOX  = { x: 8,  y: 20, width: 44,  height: 42  } as const  // 30 sites
export const DRIP_BOX  = { x: 0,  y: 0,  width: 106, height: 132 } as const  // 20 sites
```

```ts
// expr.ts — the idioms the comments already name, each written once
export const ramp = (v: Expr, lo: number, hi: number): Expr =>
  `clamp((${v} - ${lo}) / ${hi - lo}, 0, 1)` as Expr

/** 73 verbatim copies today. */
export const PRECIP = ramp(src('WEATHER.CHANCE_OF_PRECIPITATION'), 50, 100)

/** fract() is VERIFIED on hardware; it is what made per-drop rain phases possible. */
export const phase = (hz: number, offset: number): Expr =>
  `fract([SECOND_MILLISECOND] * ${hz} + ${offset})` as Expr

/** Triangle over a 0..1 phase, ZERO at both ends, so a sawtooth reset in y
 *  happens at alpha 0 rather than as a visible snap. */
export const triangleAlpha = (p: Expr): Expr =>
  `255 * (clamp(4 * ${p}, 0, 1) - clamp(4 * ${p} - 3, 0, 1))` as Expr
```

### Types that catch what the validator cannot

- **`Source` as a closed union.** `[ANIMATION_VALUE]` was invented, passed the validator and did
  nothing for a whole session. `src('ANIMATION_VALUE')` will not compile.
- **`Transform`/`Variant` targets as a per-element union**, modelled as a keyed object rather than a
  child list. Kills three bugs at once: a misspelled target, two `Transform`s on one target, and a
  `Variant` and a `Transform` fighting over one attribute — which the XML's own comment says "is not
  something the schema settles."
- **`Int` for `Part*` x/y/width/height**, which are `xs:integer` in WFF. Today a float is a validator
  SEVERE with a line number; here it is an error naming the element and telling you to move the
  fraction into the primitive inside.
- **`Record<Weekday, Hex>`** over a seven-member union — adding or dropping a day fails to compile at
  all eleven sites at once. Body and mask take the *same* argument, so the desync `TODO.md` calls
  "a dark bar across a face on exactly one weekday" becomes unrepresentable.

### Comments

**Hard requirement: all ~1670 lines survive.** They are the engineering memory and most record
things measured on hardware that cannot be re-derived.

- Comments are first-class nodes and sit in the children array where they sit today. The importer
  captures each one **verbatim**, so the migration never has to reproduce reflow — only indentation.
- Prose that is duplicated *because the markup is* (the nine copies of the nine-times note) collapses
  to one canonical copy in the owning module, plus a short provenance stub at each emitted site, so
  someone reading the XML on the wrist is still pointed at the reason.
- The header palette table is **generated from `palette.ts`**, so the documentation of the colours
  can no longer drift from the colours. It is hand-maintained today and lists every hex a second time.
- Every emitted file carries a `GENERATED FILE - DO NOT EDIT` header naming the regenerate command.
  Without it someone iterating on the wrist edits the XML directly and loses it. That is a certainty.

---

## Migration: the semantic differ is the gate

**Superseded 2026-08-08.** The first plan gated on byte-identical output. That was dropped once the
requirement was stated properly: the generated XML does not need to *look* like the hand-authored
file, it needs to *render* the same. Byte comparison cannot express that — it fires on every
reflowed attribute — and chasing it would have meant reproducing 128 inline elements, 61
hand-aligned wrapped attribute lines and a stray odd indent, forever.

What replaced it is stronger. `tools/gen/model.ts` reduces a face to what actually reaches the
screen — element order (which *is* draw order in WFF), tag, attributes, text — normalises away what
does not (comments, whitespace, attribute order, `1.0` vs `1`, including numeric literals *inside*
expressions), and compares. `node tools/gen/build.ts --diff` must report zero differences against
the baseline.

During the migration that baseline was a frozen copy of the pre-migration `watchface.xml`. Once the
generated face had been validated, memory-checked and shot across all 25 states on the wrist, the
copy was replaced by **`tools/gen/face.model.json`** — a committed semantic snapshot of the same
thing. It answers the identical question at a fraction of the size, and unlike the frozen XML it
keeps answering it for every *future* change rather than only for the migration. An intended
rendering change is accepted with `--snapshot`, and the new baseline lands in the same commit as
the change that caused it.

**The differ has a self-test, because a green check proves nothing until you have watched it fail.**
`--selftest` mutates the reference in seven ways that would change the rendering — a colour, a 1px
move, an expression, a ramp threshold, a dropped element, a rename, a typo'd `Transform` target —
and asserts each is caught, plus two controls (all comments stripped, `72` → `72.0`) that must be
ignored. It runs in a second and it stays.

This was not theoretical. The first `--check` compared the generator's output against its own
input, so it passed on a hand-edited file; and the first `--selftest` reported three false failures
because its mutations were landing in the header comment rather than in markup. Both were found by
making the checks prove themselves.

**How it actually ran.** Rather than a line-range manifest of un-migrated regions, the whole tree
was converted mechanically in one pass — a throwaway emitter walked the parsed XML and wrote
TypeScript builder calls, with repeated boxes and colours already swapped for named constants — and
then the interesting regions were collapsed by hand on top of a base that was already known good.
Each collapse was one commit with `--diff` clean. The emitter and its driver were deleted once the
migration landed; they could only produce a *worse* result if re-run against the refactored source.

For the record, on byte-identity, which was the original plan and would have been affordable:

| | |
|---|---|
| Markup, attribute order, indent | **yes** — the file is already machine-regular, 2-space indent |
| Comments | **yes**, via verbatim capture |
| The 21 derived colours | **yes — verified 21/21** |
| Rain width/height extras | **yes** — `w*0.3` exact; `h*0.35` needs banker's rounding |
| Rain fall distances | **no** — 2 of 9 sampled were hand-nudged; table them |
| Numeric formatting | **yes, fiddly** — `fmt()` must not normalise `1.0` to `1` |

Expect 2-3 places where a one-line non-identical diff is accepted deliberately and justified in the
commit message.

**Sequence:** skeleton + serialiser + copier (identical, 0% migrated) → Gradle wiring and the
mock-state guard → rain (isolated, purely numeric, failure visible in one `cycle-states` run) →
`expr.ts` + `sources.ts` + typed targets → `geometry.ts` boxes → `palette.ts` + the date row → the
eight blob weekday sites → gyro constants and the ambient/interactive pairs → delete the legacy copy.

Every commit boundary is a working repo.

### Status — migrated

`watchface.xml` is now generated in full from `tools/gen/*.ts`. 4381 hand-authored lines became
**2189** generated ones plus TypeScript, and the semantic differ reports zero differences against
the pre-migration face.

| Module | What it holds |
|---|---|
| `palette.ts` | the 7 chosen weekday hexes, the HSL derivations, and 30 named fixed colours |
| `geometry.ts` | every repeated box — `HERO_BOX` was 31 literal copies, `MINI_BOX` 30, `CANVAS` 26 |
| `expr.ts` | the closed `Source` union and the ramp/phase/triangle idioms |
| `weekday.ts` | `byWeekday()` — the seven-way fan-out, written once instead of eleven times |
| `blob.ts` | shared blob primitives taking explicit geometry |
| `crossfade.ts` | `FADE_OUT`/`FADE_IN`, one binding for four hand-written `Variant` window sets |
| `meetings.ts` | the meeting windows (added after the migration — see below) |
| `face/*.ts` | 17 section modules, one per Scene child, in draw order |

Measured effect on the duplication that motivated this:

| | before | after |
|---|---|---|
| weekday fan-out sites | 11 hand-written tables | 1 `byWeekday()` |
| precipitation ramp | 73 verbatim copies | 1 binding (`PRECIP`) |
| hero body box | 31 literal copies | 1 constant |
| rain field | 282 lines | 126, of which 24 are the drop table |
| `blob-hero` | 816 lines | 552 |

The audit that came free with the tree found nothing wrong but is worth keeping: **228 part names,
all unique**. It initially reported duplicates — `hero_eyes_startled` and two salute palms — which
are `<Expression>` names colliding with the parts they gate. That is a separate namespace and reads
well, so the check excludes `Expression`. Noted because a check that cries wolf is one people learn
to skip, and because the collision recurs by design: the salute's two are gone but
`hero_controller` now names both an expression and the part it gates.

**The generator must not read the file it writes.** The first version of `--check` did, and it was
therefore vacuous: output equalled input by construction, so appending a newline to `watchface.xml`
passed. The safety net had reintroduced this project's signature failure — silently wrong, with a
green result. The face is now built entirely from TypeScript, so `watchface.xml` is a genuine
output and a hand edit to it fails:

```
$ printf '\n' >> watchface/src/main/res/raw/watchface.xml
$ node tools/gen/build.ts --check
  watchface.xml is out of date with tools/gen.
    first difference at byte 116318 (line 2190)
    original: "...</Scene>\n</WatchFace>\n\n"
    emitted:  "...</Scene>\n</WatchFace>\n"
  exit=1
```

**The frozen `tools/gen/legacy/watchface.original.xml` is gone**, and this section used to say to
keep it. `tools/gen/face.model.json` is the sole baseline now — it is the flattened semantic model
of the same tree, which is what the differ actually compares against, so the raw copy answered
nothing the model does not. Retiring it did retire one question permanently: "does this render the
same as the *hand-authored* file" is no longer askable, only "does it render the same as the last
accepted baseline". That trade was made deliberately, and every `--snapshot` since is the audit
trail.

**`--check` was itself broken for three releases**, which is worth recording because it is the same
failure mode the paragraph above is about. Every committed blob is pure LF (`core.autocrlf=input`)
while the serialiser emitted CRLF, so it passed between a `generate` and the next git operation and
failed on every fresh clone — at byte 38, before reaching anything meaningful. It took
`validateWatchFaceXml` with it, since that `dependsOn` the staleness check, and regenerating
"fixed" it while re-arming it for the next person. The defect was that the line ending was defined
**twice**: `xml.ts` had `EOL` and `face.ts` hard-coded `"\r\n"` five times. One definition now. Net
content change: zero.

**Wired in.** `:watchface:checkWatchFaceXmlUpToDate` runs before `validateWatchFaceXml`, and unlike
the two jar-gated tasks it **throws rather than skips** when the generator is missing — those skip
because the jars are a separate download, whereas a missing generator is a broken checkout. It does
skip, loudly, when a mock is in place, because after a capture run that is the normal state of the
tree.

```
> Task :watchface:checkWatchFaceXmlUpToDate
  OK  watchface.xml is up to date.
> Task :watchface:validateWatchFaceXml
INFO: PASSED : watchface.xml is valid against watch face format version #5
BUILD SUCCESSFUL
```

### Two things that must not break

**`mock-state.ts` rewrites `watchface.xml` in place.** If generation is wired into the build, a
`mock-state on rainy` followed by `installDebug` regenerates the file and blows the mock away before
aapt sees it — every snapshot silently becomes the un-mocked face. Resolution: the generated XML is
**committed**, `mock-state.ts` is unchanged and runs as a post-processor, generation is **never**
wired into `assembleDebug`, and `build.ts` aborts if a mock backup exists.

It still broke, and finding out how was worth the trip. `mock-state.ts` matches a whole
`<Template>` as one exact string when it swaps in literal text, and the serialiser had been
indenting `Template`'s CDATA onto its own line. `node tools/mock-state.ts on rainy` refused:
*"ABORT: a [DAY_OF_WEEK_S] Template was not in the swap table — watchface.xml has changed."* That is
the script working exactly as designed; its header says every substitution asserts something so an
edit fails loudly instead of silently producing a wrong snapshot. The fix went into the serialiser,
not into `mock-state.ts`: any element with text or CDATA content now renders inline, which also
stopped `<Expression>` bodies picking up leading whitespace.

**A clean clone must still build.** The generated XML is committed — like `docs/states/*.png` and
`preview.png` already are — so a clone with no Node produces a correct APK, and `git diff` on the XML
remains the closest thing this project has to a test suite. The up-to-date check is a separate
verification task. It must **fail** rather than skip when the toolchain is absent, or it acquires the
exact problem that already lets a clean clone report BUILD SUCCESSFUL having verified nothing
(`watchface/build.gradle.kts:63-67`, `:96-100`).

---

## After the migration

Everything above is about *moving* a finished face into a generator. Design pass 7 — retiring the
salute and replacing it with a headset, a coffee cup and a game controller, 2026-08-08 — was the
first feature **authored** in it, and it is the better test: the migration only had to reproduce
something that already worked, whereas a new feature has to be right the first time in a language
where nothing checks it.

**What the generator delivered as advertised.** Retiring the salute meant deleting two bindings
(`HANDS_FULL`, `SALUTE_BUSY`) and collapsing the `Condition`s that used them; **all eight XML copies
of that expression pair went with them**, verified — the emitted file now contains zero. `--diff`
proved nothing else moved. Adding three palette entries and removing two was a compile error at
every use site until it was consistent.

Worth being accurate about the window duplication, because it is the headline claim and it is
currently *latent* rather than demonstrated: `meetings.ts` holds three bindings, and each is emitted
**exactly once** today. The copies that would prove the point disappeared when the companion's
headset was scrapped mid-pass — `HEADSET_WINDOW` was briefly emitted twice, once per blob. It
returns to two the moment that headset comes back, which is the open item at the end of `TODO.md`.
The module earns its keep either way, since restating a window is a one-line call rather than a
300-character paste, but a reader checking the output today will find one copy of each and should
not conclude the tooling is doing nothing.

**Two hazards the generator introduces that hand-authoring did not**, both worth knowing before
composing expressions:

1. **Operator precedence survives composition.** `or(a, b, c, d)` builds the flat string
   `a || b || c || d` with no parentheses of its own. Passed straight into
   `and(days, hourTest, minuteTest)` it parses as `a || b || (d && hourTest && minuteTest)`, because
   `&&` binds tighter than `||` and nothing stops the last OR term reaching past its own boundary.
   The symptom was two weekdays showing a headset at *every* hour of the day. **Reading the
   expression looks correct**; it was caught by evaluating the emitted text at midnight. The helpers
   return strings, so **any `or()` later combined with `and()` needs `group()` around it** — the
   type system brands `Expr` but cannot express associativity. This is the one place where the
   generator is *more* dangerous than writing the parenthesis by hand, because composition hides it.
2. **`--snapshot` is a ratchet, not a review.** It accepts whatever the generator currently emits.
   The gate only works if the diff is read before it is accepted, and a large intended change (this
   pass opened with ~900 differences) is exactly when skimming is tempting. The `--selftest` proves
   the differ *can* fail; nothing proves the human looked.

**An architectural finding worth recording next to the section modules.** A `PartDraw` cannot start
left of its parent group's origin — content there is clipped, as the companion's left hand
demonstrates (its cream cap is drawn from `x-2` and arrives flat-sided). The hero's raised hand sits
at group-local `x10.5`, so a prop wider than 21px could not be centred on it — and a round of art
was shipped 3.5px off-centre on the strength of that, *and documented as unfixable*, which is the
part worth flinching at: a correct premise had been carried to a false conclusion and then written
down as a constraint. **The group is not the only coordinate space available.** The umbrella, the
bolt, the burst and both sets of Zzz are already siblings of the blob rather than children,
positioned in absolute canvas coordinates, each repeating the blob's Gyro gain by hand so they still
track the wrist. Moving the three hand props into their own top-level section
(`face/hero-props.ts`, canvas `(199,262)`) centred them exactly. Draw order was preserved by
registering it immediately after `blobHero()`, which is where those `Condition`s had been its last
children; the cocktail's box moved from `(0,6)` to `(8,6)` for the same canvas position `(207,268)`,
asserted in a check and confirmed by reshooting `3-sunny`. Generalised: **anything that needs to
overhang a blob belongs beside it, not inside it**, and `heroGyro()` is what makes that free.

**Where the generator does not help, and what did.** It has nothing to say about whether a shape
*reads* at 426×426 — that still costs a build, an install and a look at a wrist, and this pass took
four rounds of it. What shortened the last two was borrowing the generator's own habit: writing a
throwaway script that asserted the claims the code comments were making (buttons contained against
a shell's rounded *corner arcs* rather than its bounding box, a handle tangent at 16.97 against a
wall at 17, steam wisps' stroke-inflated bands not touching, a band's clearance over the head
sampled across its whole span, and — the one that would never have been checked by eye — that the
band's colour differed from the arms' by a luma of 2.8, i.e. was the same colour). Thirty
assertions, all green before the build, and the shoot confirmed them. **Geometry that can be stated
in a comment can be asserted in a script**; doing so is what turned "shoot and see" into "shoot to
confirm."

---

## The data-driven pass, and the second compilation target

The migration got the magic numbers out of the **output** and stopped there. It transliterated the
XML into `el()` calls, so the numbers moved into TypeScript without ever becoming *data* — six
section modules still carried the literal header `// GENERATED SCAFFOLD`, the night window
`[HOUR_0_23] >= 23 || 7 > [HOUR_0_23]` was written out **nine times** as a pre-escaped string
literal that bypassed `expr.ts`'s closed `Source` union entirely, and the twelve canvas anchors that
place every section existed nowhere but inline.

### What a magic number was taken to mean

**Literal count is not the defect. A literal with no name, repeated or derivable, is.** `rain.ts`
had 260 numeric literals and was second on the census — and nobody would call it a problem, because
every one of them sits in a named field of a typed row with a comment saying why it is tabulated
rather than derived. It came out of this pass essentially untouched (260 → 257). The goal was to
make the other eighteen modules read like that one.

So three things were done, and a fourth deliberately was not:

- **Named** — a value with one meaning gets one binding (`T.NIGHT_FROM`, `GYRO_CLAMP`, `MOON.synodicDays`).
- **Tabulated** — a list of things becomes rows in `data/*.ts`, read by a builder.
- **Derived** — a value that *follows* from another is computed, and the derivation is asserted.
- **Not** collapsed into parameterised mega-builders. `blob.ts` argues at length that the companion
  is not the hero scaled down, and that argument still holds; the two blobs get two row sets and two
  call sequences. A helper has to remove a repetition or a hazard to earn its place. One I wrote —
  a `cloud()` for `chip-weather` — was removed again on that rule: it had a single caller and the
  three clouds have genuinely different geometry.

### Source-side result

Greps over `tools/gen/face/*.ts`, before (`ab278a9`) and after. Literal counts strip `//` comments
and block-comment body lines, then count numeric tokens not part of an identifier.

| grep | before | after |
|---|---|---|
| `el('Condition'` scaffolds | 32 | **0** |
| `text('` pre-escaped expression literals | 37 | **0** |
| `&gt;` / `&lt;` / `&amp;` in source | 96 | **0** |
| `mode: 'AMBIENT'` bags | 15 | **0** |
| `family: 'SYNC_TO_DEVICE'` | 15 | **0** |
| hand-written `value: '...'` transforms | 15 | **0** |
| `// GENERATED SCAFFOLD` headers | 11 | **0** |
| numeric literals, all 19 section modules | 1806 | **596** |
| &nbsp;&nbsp;`hero-props.ts` | 173 | 3 |
| &nbsp;&nbsp;`freeze-mark.ts` | 86 | 3 |
| &nbsp;&nbsp;`companion-burst.ts` | 75 | 3 |
| &nbsp;&nbsp;`sleep-zzz.ts` | 85 | 2 |
| &nbsp;&nbsp;`blob-hero.ts` | 410 | 133 |
| &nbsp;&nbsp;`blob-companion.ts` | 309 | 88 |
| &nbsp;&nbsp;`chip-weather.ts` | 138 | 72 |
| &nbsp;&nbsp;`rain.ts` — *already right* | 260 | 257 |

`blob-hero`, `blob-companion` and `chip-weather` are the three that did not reach the plan's rough
targets. What is left in them is the shapes that are genuinely one-of-a-kind: the X-ray skeleton,
the eyes, the shades, the scarves, and the four weather icons whose clouds are three different
sizes because each is composed against different neighbours. Those are candidates for another pass,
not evidence one is owed.

**`--audit`'s output-side numbers did not improve, and must not.** WFF has no variables, so the
emitted duplication — 31 copies of `HERO_BOX`, 2562 literals, 35 repeated expressions — is
unavoidable and is *supposed* to stay exactly where it is. An improving `--audit` would mean the
output had changed.

### The gate: byte-identity, not just semantics

Every step of this pass was held to `node tools/gen/build.ts --check` passing **without
regenerating**, which is a stronger claim than `--diff`: it proves the file cannot have changed,
so the screenshots cannot differ and no wrist run is needed to know it. Six of the seven commits
cleared it outright. The one exception was the blobs, where sharing a builder forced a different
attribute insertion order — `xml.ts` emits attributes in insertion order, so `{ ...box, name }` and
`{ name, ...box }` differ in bytes and not in meaning. That moved **7 lines, all `name` sliding
after the box**, with `--diff` green and no `--snapshot`.

`--snapshot` was authorised for this pass and used **once**, at the end and not for a refactor
step: reshooting the states showed the step-goal flag floating with no arm to hold it. See below.

### What the gate cannot see

The flag's pole is authored to be gripped — it runs down x93, the exact centre of `rightOut`'s
cream cap, and spans y19..74, bracketing that cap's centre at y60.5. Until 1.1.0 the flag and the
right arm were **two independent `<Condition>` elements**, so both drew and the hero held it.
Removing the salute merged them into one dispatch, which made the flag *exclusive* with the arm —
so from 1.2.0 the goal state drew a pole in mid-air, and on a cold day a mitten floating beside it
with no arm to sit on.

**Every check in this repo passed throughout, and none of them could have caught it.** `--check`
compares bytes to the committed file, `--diff` compares to `face.model.json`, and both baselines
were taken *after* the merge. The gate's question is "did the output change", and the answer was
correctly "no" — it has no way to ask "was it already wrong". The screenshot that would have shown
it was committed in the same commit as the merge, having been shot before it.

Two things follow, and both are now in place. The pole is recorded in `data/blobs.ts` next to the
arm row it depends on, with an assertion that it passes through the fist — which fires in all three
directions, including when the *arm* moves rather than the pole, the direction that actually caused
this. And the path-based differ is worth distrusting on structural change: inserting one
`<Condition>` shifts every sibling index and it reported 1176 differences for what was a four-element
change. The verification that worked was behavioural — render all 29 states before and after and
diff the set of shapes each one draws, which reported exactly 3 states changed by exactly the four
elements of `hero_arm_right_out`.

### Assertions, not comments

The repo's existing idiom — `crossfade.ts` proving its window invariant at module load, `palette.ts`
reproducing all 21 derived colours — was applied to every new table. The rule that emerged is
narrower than "assert things": **assert the property that makes the shape read as what it is**, and
then go and watch it fail.

- The heart is two lobes and a rotated square, and the square's upper corners must stay *hidden
  behind the lobes* — that is what makes three shapes read as one heart instead of a diamond parked
  under two circles.
- The snowflake's three axes must span all six arms exactly once; getting it wrong draws one axis
  twice and leaves a gap.
- The controller's ABXY diamond carries a 1.5px nudge, and the assertion checks **both** that the
  shipped position clears the shell edge **and** that the un-nudged position does not — so the nudge
  cannot be mistaken for an unexplained fudge and removed.
- The battery bar's housing must sit inside the shell's stroke, because WFF centres a stroke on its
  path and a bar flush to the shell's bounds paints over its own outline.

Every assertion was mutation-tested by breaking the input and watching the message. Two of those
probes were **too weak to breach the invariant they targeted** — dropping the heart's point by 12px
still tucks it under the lobes, and a bar at 2..20 exactly meets the shell's inner edge — and both
passed, which proved nothing until they were re-run at values that actually cross the line. A probe
that passes is not evidence about the assertion.

### Recorded, not fixed

Deriving shapes surfaced five places where the shipped drawing is not what a clean derivation would
produce. All five are the shape the watch has been drawing, so all five are recorded next to the
constant with the measurement, and none was quietly corrected — growing a box or nudging a
coordinate is a design decision, not a tidy-up.

| what | measured |
|---|---|
| companion's scarf tail | runs 11px past its part box, clipped |
| companion's first limb cap | starts at local x-2, arrives flat-sided |
| coffee cup's tallest steam wisp | round cap overshoots the box top by 0.2px |
| storm burst's four longest spokes | SQUARE caps reach 54.5 in a box whose half-width is 52 |
| step icon's heel | centres on 14 where the ball and arch centre on 13 |

Two documented facts also turned out to be wrong once the arithmetic was actually done. The
controller's comment claimed the ABXY diamond and right stick were "pulled 1.5px apart" because the
enlarged buttons would collide with the enlarged stick — computing both placements gives a clearance
of 0.51px traced and 0.49px shipped, so nothing was gained there; what the nudge buys is the shell
edge. And the Zzz drift was described as rising over the first half and snapping out, where it is a
symmetric triangle peaking at the midpoint (0/64/128/191/255/191/128/64/0) — which is why it is
`driftAlpha` and not `triangleAlpha`, with the measured comparison table in `expr.ts`.

### The second compilation target

The seam needed no invention. `face()` returns `Node[]` and `serialize()` is a pure function of it,
so a second pure function of the same tree is a second target:

```
                              /-> serialize()  -> watchface.xml   (WFF, ships)
   face()  ->  Node[]  ------<
                              \-> renderSvg()  -> SVG             (tools/preview)
```

**No new intermediate representation.** `model.ts` has been flattening the same tree to
`{path, tag, attrs, text}` since the migration, so the neutral scene representation this would
otherwise need already existed. Everything above the seam is shared: every constant, every table,
every predicate, every section builder. The split is the last function call, and
`tools/preview/check.ts` asserts that the app renders byte-identical output to `renderSvg` fed the
same values — so the preview is a *view* of the backend, not a third implementation of WFF
semantics.

`svg.ts` lives in `gen/` rather than under `tools/preview/` on purpose: it is a peer of `xml.ts`,
and putting it in the app would make `build.ts` import from the thing it must stay independent of.
`npm run verify` passes with `tools/preview/node_modules` moved out of the repo entirely — verified,
after a first attempt at that test renamed the directory instead and merely proved that `tsc` globs
into anything not called `node_modules`.

**The preview is not pixel truth**, and three things guarantee it:

- **Text.** The family is `SYNC_TO_DEVICE`, so glyph advance belongs to the device. WFF exposes no
  text-width source either, which is why `geometry.ts` records that the date row is centred by
  *estimate*. Anything text-shaped in the preview is indicative.
- **Easing.** WFF names its interpolation curves and does not specify them. The preview honours the
  *windows* faithfully and approximates the ramp inside each one.
- **Scale.** The design canvas is 450×450, hardware reports 426, the emulator 454. This adds a
  fourth geometry rather than settling the question.

What it *is* good for is the thing screenshots cannot show. `crossfade.ts` argues that one pair of
`<Variant>` windows serves both directions, so going ambient leaves a 0.05 gap with neither clock
copy drawn and coming back leaves an overlap with both, and that no timing avoids both. That was an
argument until the scrubber; counting visible copies across the transition gives

```
    t                0.2   0.46   0.48   0.55   0.7
    going ambient      1      0      0      1     1
    coming back        2      2      2      2     2
```

Clipping is implemented for the same reason and is not optional: `mini_limbs` draws a cap from local
x-2 inside a box starting at 0, and a preview that drew it round would hide the exact bug class
that produced the whole `hero_props` restructuring.

**The wrist stays the arbiter.** `tools/cycle-states.ps1` is still the final word — a green check
proves nothing until you have watched it fail, and this document is emphatic about that everywhere
else.

---

## Toolchain

**TypeScript with `package.json`.** Node 22.21.1 executes type-annotated TS with no flag
(`--experimental-strip-types` default since 22.18); `enum` throws
`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`, so the constraint is erasable-syntax-only and `tsconfig`'s
`erasableSyntaxOnly` makes that a compiler error rather than a convention. Stripping does **not**
type-check, so `typescript` is a devDependency used solely for `tsc --noEmit` — and since the types
are the entire justification, that check has to run somewhere reproducible.

Two devDependencies (`typescript`, `@types/node` — the second is types-only, no runtime code),
zero runtime dependencies, no build step. The repo gains its first `package.json`, lockfile and
`node_modules`; Node was already an undeclared prerequisite, since `mock-state.ts` and both
PowerShell scripts shell out to it.

`erasableSyntaxOnly` is verified working: an `enum` fails `tsc --noEmit` with
`error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled`, which is a far
better failure than node's `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` stack trace at run time.

---

## Not viable: XSLT, XInclude, resource preprocessing

Three independent blockers. `res/raw/` is copied verbatim by definition, and
`watchface/build.gradle.kts:29-31` (`noCompress += listOf("xml")`) guarantees byte passthrough, so no
XInclude processor ever sees the file. The consumer is the Wear OS WFF runtime with its own parser.
WFF's XSDs use closed `xs:all` particles, so any foreign element fails validation. Running XSLT as a
Gradle pre-step is just this plan in a worse language.

---

## Carried over: work worth doing regardless

1. **Make the missing verification jars fail rather than skip** (0.5 h). Highest value-per-hour item
   in the repo, unrelated to codegen. A `-Pwff.tools.required` property makes "I chose not to verify"
   explicit instead of silent.
2. ~~**Commit the expression-agreement evaluator.**~~ **Closed** — `tools/gen/eval.ts`, built first
   in the data-driven pass because it was the instrument the rest of it was measured with.

   The reasoning that put it on this list still reads correctly, and one part of it was wrong: it
   said "predicates only — no geometry, no compositing, no drawing." The evaluator is now the engine
   of the SVG backend, so it does all three. Building it properly rather than minimally was worth it
   for exactly that reason, and it is why `--selftest` carries 36 hand-computed cases: an evaluator
   that is subtly wrong would be wrong *identically* in `--equiv` and in the preview, which is the
   one failure mode that could mislead both at once.

   `node tools/gen/build.ts --equiv "<a>" "<b>"` answers whether two expressions agree over a
   783-row grid, and reports where they first diverge. **The first version of that grid was
   vacuous**, in this project's signature way: it varied one source at a time, and
   `a || b && c` differs from `(a || b) && c` only when `a` is true *and* `c` is false — so it
   pronounced the documented `or()`/`and()` mis-binding EQUIVALENT. The grid is now named states,
   plus one-factor sweeps over every threshold's boundary values, plus 600 seeded combinations, and
   `--selftest` asserts it still catches that mis-binding so it cannot regress.

   The same lesson landed a second time on a *negative* control: `>= 7` and `> 7` disagree on
   exactly one integer, and a grid holding 3 and 9 "proves" a changed operator harmless. Every
   threshold in `fixtures.ts` now appears with its neighbour.
3. ~~**The date crossfade disagrees with its own documentation.**~~ **Closed 2026-08-08**, judged on
   the wrist — the only way it was ever visible, since the transition lasts ~200 ms and every mock
   state is steady-state. The finding: a `<Variant>` window is used in **both** directions, so a gap
   going one way is an overlap coming back and there is no timing that avoids both. The date's real
   problem was never the timing but that its two copies were not congruent — a centred `"%s %d"`
   against two parts pinned around a chip. Fixed in `crossfade.ts` (one binding, which throws at
   build time if the windows overlap into ambient) and `face/date-common.ts` (the boxes both copies
   must agree on). Full write-up in `TODO.md`.

---

## Reproducing these numbers

- **Literal census** — strip comments (`perl -0pe 's/<!--.*?-->//gs'`), extract quoted attribute
  values, count numerics: 3737 total / 313 distinct.
- **Repeated boxes** — `grep -oE 'x="[0-9.-]+" y="[0-9.-]+" width="[0-9.-]+" height="[0-9.-]+"' | sort | uniq -c | sort -rn`.
- **Derivation, 21/21** — read the 7 `hero_body` hexes, convert to HSL, apply the three ratio pairs,
  `Math.round` back to hex, compare against the file's 21 derived values.
- **The eleven sites** — extract every `<PartDraw|PartText name="BASE_DAY">` block's `color=`, group by
  `BASE`, keep groups having all seven day suffixes. (A naive extractor reads `wx_icon_sun` as Sunday;
  requiring all seven suffixes rejects it.)
- **The crossfade** — read the four `Variant` elements at `:117`, `:303`, `:418`, `:426` against the
  prose at `:114` and `:385-413`.

Nothing here needs a build, an install, or a watch.
