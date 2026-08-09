import { defineConfig } from 'vitest/config';

/**
 * Specs sit beside the module they test, as `<name>.spec.ts` - never `.test.ts`, never a mirrored
 * tree. See /hhson-testing.
 *
 * This does NOT subsume `build.ts --selftest` or `tools/preview/check.ts`. Those answer different
 * questions - whether the differ can still detect a rendering change, and whether the preview's
 * four load-bearing claims hold - and both deliberately run under plain node with no toolchain, so
 * that `npm run verify` keeps working on a clone that has never installed anything.
 */
export default defineConfig({
	test: {
		include: ['tools/**/*.spec.ts'],
		environment: 'node'
	}
});
