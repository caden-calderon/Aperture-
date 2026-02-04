import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser
			}
		}
	},
	{
		ignores: [
			'build/',
			'.svelte-kit/',
			'dist/',
			'node_modules/',
			'src-tauri/target/',
			'**/*.timestamp-*'
		]
	},
	{
		rules: {
			// Allow unused vars prefixed with _
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
			// Allow any for now during rapid prototyping
			'@typescript-eslint/no-explicit-any': 'warn',
			// Svelte 5 runes need this
			'svelte/valid-compile': ['error', { ignoreWarnings: true }]
		}
	}
];
