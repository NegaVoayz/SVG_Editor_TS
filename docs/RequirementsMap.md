# 需求到实现的映射

## 1. 需求来源状态

当前工作区没有正式作业要求原文，也没有可引用的题面编号。因此本文不重写一份
看似权威的“作业原文”，只映射两种可确认来源：

1. 用户在项目会话中明确提出的 arm B 目标与交付约束；
2. 仓库内的 [`OopPlan.md`](./OopPlan.md)、后续 parity 说明和已实现行为。

正式提交前若取得原题，应把本文第一列替换成原题条文编号并复核覆盖；缺失项属于
证据缺口，不是已经从代码中反推出的事实。

## 2. 映射表

| 可确认需求 | 落点（模块/类/函数） | 证明（测试或会话） | 说明文档 |
| --- | --- | --- | --- |
| 用 TypeScript 实现一个 OOP 结构对照版 SVG Editor | `src/model/node/*`、`src/protocol/cmd/*`、`src/editor/*`、`src/plugin/*` | `tests/node-table.test.ts` 全部 3 条；`tests/protocol.test.ts` | [Decisions.md](./Decisions.md) D1–D8、[Architecture.md](./Architecture.md) |
| 节点不可变，编辑生成新对象 | `NodeBase` 及节点类；`UnitOfWork`；`HiveTransaction` | `type-safety.test.ts` S3/S7；`hive.test.ts` “keeps old snapshots immutable” | [Decisions.md](./Decisions.md) D1/D4/D7 |
| 一条用户命令对应一个显式编辑提交 | `Command.execute`、`Planner.execute`、`Editor` 协作类、`Document.transaction` | `editor.test.ts` “creates, moves, fills, and undoes…”；`cli.test.ts` 每条 create 的成功输出 | [Manual.md](./Manual.md) §5、§7 |
| 使用 Visitor 处理节点相关行为 | `NodeVisitor`、`TranslateVisitor`、`ScaleVisitor`、`ExtentVisitor`、`DetailsVisitor`、`SvgSerializer` | `editor.test.ts` move/scale；`cli.test.ts` show/tree；`node-table.test.ts` | [Decisions.md](./Decisions.md) D3 |
| 结构操作独立于节点数据 | `TreeStore`、`TreeLinks`、`TreeIndex`、`TreeText`、`Document` | `model.test.ts` 的 splice/round-trip 用例；`cli.test.ts` group/ungroup/order | [Decisions.md](./Decisions.md) D4 |
| 属性解析、目标检查和不可变应用可复用 | `ATTRIBUTES`、`AttributeCommand`、`AttributeWriter` | `protocol.test.ts` “applies typed attribute commands…”；`cli.test.ts` 各类 `set` | [Decisions.md](./Decisions.md) D5、[Manual.md](./Manual.md) §6 |
| 读和写共享同一 SVG 子集定义 | `SVG_SCHEMA`、`SvgReader`、`SvgSerializer` | `model.test.ts` 所有 loader/writer 用例；`node-table.test.ts` Schema 覆盖；`Demo.md` A/B 文件互通 | [Decisions.md](./Decisions.md) D6、[Manual.md](./Manual.md) §7.3 |
| 保留 undo/redo/checkout、IO baseline 与连续 commit id | `Hive`、`Snapshot`、`History`、`TreeStore` | `hive.test.ts` 13 条；`cli.test.ts` history/undo/checkout/context-id 用例 | [Manual.md](./Manual.md) §7.2、[Testing.md](./Testing.md) §5 |
| 几何值支持单位、百分比和稳定显示 | `Length`、`Percentage`、`sumLengths`、`numberText` | `values.test.ts` 14 条；`cli.test.ts` 单位/负尺寸用例 | [Manual.md](./Manual.md) §3 |
| 支持 rect/circle/ellipse/line/polygon/text/g 的创建和编辑 | `BuiltinProviders`、`CreateIntent` 子类、shape visitors | `cli.test.ts` 各图元用例；`editor.test.ts` create/move/scale/group | [Manual.md](./Manual.md) §4–§6 |
| `box` 保持一个用户对象、一个提交、可 round-trip | `CompositeShapeProvider`、`BoxProvider`、`AttributeWriter` | `cli.test.ts` box creation/fill/content/collision/undo/ungroup；`editor.test.ts` provider box | [Decisions.md](./Decisions.md) D8、[Manual.md](./Manual.md) §5.1 |
| T1：zoom 只显示，不提交 | `Session.zoomFactor`、`Zoom` parser request | `cli.test.ts` “keeps zoom outside the document and history” | [Manual.md](./Manual.md) §4 |
| T2：opacity 0..1 贯通全链路 | `ATTRIBUTES.opacity`、`PaintAttr`、Reader/Writer | `cli.test.ts` opacity round-trip/out-of-range 两条 | [Manual.md](./Manual.md) §3.4 |
| T3：polygon 点编辑与 round-trip | `Polygon`、`PolygonIntent`、points visitor | `cli.test.ts` polygon create/move/scale/save/read | [Manual.md](./Manual.md) §3.3 |
| T5/T6：history cap 与 move 默认策略可配置 | `SessionOptions`、`History.view`、`IntentParser` | `cli.test.ts` cap 与 transform-default 两条 | [Manual.md](./Manual.md) §7.1–§7.2 |
| 保证 TypeScript 严格性和错误处理 | `tsconfig.json`、`eslint.config.mjs`、闭合 Event/Refusal | `npm run check`；`type-safety.test.ts`；`node-table.test.ts` | [Testing.md](./Testing.md) §4 |
| 开发过程使用可验证的小提交和统一消息 | Git history 与 `docs/Changelog.md` | `git log --oneline`；每阶段提交范围表 | [Changelog.md](./Changelog.md) §5 |
| 修复 A/B parity #4–#10 | `BoxProvider`、`Editor.createdIdProblem`、`History`、`TreeRenderer` | `cli.test.ts` 最后四条 parity 回归；`Demo.md` 实际会话 | [Changelog.md](./Changelog.md) §2、[Demo.md](./Demo.md) |
| 只修改 TypeScript 项目范围、不提交 `phase_cli_1.md`、不新增 `.gitignore` | 文件边界与 Git 提交历史 | `git status`、`git log --name-only`、最终 `git archive` 清单 | 本表与 [SUBMISSION.md](../SUBMISSION.md) |

