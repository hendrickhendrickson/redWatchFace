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

## There is no ground truth except a wrist

`hasCode="false"` means no logs, and the validator cannot type-check `Transform/@target`,
`Variant/@target` or any expression — all three are `xs:string`, so a typo validates, ships and
silently does nothing. **A green result is the normal appearance of a broken thing here.** Whatever
you are about to trust, know what it actually proves; `docs/wff-findings.md` opens with the table.

## Project-specific conventions

These sit on top of `rules.md`, they do not replace it.

- **Module filenames are `kebab-case.ts`** (`blob-companion.ts`, `mock-state.ts`). `/hhson-naming`
  leaves the case to the project; this is the project's answer, and it is quoted in the README and
  in `docs/`, so it does not change.
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

## Where things are written down

Nothing below is loaded automatically. Read the one that covers what you are about to do.

| file                   | answers                                                          |
| ---------------------- | ---------------------------------------------------------------- |
| `README.md`            | what the face is, what it shows, how it is put together          |
| `docs/capabilities.md` | what WFF v5 offers and what of it this face uses — the inventory |
| `docs/wff-findings.md` | how WFF and this watch actually behave, measured                 |
| `docs/authoring.md`    | how to change the face: `tools/gen/`, the gate, the conventions  |
| `docs/device.md`       | toolchain, install, capture, and the traps in all three          |
| `docs/decisions/`      | why a structural choice was made, dated, one file each           |
| `CHANGELOG.md`         | what changed and when                                            |
| `TODO.md`              | what is still open — and only that                               |

**Documentation rules for this repo.** Findings go in `docs/`, history goes in `CHANGELOG.md`, open
work goes in `TODO.md`, and none of the three borrows the others' job. A doc that starts accumulating
dated entries has become a changelog and should be split.

**Name reaction states, never number them.** `gloves`, not `05-gloves`. The digits in a
`docs/states/` file name order that directory in a file explorer and mean nothing anywhere else; they
are positional and a full capture sweep recalculates all of them, so any reference goes stale
silently. Every tool takes the state name — `node tools/mock-state.ts list` prints them.

## Skills — load by need

Three project skills front the docs above, each with the triggers for when it applies:

| skill              | load before                                                         |
| ------------------ | ------------------------------------------------------------------- |
| `wff-capabilities` | reaching for a data source, an expression function or a WFF feature |
| `wff-authoring`    | editing `tools/gen/`, moving a shape, composing an expression       |
| `wff-device`       | building, installing, capturing states, judging anything that moves |

The seven `hhson-*` skills are symlinks into `submodules/hhson-lib`, created by the `postinstall`
hook. They cover TypeScript, naming, errors, validation, testing, Svelte and git, and `rules.md`
above names which one to load when.
