// ============================================================================
// @cortexgrid/eslint-config – Base Configuration
// ============================================================================

/**
 * Shared ESLint configuration used across all CortexGrid packages.
 *
 * Extends:
 *   - eslint:recommended
 *   - plugin:@typescript-eslint/recommended
 *   - plugin:react/recommended
 *   - plugin:react-hooks/recommended
 *   - prettier (disables formatting rules that conflict with Prettier)
 *
 * Usage in a project .eslintrc.js:
 *   module.exports = { extends: ['@cortexgrid/eslint-config'] };
 */

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,

  parser: '@typescript-eslint/parser',

  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },

  env: {
    es2022: true,
    node: true,
    browser: true,
  },

  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],

  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'import'],

  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },

  rules: {
    // -- TypeScript --
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/consistent-type-imports': [
      'warn',
      { prefer: 'type-imports' },
    ],

    // -- General --
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'no-param-reassign': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    eqeqeq: ['error', 'always'],
    curly: ['error', 'multi-line'],
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': 'error',

    // -- React --
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react/display-name': 'off',

    // -- Import --
    'import/order': [
      'warn',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
          'type',
        ],
        'newlines-between': 'never',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    'import/no-duplicates': 'warn',
    'import/no-cycle': 'off',
  },

  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off',
      },
    },
  ],
};
