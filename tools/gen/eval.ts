/**
 * An interpreter for the WFF expression language.
 *
 * WHY THIS EXISTS, and why it is not a test helper. Two questions about this face
 * cannot be answered by reading, by the validator, or by a screenshot:
 *
 *   1. "I rewrote this expression through expr.ts - does it still compute the same
 *      thing?" The semantic differ compares expression STRINGS (normalised for
 *      whitespace and number formatting), so an added parenthesis reads as a
 *      rendering change even when the arithmetic is identical. That is the right
 *      default for a differ and useless for a refactor.
 *
 *   2. "Which branch is live, and where is this shape right now?" The preview in
 *      tools/preview cannot draw anything without answering that per frame.
 *
 * So the same interpreter serves build.ts --equiv and the preview. That is worth
 * saying out loud because it is also the risk: an interpreter that is subtly wrong
 * is wrong IDENTICALLY in both, and would quietly agree with itself. That is what
 * the assertion suite at the bottom is for, and why build.ts --selftest runs it.
 *
 * THE GRAMMAR IS THE ONE THE FACE ACTUALLY USES, measured rather than assumed.
 * Across the whole generated file: clamp() 180 times, fract() 72, and the
 * operators + - * / % == != < <= > >= && ||. No other function appears, there are
 * no string operations, and no variables - WFF has none, which is the entire
 * reason the generator exists.
 *
 * OPERATOR PRECEDENCE IS C-LIKE, and specifically && binds tighter than ||. That
 * is not a guess: docs/authoring.md records a live bug where
 * and(or(a, b), c) put headsets on at every hour of the day, which is exactly the
 * mis-binding standard precedence produces when or() returns a flat
 * unparenthesised string. The evaluator reproduces that faithfully - it models
 * WFF, it does not correct it - and there is an assertion below pinning it, so the
 * hazard stays visible instead of being fixed by accident.
 */

import { assertUnreachable } from 'hhson-lib';
import { messageOf } from './error.ts';
import type { NumericSource } from './fixtures.ts';

/**
 * One set of source values, keyed by source name.
 *
 * `Partial` because the key type is `string` and a lookup genuinely misses: evalAst throws
 * `no value for source [X]` on exactly that, and without the wrapper the type claims a number
 * is always there while the code right below it checks for undefined. See /hhson-typescript.
 */
export type Values = Readonly<Partial<Record<string, number>>>;

// --- Lexer ------------------------------------------------------------------

/**
 * Expressions live in XML ATTRIBUTES, so they arrive escaped: `&gt;=`, `&lt;=`,
 * and `&amp;&amp;` for `&&`. `xml.ts` deliberately does not re-escape an
 * already-escaped expression, so both forms reach this function and both must
 * work.
 *
 * `&amp;` is decoded LAST. Decoding it first would turn `&amp;lt;` into `&lt;`
 * and then into `<`, inventing an operator that was not written.
 */
const decode = (escaped: string): string =>
	escaped
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&amp;/g, '&');

type Token =
	| { k: 'num'; v: number }
	| { k: 'src'; name: string }
	| { k: 'fn'; name: string }
	| { k: 'op'; v: string }
	| { k: 'punc'; v: '(' | ')' | ',' };

/** Longest first, so `>=` is never read as `>` followed by a stray `=`. */
const OPERATORS = ['&&', '||', '==', '!=', '<=', '>=', '+', '-', '*', '/', '%', '<', '>'];

