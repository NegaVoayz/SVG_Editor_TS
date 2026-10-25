# TypeScript 版本设计决策记录

本文记录 arm B 在保持 A 侧可观察行为时，对内部结构作出的八项关键选择。
`OopPlan.md` 说明准备做什么，`OopImpedanceLog.md` 记录这些选择的持续成本，
`Architecture.md` 描述最终形态；本文补上另外三个问题：当时有哪些真实选项、
为什么选中当前方案、以后改变时要付什么代价。

这些理由只代表 TypeScript 版本。尤其是第 8 项，A 侧把 box 作为内核图元，
B 侧把它作为组合图元，两种做法都服务于各自语言和架构约束。

## D1：类层次与闭合联合并存

**背景。** SVG 节点既需要多态行为，也需要在 TypeScript 中把“节点”限制为一个
可知、可检查的集合。只使用接口会让非法节点悄悄混入；只使用类层次又容易把
每一种特殊行为写成继承差异，最终得到一个难以穷尽的基类。

**真实选项。**

1. 纯手写类层次，基类声明所有可选能力，调用处自行判断。
2. 放弃类，只用带 `kind` 字段的普通对象和分支函数。
3. 保留不可变类层次，同时用 `NODE_TYPES` 表和实例类型联合定义闭合的 `Node`。

**选择。** 第 3 种。具体节点仍是类，可以复用不可变属性和访问者入口；
`src/model/node/table.ts` 的 `NODE_TYPES` 把每个标签映射到构造器，
`Node` 由该表推导，而不是手写第二份联合。

**理由与代价。** 新增节点时必须同时进入类型表、Schema、访问者和 Provider；
编译器因此能指出漏项。代价是“添加一种节点”不再是单文件改动，节点构造器和
类型表之间也需要一条测试保持一致。`tests/node-table.test.ts` 守的就是这条一致性。
纯对象方案更轻，但会失去节点方法、构造器可读性和现成的访问者双重分派。

**证据。** `src/model/node/table.ts`、`src/model/node/NodeBase.ts`、
`tests/node-table.test.ts`；对应 S1 的类型级断言在
`tests/type-safety.test.ts`。

## D2：行为判别使用元素名，而非 `instanceof` 链

**背景。** 早期实现大量依靠 `instanceof Rect`、`instanceof Group` 等表达式
选择几何和属性行为。它表达了“对象是什么类型”，却把内部类名变成了 UI 和
I/O 的协议。

**真实选项。**

1. 保留 `instanceof` 链，新增节点时逐个调用点追加分支。
2. 为每种节点增加一个平行的行为对象，再依靠构造器类型查找。
3. 用元素名的闭合字符串联合判别 SVG 行为；只在类族边界继续使用 `instanceof`。

**选择。** 第 3 种。`elementName` 是 SVG 语义的一部分，`switch` 可以依靠
ESLint 的 `switch-exhaustiveness-check` 检查新成员；`instanceof` 保留在
`ElementNode`/`ContainerNode`/`PlainTextNode` 等真正的类族边界。

**理由与代价。** 这样，普通矩形、圆形等节点只改变数据，不会把每个调用点
绑死到具体构造器。代价是 TypeScript 在联合收窄之后仍可能需要辅助函数，
并且“同一种标签由两个类实现”的情况必须禁止。第 8 项的 box 正是为了避免
这种歧义，没有新增 `Box` 节点类。

**证据。** `src/model/node/table.ts`、`src/protocol/attr/spec.ts`、
`src/editor/shape/`。对当前树执行
`git grep -h instanceof 778b3ed -- 'src/**/*.ts'` 可得到 86 行；剩余使用点
均位于类族边界、值对象判别或错误类型检查，不是 SVG 标签分派。

## D3：`NodeVisitor` 承担几何与详情

**背景。** `move`、`scale`、范围计算和 `show` 都需要按节点种类读取几何。
把这些分支继续放在 `Editor` 中会让编辑命令、渲染格式和新节点知识互相纠缠。

**真实选项。**

