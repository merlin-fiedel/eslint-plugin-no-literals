# eslint-plugin-no-literals

An ESLint plugin that flags hardcoded string literals inside TypeScript class bodies, encouraging the use of enums, constants, or i18n keys instead.

## Why

Hardcoded strings scattered across service and component classes are one of the most common sources of:

- **Typo bugs** — `'faild'` vs `'failed'` in two different error handlers
- **i18n debt** — strings baked into logic instead of going through a translation layer
- **Magic values** — route paths, API endpoints, and event names with no single source of truth

> **Security bonus:** hardcoded API keys and client IDs are string literals too. Real-world testing against open-source Angular projects surfaced a Flickr API key and a Spotify client ID sitting directly in class bodies. This rule catches them automatically as part of its normal operation.

This plugin surfaces those strings at lint time so they can be moved to typed constants or enums before they spread.

## Installation

```sh
npm install --save-dev eslint-plugin-no-literals @typescript-eslint/parser
# or
pnpm add -D eslint-plugin-no-literals @typescript-eslint/parser
```

## Setup (ESLint flat config)

```js
// eslint.config.mjs
import tsParser from '@typescript-eslint/parser';
import noLiterals from 'eslint-plugin-no-literals';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      'no-literals': noLiterals,
    },
    rules: {
      'no-literals/no-literals': 'warn',
    },
  },
];
```

> **Requires ESLint ≥ 9** (flat config only). Legacy `.eslintrc` is not supported.

Then run ESLint against your source files:

```sh
npx eslint src/
```

## Rule: `no-literals/no-literals`

Flags string literals that appear inside a class body — in property initializers, method bodies, getters, and setters.

### Options

All options are passed as a single configuration object.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `minLength` | `number` | `2` | Ignore strings shorter than this many characters. Useful to allow single-character sentinels. |
| `ignorePatterns` | `string[]` | `[]` | Array of regular expression strings. Literals matching any pattern are ignored. |
| `ignoredCallExpressions` | `string[]` | `['console.log', 'console.error', 'console.warn']` | Dot-separated callee names whose string arguments are ignored. |
| `ignoreFiles` | `string[]` | `[]` | Glob patterns (supports `*` and `**`). Files matching any pattern are skipped entirely. |

### Examples

#### ❌ Invalid — will be flagged

```ts
export class UserService {
  // Property initializer with a raw string
  private endpoint = '/api/users';

  // Method body with a raw string
  getUser(id: string) {
    const url = this.endpoint + '/' + id;
    return fetch(url, { method: 'GET' });
  }

  // Return value with a raw string
  handleError(code: number): string {
    if (code === 404) {
      return 'User not found';
    }
    return 'Unknown error';
  }
}
```

#### ✅ Valid — these are not flagged

```ts
// Top-level enums are outside the class body
export enum UserRole {
  Admin = 'admin',
  Viewer = 'viewer',
}

// Top-level constants are outside the class body
export const API_BASE = '/api/v1';
export const NOT_FOUND_MSG = 'User not found';

@Injectable({ providedIn: 'root' }) // Decorator arguments are ignored
export class UserService {
  // References to constants and enums are fine
  private baseUrl = API_BASE;
  readonly role = UserRole.Viewer;

  // console.log / console.error / console.warn are ignored by default
  handleError(code: number) {
    console.error('Unexpected error code:', code);
    return NOT_FOUND_MSG;
  }
}
```

### With options

```js
// eslint.config.mjs
rules: {
  'no-literals/no-literals': [
    'warn',
    {
      // Only flag strings of 4+ characters (ignore short sentinels like 'px')
      minLength: 4,

      // Ignore version strings and CSS units
      ignorePatterns: ['^v\\d+', 'px$', 'em$'],

      // Ignore calls to your own translation helper in addition to console.*
      ignoredCallExpressions: [
        'console.log',
        'console.error',
        'console.warn',
        'this.i18n.translate',
        'this.logger.log',
      ],

      // Skip generated or legacy files
      ignoreFiles: ['**/*.generated.ts', 'src/legacy/**'],
    },
  ],
}
```

## Escape hatch: `// no-literals-ignore`

Add a `// no-literals-ignore` comment on the line immediately before a literal (or on the same line) to suppress the violation for that one occurrence:

