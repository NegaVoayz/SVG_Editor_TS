# SVG Editor TypeScript 提交说明

这是 SVG Editor 的 arm B：用 TypeScript 面向对象结构重写同一套 CLI 行为，
以不可变节点、命令对象、Unit of Work、结构外置和 Visitor 为核心。
它与 C++23 arm A 共享可观察命令语义，并把结构取舍、测试证据和已知边界一并交付。

## 1. 三点验证

在包根执行：

```sh
npm ci
npm run check
npm test
npm run build
```

当前 `package-lock.json` 可直接用于 `npm ci`。期望尾行/结果：

```text
npm run check   exit 0，tsc 与 eslint 无错误
npm test        Test Files  9 passed (9)
                Tests  128 passed (128)
npm run build   exit 0，TypeScript 项目构建成功
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

`final` 是最终提交标签，指向包含源码、测试和全部文档的交付提交；
`submission` 是同一提交的别名。`final` 的提交仍包含上述产品行为基线。
归档时用标签解析真实提交，避免在文件里写入包含自己的提交哈希：

```sh
git rev-parse final^{commit}
git rev-parse submission^{commit}
git archive --format=zip --output=../SVG_Editor_TS-final.zip final
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
| [`docs/Testing.md`](./docs/Testing.md) | 9 个测试文件、128 条用例、类型级断言和未覆盖项 |
| [`docs/RequirementsMap.md`](./docs/RequirementsMap.md) | 可确认需求到模块、测试、文档的证据链 |
| [`docs/Decisions.md`](./docs/Decisions.md) | 八条设计决策、被否决方案和代价 |
| [`docs/Demo.md`](./docs/Demo.md) | 由脚本生成的完整会话与 A/B 互通记录 |
| [`docs/Changelog.md`](./docs/Changelog.md) | W/T/BR/P 阶段、提交范围、度量和测试增长 |
| [`docs/Limitations.md`](./docs/Limitations.md) | SVG 子集、已知缺陷和未验证风险 |

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
src/
tests/
package.json package-lock.json
tsconfig.json tsconfig.build.json
eslint.config.mjs vitest.config.ts
```

代码统计按 `778b3ed` 的 `src/**/*.ts` 非空行：110 个文件、10,176 行。
测试统计为 9 个文件、1,743 个物理行、128 条测试。

## 5. 已知限制

完整清单见 [`docs/Limitations.md`](./docs/Limitations.md)。提交时最需要知道的
五项是：

1. SVG 子集不包含 `use`、`path`、渐变、filter、CSS style 等完整资源语义；
2. polygon 少于三个点仍会创建，且 `set points` 未实现；
3. box 标签使用固定 `(x+20, y+35)` 偏移，没有排版测量；
4. TypeScript `double` 与 A 的 `float` 在极端精度和 transform 输出上可能不同；
5. 没有 fuzz、性能、并发读者或恶意深 XML 的认证。

正式作业要求原文当前不在工作区，因此
[`docs/RequirementsMap.md`](./docs/RequirementsMap.md) 明确区分“可确认目标”与
“待补原文”，没有伪造题面编号。

## 6. 仓库边界

本轮只修改 `SVG_Editor_TS/`。两个 C++ 参考项目只读；A 仅被 demo 用作可选的
互操作验证。`phase_cli_1.md` 未加入本仓，也没有新增 `.gitignore` 条目。

