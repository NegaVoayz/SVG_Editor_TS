# 开发阶段变更记录

本文把四组阶段名放回同一条提交线上。短 SHA 均可在 arm B 仓库中通过
`git show <sha>` 复核；“当时测试”按该提交中 `tests/**/*.test.ts` 的
`it(...)` 数量统计，而不是今天的测试数量。

基线最终提交为 `778b3ed`。它之后的文档提交不改变本文描述的产品行为。

## 1. 阶段总表

| 阶段 | 提交范围 | 交付内容 | 当时测试 |
| --- | --- | --- | ---: |
| W0 | `27c7f27` | strict TypeScript、ESLint、Vitest 骨架与公开入口 | 1 |
| W1 | `9e9a29c` | 长度、百分比、颜色、ViewBox、Transform 等不可变值 | 15 |
| W2 | `f3e5f77` | Map 版本 Hive、事务、Snapshot、commit、undo/redo/prune | 28 |
| W3 | `d142133` | 节点类层次、TreeStore、Document、SVG Reader/Writer/Loader | 37 |
| W4 | `02e4820` | Command、Attribute、Event、Refusal、View 协议 | 39 |
| W5 | `fad184a` | Editor、编辑协作类、Provider 与属性写入 | 46 |
| W6 | `1f2f917`…`3684dd9` | Planner、Parser、Renderer、交互 CLI 与管道稳定性 | 108 → 120 |
| T1–T6 | `5484581` | zoom、opacity、polygon、box、history cap、move 默认策略 | 120 |
| BR-01–09 | `2057fd7`…`8c5a709` | 结构修复与验收文档 | 120 → 124 |
| P1–P4 | `b74446b`…`778b3ed` | A/B parity #4–#10 修复与记录 | 124 → 128 |

W6 的起点已经有 Planner/UI/CLI，`3684dd9` 只修正管道会话；`5484581` 在两者
之间加入 T1–T6，所以不能把 W6 简单写成单个提交。

## 2. 各阶段做了什么

### W0–W1：可编译骨架与值对象

W0 固定 Node.js/npm 脚本、严格编译选项、ESLint 和 Vitest，并建立最小包入口。
W1 开始把“数字字符串”变成值对象：长度单位、百分比、paint、ViewBox 和
transform 都有解析、显示和 SVG 序列化三种表示。此阶段还没有可编辑文档。

### W2：MVCC 历史

`Hive<T>` 使用虚拟 id、版本链、事务快照和显式 commit 图。staged write 与
committed value 隔离；undo/redo 通过 diffs 反转 insert/remove/update；
checkout 保留 redo 尾，后续提交截断它。

### W3：树、文档与 SVG I/O

不可变节点承载 SVG 字段，结构链接归 `TreeStore`，`Document` 是文件与事务的
Facade。Reader 只接受实现的 SVG 子集，Writer 使用确定性顺序恢复文件。

### W4–W6：协议、编辑器和 CLI

W4 把请求、命令、结果、拒绝和视图区分为闭合协议对象。W5 将创建、结构、
transform、属性与历史写入 Editor 及其协作者。W6 把 Parser/Planner/Rendering
接到交互与单参数 CLI，并让分号会话和管道输出稳定。

### T1–T6：对照扩展

- T1：`zoom <factor>` 只改变前端显示倍率；
- T2：`opacity` 0..1 贯通 tree/show/save/read；
- T3：`polygon` 节点、点列表、move/scale 和 round-trip；
- T4：组合 `box`、fill/content 路由及派生 id 冲突保护；
- T5：`history` 默认 cap 可通过 `SessionOptions` 或环境变量设置；
- T6：B 的默认 `move` 从 params+cascade 改为 transform，可配置回退。

### BR-01–09：结构修复

| 项目 | 结果 |
| --- | --- |
| BR-01 | 几何与详情迁入 `NodeVisitor` 实现 |
| BR-02 | SVG 行为按 `elementName` 判别 |
| BR-03 | `NodeBase + Node` 闭合联合与 `NODE_TYPES` 表 |
| BR-04 | 31 个 Set 类/32 路 Parser switch 收敛到 `ATTRIBUTES`；读写共用 `SVG_SCHEMA` |
| BR-05 | 大 `Editor` 拆为 History、Naming、AttributeWriter、TransformService、StructureService |
| BR-06 | `TreeStore` 拆为 links、index、text |
| BR-07 | Reader 的 XML/id 职责拆开，并统一读写 Schema |
| BR-08 | Refusal、Event 与渲染使用闭合联合和穷尽 switch |
| BR-09 | box 行为迁入 `CompositeShapeProvider` |