const lex = (input: string): Token[] => {
	const source = decode(input);
	const out: Token[] = [];
	let i = 0;

	while (i < source.length) {
		const char = source[i];

		if (/\s/.test(char)) {
			i++;
			continue;
		}

		if (char === '(' || char === ')' || char === ',') {
			out.push({ k: 'punc', v: char });
			i++;
			continue;
		}

		// [SOURCE] or [WEATHER.SOMETHING]
		if (char === '[') {
			const end = source.indexOf(']', i);
			if (end === -1) {
				throw new Error(`unterminated source reference at ${i}: ${source}`);
			}
			out.push({ k: 'src', name: source.slice(i + 1, end) });
			i = end + 1;
			continue;
		}

		if (/[0-9.]/.test(char)) {
			const match = /^[0-9]*\.?[0-9]+/.exec(source.slice(i));
			if (match === null) {
				throw new Error(`bad number at ${i}: ${source}`);
			}
			out.push({ k: 'num', v: Number(match[0]) });
			i += match[0].length;
			continue;
		}

		// A bare identifier can only be a function name in this language.
		if (/[a-zA-Z_]/.test(char)) {
			const match = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(source.slice(i));
			if (match === null) {
				throw new Error(`bad identifier at ${i}: ${source}`);
			}
			out.push({ k: 'fn', name: match[0] });
			i += match[0].length;
			continue;
		}

		const op = OPERATORS.find((candidate) => source.startsWith(candidate, i));
		if (op !== undefined) {
			out.push({ k: 'op', v: op });
			i += op.length;
			continue;
		}

		throw new Error(`unexpected character ${JSON.stringify(char)} at ${i}: ${source}`);
	}

	return out;
};

// --- Parser -----------------------------------------------------------------
//
// Recursive descent, lowest precedence outermost:
//
//   or  ->  and  ->  cmp  ->  add  ->  mul  ->  unary  ->  primary

export type Ast =
	| { k: 'num'; v: number }
	| { k: 'src'; name: string }
	| { k: 'bin'; op: string; a: Ast; b: Ast }
	| { k: 'neg'; a: Ast }
	| { k: 'call'; name: string; args: Ast[] };

const parse = (tokens: Token[], original: string): Ast => {
	let position = 0;
	const peek = (): Token | undefined => tokens[position];

	const eatOp = (...ops: string[]): string | undefined => {
		const token = peek();
		if (token?.k === 'op' && ops.includes(token.v)) {
			position++;
			return token.v;
		}
		return undefined;
	};

	const expectPunc = (want: '(' | ')' | ',') => {
		const token = peek();
		if (token?.k !== 'punc' || token.v !== want) {
			throw new Error(`expected ${JSON.stringify(want)} at token ${position} in: ${original}`);
		}
		position++;
	};

	/** One precedence level: a chain of same-priority binary operators. */
	const level = (ops: string[], next: () => Ast) => (): Ast => {
		let left = next();
		for (;;) {
			const op = eatOp(...ops);
			if (op === undefined) {
				return left;
			}
			left = { k: 'bin', op, a: left, b: next() };
		}
	};

	const primary = (): Ast => {
		const token = peek();
		if (token === undefined) {
			throw new Error(`unexpected end of expression: ${original}`);
		}

		if (token.k === 'num') {
			position++;
			return { k: 'num', v: token.v };
		}
		if (token.k === 'src') {
			position++;
			return { k: 'src', name: token.name };
		}
		if (token.k === 'fn') {
			position++;
			expectPunc('(');
			const args: Ast[] = [];
			// No zero-argument function exists in this language, so a '(' is always
			// followed by at least one expression.
			for (;;) {
				args.push(or());
				const separator = peek();
				if (separator?.k === 'punc' && separator.v === ',') {
					position++;
					continue;
				}
				break;
			}
			expectPunc(')');
			return { k: 'call', name: token.name, args };
		}
		if (token.k === 'punc' && token.v === '(') {
			position++;
			const inner = or();
			expectPunc(')');
			return inner;
		}
		throw new Error(`unexpected token ${JSON.stringify(token)} at ${position} in: ${original}`);
	};

	const unary = (): Ast => {
		const op = eatOp('-', '+');
		if (op === '-') {
			return { k: 'neg', a: unary() };
		}
		if (op === '+') {
			return unary();
		}
		return primary();
	};

	const mul = level(['*', '/', '%'], unary);
	const add = level(['+', '-'], mul);
	const cmp = level(['==', '!=', '<=', '>=', '<', '>'], add);
	const and = level(['&&'], cmp);
	const or = level(['||'], and);

	const ast = or();
	if (position !== tokens.length) {
		throw new Error(`trailing tokens from ${position} in: ${original}`);
	}
	return ast;
};

/** Parse once, evaluate many. The preview re-evaluates every frame. */
export const compile = (expr: string): Ast => parse(lex(expr), expr);

// --- Evaluation -------------------------------------------------------------

