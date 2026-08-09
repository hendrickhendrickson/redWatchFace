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

import { el, text, type Node } from './xml.ts';
import type { Expr } from './expr.ts';

export type Case = {
	/** The `<Expression>` name, used again as the `<Compare>` reference. */
	name: string;
	/** The predicate. An Expr, so it came from expr.ts rather than a keyboard. */
	when: Expr;
	/** What to draw when this case wins. */
	then: Node[];
};

/**
 * A Condition with any number of ordered cases and an optional fallback.
 *
 * Emits the shape all 25 hand-written copies had: the Expressions block, then one
 * Compare per case in case order, then the Default.
 *
 * `declare` GIVES THE EXPRESSIONS THEIR OWN ORDER, because WFF separates
 * declaration from dispatch and one section uses that. chip-weather declares
 * wet, sun, moon, partly and then dispatches wet, partly, sun, moon - the
 * dispatch order is semantics (first true Compare wins, so "partly cloudy" has to
 * be tested before plain "clear"), while the declaration order is not. Collapsing
 * them to one list was this builder's first version and it silently reordered four
 * declarations, which the semantic differ correctly reports as a change because it
 * compares document order and cannot know that Expression order is arbitrary.
 *
 * Omit it unless you have that situation; case order is the sane default.
 */
export const switchOn = (cases: Case[], fallback?: Node[], declare?: string[]): Node => {
	if (cases.length === 0) {
		throw new Error('switchOn needs at least one case');
	}

	const byName = new Map<string, Case>();
	for (const caseEntry of cases) {
		// A duplicate name inside one Condition makes the second Compare unreachable,
		// silently. build.ts's audit cannot catch this: Expression names are a
		// separate namespace from part names and are excluded there on purpose.
		if (byName.has(caseEntry.name)) {
			throw new Error(`duplicate expression name "${caseEntry.name}" in one Condition`);
		}
		byName.set(caseEntry.name, caseEntry);
	}

	const declared = declare ?? cases.map((caseEntry) => caseEntry.name);
	if (declared.length !== cases.length) {
		throw new Error(`declare lists ${declared.length} names for ${cases.length} cases`);
	}
	const expressions = declared.map((name) => {
		const caseEntry = byName.get(name);
		if (caseEntry === undefined) {
			throw new Error(`declare names "${name}", which is not a case`);
		}
		return el('Expression', { name }, [text(caseEntry.when)]);
	});

	return el('Condition', {}, [
		el('Expressions', {}, expressions),
		...cases.map((caseEntry) => el('Compare', { expression: caseEntry.name }, caseEntry.then)),
		...(fallback ? [el('Default', {}, fallback)] : [])
	]);
};

/** One case, no fallback: draw this only when the predicate holds. */
export const when = (name: string, pred: Expr, then: Node[]): Node =>
	switchOn([{ name, when: pred, then }]);

/** One case with a fallback: this, or else that. */
export const whenElse = (name: string, pred: Expr, then: Node[], otherwise: Node[]): Node =>
	switchOn([{ name, when: pred, then }], otherwise);
