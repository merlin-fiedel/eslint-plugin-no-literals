# eslint-plugin-no-literals

Disallow hardcoded string literals in TypeScript classes.

Hardcoded strings scattered across service and component classes are a silent source of bugs — a typo in an error message, an API path duplicated in three places, a user-facing label that never made it into the translation layer. This plugin catches them at lint time, before they spread. The rule is simple: if a string literal lives inside a class body, it belongs in an enum, a typed constant, or an i18n key — not inline.

See [`packages/eslint-plugin/README.md`](packages/eslint-plugin/README.md) for full documentation: installation, configuration, rule options, and examples.

## Repository layout

```text
packages/
  eslint-plugin/    — the published ESLint plugin
  vscode-extension/ — VS Code extension (uses the plugin)
playground/         — local dogfood project (not a workspace package)
```

## Development

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 (`npm install -g pnpm`)

### Install & build

```sh
pnpm install
pnpm build      # compiles all packages
pnpm test       # runs all test suites
pnpm typecheck  # type-checks all packages
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the playground `npm link` workflow, test instructions, and PR guidelines.
