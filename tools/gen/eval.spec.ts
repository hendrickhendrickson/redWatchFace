import { describe, expect, it } from 'vitest';
import { compile, evaluate, isTrue, sourcesIn } from './eval.ts';

describe('evaluate', () => {
	it('does arithmetic', () => {
		expect(evaluate('1 + 2 * 3', {})).toBe(7);
		expect(evaluate('(1 + 2) * 3', {})).toBe(9);
		expect(evaluate('10 / 4', {})).toBe(2.5);
		expect(evaluate('10 % 3', {})).toBe(1);
	});

	it('reads a source by name', () => {
		expect(evaluate('[HOUR_0_23]', { HOUR_0_23: 14 })).toBe(14);
	});

	it('throws on a missing source, never silently reads zero', () => {
		expect(() => evaluate('[NO_SUCH_SOURCE]', {})).toThrow(/no value for source/);
	});

	it('evaluates comparisons to 1 or 0, WFF-style', () => {
		expect(evaluate('3 > 2', {})).toBe(1);
		expect(evaluate('2 > 3', {})).toBe(0);
		expect(evaluate('3 == 3', {})).toBe(1);
		expect(evaluate('3 != 3', {})).toBe(0);
	});

	it('binds && tighter than ||, matching the documented mis-binding hazard', () => {
		// a=0, b=1, c=0: `a || b && c` parses as `a || (b && c)` = 0 || 0 = 0.
		// If && did not bind tighter it would be `(a || b) && c` = 1 && 0 = 0 too,
		// so this case alone would not distinguish them - the grid in
		// build.ts --selftest covers the case that does. This is the direct check
		// that the parser itself groups && before ||.
		expect(evaluate('0 || 1 && 0', {})).toBe(0);
		expect(evaluate('1 || 0 && 0', {})).toBe(1);
	});

	it('clamp() and fract()', () => {
		expect(evaluate('clamp(5, 0, 10)', {})).toBe(5);
		expect(evaluate('clamp(-5, 0, 10)', {})).toBe(0);
		expect(evaluate('clamp(15, 0, 10)', {})).toBe(10);
		expect(evaluate('fract(2.75)', {})).toBeCloseTo(0.75);
	});

	it('rejects a function outside the closed set', () => {
		expect(() => evaluate('sin(1)', {})).toThrow(/unknown function/);
	});

	it('decodes XML-escaped operators', () => {
		expect(evaluate('3 &gt; 2 &amp;&amp; 1 &lt;= 1', {})).toBe(1);
	});
});

describe('isTrue', () => {
	it('treats non-zero as true, matching WFF Compare semantics', () => {
		expect(isTrue('1', {})).toBe(true);
		expect(isTrue('0', {})).toBe(false);
		expect(isTrue(compile('2 - 2'), {})).toBe(false);
	});
});

describe('sourcesIn', () => {
	it('collects every source name an expression reads, once each', () => {
		expect(sourcesIn('[HOUR_0_23] + [HOUR_0_23] * [MINUTE]').sort()).toEqual([
			'HOUR_0_23',
			'MINUTE'
		]);
	});

	it('returns an empty list for a source-free expression', () => {
		expect(sourcesIn('1 + clamp(2, 0, 3)')).toEqual([]);
	});
});
