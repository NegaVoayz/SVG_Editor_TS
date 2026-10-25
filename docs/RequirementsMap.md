# 需求到实现的映射

## 1. 映射范围

本文把 arm B 的项目目标、交付约束和已实现行为映射到代码、测试与文档。来源是
[`OopPlan.md`](./OopPlan.md)、当前命令语义以及本轮修复后的可执行证据。

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
| T3：polygon 创建、`set points`、几何编辑与 round-trip | `Polygon`、`Points`、`PolygonIntent`、points visitor | `cli.test.ts` polygon create/set/move/scale/save/read 与最小值拒绝 | [Manual.md](./Manual.md) §3.3 |
| T5/T6：history cap 与 move 默认策略可配置 | `SessionOptions`、`History.view`、`IntentParser` | `cli.test.ts` cap 与 transform-default 两条 | [Manual.md](./Manual.md) §7.1–§7.2 |
| 保证 TypeScript 严格性和错误处理 | `tsconfig.json`、`eslint.config.mjs`、闭合 Event/Refusal | `npm run check`；`type-safety.test.ts`；`node-table.test.ts` | [Testing.md](./Testing.md) §4 |
| 开发过程使用可验证的小提交和统一消息 | Git history 与 `docs/Changelog.md` | `git log --oneline`；每阶段提交范围表 | [Changelog.md](./Changelog.md) §5 |
| 修复 A/B parity #4–#10 | `BoxProvider`、`Editor.createdIdProblem`、`History`、`TreeRenderer` | `cli.test.ts` 最后四条 parity 回归；`Demo.md` 实际会话 | [Changelog.md](./Changelog.md) §2、[Demo.md](./Demo.md) |
| 只修改 TypeScript 项目范围、不提交 `phase_cli_1.md`、不新增 `.gitignore` | 文件边界与 Git 提交历史 | `git status`、`git log --name-only`、最终 `git archive` 清单 | 本表与 [SUBMISSION.md](../SUBMISSION.md) |

## 3. 已验证边界

“全部测试通过”证明 132 条已写规则。完整 SVG 支持、fuzz、性能和并发 reader
的覆盖范围见 [Testing.md](./Testing.md) §6 与
[Limitations.md](./Limitations.md)。

