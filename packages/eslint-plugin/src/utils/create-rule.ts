import { ESLintUtils } from '@typescript-eslint/utils';

export const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/merlin-fiedel/eslint-plugin-no-literals/blob/main/docs/rules/${name}.md`,
);