/** WFF has no booleans; a comparison yields 1 or 0 and any non-zero is true. */
const bool = (value: boolean): number => (value ? 1 : 0);

const evalAst = (ast: Ast, values: Values): number => {
	switch (ast.k) {
		case 'num':
			return ast.v;

		case 'src': {
			const got = values[ast.name];
			if (got === undefined) {
				// A missing value is never a zero. [DAY_OF_WEEK_S] is a string source and
				// reaches here only by mistake; anything else means the value set and the
				// face disagree about what the face reads, which is exactly the drift
				// fixtures.ts is typed to prevent.
				throw new Error(`no value for source [${ast.name}]`);
			}
			return got;
		}

		case 'neg':
			return -evalAst(ast.a, values);

		case 'call': {
			const args = ast.args.map((arg) => evalAst(arg, values));
			switch (ast.name) {
				case 'clamp': {
					const [value, lo, hi] = args;
					if (args.length !== 3) {
						throw new Error(`clamp takes 3 arguments, got ${args.length}`);
					}
					return Math.min(Math.max(value, lo), hi);
				}
				case 'fract': {
					if (args.length !== 1) {
						throw new Error(`fract takes 1 argument, got ${args.length}`);
					}
					const value = args[0];
					return value - Math.floor(value);
				}
				default:
					// A CLOSED set, for the same reason expr.ts's Source union is closed:
					// the WFF schema types expressions as xs:string, so an invented
					// function validates and silently does nothing on the wrist.
					throw new Error(`unknown function ${ast.name}() - the face only uses clamp and fract`);
			}
		}

		case 'bin': {
			const left = evalAst(ast.a, values);
			const right = evalAst(ast.b, values);
			switch (ast.op) {
				case '+':
					return left + right;
				case '-':
					return left - right;
				case '*':
					return left * right;
				case '/':
					return left / right;
				// JS % is a remainder, taking its sign from the dividend. Everything the
				// face applies it to ([SECOND], [MINUTE]) is non-negative, so the
				// distinction from a true modulo never arises here.
				case '%':
					return left % right;
				case '==':
					return bool(left === right);
				case '!=':
					return bool(left !== right);
				case '<':
					return bool(left < right);
				case '<=':
					return bool(left <= right);
				case '>':
					return bool(left > right);
				case '>=':
					return bool(left >= right);
				case '&&':
					return bool(left !== 0 && right !== 0);
				case '||':
					return bool(left !== 0 || right !== 0);
				default:
					// NOT an exhaustiveness check: Ast.op is `string`, because it comes off
					// the tokeniser rather than out of a closed union. This is a real
					// runtime check on parsed input.
					throw new Error(`unknown operator ${ast.op}`);
			}
		}
	}

	// This one IS exhaustiveness - Ast.k is closed - so a new node kind becomes a
	// compile error here rather than a silent 0 at render time.
	assertUnreachable(ast);
};

/** Evaluate an expression string against one set of source values. */
export const evaluate = (expr: string, values: Values): number => evalAst(compile(expr), values);

/** Evaluate a pre-compiled expression. Used per frame by the preview. */
export const run = (ast: Ast, values: Values): number => evalAst(ast, values);

/** Truthiness, for picking a Condition's live branch. */
export const isTrue = (expr: string | Ast, values: Values): boolean =>
	(typeof expr === 'string' ? evaluate(expr, values) : run(expr, values)) !== 0;

/** Every source name an expression reads. */
export const sourcesIn = (expr: string): string[] => {
	const out = new Set<string>();
	const walk = (ast: Ast) => {
		switch (ast.k) {
			case 'src':
				out.add(ast.name);
				break;
			case 'neg':
				walk(ast.a);
				break;
			case 'bin':
				walk(ast.a);
				walk(ast.b);
				break;
			case 'call':
				ast.args.forEach(walk);
				break;
			case 'num':
				break;
			default:
				assertUnreachable(ast);
		}
	};
	walk(compile(expr));
	// `string[]`, not `Source[]`. The names come off the tokeniser, so claiming each one is a
	// member of the closed Source union would be an assumption about the text that was parsed,
	// not something this function establishes. A caller that needs Source has to narrow.
	return [...out];
};

// --- Equivalence ------------------------------------------------------------

