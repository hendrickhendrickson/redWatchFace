# Generate watchface.xml from TypeScript

**Status: accepted, implemented 2026-08-08.** `watchface.xml` is a build artifact emitted by
`node tools/gen/build.ts`; the magic numbers live in typed constants.

This is the record of _why_, kept because the reasoning is still load-bearing. For how to work in the
generator today, see [../authoring.md](../authoring.md).

Numbers below are measured against `watchface.xml` as committed in **`9aa11c9` ("1.1.0")** — 4185
lines, md5 `e2b772c9a2046c202b034a3a204272ef`. They reproduce from a clean checkout of that commit,
and they are historical: they describe the file the migration started from, not today's.

---

## The case

WFF has no variables, no functions and no constants. Every number is written where it is used. With
comments stripped:

|                                | total    | distinct |
| ------------------------------ | -------- | -------- |
| numeric literals in attributes | **3737** | **313**  |
| `x`                            | 433      | 89       |
| `y`                            | 433      | 79       |
| `width`                        | 437      | 56       |
| `height`                       | 437      | 52       |
| `cornerRadiusX` / `Y`          | 68 / 68  | 16 / 16  |
| `thickness`                    | 100      | 15       |
| `alpha`                        | 50       | **2**    |
| colour literals                | 331      | 61       |

**About 3400 of the 3737 literals are repeats of a value already written elsewhere.** It is not
diffuse repetition either — it clusters into a handful of boxes typed out over and over:

```
31 x  x="14" y="36" width="72" height="80"     the hero's body box
30 x  x="8"  y="20" width="44" height="42"     the companion's body box
26 x  x="0"  y="0"  width="450" height="450"   the canvas
20 x  x="0"  y="0"  width="106" height="132"   the drip box
```

and whole primitive lines recur verbatim 7–8 times:

```
8 x  <RoundRectangle x="0" y="0" width="44" height="42" cornerRadiusX="22" cornerRadiusY="20">
7 x  <RoundRectangle x="0" y="0" width="72" height="80" cornerRadiusX="36" cornerRadiusY="34">
7 x  <Ellipse x="30" y="42" width="11" height="11">
7 x  <Rectangle x="22" y="35" width="26" height="13">
```

**The maintainability consequence is direct:** moving the hero's body is not a one-line edit, it is
up to 31 coordinated edits that nothing verifies. Retuning the precipitation ramp is 73. Changing the
phase idiom is 20, four of them inside a single attribute. Under a generator each is one edit to one
named constant.

The second half of the case is the conditional logic. WFF's only branching construct is
`<Condition>` / `<Expressions>` / `<Compare>` / `<Default>`, which cannot be factored, parameterised
or referenced across conditions. So a seven-way weekday choice costs ~45–70 lines of markup, and the
face paid that **eleven times**. The salute's window was written out five times in two forms for the
same reason. In TypeScript a seven-way choice is a `Record<Weekday, T>` and a loop.

> The salute was retired on 2026-08-08 and its five window copies went with it. The measurement
> stands as history, and the pattern outlived the feature: the meeting windows that replaced it are
> restated from one binding in `meetings.ts`.

### The counter-argument, and why it lost

An earlier draft of this document recommended _against_ generating, on the grounds that ~450 lines of
structurally-duplicated markup (the weekday tables and the rain field) were only 11% of the file,
were internally consistent, and were already finished — while the bulk of real editing was
one-of-a-kind geometry a generator would not help with.

That reasoning had a hole. It counted _structural block_ duplication and colour literals, and treated
everything else as un-abstractable bespoke geometry. But bespoke geometry is exactly where the 3737
literals live, and `HERO_BOX` repeated 31 times is abstractable by any standard. **The 11% figure
measured the wrong thing.**

Four points from that draft survived, and they shaped the design:

- **The ~1670 comment lines are the project's engineering memory** and had to survive the migration
  intact — a hard requirement, not a best effort.
- **There is no ground truth except a wrist.** `hasCode="false"` means no logs, and the validator
  cannot type-check `Transform/@target`, `Variant/@target` or any expression — all three are
  `xs:string`, so a typo validates, ships and silently does nothing. A generator can therefore emit
  valid, validator-passing, semantically-wrong XML. That is the migration's central risk, and the
  semantic differ is the answer to it.
- **`generate-preview.mjs` was deleted for drifting** out of sync with the face. A generator is
  immune to that specific failure — it inverts the relationship — but only once a region is fully
  migrated. Half-migrated regions have the old problem.
- **Two checking tools had been written for this face and neither was committed.** Whatever else
  happened, those belonged in the repo. Both are now in it: `tools/gen/palette.ts` and
  `tools/gen/eval.ts`.

## The eleven sites

The open list at the time said the seven-colour table was written out nine times. Measured, it was
**eleven `Part*` sites** — the date row is three, not one:

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

All eleven agreed: both masks matched their bodies on all seven days, and
`mini_body[d] === hero_body[next(d)]`. **All 21 derived hexes reproduced byte-for-byte** from the
seven body colours using standard HSL and `Math.round` at the documented ratios — mouth S×0.55/L×0.41,
chip S 0.20/L 0.28, text S 0.22/L 0.78. 21 match, 0 mismatch, no fudge factor.

That mattered twice over: it confirmed the scheme was intact, and it meant the derivation was ~12
lines to re-implement — so `palette.ts` could compute all 21 rather than tabulate them.

---

## How the migration ran

