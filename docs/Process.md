# 结构与实现过程记录

本文记录从工具链脚手架到完整编辑器的结构形成过程，以及 BR 系列如何收窄职责和类型边界。
这里的“纠正”指结构边界在下一提交中得到落实。局部输出与数值修正不单列。

## 1. 结构形成与复审

| 产物或建议 | 哪里不足 | 如何确认 | 如何纠正 | 如何防止复发 |
| --- | --- | --- | --- | --- |
| W0 只建立 strict TypeScript、ESLint、Vitest 和入口 | 工具链已经可运行，但模型没有 SVG 值对象，字段解析和序列化会散落在调用方 | `npm run check; "exit=$LASTEXITCODE"`<br>`exit=0` | `9e9a29c` 建立不可变 Color、Length、ViewBox、Transform、Points 等值类型 | 每个值类型同时定义解析、显示与序列化，并有独立测试 |
| W1 已有的不可变值 | 文档还没有版本链、事务隔离、undo/redo 和 checkout 语义 | `npx vitest run tests/values.test.ts`<br>`Tests  15 passed (15)` | `f3e5f77` 加入 Hive、HiveTransaction、Snapshot 和稀疏 commit id | staged/committed 状态分离，并用快照与事务测试锁定 |
| W2 已有的 MVCC 存储 | 节点、父子链接、文本顺序和 SVG I/O 尚未形成统一模型 | `npx vitest run tests/hive.test.ts`<br>`Tests  13 passed (13)` | `d142133` 建立节点类层次、TreeStore、Document、Reader/Serializer | 结构链接外置，I/O 使用固定支持的子集和 round-trip 测试 |
| W3 已有的模型和 I/O | 命令、结果、拒绝、事件和视图还没有闭合协议 | `npx vitest run tests/model.test.ts`<br>`Tests  9 passed (9)` | `02e4820` 定义 Command、Outcome、Refusal、EditEvent、View 和 TreeQuery | 每种命令和结果都是类型，渲染侧只消费协议对象 |
| W4 已有的协议 | 命令尚未落成统一的 Editor 执行路径，图元创建能力也不完整 | `npx vitest run tests/protocol.test.ts`<br>`Tests  2 passed (2)` | `fad184a` 实现 Editor、ShapeProvider、Registry 和内置图元 | 创建入口统一经过 Provider，编辑结果继续走事务与历史边界 |
| W5 已有的 Editor 与 Provider | Editor 单体承担命令分派、属性、历史和结构写入；CLI 尚未接入 | `npx vitest run tests/editor.test.ts`<br>`Tests  7 passed (7)` | `1f2f917` 接上 Planner、Parser、Renderer、Session 和 CLI；`3684dd9` 稳定管道会话 | 前端只调用 Planner/Editor，CLI 输出由 Renderer 投影 |
| W6 已连通的执行链 | Editor 约 1,200 行，节点行为依赖具体类型，属性、Schema 和树存储仍有重复映射 | `npx vitest run tests/cli.test.ts`<br>`Tests  79 passed (79)` | BR 系列提取 Visitor、闭合节点表、属性规格、Schema、Provider 和命令服务 | 单测、类型级断言和结构表共同指出新增节点的遗漏位置 |
| BR 重构后的边界 | 简化若只看行数，容易漏掉行为差异；需要证明结构拆分没有改变协议结果 | `npm test`<br>`Tests  132 passed (132)` | `2057fd7`…`8c5a709` 完成职责拆分并记录验收矩阵 | 保留 CLI 行为测试、闭合联合、exhaustive switch 和结构度量 |

## 2. 第一批结构提交

W0–W6 是编辑器的定义与首次完整实现。每个提交都留下一个可继续扩展的边界，最终组合成
`CLI -> UI -> Planner -> Editor -> Protocol -> Model -> Store` 的依赖链。

| 提交 | 阶段 | 结构贡献 | 验收 |
| --- | --- | --- | --- |
| `27c7f27` | W0 | strict TypeScript、ESLint、Vitest、构建入口 | `tests/scaffold.test.ts` |
| `9e9a29c` | W1 | 不可变 SVG 值和解析/显示/序列化表示 | `tests/values.test.ts`，15 条 |
| `f3e5f77` | W2 | Hive、事务、快照、版本链和 checkout | `tests/hive.test.ts`，13 条 |
| `d142133` | W3 | 节点类层次、TreeStore、Document、SVG I/O | `tests/model.test.ts`，9 条 |
| `02e4820` | W4 | 命令、结果、拒绝、事件、视图闭合协议 | `tests/protocol.test.ts`，2 条 |
| `fad184a` | W5 | Editor、ShapeProvider、Registry、内置图元 | `tests/editor.test.ts`，7 条 |
| `1f2f917` | W6 | Planner、Parser、Renderer、Session、CLI | `tests/cli.test.ts`，79 条 |
| `3684dd9` | W6 | 管道会话终止与 stdout 稳定性 | CLI 管道路径 |

以上提交不是事后补写文档，而是逐步建立的实现骨架。后续重构均以 `3684dd9` 的
120 条行为测试为基线。

## 3. BR 结构重构提交

| 提交 | 结构贡献 |
| --- | --- |
| `2057fd7` | 提取 Translate/Scale/Extent/Details Visitor，以及 History、Naming、Attribute 等协作对象 |
| `9a2ca19` | 将大量 Set 类与 Parser 分支统一为 `ATTRIBUTES` 规格表 |
| `771d099` | Refusal/EditEvent 使用闭合联合，Renderer 使用 exhaustive switch |
| `1b3805e` | `NodeBase + Node` 形成闭合联合，`NODE_TYPES` 校验构造表 |
| `9abdfc2` | SVG 行为按 `elementName` 分派，减少具体类判断 |
| `10f0ec4` | box 的识别、内容寻址和属性路由迁入 CompositeShapeProvider |
| `6ac17bb` | TreeStore 拆为 TreeLinks、TreeIndex、TreeText |
| `a47460a` | Reader/Writer 共用 `SVG_SCHEMA`，XML 与 id 规则集中 |
| `7e008ab` | 节点表与 SVG Schema 一致性测试补齐 |
| `a0cae00` | Editor 剩余命令职责拆入 AttributeWriter、StructureService、TransformService |
| `02388a3` | 拆分后保留 missing attribute target 的拒绝语义 |
| `8c5a709` | 记录 BR-01–09 验收矩阵、结构度量和类型证据 |

## 4. 当前结构边界

结构复查不依赖某一处局部输出，而依赖以下可重复入口：

```sh
npm run check
npm test
npm run build
node docs/check_docs.mjs
```

类型层由 `NODE_TYPES`、`SVG_SCHEMA`、`ATTRIBUTES`、`NodeVisitor` 和 `ShapeProvider`
共同约束；结构关系归 `TreeStore`，事务归 `Hive`，编辑命令归 `Editor` 及其服务，CLI 只负责
输入、规划和渲染。该边界比单个树线条或窗口计数错误更能代表项目的开发过程。
