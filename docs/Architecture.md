# TypeScript 版架构

## 模块与依赖

```text
cli -> ui -> planner -> editor -> protocol -> model -> store
                                  \-> plugin
model/document -> io
```

`model/` 不导入 UI、Planner、Editor、协议或 CLI。该规则由
`eslint.config.mjs` 的 `no-restricted-imports` 强制。

```plantuml
@startuml
package "CLI" {
  [main]
}
package "UI" {
  [Tokenizer]
  [Parser]
  [Renderers]
  [Session]
}
package "Planner" {
  [Planner]
}
package "Editor" {
  [Editor]
}
package "Protocol" {
  [Command]
  [Attribute]
  [Event]
  [Refusal]
  [View]
}
package "Plugin" {
  [ShapeProvider]
  [Registry]
}
package "Model" {
  [Document]
  [UnitOfWork]
  [TreeStore]
  [TreeStructure]
  [TreeIndex]
  [TreeText]
  [Hive]
  [Node hierarchy]
  [TreeQuery]
}
package "I/O" {
  [SvgReader]
  [SvgSerializer]
  [SvgSchema]
  [Loader]
}
main --> Session
Session --> Parser
Session --> Planner
Session --> Renderers
Parser --> Registry
Parser --> Command
Planner --> Editor
Planner --> TreeQuery
Editor --> Protocol
Editor --> Document
Document --> TreeStore
Document --> I/O
TreeStore --> Hive
Hive --> Snapshot
@enduml
```

## 设计模式

| 模式 | TypeScript 形式 |
| --- | --- |
| Command | 每个用户意图都是 `Command` 子类，`execute(context)` 返回 `Outcome` |
| Composite | `Node -> ShapeNode/ContainerNode/TextNode -> 13` 个具体节点 |
| Visitor | `NodeVisitor` 覆盖全部节点类；SVG 序列化通过访问者实现 |
| Factory/Registry | `ShapeRegistry -> ShapeProvider` 创建内置与组合图元 |
| Facade | `Document` 隐藏 TreeStore、快照与 I/O |
| Unit of Work | `UnitOfWork` 封装一次树事务，负责提交或回滚 |
| Strategy | `EditTarget + EditScope` 选择参数、矩阵或级联策略 |
| Memento replacement | Hive 保存版本链与 checkout，不为每条命令复制整棵树 |

节点只保存 SVG 值，不保存 parent、sibling 或 child id。结构关系由
`TreeStore` 的 `TreeRecord(links)` 保存，因此视图不会泄漏存储链接。

## 可能的未来变化

| 变化 | 落点 | 成本 |
| --- | --- | --- |
| 新属性 | `ATTRIBUTES` 规格表中的一个记录 | 解析、适用性与写入同时定义 |
| 新图元 | `NODE_TYPES` + `SVG_SCHEMA` + `ShapeProvider` + `NodeVisitor` | 联合类型、Visitor、Schema 测试共同指出遗漏 |
| 新命令 | `Command` 子类、`CommandContext` 方法和 Planner 路由 | 路由与执行均为显式方法 |
| 新前端 | 复用 Parser/Planner/Rendering 边界 | Session 的 readline 循环需替换 |
| 新文件格式 | 新 Reader/Loader/Serializer | `Document` 文件边界需要泛化 |
| 更大历史 | 配置 `historyLimit` | 当前 Map 版本链可工作，但没有 C++ 的定长块布局 |
| 多文档 | 每个前端会话持有独立 Document | Document 目前不可移动，适合显式会话所有权 |
| 协作写入 | 需要冲突策略与同步层 | 当前只保证单写者同步事务 |

## 验证入口

```sh
npm run check
npm test
npm run build
npm run cli -- "init; create g layer; tree"
```

