/**
 * @commonground/eslint-config/library
 *
 * ESLint configuration for shared library packages
 */

/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['./index.js'],
  env: {
    node: true,
    browser: true,
  },
  rules: {
    // Stricter rules for libraries
    '@typescript-eslint/explicit-function-return-type': [
      'warn',
      {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
      },
    ],
    '@typescript-eslint/no-explicit-any': 'error',
    'no-console': 'error',
  },
};
