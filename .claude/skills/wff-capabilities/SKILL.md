---
name: wff-capabilities
description: What Watch Face Format v5 can and cannot do — the 116 data sources, the expression grammar, the five drawing primitives, the hard limits, and the runtime behaviour none of it documents. Load before reaching for a data source or an expression function, before designing any feature that depends on weather, health, motion, ambient or the moon, when asked whether WFF supports something, or when an expression validates and then does nothing on the wrist.
---

# WFF capabilities and behaviour

Two documents hold the detail. Read the relevant one before designing anything on top of the format;
neither is short, and both are organised so you can read one section.

- **`docs/capabilities.md`** — the inventory. All 116 data sources grouped by namespace, each with a
  status (in use / proven / available / ⚠ / absent), the rendering features by whether this face
  touches them, the exact expression grammar, and the hard limits. Part 3 is the ranked list of
  unused features worth acting on.
- **`docs/wff-findings.md`** — the behaviour. What measurement added to the inventory: how `<Gyro>`
  and `<Animation>` really work, `fract()`, `<Variant>` timing, the `WEATHER.CONDITION` codes, the
  drawing constraints, the memory budget.

## The five things to know before reading either

1. **A validator PASS proves almost nothing.** `Transform/@target`, `Variant/@target` and the whole
   expression type are plain `xs:string`, so a misspelled source or an unimplemented function passes
   validation and **fails silently at runtime**. That is exactly how `[ANIMATION_VALUE]` — a source
   that has never existed — shipped and did nothing. `Compare/@expression` is the one exception; it
   is keyref-checked.

2. **"Available" is weaker than it sounds.** Anything moved from _available_ to _in use_ has to be
   seen on the wrist. Only `clamp` and `fract` of the 34 functions have ever been exercised here.

3. **Weather lies when it is absent.** `WEATHER.TEMPERATURE` reads **0** and `WEATHER.IS_DAY` reads
   **1** while unavailable — a confident, wrong "0° and daytime". **Gate every weather branch on
   `WEATHER.IS_AVAILABLE`**, which also goes false on its own during normal use.

4. **There are no variables, no `min`/`max`, no `<Path>`, and no `[IS_AMBIENT]`.** Ambient is
   reachable only through `<Variant mode="AMBIENT">`; arbitrary shapes must be pre-rendered to PNG;
   `clamp` does the work `min`/`max` would.

5. **Do not guess at a source or a code.** If it is not in `docs/capabilities.md`, check the XSD tree
   (extraction command is at the top of that file) rather than assuming. Wind, precipitation type,
   humidity, sunrise/sunset, location and calendar are confirmed absent — they have been asked for
   twice.

## When you learn something new

A measured fact about how the format behaves goes in `docs/wff-findings.md`. A change in what this
face _uses_ goes in the status column in `docs/capabilities.md`. Both are re-derivable documents —
`capabilities.md` carries the command that regenerates its source list — so keep them that way.
