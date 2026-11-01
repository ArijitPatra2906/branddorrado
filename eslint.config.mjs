import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';

export default [
    { ignores: ['**/dist/**', '**/node_modules/**', 'e2e/report/**', 'e2e/results/**', 'server/drizzle/**'] },
    js.configs.recommended,
    {
        files: ['server/**/*.js', 'client/scripts/**', 'client/*.js', 'e2e/**/*.js', 'eslint.config.mjs'],
        languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
        rules: { 'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }], 'no-empty': ['error', { allowEmptyCatch: true }] },
    },
    {
        files: ['client/src/**/*.{js,jsx}', 'client/test/**/*.{js,jsx}'],
        plugins: { react, 'react-hooks': hooks },
        languageOptions: { ecmaVersion: 2023, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } }, globals: { ...globals.browser, ...globals.node, vi: 'readonly', describe: 'readonly', it: 'readonly', expect: 'readonly', afterEach: 'readonly', beforeEach: 'readonly' } },
        rules: {
            'react/jsx-uses-vars': 'error', 'react/jsx-uses-react': 'off',
            'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'warn',
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_|^React$' }],
            'no-empty': ['error', { allowEmptyCatch: true }],
        },
    },
];
