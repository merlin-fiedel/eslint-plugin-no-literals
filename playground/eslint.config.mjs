import tsParser from '@typescript-eslint/parser';
import noLiteralsPlugin from 'eslint-plugin-no-literals';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      'no-literals': noLiteralsPlugin,
    },
    rules: {
      'no-literals/no-literals': 'error',
    },
  },
];
