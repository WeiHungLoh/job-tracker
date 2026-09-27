import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { moduleDependencies } from './moduleBoundaries.mjs';

const moduleImportRules = Object.entries(moduleDependencies).map(([owner, dependencies]) => ({
    files: [`src/modules/${owner}/**/*.ts`],
    rules: {
        'no-restricted-imports': [
            'error',
            {
                patterns: Object.keys(moduleDependencies)
                    .filter((target) => target !== owner)
                    .map((target) => ({
                        regex: `(?:^|/)${target}/${dependencies.includes(target) ? '(?!api\\.js$)' : ''}`,
                        message: dependencies.includes(target)
                            ? `Import ${target} through its api.ts public interface.`
                            : `${owner} must not depend on ${target}.`,
                    })),
            },
        ],
    },
}));

export default defineConfig([
    globalIgnores(['dist/**']),
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.ts'],
        languageOptions: {
            globals: globals.node,
        },
        rules: {
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-trailing-spaces': 'error',
            'space-before-function-paren': ['error', 'always'],
            'eol-last': ['error', 'always'],
            'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 1 }],
        },
    },
    ...moduleImportRules,
    {
        files: ['src/shared/**/*.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['**/modules/**'],
                            message: 'Shared infrastructure must not depend on business modules.',
                        },
                    ],
                },
            ],
        },
    },
]);
