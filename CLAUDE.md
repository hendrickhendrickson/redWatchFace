# redPlant Blob — working notes

@./submodules/hhson-lib/rules.md

## What this repo is

A Wear OS Watch Face Format (WFF) face for the Pixel Watch 4. The face itself is
`watchface/src/main/res/raw/watchface.xml`, and it is **generated** — see below. Everything under
`tools/` is build tooling written in TypeScript and run directly by Node's type stripping; none of
it ships in the APK.

## watchface.xml is generated — never edit it

`tools/gen/` is the source of truth. Hand-editing the XML is silently undone by the next
`npm run gen`, and `npm run check` exists to catch exactly that.

## The gate

```
npm run verify      typecheck + lint + test + selftest + diff + check
```

`npm run diff` is the one that matters for any refactor. It compares the generated face's
_semantic model_ — element order, tags, attributes, text — against the committed snapshot in
`tools/gen/face.model.json`. Reflowed markup, reordered attributes and `1.0`-vs-`1` are invisible
to it; a moved shape, a changed colour or an altered expression is not.

> A pure refactor must leave `npm run diff` empty. If it reports a difference, the refactor changed
> the rendering — revert it. `--snapshot` is only for an _intended_ rendering change, and the new
> baseline lands in the same commit as the change that caused it.

## Project-specific conventions

These sit on top of `rules.md`, they do not replace it.

- **Module filenames are `kebab-case.ts`** (`blob-companion.ts`, `mock-state.ts`). `/hhson-naming`
  leaves the case to the project; this is the project's answer, and it is quoted in the README, in
  `docs/` and in the PowerShell capture scripts, so it does not change.
- **`noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are off**, matching hhson-lib's own
  tsconfig. The reasoning is written out in `tsconfig.json`. What replaces them is convention, from
  `/hhson-typescript`: bracket-index only where the surrounding code guarantees the element exists,
  and wrap an infinite-key `Record` in `Partial`.
- **`.svelte` files are not linted by ESLint** — `npm --prefix tools/preview run check`
  (svelte-check) covers them instead.
- **`hhson-lib` is the generator's one and only runtime dependency**, and it is a `file:` link to
  the submodule rather than anything from the registry — no version to drift, no code that is not
  in this working tree. Nothing else may be added without asking. `tools/preview` still owns its
  own `package.json` for the same reason it always did: `npm run verify` has to pass on a clone
  that has never run `npm install` inside `tools/preview`. It resolves `hhson-lib` by walking up to
  the root `node_modules`, so it needs no dependency entry of its own.
- **The lint/format toolchain is pinned to the exact versions hhson-lib uses**, so a finding here
  and a finding there are the same finding. Bump them together.
