---
name: wff-authoring
description: How this face is generated — the tools/gen module layout, the semantic differ that gates every change, what counts as a magic number here, and the two hazards the generator introduces. Load before editing anything under tools/gen/, adding or changing a reaction state, moving a shape, touching a colour or a constant, composing a WFF expression, or when npm run diff reports a difference.
---

# Authoring the face

`watchface/src/main/res/raw/watchface.xml` is a **build artifact**. `tools/gen/` is the source of
truth, and a hand edit to the XML survives until the next `npm run gen` and then vanishes.

Full detail in **`docs/authoring.md`**. Read it before a first change to `tools/gen/`, and read the
relevant section before any of: composing an expression, adding a table, writing an assertion, or
accepting a snapshot.

## The gate — this is the part that must not be got wrong

```
npm run diff       semantic model vs tools/gen/face.model.json
npm run check      committed XML vs what the generator emits, byte for byte
npm run selftest   proves the differ can still fail
npm run verify     typecheck + lint + test + selftest + diff + check
```

> **A pure refactor must leave `npm run diff` empty.** If it reports a difference, the refactor
> changed the rendering — revert it. `--snapshot` is only for an _intended_ rendering change, and the
> new baseline lands in the same commit as the change that caused it.

The differ normalises away comments, whitespace, attribute order and `1.0`-vs-`1`. A moved shape, a
changed colour or an altered expression it does not.

**`--snapshot` is a ratchet, not a review.** It accepts whatever the generator currently emits. Read
the diff before accepting it — a large intended change is exactly when skimming is tempting.

**The gate cannot ask "was it already wrong".** Both baselines are taken after the change. A merge
once made the step-goal flag exclusive with the arm holding it, and every check in the repo passed
throughout. For structural changes, verify _behaviourally_ — render the states before and after and
diff the shapes each one draws — because inserting one `<Condition>` shifts every sibling index and
the path-based differ will report a thousand differences for a four-element change.

## Composing expressions

**`or(a, b, c)` builds a flat `a || b || c` with no parentheses of its own.** ANDed with anything, it
parses as `a || b || (c && …)` because `&&` binds tighter. **Any `or()` later combined with `and()`
needs `group()` around it.** Reading the expression looks correct; this is caught by evaluating the
emitted text, not by inspection. `node tools/gen/build.ts --equiv "<a>" "<b>"` answers whether two
expressions agree over the grid.

## What counts as a magic number

Literal count is not the defect. **A literal with no name, repeated or derivable, is.** `rain.ts` has
~260 literals and is fine, because each sits in a named field of a typed row with a comment saying
why it is tabulated rather than derived.

- **Named** — one meaning, one binding.
- **Tabulated** — a list of things becomes rows in `tools/gen/data/*.ts`.
- **Derived** — a value that follows from another is computed, and the derivation is **asserted**.
- **Not** collapsed into parameterised mega-builders. A helper has to remove a repetition or a hazard
  to earn its place; a single-caller helper does not.

`--audit`'s output-side numbers are supposed to stay exactly where they are. WFF has no variables, so
the emitted duplication is unavoidable — an improving `--audit` would mean the output had changed.

## Assertions

Assert **the property that makes the shape read as what it is** — the heart's square corners staying
hidden behind its lobes, the snowflake's axes spanning all six arms exactly once — then break the
input and watch the assertion fail. **A probe that passes is not evidence about the assertion**; two
were once too weak to breach the invariant they targeted and passed anyway.

Where a shipped shape is not what a clean derivation would produce, **record it next to the constant
with the measurement**. Growing a box or nudging a coordinate is a design decision, not a tidy-up.

## The wrist is still the arbiter

The generator has nothing to say about whether a shape _reads_ at 426×426. `tools/preview` is a view
of the same node tree and is honest about text, easing and scale being indicative only. For anything
that moves, see the `wff-device` skill.
