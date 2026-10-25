# SVG Editor TypeScript 提交说明

这是 SVG Editor 的 arm B：用 TypeScript 面向对象结构重写同一套 CLI 行为，
以不可变节点、命令对象、Unit of Work、结构外置和 Visitor 为核心。
它与 C++23 arm A 共享可观察命令语义，并把结构取舍、测试证据和已知边界一并交付。

## 1. 完整验证

在包根执行：

```sh
npm ci
npm run check
npm test
npm run build
node docs/check_docs.mjs
```

当前 `package-lock.json` 可直接用于 `npm ci`。期望尾行/结果：

```text
npm run check   exit 0，tsc 与 eslint 无错误
npm test        Test Files  9 passed (9)
                Tests  132 passed (132)
npm run build   exit 0，TypeScript 项目构建成功
node docs/check_docs.mjs
                docs/Consistency.md matches current checks
                exit 0
```

本次验证环境：

```text
Date    2026-10-25
Node    v26.8.1（项目要求 >= 22）
npm     11.19.0（项目要求 >= 10）
```

完整可复现会话：

```sh
node docs/demo.mjs
```

脚本会重新运行上面三步，驱动实际 `Session`，生成 `docs/Demo.md`，并尝试与
相邻 A 可执行文件做双向 SVG 读取。A 不在时可跳过互通项，但不会跳过 B 的验证。

## 2. 版本标识

产品行为基线是：

```text
778b3ed Task P4: record A/B parity fixes (arm B)
```

`final-2` 是不可移动的交付标签，指向包含源码、测试和全部文档的交付提交，
并保留上述产品行为基线。已发布的标签不改指向；后续交付使用新标签。
归档前先强制刷新标签，再断言标签与 HEAD 相同：

```sh
git fetch --tags --force origin
test "$(git rev-parse 'final-2^{commit}')" = "$(git rev-parse HEAD)"
git archive --format=zip --output=../SVG_Editor_TS-final-2.zip final-2
```

`git archive` 只打包已跟踪文件，因此不会包含本地 `node_modules/`、`dist/`、
coverage 或临时 SVG。包根含 TypeScript 源码、测试、锁文件、配置、根 README 和
全部文档。

## 3. 文档地图

已有章节经本轮整理后纳入交付：

| 文档 | 内容 |
| --- | --- |
| [`README.md`](./README.md) | 安装、验证、CLI 入口和配置 |
| [`docs/Architecture.md`](./docs/Architecture.md) | 模块、依赖方向、设计模式和验证入口 |
| [`docs/StructuralRefactor.md`](./docs/StructuralRefactor.md) | BR-01–09 验收与最终统计 |
| [`docs/OopImpedanceLog.md`](./docs/OopImpedanceLog.md) | 16 条 OOP 结构性成本 |
| [`docs/OopPlan.md`](./docs/OopPlan.md) | 立项目标、规则、工作包和判据 |

本轮补齐：

| 文档 | 内容 |
| --- | --- |
| [`docs/Manual.md`](./docs/Manual.md) | B 自己的完整命令、值、历史和 I/O 手册 |
| [`docs/Testing.md`](./docs/Testing.md) | 9 个测试文件、132 条用例、类型级断言和未覆盖项 |
| [`docs/RequirementsMap.md`](./docs/RequirementsMap.md) | 可确认需求到模块、测试、文档的证据链 |
| [`docs/Decisions.md`](./docs/Decisions.md) | 八条设计决策、约束与代价 |
| [`docs/Demo.md`](./docs/Demo.md) | 由脚本生成的完整会话与 A/B 互通记录 |
| [`docs/Changelog.md`](./docs/Changelog.md) | W/T/BR/P 阶段、提交范围、度量和测试增长 |
| [`docs/Process.md`](./docs/Process.md) | 代表性评审事件、确认命令、纠正提交和防复发措施 |
| [`docs/Limitations.md`](./docs/Limitations.md) | SVG 子集、已知缺陷和未验证风险 |
| [`docs/Consistency.md`](./docs/Consistency.md) | 校验统计、链接、提交、标签和命令的一致性；`--write` 显式重算 |

[`docs/DesignComparison.md`](./docs/DesignComparison.md) 是开发期间的内部短对比，
不是最终正式对比报告；其中数字是 `778b3ed` 快照，并已在本文档集中校正。

## 4. 交付内容

```text
SUBMISSION.md
README.md
docs/
  Architecture.md DesignComparison.md OopImpedanceLog.md OopPlan.md
  StructuralRefactor.md Manual.md Testing.md RequirementsMap.md
  Decisions.md Demo.md demo.mjs Changelog.md Limitations.md
  Process.md Consistency.md check_docs.mjs
src/
tests/
package.json package-lock.json
tsconfig.json tsconfig.build.json
eslint.config.mjs vitest.config.ts
```

当前代码统计按 `src/**/*.ts` 非空行：111 个文件、10,260 行。
测试统计为 9 个文件、1,801 个物理行、132 条测试。

## 5. 已知限制

完整清单见 [`docs/Limitations.md`](./docs/Limitations.md)。提交时最需要知道的
四项是：

1. SVG 子集不包含 `use`、`path`、渐变、filter、CSS style 等完整资源语义；
2. box 标签使用固定 `(x+20, y+35)` 偏移，没有排版测量；
3. TypeScript `double` 与 A 的 `float` 在极端精度和 transform 输出上可能不同；
4. 没有 fuzz、性能、并发读者或恶意深 XML 的认证。

## 6. 仓库边界

本轮只修改 `SVG_Editor_TS/`。两个 C++ 参考项目只读；A 仅被 demo 用作可选的
互操作验证。`phase_cli_1.md` 未加入本仓，也没有新增 `.gitignore` 条目。

