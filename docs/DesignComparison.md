# C++ 与 TypeScript 对照结论

## 实现范围

| 阶段 | TypeScript 结果 |
| --- | --- |
| W0 | strict TS、ESLint、Vitest、构建与 CLI 骨架 |
| W1 | 数值、单位、颜色、ViewBox、Transform、属性值 |
| W2 | Map 版本链 Hive、快照、显式 commit、undo/redo/prune |
| W3 | 13 类节点、TreeStore、Document、SVG Reader/Writer/Loader |
| W4 | Command、Attribute、Event、Refusal、View 协议 |
| W5 | Editor、拓扑编辑、参数/Transform 策略、ShapeProvider |
| W6 | Planner、Parser、Renderer、交互 CLI |
| W7 | 108 条主回归 + T1–T6 + S1–S8 类型/历史测试 |

当前统计约为 110 个 TypeScript 源文件、10,175 行产品代码、128 个通过测试。
C++ 参考目录静态统计为 78 个 `.hh/.cc` 文件、11,067 行（含其测试文件）。

## T1–T6

| 项 | TypeScript B |
| --- | --- |
| T1 `zoom` | Session 显示状态；不创建提交，不改变文档 |
| T2 `opacity` | tree/show/save/read 全链路，范围 0..1 |
| T3 `polygon` | 新节点、Reader/Writer、Provider、move/scale |
| T4 `box` | 组合创建、fill/label 传播、data-kind 往返、解组拒绝 |
| T5 history cap | `SessionOptions.historyLimit` 与 `SVG_EDITOR_HISTORY_LIMIT` |
| T6 move default | 默认矩阵移动；`SessionOptions.moveDefaultsToTransform=false` 保留旧默认 |

由于任务范围禁止修改两个 C++ 项目，T 项没有在 A 侧落盘实现；这里记录的是 B 的独立扩展结果。

## S1–S8

| 项 | 证据 |
| --- | --- |
| S1 | `type-safety.test.ts` 的关闭 union 完整性检查 |
| S2 | enum 成员完整性检查与 ESLint strict config |
| S3 | readonly 节点字段的 `@ts-expect-error` 检查 |
| S4 | 缺少 `execute()` 的具体 Command 无法编译 |
| S5 | Editor 方法拼写错误无法编译 |
| S6 | Hive undo/redo 对 insert/remove 的运行时反转测试 |
| S7 | 暂存写不改变已提交节点，rollback 恢复原引用 |
| S8 | 拒绝对象未知字段无法编译 |
| BR-01–BR-09 | 见 [`StructuralRefactor.md`](./StructuralRefactor.md)，行为回归全通过 |
| A/B parity #4–#10 | box fill 与派生 id、history 窗口/折叠、树分支前缀均有 CLI 回归 |

## 结构比较

| 维度 | C++ A | TypeScript B |
| --- | --- | --- |
| 分派 | variant + visit + 编译期穷尽 | 类层次 + Command/Visitor 抽象方法 |
| 结构链接 | Node record 内 parent/sibling links | TreeStore 外部 TreeRecord links |
| 历史 | 定长块、placement storage、MVCC 版本目标 | Map 版本链 + commit 图，优先语义清晰 |
| 序列化 | variant writer | NodeVisitor |
| 扩展图元 | 修改关闭 variant 与多个 visitor | Provider 注册，但节点/Visitor 仍显式 |
| 文本前端 | 表驱动 parser | Provider/Attribute 对象与 Parser 表 |

## 结论

B 的主要优势是把“写树”“提交事务”“生成事件”“生成文案”分开，编辑流程的可测试性较高；
Provider 与 Visitor 使扩展位置明确。主要劣势是类数量和显式样板明显高于 C++ variant，且 TS
没有真正等价于 `const T&`、编译期 variant exhaustiveness 和确定性析构的机制。

对需要快速新增属性、UI 或组合图元的场景，B 的边界更清楚；对存储密度、并发读者和极端历史规模，
A 的实现更接近其在论文/设计文档中证明过的成本模型。

