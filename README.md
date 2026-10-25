# SVG Editor TypeScript

This repository is arm B of the OOP comparison project described in
[`docs/OopPlan.md`](./docs/OopPlan.md). It reimplements the observable behavior of the
C++23 SVG editor while using immutable model objects, command objects, a unit
of work, a registry of shape providers, and visitor-based serialization.

The implementation is complete through the W0–W7 work packages. It also
contains the T1–T6 extensions (`zoom`, `opacity`, `polygon`, composite `box`,
configurable history cap, optional transform-default move) and compile/runtime
checks for S1–S8.

## Requirements

- Node.js 22 or newer
- npm 10 or newer

## Commands

```sh
npm install
npm run check
npm test
npm run build
npm run cli
```

`npm run check` runs TypeScript in strict mode and ESLint with zero warnings
allowed. The dependency direction is enforced by an ESLint rule: `src/model`
cannot import editor, protocol, planner, I/O, UI, or CLI code.

## Development order

Implementation follows the work packages in `docs/OopPlan.md`: W0 scaffold,
W1 values, W2 MVCC hive, W3 model and SVG I/O, W4 protocol, W5 editor,
W6 planner/UI/CLI, and W7 oracle coverage. Each independently verifiable
step is committed with `Task Wn: <name> (arm B)`.

See [`docs/Architecture.md`](./docs/Architecture.md),
[`docs/Manual.md`](./docs/Manual.md),
[`docs/Testing.md`](./docs/Testing.md),
[`docs/Decisions.md`](./docs/Decisions.md),
[`docs/RequirementsMap.md`](./docs/RequirementsMap.md),
[`docs/Demo.md`](./docs/Demo.md),
[`docs/OopImpedanceLog.md`](./docs/OopImpedanceLog.md), and
[`docs/DesignComparison.md`](./docs/DesignComparison.md). The generated
[`docs/Consistency.md`](./docs/Consistency.md) report checks code/document
statistics, links, commits, tags, and verification commands together.

## Configuration

- `SVG_EDITOR_HISTORY_LIMIT=<n>` changes the default `history` cap (default 20).
- `SVG_EDITOR_MOVE_DEFAULT=params` restores the C++ default `params+cascade`
  move behavior; the TypeScript T6 default is `transform`.

## CLI examples

```sh
npm run cli
node dist/cli/main.js 'init; create g layer; create rect box 0 0 10 10 #ff0000 in layer; tree'
node dist/cli/main.js 'init; create polygon p 0 0 10 0 10 10 #00ff00; tree'
node dist/cli/main.js 'init; create box n1 120 100 160 60 "Start" #4a90d9; tree'
```

On Windows, `npm run cli` opens the interactive prompt without an argument;
passing a semicolon session through npm's `cmd.exe` layer can split the argument.

