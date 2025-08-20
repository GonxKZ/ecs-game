module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2020: true
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'no-unused-vars': ['warn', {
      varsIgnorePattern: '^[A-Z_]'
    }],
    'no-undef': 'off', // Deshabilitar para scripts de Node.js
  },
  overrides: [
    {
      files: ['scripts/*.js', 'test-code.js'],
      env: {
        node: true,
        browser: false
      },
      rules: {
        'no-undef': 'error'
      }
    },
    {
      files: ['*.jsx'],
      env: {
        browser: true,
        node: false
      },
      rules: {
        'no-undef': 'off'
      }
    }
  ]
}
