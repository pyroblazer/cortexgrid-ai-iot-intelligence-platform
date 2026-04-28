module.exports = {
  extends: ['@cortexgrid/eslint-config/nest'],
  overrides: [
    {
      files: ['prisma/**/*'],
      rules: {
        'no-console': 'off',
        'no-process-exit': 'off',
      },
    },
  ],
};