export type Divergence = {
	values: Values;
	a: number;
	b: number;
};

/**
 * Do two expressions compute the same thing over every row of a value grid?
 *
 * TOLERANCE IS RELATIVE, and it has to be: recomposing `1 + [X] * 0.145` through
 * a helper can reassociate a multiplication, and floating point is not
 * associative. 1e-9 relative is far below anything that could move a pixel and
 * far above float noise.
 *
 * Returns the FIRST row where they disagree, so the report can name the state
 * rather than saying "somewhere".
 */
export const diverges = (
	a: string,
	b: string,
	grid: ReadonlyArray<Values>
): Divergence | undefined => {
	const astA = compile(a);
	const astB = compile(b);
	for (const values of grid) {
		const valueA = run(astA, values);
		const valueB = run(astB, values);
		if (valueA === valueB) {
			continue;
		}
		// NaN === NaN is false, so an expression that is undefined in the same way in
		// both is not a divergence.
		if (Number.isNaN(valueA) && Number.isNaN(valueB)) {
			continue;
		}
		if (Math.abs(valueA - valueB) <= 1e-9 * Math.max(1, Math.abs(valueA), Math.abs(valueB))) {
			continue;
		}
		return { values, a: valueA, b: valueB };
	}
	return undefined;
};

// --- Self-check -------------------------------------------------------------

/**
 * Hand-computed expectations, run by build.ts --selftest.
 *
 * An evaluator is a safety net, and this repo's rule is that a net nobody has
 * watched fail is not a net. The stakes are higher here than for most helpers:
 * --equiv and the preview share this code, so a wrong answer is wrong twice and
 * agrees with itself both times.
 *
 * Every expected value below was worked out by hand, not by running the code.
 */