详细验收矩阵在 [StructuralRefactor.md](./StructuralRefactor.md)。

### P1–P4：A/B parity

| 提交 | 修复 |
| --- | --- |
| `b74446b` | box 接受第六个 fill 操作数；创建前递归检查全部派生 id；fill 原子写 group 与 outline |
| `50df835` | `history n` 恢复 HEAD + n 邻居 + 折叠行 + baseline；位置从 1 开始 |
| `8ee9b1e` | 修复最后子容器下的多余竖线，树前缀按行增量维护 |
| `778b3ed` | 记录 parity 结论、测试和结构统计 |

## 3. 结构度量

以下数字来自 `778b3ed` 的源码，文件行数为物理行：

| 指标 | 结构修复前 | BR 完成 | P1–P3 后 |
| --- | ---: | ---: | ---: |
| `src/editor/Editor.ts` | 1,394 | 253 | 333 |
| `src/model/store/TreeStore.ts` | 633 | 367 | 367 |
| `src/io/SvgReader.ts` | 526 | 156 | 156 |
| `src/protocol/attr/SetCommands.ts` | 752 | 0 | 0 |

Editor 在 BR 后又增加 box fill、历史窗口和派生 id 检查，因此终值是 333。
不能用 253 当作最终行数，也不能假装 P1–P3 没有成本。

`instanceof` 需要写清统计口径：

```sh
# 最终版本的命中行数
git grep -h instanceof 778b3ed -- 'src/**/*.ts' | Measure-Object -Line

# 同一批行里的文本出现次数
git grep -h instanceof 778b3ed -- 'src/**/*.ts' |
  Select-String -Pattern instanceof -AllMatches
```

`3684dd9` 有 216 次文本出现、211 个命中行；`778b3ed` 降到 86 次出现、83 个
命中行。三条行各含两个判断，解释了 86 和 83 的差。剩余判断位于类族边界、
值对象或错误类型检查；SVG 标签分派使用 `elementName`。

## 4. 测试增长

从 T 完成到 parity 完成，测试由 120 增至 128：

| 提交 | 新增 | 结果条数 |
| --- | ---: | ---: |
| `02388a3` | 4 | 124 |
| `b74446b` | 2 | 126 |
| `50df835` | 1 | 127 |
| `8ee9b1e` | 1 | 128 |
| `778b3ed` | 0 | 128 |

具体新增用例：

- BR-05：`distinguishes a missing attribute target from no document`；
- node table：`contains every concrete node exactly once`；
- node table：`keeps each constructor aligned with its element name`；
- node table：`covers every element with one SVG schema record`；
- P1：`accepts a box fill and paints its outline`；
- P1：`refuses a colliding derived box id without changing the document`；
- P2：`shows HEAD, the requested neighbours, folded commits, and baseline`；
- P3：`does not draw a branch bar below a last-child container`。

最终分布是 `cli.test.ts` 76 条、`editor.test.ts` 7 条、`hive.test.ts` 13 条、
`model.test.ts` 9 条、`node-table.test.ts` 3 条、`protocol.test.ts` 2 条、
`scaffold.test.ts` 1 条、`type-safety.test.ts` 3 条、`values.test.ts` 14 条。
测试策略见 [Testing.md](./Testing.md)。

## 5. 提交规范

每个可独立验证的改动使用以下格式：

```text
Task <阶段或规则>: <完成的行为> (arm B)
```

文档阶段沿用同样格式：

```text
Task Docs-D4: record architecture decisions (arm B)
```

提交应满足：

1. 一个提交至少能独立说明一个行为或一组不可拆的文档交付；
2. 代码提交先跑 `npm run check`、`npm test`、`npm run build`；
3. 文档中的测试数、文件数和 SHA 来自实际命令，不靠回忆；
4. 不把两个 C++ 参考项目、`node_modules/`、`dist/` 或临时 demo 文件带入本仓。

