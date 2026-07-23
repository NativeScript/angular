import baseConfig from '../../eslint.config.mjs';
import nx from '@nx/eslint-plugin';

export default [
  ...baseConfig,
  ...nx.configs['flat/angular'],
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'warn',
        {
          type: 'attribute',
          prefix: '',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'warn',
        {
          type: 'element',
          prefix: '',
          style: 'kebab-case',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
    languageOptions: {
      parserOptions: {
        project: ['/apps/nativescript-demo-ng/tsconfig.*?.json'],
      },
    },
  },
  ...nx.configs['flat/angular-template'],
  {
    files: ['**/*.html'],
    rules: {
      // Newly enabled by the angular-eslint v22 template preset (flat
      // config); not enforced before the ESLint v9 migration, and NativeScript
      // UI components (e.g. Label) are not DOM form elements.
      '@angular-eslint/template/label-has-associated-control': 'off',
      '@angular-eslint/template/elements-content': 'off',
    },
  },
  {
    // Use `**/`-prefixed patterns so the ignores apply regardless of the base
    // path ESLint resolves them against (the `@nx/eslint:lint` executor runs
    // ESLint from the workspace root with this file as an override config,
    // which makes project-root-relative patterns like `platforms/**/*` miss).
    ignores: ['**/node_modules/**', '**/platforms/**'],
  },
];