```ts
export class MigrationService {
  getLegacyPath(): string {
    // no-literals-ignore
    return '/legacy/v0/users'; // suppressed
  }

  getTaggedPath(): string {
    return '/legacy/v1/users'; // no-literals-ignore — suppressed inline
  }
}
```

Use sparingly. The recommended approach is to extract the string to a typed constant.

## What is and isn't flagged

| Location | Flagged? |
| --- | --- |
| Class property initializer | ✅ Yes |
| Method / getter / setter body | ✅ Yes |
| Top-level `const` / `let` / `var` | ❌ No |
| `enum` member values | ❌ No |
| Decorator arguments (`@Component`, `@Injectable`, …) | ❌ No |
| `console.log` / `console.error` / `console.warn` args | ❌ No (default) |
| Strings below `minLength` | ❌ No |
| Strings matching `ignorePatterns` | ❌ No |
| Files matching `ignoreFiles` | ❌ No |
| `typeof` comparison operands (`typeof x === 'string'`) | ❌ No |
| Dynamic `import()` specifiers | ❌ No |
| Quoted object property keys (`{ 'key': value }`) | ❌ No |
| Computed member access (`obj['key']`) | ❌ No |

## Known patterns and workarounds

### Third-party library config strings

Some libraries accept strings from a fixed, documented set (e.g. ECharts `'bar'`, `'category'`). These are effectively constants defined by the library contract, not magic values you own. Suppress them with a regex that matches only that domain:

```js
ignorePatterns: ['^(bar|line|scatter|category|value)$']
```

### Canvas / DOM typed string unions

`ctx.globalCompositeOperation = 'lighter'` and `ctx.lineCap = 'round'` look like magic strings but TypeScript already enforces correctness via typed unions (`CanvasCompositeOperation`, `CanvasLineCap`). The same applies to `scrollIntoView({ behavior: 'smooth', block: 'center' })`. Use `ignorePatterns` to suppress the specific values your codebase uses:

```js
ignorePatterns: ['^(lighter|source-over|round|butt|square|smooth|center|start|end)$']
```

Type-aware suppression (automatically skipping literals assigned to DOM typed-union properties) is planned for a future release.

### Angular query tokens — `contentChild` / `viewChild`

`contentChild('listRef')` and `viewChild('header')` pass template reference variable names as strings. These are semantically identical to decorator metadata — the string must match the `#ref` name in the template. Add the Angular query APIs to `ignoredCallExpressions`:

```js
ignoredCallExpressions: [
  'console.log', 'console.error', 'console.warn',
  'contentChild', 'viewChild', 'contentChildren', 'viewChildren',
]
```

### Angular CDK `ComponentHarness.hostSelector`

`static hostSelector = 'app-slider'` must match the component's CSS selector exactly — it is test-harness metadata, not a runtime string. Either suppress the one occurrence with `// no-literals-ignore` or exclude it by pattern:

```js
ignorePatterns: ['^app-']
```

### TypeScript union switch-case values

Exhaustive `switch` branches over a typed string union (`'error' | 'warning' | 'normal'`) are technically correct violations — an `enum` or `as const` object would be cleaner. Teams that deliberately prefer typed string unions can suppress the case values by pattern:

```js
ignorePatterns: ['^(error|warning|normal|success|pending)$']
```

### Inline mock and seed data

Services or fixtures that contain large hardcoded datasets (names, labels, task descriptions) are expected to have many violations and are poor targets for this rule. Skip them entirely:

```js
ignoreFiles: ['**/*.mock.ts', '**/mock/**', '**/*.seed.ts', '**/fixtures/**']
```

## Contributing

```sh
# Install dependencies
pnpm install

# Build the plugin
pnpm build

# Run tests
pnpm test

# Typecheck
pnpm typecheck
```

Tests live in [packages/eslint-plugin/tests/rules/no-literals.test.ts](./tests/rules/no-literals.test.ts) and use [`@typescript-eslint/rule-tester`](https://typescript-eslint.io/packages/rule-tester/) via [Vitest](https://vitest.dev/).

To add a new test case, append a `valid` or `invalid` entry to the `RuleTester.run` call. Invalid entries require a `errors` array describing every expected violation.

Pull requests are welcome. Please open an issue first for non-trivial changes.

## License

MIT
