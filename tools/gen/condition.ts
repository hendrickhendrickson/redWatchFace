/**
 * The Condition scaffold, written once.
 *
 * `<Condition>` is how this face expresses every choice it makes, and its shape is
 * fixed and verbose: a `<Expressions>` block declaring named booleans, then one
 * `<Compare>` per branch referring to a name, then an optional `<Default>`. Four
 * element types and a name repeated between two of them, for what is a switch.
 *
 * It was typed out by hand TWENTY-FIVE times across tools/gen/face/ - the single
 * most repeated structure in the codebase, and the one thing with no helper, while
 * the seven-way weekday fan-out (which is the same shape) had had byWeekday()
 * since the migration. Each hand-written copy also inlined its predicate as a
 * pre-escaped string, which is how the night window came to exist in nine places;
 * see states.ts.
 *
 * THE NAME IS THE HAZARD THIS REMOVES. `expression="hero_cold"` on the Compare has
 * to match `name="hero_cold"` on the Expression, and nothing checks it: a
 * mismatched name is legal XML, passes the WFF validator (expressions are typed
 * xs:string), and renders as the branch silently never firing. Here the name is
 * written once per case and used twice from that one value.
 *
 * ORDER IS SEMANTICS, not style. WFF takes the FIRST Compare that evaluates true,
 * so listing a case earlier is how the face expresses priority - the Wednesday
 * coffee cup beats the cocktail for the same fist purely by being listed first,
 * with no negation anywhere (see hero-props.ts). switchOn() preserves the order it
 * is given and does nothing clever with it.
 */

import { el, text, type Node } from './xml.ts'
import type { Expr } from './expr.ts'

export interface Case {
  /** The `<Expression>` name, used again as the `<Compare>` reference. */
  name: string
  /** The predicate. An Expr, so it came from expr.ts rather than a keyboard. */
  when: Expr
  /** What to draw when this case wins. */
  then: Node[]
}

/**
 * A Condition with any number of ordered cases and an optional fallback.
 *
 * Emits exactly the shape all 25 hand-written copies had: every Expression first,
 * in case order, then every Compare in the same order, then the Default. That
 * ordering is why adopting this builder changed no bytes.
 */
export const switchOn = (cases: Case[], fallback?: Node[]): Node => {
  if (cases.length === 0) throw new Error('switchOn needs at least one case')

  const names = new Set<string>()
  for (const c of cases) {
    // A duplicate name inside one Condition makes the second Compare unreachable,
    // silently. build.ts's audit cannot catch this: Expression names are a
    // separate namespace from part names and are excluded there on purpose.
    if (names.has(c.name)) {
      throw new Error(`duplicate expression name "${c.name}" in one Condition`)
    }
    names.add(c.name)
  }

  return el('Condition', {}, [
    el('Expressions', {}, cases.map((c) => el('Expression', { name: c.name }, [text(c.when)]))),
    ...cases.map((c) => el('Compare', { expression: c.name }, c.then)),
    ...(fallback ? [el('Default', {}, fallback)] : []),
  ])
}

/** One case, no fallback: draw this only when the predicate holds. */
export const when = (name: string, pred: Expr, then: Node[]): Node =>
  switchOn([{ name, when: pred, then }])

/** One case with a fallback: this, or else that. */
export const whenElse = (name: string, pred: Expr, then: Node[], otherwise: Node[]): Node =>
  switchOn([{ name, when: pred, then }], otherwise)
