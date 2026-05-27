import { noLiterals } from './rules/index.js';

const plugin = {
  meta: {
    name: 'eslint-plugin-no-literals',
    version: '0.1.0',
  },
  rules: {
    'no-literals': noLiterals,
  },
  configs: {},
} as const;

export default plugin;
