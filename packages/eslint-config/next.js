// ============================================================================
// @cortexgrid/eslint-config/next – Next.js Configuration
// ============================================================================

/**
 * ESLint configuration for Next.js front-end projects.
 *
 * Extends the shared base config and adds Next.js-specific rules via
 * next/core-web-vitals.
 *
 * Usage in a Next.js project .eslintrc.js:
 *   module.exports = { extends: ['@cortexgrid/eslint-config/next'] };
 */

/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [
    './index.js',
    'next/core-web-vitals',
  ],

  rules: {
    // Next.js specific overrides
    '@next/next/no-html-link-for-pages': 'error',
    '@next/next/no-img-element': 'warn',
    '@next/next/no-page-custom-font': 'warn',

    // Relax some rules that conflict with Next.js patterns
    'react/display-name': 'off',
    '@typescript-eslint/no-require-imports': 'off',
  },

  settings: {
    next: {
      rootDir: ['.'],
    },
  },
};
