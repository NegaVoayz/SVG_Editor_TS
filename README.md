# SVG Editor TypeScript

This repository is arm B of the OOP comparison project described in
[`OopPlan.md`](./OopPlan.md). It reimplements the observable behavior of the
C++23 SVG editor while using immutable model objects, command objects, a unit
of work, a registry of shape providers, and visitor-based serialization.

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

Implementation follows the work packages in `OopPlan.md`: W0 scaffold,
W1 values, W2 MVCC hive, W3 model and SVG I/O, W4 protocol, W5 editor,
W6 planner/UI/CLI, and W7 oracle coverage. Each independently verifiable
step is committed with `Task Wn: <name> (arm B)`.