**The gate was changed before it started.** The first plan gated on byte-identical output. That was
dropped once the requirement was stated properly: the generated XML does not need to _look_ like the
hand-authored file, it needs to _render_ the same. Byte comparison cannot express that — it fires on
every reflowed attribute — and chasing it would have meant reproducing 128 inline elements, 61
hand-aligned wrapped attribute lines and a stray odd indent, forever.

For the record, byte-identity had been affordable:

|                                 |                                                               |
| ------------------------------- | ------------------------------------------------------------- |
| Markup, attribute order, indent | **yes** — the file is already machine-regular, 2-space indent |
| Comments                        | **yes**, via verbatim capture                                 |
| The 21 derived colours          | **yes — verified 21/21**                                      |
| Rain width/height extras        | **yes** — `w*0.3` exact; `h*0.35` needs banker's rounding     |
| Rain fall distances             | **no** — 2 of 9 sampled were hand-nudged; table them          |
| Numeric formatting              | **yes, fiddly** — `fmt()` must not normalise `1.0` to `1`     |

**The conversion itself.** Rather than a line-range manifest of un-migrated regions, the whole tree
was converted mechanically in one pass — a throwaway emitter walked the parsed XML and wrote
TypeScript builder calls, with repeated boxes and colours already swapped for named constants — and
then the interesting regions were collapsed by hand on top of a base that was already known good.
Each collapse was one commit with `--diff` clean. The emitter and its driver were deleted once the
migration landed; they could only produce a _worse_ result if re-run against the refactored source.

### Result

4381 hand-authored lines became **2189** generated ones plus TypeScript, and the semantic differ
reported zero differences against the pre-migration face.

|                       | before                 | after                               |
| --------------------- | ---------------------- | ----------------------------------- |
| weekday fan-out sites | 11 hand-written tables | 1 `byWeekday()`                     |
| precipitation ramp    | 73 verbatim copies     | 1 binding (`PRECIP`)                |
| hero body box         | 31 literal copies      | 1 constant                          |
| rain field            | 282 lines              | 126, of which 24 are the drop table |
| `blob-hero`           | 816 lines              | 552                                 |

A second pass followed, making the numbers _data_ rather than merely moving them into TypeScript.
Across the 19 section modules: `el('Condition')` scaffolds 32 → 0, pre-escaped expression literals
37 → 0, `&gt;`/`&lt;`/`&amp;` in source 96 → 0, `// GENERATED SCAFFOLD` headers 11 → 0, and numeric
literals 1806 → 596.

The audit that came free with the tree found nothing wrong but is worth keeping: **228 part names,
all unique.** It initially reported duplicates, which turned out to be `<Expression>` names colliding
with the parts they gate — a separate namespace that reads well, so the check excludes `Expression`.
Noted because a check that cries wolf is one people learn to skip.

### Three ways the safety net was itself broken

Each is the project's signature failure mode — silently wrong, with a green result — and each is why
the current checks look the way they do.

- **`--check` compared the generator's output against its own input**, so it was vacuous by
  construction: appending a newline to `watchface.xml` passed. The face is now built entirely from
  TypeScript, so the XML is a genuine output and a hand edit fails.
- **`--check` was then broken for three releases** by a line ending defined **twice**: `xml.ts` had
  `EOL` and `face.ts` hard-coded `"\r\n"` five times. Every committed blob is pure LF
  (`core.autocrlf=input`), so it passed between a generate and the next git operation and failed on
  every fresh clone, at byte 38. It took `validateWatchFaceXml` with it, and regenerating "fixed" it
  while re-arming it for the next person.
- **`--selftest` reported three false failures** because its mutations were landing in the header
  comment rather than in markup.

**The frozen `tools/gen/legacy/watchface.original.xml` is gone.** `face.model.json` is the sole
baseline — it is the flattened semantic model of the same tree, which is what the differ actually
compares against, so the raw copy answered nothing the model does not. Retiring it retired one
question permanently: "does this render the same as the _hand-authored_ file" is no longer askable,
only "does it render the same as the last accepted baseline". That trade was made deliberately, and
every `--snapshot` since is the audit trail.

---

## Not viable: XSLT, XInclude, resource preprocessing

Three independent blockers. `res/raw/` is copied verbatim by definition, and
`watchface/build.gradle.kts` (`noCompress += listOf("xml")`) guarantees byte passthrough, so no
XInclude processor ever sees the file. The consumer is the Wear OS WFF runtime with its own parser.
WFF's XSDs use closed `xs:all` particles, so any foreign element fails validation. Running XSLT as a
Gradle pre-step is just this plan in a worse language.

---

## Reproducing these numbers

Nothing here needs a build, an install, or a watch.

- **Literal census** — strip comments (`perl -0pe 's/<!--.*?-->//gs'`), extract quoted attribute
  values, count numerics: 3737 total / 313 distinct.
- **Repeated boxes** —
  `grep -oE 'x="[0-9.-]+" y="[0-9.-]+" width="[0-9.-]+" height="[0-9.-]+"' | sort | uniq -c | sort -rn`.
- **Derivation, 21/21** — read the 7 `hero_body` hexes, convert to HSL, apply the three ratio pairs,
  `Math.round` back to hex, compare against the file's 21 derived values.
- **The eleven sites** — extract every `<PartDraw|PartText name="BASE_DAY">` block's `color=`, group
  by `BASE`, keep groups having all seven day suffixes. (A naive extractor reads `wx_icon_sun` as
  Sunday; requiring all seven suffixes rejects it.)
