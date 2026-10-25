# TypeScript 版本设计决策记录

本文记录 arm B 的八项结构决策。每项只描述仓库中已经采用的做法、实际约束、
代价和证据。`OopPlan.md` 记录工作包，`OopImpedanceLog.md` 记录持续成本，
`Architecture.md` 描述最终模块关系。

这些理由只代表 TypeScript 版本。第 8 项记录了 B 使用组合图元，而 A 使用
内核 box 图元这一已存在的结构差异。

## D1：类层次与闭合联合并存

**决策。** 每个 SVG 节点使用不可变类；`src/model/node/table.ts` 的
`NODE_TYPES` 把元素名映射到构造器，`Node` 类型由该表推导。

**原因。** 节点需要类提供的构造、不可变更新和 Visitor 入口；上层同时需要
一个可穷举的节点集合，供 Schema、表注册和类型检查使用。

**代价。** 新增节点要同步构造器、`NODE_TYPES`、`SVG_SCHEMA`、访问者和
Provider。节点表与构造器标签由 `tests/node-table.test.ts` 保持一致。

**证据。** `src/model/node/table.ts`、`src/model/node/NodeBase.ts`、
`tests/node-table.test.ts`、`tests/type-safety.test.ts`。

## D2：SVG 行为按元素名判别

**决策。** 几何、属性和内容行为使用闭合的 `elementName` 字符串联合；
`instanceof` 用于 `ElementNode`、`ContainerNode`、`PlainTextNode` 等类族边界，
以及值对象和错误类型检查。

**原因。** 元素名直接对应输出中的 SVG 标签；TypeScript 可以对它做穷尽检查，
ESLint 的 `switch-exhaustiveness-check` 会在新增成员时指出遗漏。

**代价。** 某些联合收窄仍需要辅助函数；同一种 SVG 标签不能由两个类重复表示。
当前 `src/**/*.ts` 中有 85 行包含 `instanceof`，共 88 次文本出现。

**证据。** `src/model/node/table.ts`、`src/protocol/attr/spec.ts`、
`src/editor/shape/`、`eslint.config.mjs`。

## D3：`NodeVisitor` 承担几何与详情

**决策。** `TranslateVisitor`、`ScaleVisitor`、`ExtentVisitor` 和
`DetailsVisitor` 分别实现平移、缩放、范围与显示；`SvgSerializer` 使用同一
访问者基类。

**原因。** 编辑、渲染和序列化都需要按节点类型读取行为。访问者把这些行为集中
在各自模块，避免 Editor 直接持有所有节点种类知识。

**代价。** 新增节点种类时，每个访问者都要补对应方法。这是节点扩展时需要
承担并逐项复核的成本，记录在 `OopImpedanceLog.md` 第 1 项。

**证据。** `src/model/visit/NodeVisitor.ts`、`src/editor/shape/`、
`src/io/SvgSerializer.ts`。

## D4：结构链接由 `TreeStore` 维护

**决策。** 节点只保存 SVG 数据；parent、children、sibling 等链接保存在
`TreeStore` 的 `TreeRecord` 中。`TreeLinks`、`TreeIndex`、`TreeText` 分别处理
链接代数、id 索引和文本读取。

**原因。** checkout 后节点必须与其提交版本一致。节点不携带结构链接，旧快照
就不会导航到当前 HEAD 的树。

**代价。** 每次结构导航都经过 store；一次结构编辑要同时维护父节点的 children
和相邻 record 的 links。渲染投影由 `TreeQuery` 和 `TreeRenderer` 完成。

**证据。** `src/model/store/TreeLinks.ts`、`src/model/store/TreeIndex.ts`、
`src/model/store/TreeStore.ts`、`src/model/query/TreeQuery.ts`、
`tests/hive.test.ts`。

## D5：`ATTRIBUTES` 表驱动属性

**决策。** `AttributeSpec` 同时描述属性解析、适用节点和不可变应用函数；
`AttributeCommand` 保存已解析值，`AttributeWriter` 统一提交。

**原因。** `set` 命令共享同一套解析、目标检查和事务流程。属性规格集中后，
普通属性由一张表提供，事务与事件记录留在写入服务。

**代价。** 应用函数仍需按节点类型重建对象；组合图元的跨节点路由由 Provider
补充。`set points` 使用 `Points` 值类型保证 polygon 至少有三个坐标对。

**证据。** `src/protocol/attr/spec.ts`、`src/editor/AttributeWriter.ts`、
`src/model/values/Points.ts`、`tests/protocol.test.ts`、`tests/values.test.ts`。

## D6：`SVG_SCHEMA` 同时约束读写

**决策。** `SVG_SCHEMA` 定义元素、属性和内容模式；Reader 用它验证输入，
Writer 从同一节点联合按固定顺序输出，并由 Schema 测试检查元素覆盖。

**原因。** 文件输入与输出使用同一份元素边界，新增合法字段时可以同时定位
Reader、Writer 和测试。

**代价。** Schema 表项与 Writer 数据属性函数仍需同步；`NODE_TYPES`、
`SVG_SCHEMA` 和 `NodeVisitor` 是新增元素时必须共同更新的位置。

**证据。** `src/io/SvgSchema.ts`、`src/io/SvgReader.ts`、
`src/io/SvgSerializer.ts`、`tests/model.test.ts`、`tests/node-table.test.ts`。

## D7：Map 版本链与显式 commit 图

**决策。** `Hive` 用 Map 保存每个虚拟 id 的版本链，`Snapshot` 固定读取一个
commit id，`History` 把命令事件附着到提交号。

**原因。** TypeScript 实现直接表达 transaction、snapshot、diffs、prune 和
checkout 语义，测试可以驱动这些 API。

**代价。** 分支可见性、版本回收和 history 窗口由 TypeScript 代码维护；
该实现以语义清晰为主，不采用 A 侧的定长块存储。

**证据。** `src/model/store/Hive.ts`、`src/model/store/Snapshot.ts`、
`src/editor/history/History.ts`、`tests/hive.test.ts`。

## D8：box 使用组合 Provider

**决策。** box 由 `BoxProvider` 创建 `data-kind="box"` 的 group、矩形和标签；
`CompositeShapeProvider` 负责 fill 与 content 的目标路由。文件结构保持三个
真实 SVG 节点。

**原因。** Reader/Writer 和节点联合继续只处理真实 SVG 标签；派生 id、原子创建
和跨节点更新集中在 Provider 与 `AttributeWriter`。

**代价。** Provider 必须在事务前检查全部派生 id；缺少 `rect` 或 `label` 的
外部组合结构会返回明确拒绝；`ungroup` 由 Provider 能力拒绝。A 侧将 box 作为
内核图元处理，因此两边的实现位置不同，但用户级行为可以交叉验证。

**证据。** `src/plugin/ShapeProvider.ts`、`src/plugin/BuiltinProviders.ts`、
`src/editor/AttributeWriter.ts`、`src/editor/Editor.ts`、`tests/cli.test.ts`。

## 复核入口

结构修改后运行：

```sh
npm run check
npm test
npm run build
node docs/check_docs.mjs
```

`docs/Consistency.md` 记录当次统计、链接、提交、标签与文档事实检查结果。

