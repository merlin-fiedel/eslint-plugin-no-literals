import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';
import type { TSESLint } from '@typescript-eslint/utils';
import { createRule } from '../utils/create-rule.js';

type Options = [
  {
    minLength?: number;
    ignorePatterns?: string[];
    ignoredCallExpressions?: string[];
    ignoreFiles?: string[];
  },
];

type MessageIds = 'noLiteral';

const DEFAULT_IGNORED_CALLS = [
  'console.log',
  'console.error',
  'console.warn',
] as const satisfies readonly string[];

export const noLiterals = createRule<Options, MessageIds>({
  name: 'no-literals',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow hardcoded string literals inside TypeScript class bodies',
    },
    schema: [
      {
        type: 'object',
        properties: {
          minLength: { type: 'number', minimum: 0, default: 2 },
          ignorePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          ignoredCallExpressions: {
            type: 'array',
            items: { type: 'string' },
            default: [...DEFAULT_IGNORED_CALLS],
          },
          ignoreFiles: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noLiteral:
        "Hardcoded string literal '{{value}}' found in class body. Use an enum, constant, or i18n key instead.",
    },
  },
  defaultOptions: [
    {
      minLength: 2,
      ignorePatterns: [],
      ignoredCallExpressions: [...DEFAULT_IGNORED_CALLS],
      ignoreFiles: [],
    },
  ],
  create(context, optionsWithDefault) {
    const [opts] = optionsWithDefault;
    const minLength = opts.minLength ?? 2;
    const compiledIgnorePatterns = (opts.ignorePatterns ?? []).map(
      (p) => new RegExp(p),
    );
    const ignoredCalls: readonly string[] =
      opts.ignoredCallExpressions ?? DEFAULT_IGNORED_CALLS;
    const ignoreFiles = opts.ignoreFiles ?? [];

    if (
      ignoreFiles.length > 0 &&
      fileMatchesIgnorePattern(context.filename, ignoreFiles)
    ) {
      return {};
    }

    const { sourceCode } = context;

    return {
      Literal(node) {
        if (typeof node.value !== 'string') return;
        const { value } = node;
        if (value.length < minLength) return;
        if (!isInsideClassBody(node)) return;
        if (isInsideDecorator(node)) return;
        if (isDynamicImportSpecifier(node)) return;
        if (isComputedMemberKey(node)) return;
        if (isObjectPropertyKey(node)) return;
        if (isTypeofComparison(node)) return;
        if (isInsideIgnoredCall(node, ignoredCalls)) return;
        if (compiledIgnorePatterns.some((re) => re.test(value))) return;
        if (hasIgnoreComment(node, sourceCode)) return;

        context.report({
          node,
          messageId: 'noLiteral',
          data: { value },
        });
      },
    };
  },
});

function isInsideClassBody(node: TSESTree.Node): boolean {
  let current: TSESTree.Node | null | undefined = node.parent;
  while (current != null) {
    if (current.type === AST_NODE_TYPES.ClassBody) return true;
    current = current.parent;
  }
  return false;
}

function isInsideDecorator(node: TSESTree.Node): boolean {
  let current: TSESTree.Node | null | undefined = node.parent;
  while (current != null) {
    if (current.type === AST_NODE_TYPES.Decorator) return true;
    current = current.parent;
  }
  return false;
}

function isDynamicImportSpecifier(node: TSESTree.Node): boolean {
  return node.parent?.type === AST_NODE_TYPES.ImportExpression;
}

function isObjectPropertyKey(node: TSESTree.Node): boolean {
  const { parent } = node;
  if (parent?.type !== AST_NODE_TYPES.Property) return false;
  const prop = parent as TSESTree.Property;
  return !prop.computed && prop.key === node;
}

function isComputedMemberKey(node: TSESTree.Node): boolean {
  const { parent } = node;
  if (parent?.type !== AST_NODE_TYPES.MemberExpression) return false;
  const member = parent as TSESTree.MemberExpression;
  return member.computed && member.property === node;
}

function isTypeofComparison(node: TSESTree.Node): boolean {
  const { parent } = node;
  if (parent?.type !== AST_NODE_TYPES.BinaryExpression) return false;
  const bin = parent as TSESTree.BinaryExpression;
  const other = bin.left === node ? bin.right : bin.left;
  return (
    other.type === AST_NODE_TYPES.UnaryExpression &&
    (other as TSESTree.UnaryExpression).operator === 'typeof'
  );
}

function isInsideIgnoredCall(
  node: TSESTree.Node,
  ignoredCalls: readonly string[],
): boolean {
  let current: TSESTree.Node | null | undefined = node.parent;
  while (current != null) {
    if (current.type === AST_NODE_TYPES.CallExpression) {
      if (ignoredCalls.includes(resolveCalleeName(current.callee))) return true;
    }
    current = current.parent;
  }
  return false;
}

// Converts a callee expression to a dot-separated name string,
// e.g. MemberExpression `console.log` → "console.log",
//      `this.i18n.translate` → "this.i18n.translate".
function resolveCalleeName(node: TSESTree.Node): string {
  if (node.type === AST_NODE_TYPES.Identifier) {
    return node.name;
  }
  if (node.type === AST_NODE_TYPES.ThisExpression) {
    return 'this';
  }
  if (
    node.type === AST_NODE_TYPES.MemberExpression &&
    !node.computed &&
    node.property.type === AST_NODE_TYPES.Identifier
  ) {
    return `${resolveCalleeName(node.object)}.${node.property.name}`;
  }
  return '';
}

function hasIgnoreComment(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  const nodeLine = node.loc?.start.line;
  if (nodeLine === undefined) return false;
  const comments = sourceCode.getAllComments();
  return comments.some(
    (comment) =>
      comment.value.trim() === 'no-literals-ignore' &&
      (comment.loc?.end.line === nodeLine ||
        comment.loc?.end.line === nodeLine - 1),
  );
}

// Matches a file path against glob-style patterns (supports * and **).
function fileMatchesIgnorePattern(
  filePath: string,
  patterns: readonly string[],
): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return patterns.some((pattern) => {
    const regexStr = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*\//g, '(.+/)?')
      .replace(/\*\*/g, '.+')
      .replace(/\*/g, '[^/]+')
      .replace(/\?/g, '[^/]');
    return new RegExp(`(^|/)${regexStr}$`).test(normalized);
  });
}
