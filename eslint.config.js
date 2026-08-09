/**
 * Adapted from submodules/hhson-lib/eslint.config.js. The rule set is deliberately the same one -
 * the library IS the shared convention - with three differences, each noted where it appears:
 * the paths point at tools/ instead of src/, `curly` is added, and the submodule is ignored so
 * this repo never lints or reformats code it does not own.
 */

import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

export default defineConfig(
	// submodules/ is the library's own repo, with its own eslint version and its own config.
	// watchface/ and build/ are Gradle's; tools/preview/dist/ is a vite build.
	globalIgnores([
		'node_modules/',
		'submodules/',
		'build/',
		'.gradle/',
		'tools/preview/dist/',
		'watchface/'
	]),
	js.configs.recommended,
	...ts.configs.recommended,
	prettier,
	{
		languageOptions: {
			globals: { ...globals.node, ...globals.browser }
		},
		rules: {
			// typescript-eslint strongly recommends not using no-undef on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' }
			],
			// Generic parameters are named after what they hold, prefixed with T: TValue, TError,
			// TKey. A bare T is allowed for a single parameter. See /hhson-naming.
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: 'typeParameter',
					format: ['PascalCase'],
					custom: { regex: '^(T|T[A-Z][a-zA-Z]*)$', match: true }
				}
			],

			// NOT IN THE SHARED CONFIG, added here. rules.md requires braces around every
			// control-statement body, and nothing in hhson-lib enforces it. This repo had 111
			// brace-less bodies before the conformance pass; without the rule they come straight
			// back, one convenient one-liner at a time.
			curly: ['error', 'all']
		}
	},
	{
		// Type-aware linting. tools/ only, because the JS here - this config file - is not in any
		// TypeScript program (allowJs is off), so the project service cannot type it. Rules needing
		// type information must live in this block: a later unscoped block would re-enable them for
		// JS and crash the run.
		//
		// Two tsconfigs cover this glob. The service picks the nearest one per file: tools/gen and
		// tools/mock-state.ts land in the root tsconfig.json, everything under tools/preview in
		// tools/preview/tsconfig.json.
		files: ['tools/**/*.ts'],
		languageOptions: {
			parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname }
		},
		extends: [ts.configs.strictTypeChecked],
		rules: {
			// Only booleans in conditions. No truthiness on strings, numbers, objects or nullables
			// -- write the comparison you mean. See /hhson-typescript.
			'@typescript-eslint/strict-boolean-expressions': 'error',

			// Same three exemptions as the shared config, for the same reasons.
			'@typescript-eslint/no-confusing-void-expression': 'off',
			'@typescript-eslint/no-dynamic-delete': 'off',
			'@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }]
		}
	}
);
