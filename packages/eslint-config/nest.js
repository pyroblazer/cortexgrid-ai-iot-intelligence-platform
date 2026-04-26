// ============================================================================
// @cortexgrid/eslint-config/nest – NestJS / Backend Configuration
// ============================================================================

/**
 * ESLint configuration for NestJS back-end services and Node.js packages.
 *
 * Extends the shared base config and adds Node / decorator-friendly rules
 * suited for NestJS projects.
 *
 * Usage in a NestJS project .eslintrc.js:
 *   module.exports = { extends: ['@cortexgrid/eslint-config/nest'] };
 */

/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['./index.js'],

  env: {
    node: true,
    browser: false,
  },

  rules: {
    // Node-specific rules
    'no-process-exit': 'error',
    'no-sync': 'warn',

    // NestJS heavily uses decorators and DI; relax conflicting rules
    'max-classes-per-file': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-parameter-properties': 'off',

    // Enforce consistent imports for decorators
    'import/no-default-export': 'warn',

    // Allow class-based patterns common in NestJS
    'no-useless-constructor': 'off',
    '@typescript-eslint/no-useless-constructor': 'off',
  },

  overrides: [
    {
      // Relax rules for module barrel files (index.ts) and main.ts
      files: ['**/index.ts', '**/main.ts'],
      rules: {
        'import/no-default-export': 'off',
        'no-console': 'off',
      },
    },
    {
      // Relax rules for NestJS module registration files
      files: ['**/*.module.ts'],
      rules: {
        'max-lines': 'off',
      },
    },
    {
      // Relax rules for decorator-heavy files
      files: ['**/*.controller.ts', '**/*.resolver.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    {
      // DTO / entity files may have empty interfaces
      files: ['**/*.dto.ts', '**/*.entity.ts'],
      rules: {
        '@typescript-eslint/no-empty-interface': 'off',
        'max-classes-per-file': 'off',
      },
    },
  ],
};
