/* eslint-env node */

module.exports = {
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'react/prop-types': 'off',
    // A .map() callback with a block body and no `return` renders nothing.
    // That silently emptied the customer's reservations list and hid the
    // password fields on the profile page for months, so make it an error.
    'array-callback-return': ['error', { checkForEach: false }],
    'no-unused-expressions': [
      'error',
      { allowShortCircuit: true, allowTernary: true, enforceForJSX: true },
    ],
  },
}