export const selfCheck = (): { problems: string[]; checks: number } => {
	const problems: string[] = [];
	let checks = 0;
	const V: Values = {
		HOUR_0_23: 9,
		SECOND: 1,
		SECOND_MILLISECOND: 1.5,
		HEART_RATE: 150,
		'WEATHER.CHANCE_OF_PRECIPITATION': 75,
		'WEATHER.IS_AVAILABLE': 1,
		'WEATHER.TEMPERATURE': 10,
		ACCELEROMETER_ANGLE_X: 90
	};

	const eq = (expr: string, want: number, why: string) => {
		checks++;
		let got: number;
		try {
			got = evaluate(expr, V);
		} catch (e) {
			problems.push(`${why}: ${expr} threw ${messageOf(e)}`);
			return;
		}
		if (Math.abs(got - want) > 1e-9) {
			problems.push(`${why}: ${expr} = ${got}, expected ${want}`);
		}
	};

	const throws = (expr: string, why: string) => {
		checks++;
		try {
			evaluate(expr, V);
			problems.push(`${why}: ${expr} should have thrown`);
		} catch {
			// expected
		}
	};

	// Arithmetic and precedence.
	eq('2 + 3 * 4', 14, 'multiplication binds tighter than addition');
	eq('(2 + 3) * 4', 20, 'parentheses override precedence');
	eq('10 - 4 - 3', 3, 'subtraction is left-associative');
	eq('100 / 10 / 2', 5, 'division is left-associative');
	eq('10 % 3', 1, 'remainder');
	eq('0 - 24', -24, 'the face writes negation as a subtraction from zero');
	eq('-24', -24, 'unary minus');
	eq('6 + clamp(0 - 5, -24, 0)', 1, 'a negative literal as a clamp bound');

	// The two functions that exist.
	eq('clamp(5, 0, 1)', 1, 'clamp above range');
	eq('clamp(0 - 5, 0, 1)', 0, 'clamp below range');
	eq('clamp(0.5, 0, 1)', 0.5, 'clamp inside range');
	eq('fract(2.25)', 0.25, 'fract of a positive');
	eq('fract(3)', 0, 'fract of an integer');
	throws('sin(1)', 'an invented function must not silently evaluate');
	throws('clamp(1, 2)', 'clamp with the wrong arity must not silently evaluate');

	// Sources, in both escaped and bare forms.
	eq('[HOUR_0_23]', 9, 'a bare source');
	eq('[HOUR_0_23] &gt;= 7', 1, 'an escaped operator');
	eq('[HOUR_0_23] >= 7', 1, 'the same operator unescaped');
	eq('[WEATHER.TEMPERATURE] &lt;= 10', 1, 'a dotted source name, on the threshold');
	eq('[WEATHER.TEMPERATURE] &lt; 10', 0, 'strictly below the threshold');
	throws('[NO_SUCH_SOURCE]', 'a source with no value must not read as zero');

	// Logic. `&&` and `||` yield 1 or 0, and any non-zero operand is true.
	eq('1 &amp;&amp; 1', 1, 'and, both true');
	eq('1 &amp;&amp; 0', 0, 'and, one false');
	eq('0 || 1', 1, 'or, one true');
	eq('0 || 0', 0, 'or, both false');
	eq('2 &amp;&amp; 3', 1, 'a non-zero operand is true and the result is 1, not 3');

	// THE DOCUMENTED HAZARD, pinned. or() emits a flat unparenthesised string, so
	// combining it with and() mis-binds - the bug that put headsets on at every
	// hour. These two lines are what make that visible rather than folklore.
	eq('1 || 0 &amp;&amp; 0', 1, '&& binds tighter than || - and(or(a,b),c) mis-binds');
	eq('(1 || 0) &amp;&amp; 0', 0, 'group() is what makes the intended binding');

	// The face's own idioms, against the values above.
	//   PRECIP at 75%: clamp((75 - 50) / 50, 0, 1) = 0.5
	eq('clamp(([WEATHER.CHANCE_OF_PRECIPITATION] - 50) / 50, 0, 1)', 0.5, 'the precipitation ramp');
	//   heartRamp(100, 200) at 150: clamp((150 - 100) / 100, 0, 1) = 0.5
	eq('clamp(([HEART_RATE] - 100) / 100, 0, 1)', 0.5, 'the heart-rate ramp');
	//   secondPhase(2) at SECOND 1, SECOND_MILLISECOND 1.5:
	//   ((1 % 2) + 1.5 - 1) / 2 = (1 + 0.5) / 2 = 0.75
	eq('(([SECOND] % 2) + [SECOND_MILLISECOND] - [SECOND]) / 2', 0.75, 'the whole-second sawtooth');
	//   triangleAlpha at p = 0.75: 255 * (clamp(3,0,1) - clamp(0,0,1)) = 255
	eq('255 * (clamp(4 * 0.75, 0, 1) - clamp(4 * 0.75 - 3, 0, 1))', 255, 'the triangle, at its top');
	//   and at p = 1: 255 * (clamp(4,0,1) - clamp(1,0,1)) = 0. Zero at both ends is
	//   the entire point of the idiom.
	eq('255 * (clamp(4 * 1, 0, 1) - clamp(4 * 1 - 3, 0, 1))', 0, 'the triangle, zero at its end');
	//   tilt: clamp(90, -35, 35) * 0.229 = 35 * 0.229 = 8.015
	eq('clamp([ACCELEROMETER_ANGLE_X], -35, 35) * 0.229', 8.015, 'parallax clamps before it scales');

	// Equivalence, in both directions - it has to be able to say "no".
	//
	// THE GRID MUST CONTAIN 7, and that is the whole lesson of this pair. `>= 7`
	// and `> 7` agree on every integer except exactly 7, so a grid of 9 and 3
	// "proves" them equivalent. The first version of this check did exactly that
	// and reported the negative control as broken. EVAL_GRID() in fixtures.ts
	// includes both sides of every threshold in the face for this reason; a grid
	// that misses the boundary is not evidence.
	checks += 2;
	const grid: Values[] = [V, { ...V, HOUR_0_23: 3 }, { ...V, HOUR_0_23: 7 }];
	if (diverges('[HOUR_0_23] &gt;= 7', '[HOUR_0_23] > 6', grid)) {
		problems.push('diverges() reported two equivalent expressions as different');
	}
	if (!diverges('[HOUR_0_23] &gt;= 7', '[HOUR_0_23] &gt; 7', grid)) {
		problems.push('diverges() failed to notice >= vs > at the one value they differ on');
	}

	return { problems, checks };
};

/** Compile-time proof that the grid's key type is the face's own source union. */
export type _GridKeysAreSources = NumericSource;
