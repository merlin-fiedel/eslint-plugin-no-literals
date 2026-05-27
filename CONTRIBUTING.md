# Contributing

Contributions are welcome. Please open an issue first for non-trivial changes.

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 (`npm install -g pnpm`)

## Install & build

```sh
pnpm install
pnpm build      # compiles all packages
```

## Running tests and typecheck

```sh
pnpm test       # runs all test suites
pnpm typecheck  # type-checks all packages
```

Tests live in [`packages/eslint-plugin/tests/rules/no-literals.test.ts`](packages/eslint-plugin/tests/rules/no-literals.test.ts) and use [`@typescript-eslint/rule-tester`](https://typescript-eslint.io/packages/rule-tester/) via [Vitest](https://vitest.dev/). Add a `valid` or `invalid` entry to the `RuleTester.run` call for any new case; invalid entries require an `errors` array describing every expected violation.

## Testing changes live in the playground

The `playground/` folder is a minimal Angular-style project used to dogfood the plugin. It is managed with **npm** (not pnpm) because it sits outside the pnpm workspace.

### One-time setup — configure a user-local npm prefix (Linux/Mac only)

`npm link` writes to the global npm prefix. On most Linux systems the default (`/usr/local`) requires root. Configure a user-writable prefix once:

```sh
echo "prefix=~/.npm-global" >> ~/.npmrc
# add ~/.npm-global/bin to PATH if you haven't already
export PATH="$HOME/.npm-global/bin:$PATH"
```

### Link the plugin into the playground

```sh
# 1. Build the plugin
pnpm --filter eslint-plugin-no-literals build

# 2. Register the plugin in the user-local global store
(cd packages/eslint-plugin && npm link)

# 3. Point the playground at the global symlink
(cd playground && npm link eslint-plugin-no-literals)
```

After this, `playground/node_modules/eslint-plugin-no-literals` is a symlink to `packages/eslint-plugin`. Any rebuild in step 1 is immediately picked up — no reinstall needed.

### Verify

```sh
cd playground
./node_modules/.bin/eslint src/user.service.ts
```

You should see 4 `no-literals/no-literals` errors.

### Teardown

```sh
# Remove the symlink from the playground and restore the file: install
(cd playground && npm unlink eslint-plugin-no-literals && npm install)

# Remove the global registration
(cd packages/eslint-plugin && npm unlink)
```

## Pull request guidelines

- Branch from `main`
- Use [conventional commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `docs:`, etc.)
- Any change to rule logic must include corresponding test cases in `packages/eslint-plugin/tests/rules/no-literals.test.ts`
