import { describe, expect, it } from 'vitest';
import { and, drift, eq, gt, group, gte, lt, lte, n, or, raw, ramp, src, tilt } from './expr.ts';
import { evaluate } from './eval.ts';

describe('n', () => {
	it('prints an integer with no decimal point', () => {
		expect(n(3)).toBe('3');
	});

	it('kills float noise without touching authored precision', () => {
		expect(n(3 * 0.3)).toBe('0.9');
	});

	it('rejects a non-finite number', () => {
		expect(() => n(Infinity)).toThrow(/not a finite number/);
		expect(() => n(NaN)).toThrow(/not a finite number/);
	});
});

describe('src', () => {
	it('wraps a source name in brackets', () => {
		expect(src('HEART_RATE')).toBe('[HEART_RATE]');
	});
});

describe('comparison operators', () => {
	it('emit XML-escaped operators that the evaluator decodes back', () => {
		expect(eq(1, 1)).toBe('1 == 1');
		expect(gt(2, 1)).toBe('2 &gt; 1');
		expect(gte(2, 1)).toBe('2 &gt;= 1');
		expect(lt(1, 2)).toBe('1 &lt; 2');
		expect(lte(1, 2)).toBe('1 &lt;= 2');
		expect(evaluate(gt(src('HOUR_0_23'), 7), { HOUR_0_23: 8 })).toBe(1);
	});

	it('formats a bare number operand through n(), killing float noise', () => {
		expect(gt(3 * 0.3, 0)).toBe('0.9 &gt; 0');
	});
});

describe('and / or / group', () => {
	it('join with the escaped WFF operators', () => {
		expect(and(raw('a'), raw('b'))).toBe('a &amp;&amp; b');
		expect(or(raw('a'), raw('b'))).toBe('a || b');
		expect(group(raw('a || b'))).toBe('(a || b)');
	});
});

describe('ramp', () => {
	it('is 0 below lo, 1 above hi, linear between', () => {
		const expr = ramp(src('HEART_RATE'), 100, 200);
		expect(evaluate(expr, { HEART_RATE: 50 })).toBe(0);
		expect(evaluate(expr, { HEART_RATE: 150 })).toBe(0.5);
		expect(evaluate(expr, { HEART_RATE: 300 })).toBe(1);
	});
});

describe('drift', () => {
	it('moves negatively by amount * the phase, so it drifts up in WFF y-down space', () => {
		expect(evaluate(drift(10, raw('1')), {})).toBe(-10);
		expect(evaluate(drift(10, raw('0.5')), {})).toBe(-5);
	});
});

describe('tilt', () => {
	it('scales the accelerometer angle by gain and clamps it', () => {
		const expr = tilt('X', 2, 10);
		expect(evaluate(expr, { ACCELEROMETER_ANGLE_X: 3 })).toBe(6);
		expect(evaluate(expr, { ACCELEROMETER_ANGLE_X: 100 })).toBe(20);
	});
});
