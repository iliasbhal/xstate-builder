# ts-jest-boilerplate

A boilerplate for TypeScript + Jest

## Requirement

- Node v10.x.x or later
- Yarn

## Installation

Clone this repository and run `yarn install` in the project root.

## Usage

### Build

```
yarn build
```

Outputed into `lib/`.

### Test

```
yarn test
```

### Coverage

```
yarn coverage
```

Open `coverage/lcov-report/index.html` in a browser.

## How it works

### TypeScript

`yarn build` transpiles the source codes from `src/` to `lib/`.

See `tsconfig.json`.

### husky & lint-staged

husky provides hooks for git, e.g. pre-commit, pre-push.

lint-staged gives the git staging files to any command.

You can format and lint the source codes with them before they are commited.

See `package.json` and `.lintstagedrc.json`.

### Prettier & TSLint

Pretiter is a code formatter.

By default, Prettier uses Babylon to parse the source codes but the TypeScript compiler can be also used.

TSLint configurations cover Prettier ones, so they are conflicted.

eslint-config-prettier invalidates the TSLint configurations conflicted with Prettier.

eslint-plugin-prettier let you use Prettier on TSLint.

See `.prettierrc` and `tslint.json`.

In [Editor configuration](#editor-configuration) you can learn how to use automatic formatting and linting in each editors.

### Jest(ts-jest)

Jest is a test runner.

ts-jest let Jest run `.ts` files.

## Editor configuration

### VSCode

Install the extensions below.

- prettier-vscode
- tslint

Adding these settings for VSCode.

```
{
    "[javascript]": {
        "editor.formatOnSave": true
    },
    "[json]": {
        "editor.formatOnSave": true
    },
    "[typescript]": {
        "editor.formatOnSave": true
    }
}
```

If `editor.formatOnSave` is true and prettier is installed either local or global, the source code is automatically formatted on save.

`[javascript]` means those settings is valid only when the edited file type is JavaScript.