1. 继续在一个大的 Editor 方法里 `switch elementName`。
2. 把几何方法放到节点类上，由命令直接调用。
3. 用 GoF Visitor 按节点类型双重分派，命令和渲染共享访问者。

**选择。** 第 3 种。`TranslateVisitor`、`ScaleVisitor`、`ExtentVisitor` 和
`DetailsVisitor` 分别处理平移、缩放、范围和显示；序列化器也实现同一基类。

**理由与代价。** 节点不需要知道编辑器、UI 或序列化；新增一种几何操作只新增
一个访问者，而不是给所有节点加方法。GoF Visitor 的代价是每次增加节点种类，
所有访问者都要补方法。这正好迫使作者重新审视每种行为，但在节点扩展频繁时
会产生机械修改。`OopImpedanceLog.md` 第 1 项记录了这一成本。

**证据。** `src/model/visit/NodeVisitor.ts`、`src/editor/shape/`、
`src/io/SvgSerializer.ts`；BR-01 的迁移范围列在
`docs/StructuralRefactor.md`。

## D4：结构链接放在 `TreeStore`

**背景。** 命令会频繁移动、分组、删除节点；如果把 parent、first-child、
next-sibling 写进不可变节点，一次局部结构修改就要复制整条祖先链，并且历史
快照之间会共享过期的链接。

**真实选项。**

1. 节点持有 parent、children、siblings，方法直接在节点上导航，接近 C++ 模型。
2. 每次结构编辑都复制整棵树。
3. 节点只存 SVG 数据；结构由 `TreeStore` 的 `TreeRecord(links)` 单独维护。

**选择。** 第 3 种。`TreeLinks` 负责链接代数，`TreeIndex` 负责 id 索引，
`TreeText` 读取文本，`TreeStore` 负责事务和 MVCC 版本。

**理由与代价。** 节点的不可变快照可以安全复用，`checkout` 不会让节点指向
另一个 HEAD。代价是每次导航都要经过 store，结构操作必须同时维护父节点的
children 和兄弟节点的 links。B 没有照搬 A 的节点外视图对象，因为
`TreeQuery` 和 `TreeRenderer` 已经承担投影职责。

**证据。** `src/model/store/TreeLinks.ts`、`src/model/store/TreeIndex.ts`、
`src/model/store/TreeStore.ts`、`src/model/query/TreeQuery.ts`。

## D5：`ATTRIBUTES` 单表驱动属性

**背景。** 属性命令需要完成解析、检查目标是否支持该属性、生成不可变替换值。
如果每种属性都手写一个命令和一个 parser 分支，重复代码会迅速增长。

**真实选项。**

1. 为每种 `set` 属性维持一个 `Set*Command` 类和一个 Parser 分支。
2. 在 Editor 中使用巨大 `switch (attribute)`。
3. 用 `AttributeSpec` 表同时描述 parser、适用节点和不可变应用函数。

**选择。** 第 3 种。`src/protocol/attr/spec.ts` 的 `ATTRIBUTES` 是唯一规格表；
`AttributeCommand` 保存已解析的强类型值，`AttributeWriter` 统一检查范围并提交。

**理由与代价。** 31 个 Set 类被删除，新增普通属性通常只加一条表记录。
代价是应用函数仍需按节点类型重建对象，并且复杂组合图元不能只靠表项表达，
需要 Provider 路由（见 D8）。

**证据。** `src/protocol/attr/spec.ts`、`src/editor/AttributeWriter.ts`；
`SetCommands.ts` 在 `778b3ed` 中已为 0 行。

## D6：`SVG_SCHEMA` 同时约束读写

**背景。** Reader 若维护一份合法元素/属性 allowlist，Writer 又维护一份输出
列表，两边容易一边接受、一边丢弃，形成不对称的数据损坏。

**真实选项。**

1. Reader 和 Writer 各自维护标签和属性表。
2. Writer 泛化输出任意字段，靠 Reader 保证数据合法。
3. 用一份 `SVG_SCHEMA` 定义标签、属性、内容模式和节点构造方式，Writer 从
   同一个节点联合生成固定字段。