## 3. 无法闭环的需求

| 缺口 | 影响 | 当前处理 |
| --- | --- | --- |
| 正式作业要求原文未提供 | 无法证明每条原题编号都已覆盖，也无法引用原文 | 本文只映射明确目标和企划，提交前需人工补原文 |
| 交付形态尚未指定 | 可能是仓库、压缩包或指定报告 | `SUBMISSION.md` 同时给出仓库验证与 `git archive` 方法 |
| 是否答辩未指定 | Demo 无法针对讲述时长和顺序优化 | 当前 Demo 按“验证 → 核心行为 → 拒绝 → 互通”排列，兼顾讲述和参考 |
| 是否要求与 A 使用完全相同的 UI 术语未指定 | 少量文字仍可能在对白中不同 | 已保持核心事件和拒绝输出一致；术语由正式对比文档再统一 |
| 没有原题要求的性能、并发或内存门槛 | 无法声称工程满足未提供的 SLA | [Limitations.md](./Limitations.md) 明确未做并发和性能认证 |

## 4. 缺口之外已证明的边界

“全部测试通过”只证明 128 条已写规则。文件 I/O 的完整 SVG 支持、非法 polygon
顶点数、fuzz、性能和并发 reader 仍未覆盖，详见
[Testing.md](./Testing.md) §6 与 [Limitations.md](./Limitations.md)。这些条目
不应在提交说明里被一句“测试全绿”抹掉。

