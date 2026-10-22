# OOP 阻抗日志

本日志记录 TypeScript + 对象模型相比 C++ variant/visitor 实现多出的结构性成本。

| # | 位置 | 阻抗 | 处理 |
| --- | --- | --- | --- |
| 1 | `NodeVisitor` | GoF Visitor 必须为每个具体节点写一个抽象方法；新增 Polygon 时序列化器立即编译失败 | 保留 Visitor，接受显式扩展点 |
| 2 | `protocol/attr/SetCommands.ts` | 30 个命令类型造成大量近乎重复的不可变重建代码 | 每个命令独立校验并替换，避免字符串分派 |
| 3 | `Editor.transformNode` | TS 没有 C++ variant 的模式匹配，必须组合 `instanceof` 与类型收窄 | 将节点分类限制在几何适配函数中 |
| 4 | `Editor.setBoxFill` | 组合形状的语义传播是插件契约，但普通 OOP 接口无法表达“哪些子节点接收哪个属性” | 明确由 box provider 约定子节点 id 后缀 |
| 5 | `TreeStore` | 节点不持有链接后，结构补丁需要同时重建邻居和端点 record | 换取无 parent/sibling 的纯节点模型 |
| 6 | `Hive` | Map 版本链没有 C++ 的块内紧凑布局和 32 字节记录保证 | 首先验证语义，不移植 blocked array |
| 7 | `Outcome` | TypeScript 的联合类型在运行时没有标准 variant index | 通过类层次和 `instanceof` 边界识别结果 |
| 8 | `Snapshot` | JS 没有析构与引用守卫，无法用语言级生命周期阻止 hive 销毁后的访问 | 使用 generation.valid 标志 |
| 9 | `ContextCommands` | 视图命令也要满足 Command 基类，即使它只读取 | Planner 统一实现 `CommandContext` |
| 10 | `Parser` | 属性词法必须先生成命令对象，再绑定目标节点 | `AttributeCommand.at(target)` 作为构造后的绑定步骤 |
| 11 | `WithAttributes.ts` | structural `WithX` 能力接口与具体节点不可变 clone 方法之间需要额外适配 | 当前由 Set 命令集中执行 `withAttributes` |
| 12 | `SvgSerializer` | Visitor 状态比 C++ 递归 writer 更容易被归约式重构破坏 | writer 显式保存/恢复当前节点、深度和 inline 状态 |
| 13 | `HiveTransaction` | TS 单线程没有真正的 writer mutex | 使用 `writerActive` 拒绝重入事务 |
| 14 | `BoxIntent` | 组合创建需要子节点树，而普通 CreateIntent 只返回一个 Node | 增加 `CreatedChild` 递归创建描述 |
| 15 | `DocumentTransaction` | 需要区分事务封装和 UoW 外观 | `UnitOfWork` 作为 Editor 唯一写入入口，内部持有事务 |
| 16 | ESLint | `strictTypeChecked` 会把安全的结构探测也视为潜在不安全操作 | 缩小到明确的型守卫，而不是关闭规则 |

## 结论

显式类和 Visitor 增加了文件数和样板代码，但新增 kind/attribute 时，编译器能指出多数遗漏。
真正的成本集中在两类地方：一是没有 sum type ergonomics，二是不可变节点需要重建完整值。
这些成本被限制在 Editor 的几何适配、Set 命令和节点 clone 层，没有扩散到 Hive 与 I/O。