**选择。** 第 3 种。Reader 用 Schema 拒绝未知元素/属性，Writer 的类型化
`switch` 覆盖同一组元素，并以固定顺序输出公共属性。

**理由与代价。** 文件边界只有一处 allowlist，新增合法字段不会出现只读不写。
代价是 Schema 的表项和 Writer 的数据属性函数仍需同步；类型测试会检查 Schema
覆盖所有元素，输出顺序则由重构测试固定。

**证据。** `src/io/SvgSchema.ts`、`src/io/SvgReader.ts`、
`src/io/SvgSerializer.ts`、`tests/model.test.ts`、
`tests/node-table.test.ts`。

## D7：Map 版本链与显式 commit 图

**背景。** A 的 MVCCHive 使用定长块、紧凑 placement 记录和固定窗口来降低
C++ 侧存储成本。TypeScript 的目标首先是行为可验证和 undo/checkout 可理解，
不是复刻内存布局。

**真实选项。**

1. 逐项移植 blocked array、32 字节记录和定长窗口。
2. 每次提交复制完整文档；undo 保存整棵树。
3. 每个虚拟 id 保存版本数组，另存 commit 图、分支位置和高水位。

**选择。** 第 3 种。`Hive` 用 Map 保存版本链，`Snapshot` 固定读取一个
commit id，`History` 只把编辑事件附着到提交号；checkout 保留 redo 分支，
新提交截断它。

**理由与代价。** 算法可在测试中直接观察事务、diffs、prune 和 checkout，
不需要模拟 C++ 内存布局。代价是 Map 版本链的分支可见性、版本回收和窗口
语义都要自己处理；它不追求 A 的存储密度，也不能直接复用 A 的并发假设。

**证据。** `src/model/store/Hive.ts`、`src/model/store/HiveTransaction.ts`、
`src/model/store/Snapshot.ts`、`tests/hive.test.ts`。

## D8：box 是 Provider 组合图元，不是新节点类

**背景。** box 对用户是一个可编辑对象，实际 SVG 却是带 `data-kind="box"`
的 group、一个矩形和一个标签文本。若在 `Node` 联合中加入 `Box`，Reader、
Writer、Visitor、Schema 和树结构都要认识一个并不存在的 SVG 标签。

**真实选项。**

1. 在 `NODE_TYPES`/`Node` 联合中加入 `Box`，再给所有访问者补方法。
2. 让 box 只是用户级语法糖，创建后不再保留组合语义。
3. 保持三个真实 SVG 节点，由 `CompositeShapeProvider` 识别组合并在属性设置时路由。

**选择。** 第 3 种。`BoxProvider` 用一次事务创建 group、`-rect` 和 `-label`；
`attributeTargets("fill")` 返回 group 与 outline，`contentTarget` 返回标签文本。
`data-kind` 使保存和读取保持 round-trip。

**理由与代价。** 核心节点联合仍只含真实 SVG 标签，Reader/Writer 不需要
虚构元素；派生 id 冲突可在事务前整体检查。代价是 Provider 必须知道派生
id 规则，`set fill` 是跨两个节点的原子写，`ungroup` 要显式拒绝组合图元。
B 选择这条路线，A 选择把 box 作为内核图元；两者在用户行为上对齐，但扩展
成本落在不同模块。

**证据。** `src/plugin/ShapeProvider.ts`、`src/plugin/BuiltinProviders.ts`、
`src/editor/AttributeWriter.ts`、`src/editor/Editor.ts`、
`tests/cli.test.ts` 中 box 相关用例。

## 共同代价与复核入口

这些决策不追求让 TypeScript 与 C++“同构”，而是让两侧在 CLI 行为上可比较。
因此最值得警惕的不是抽象层数，而是学习成本被藏在类型、Visitor 和 Provider
边界里。第 1、3、5、6、8 项都要求改一处时检查多处注册表；对应检查分别放在
`npm run check`、类型测试、`node-table.test.ts` 和 CLI 回归里。

修改任何一项前，至少重跑：

```sh
npm run check
npm test
npm run build
```

