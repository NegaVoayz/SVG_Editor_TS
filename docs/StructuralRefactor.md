# B 侧结构修复验收记录

基线：`3684dd9`。所有重构均保持 CLI 与 SVG 可观察行为不变；原有 120 条测试
继续通过，加入节点联合、Schema、parity 与后续问题回归后为 132 条。

## BR 对照

| 项目 | 结果 |
| --- | --- |
| BR-01 | Translate、Scale、Extent、Details 改为 `NodeVisitor`，Editor 中的节点几何分支迁移到 visitor |
| BR-02 | 节点行为使用 `elementName` 判别，列表变更不再依赖具体类型判断 |
| BR-03 | `NodeBase + Node` 构成闭合联合，`NODE_TYPES` 保证构造表一致 |
| BR-04 L1 | 31 个 Set 类、32 路 Parser switch 合并为 `ATTRIBUTES` 规格表 |
| BR-04 L2 | Reader 合法性判断与 Writer 属性输出统一由 `SVG_SCHEMA` 驱动 |
| BR-05 | Editor 在 BR 完成时从 1394 行降至 253 行，职责拆入 History、Naming、Attribute、Transform、Structure 服务；parity 后为 333 行 |
| BR-06 | TreeStore 从 633 行降至 367 行，拆为 TreeLinks、TreeIndex、TreeText |
| BR-07 | SvgReader 从 526 行降至 156 行，XML 与 id 规则迁入 SVG schema |
| BR-08 | Refusal、EditEvent 使用闭合联合，渲染使用 exhaustive switch |
| BR-09 | Box 识别、内容寻址和属性路由迁入 CompositeShapeProvider |

## 统计

| 指标 | 修复前 | 修复后 |
| --- | ---: | ---: |
| `instanceof` 命中行数 | 211 | 85 |
| `instanceof` 文本出现次数 | 216 | 88 |
| Editor 行数 | 1394 | 333（BR 时 253） |
| TreeStore 行数 | 633 | 367 |
| SvgReader 行数 | 526 | 156 |
| SetCommands 行数 | 752 | 0 |

收窄到具体节点类型的剩余判断主要用于结构能力边界：`ElementNode`、
`ContainerNode`、`PlainTextNode` 和文本容器。它们没有重复映射 SVG 元素标签；新增普通元素类型时，
`NODE_TYPES`、`SVG_SCHEMA`、`NodeVisitor` 与 `ShapeProvider` 会指出遗漏位置。

## 验证

```text
npm run check   PASS
npm test        9 files / 132 tests PASS
npm run build   PASS
```

另以单行命令脚本和管道交互会话验证了画布、容器、组合节点、树输出与退出路径。
