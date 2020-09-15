module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'simple-import-sort'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier/@typescript-eslint'],
  env: {
    node: true,
  },
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    'no-constant-condition': 'off',
    'simple-import-sort/sort': [
      'error',
      {
        // The default grouping, but with no blank lines.
        groups: [['^\\u0000', '^@?\\w', '^[^.]', '^\\.']],
      },
    ],
  },
  ignorePatterns: ['node_modules', 'dest*', 'dist', '*.js', '.eslintrc'],
};
