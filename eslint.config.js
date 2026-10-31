import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Downward-only imports (conventions react/structure.md). Each folder lists what it may NOT import.
const REL = { group: ['../../*', '../../../*'], message: 'No relative imports climbing more than one level: use @/.' };

const UP = (names) => [
  ...names.map((name) => ({ group: [`@/${name}`, `@/${name}/**`], message: `Not allowed here: @/${name} is an upward or sideways import.` })),
  REL,
];

const UI_FORBIDDEN_PACKAGES = ['zustand', 'react-router', 'react-router-dom', 'react-hook-form', 'zod'].map((name) => ({
  name,
  message: 'components/ui is pure: props in, callbacks out (react/components.md).',
}));

export default tseslint.config(
  { ignores: ['dist', 'storybook-static', 'test-results', 'playwright-report', 'node_modules', 'public'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-imports': ['error', { patterns: [REL] }],
    },
  },
  // import.meta.env is read only in src/config/env.ts.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/config/env.ts', 'src/vite-env.d.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.type='MetaProperty'][property.name='env']",
          message: 'Read env from @/config/env, not import.meta.env.',
        },
      ],
    },
  },
  // components/ui -> other components/ui, lib, assets, styles only.
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: UP(['store', 'hooks', 'api', 'mocks', 'config', 'features']),
          paths: UI_FORBIDDEN_PACKAGES,
        },
      ],
    },
  },
  // store -> api types, lib.
  {
    files: ['src/store/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: UP(['features', 'hooks', 'components', 'mocks']) }],
    },
  },
  // hooks -> api, store, lib.
  {
    files: ['src/hooks/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: UP(['features', 'components', 'mocks']) }],
    },
  },
  // api -> lib, config.
  {
    files: ['src/api/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: UP(['features', 'hooks', 'store', 'components', 'mocks']) }],
    },
  },
  // lib is framework-free and imports nothing from the app layers.
  {
    files: ['src/lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: UP(['features', 'hooks', 'store', 'api', 'components', 'mocks', 'config']) }],
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}', 'scripts/**/*.ts', 'vite.config.ts', 'playwright.config.ts', '.storybook/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
);
