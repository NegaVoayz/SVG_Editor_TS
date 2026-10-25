# 测试策略与覆盖说明

本文对应当前实现的 9 个测试文件、132 条 Vitest 用例。测试不是按文件
数量追求覆盖率的堆积，而是把 CLI 行为、不可变模型、MVCC 历史、类型约束和
文档 Schema 分层固定下来。

## 1. 验证入口

```sh
npm run check
npm test
npm run build
```

期望结果：

```text
npm run check   tsc --noEmit 与 eslint 成功（正常时无额外输出）
npm test        Test Files  9 passed (9)
                Tests  132 passed (132)
npm run build   tsc -p tsconfig.build.json 成功
```

`check` 同时验证 TypeScript 编译和 ESLint。`strictTypeChecked` 不使用警告
豁免，`--max-warnings 0` 让任何 warning 都成为失败；`no-explicit-any` 和
`switch-exhaustiveness-check` 属于验收规则，不是编辑建议。

## 2. 测试分布

这里的“行”是文件物理行数，空行和注释也计算在内。

| 文件 | 行 | 用例 | 守住的层 | 删除它后最容易静默的问题 |
| --- | ---: | ---: | --- | --- |
| `tests/cli.test.ts` | 690 | 79 | Session、Parser、Planner、Editor、Renderer 的可观察行为 | 命令路由、输出措辞、提交边界和历史窗口出现回归 |
| `tests/editor.test.ts` | 255 | 7 | Editor 与其协作者的事务级行为 | 属性写入、cascade、group 顺序和 box 内部结构失配 |
| `tests/hive.test.ts` | 280 | 13 | MVCC 版本链、commit、undo/redo、prune | 旧快照被污染，或 redo 尾部和 checkout 语义悄悄改变 |
| `tests/model.test.ts` | 218 | 9 | 树链接、Loader/Reader/Writer round-trip | 节点仍在但父子顺序、id 或 SVG 文本已经损坏 |
| `tests/node-table.test.ts` | 44 | 3 | 节点表、构造器标签和 `SVG_SCHEMA` 覆盖 | 新节点没有登记，或读写一侧漏掉整个元素 |
| `tests/protocol.test.ts` | 71 | 2 | 协议投影与冻结的 attribute command | 树投影和不可变属性路径逐渐偏离协议 |
| `tests/scaffold.test.ts` | 9 | 1 | 包的公开身份 | 构建入口被误改到另一个项目名称 |
| `tests/type-safety.test.ts` | 106 | 3 | 类型系统与运行时事务守卫 | 编译期承诺退化成 `any`，或 staged 写提前泄漏 |
| `tests/values.test.ts` | 128 | 15 | 数字、长度、颜色、ViewBox、Transform、Points | 显示精度、单位兼容和序列化拼写漂移 |
| **合计** | **1,801** | **132** | 从值对象到 CLI 的完整链路 | 单层通过但端到端语义改变 |

## 3. CLI 回归守什么

`cli.test.ts` 的 79 个 `it` 标题本身就是全仓最接近“用户规则清单”的地方。
按职责可分为以下几组：

- **启动和输出协议：** 未初始化拒绝、`init`、`tree`、`show`、`canvas`、
  comments、分号、`help`、`exit`、未知命令；
- **值和拒绝：** 单位混用、负尺寸、非法画布、非法 viewBox、非法 id、保留根 id；
- **创建与树结构：** 每种真实节点、text 子节点、嵌套、group/ungroup、addto、
  front/back、重复成员和环检测；
- **移动和缩放：** transform/params、cascade/restrict、默认值、坐标系边界、
  空容器、零位移、非法因子；
- **历史和 I/O：** undo/redo、checkout、commit 连续性、折叠窗口、cap、
  read/save、无来源路径、未命名 id 与保留 id 重命名；
- **扩展图元：** zoom 不提交、opacity 全链路、polygon 三对最小值与 `set points`、box fill、
  content、派生 id 冲突、round-trip 和禁止 ungroup；
- **parity 回归：** `history n` 的 HEAD+n 邻居窗口、最后一个子容器后的树线、
  box 第六个 fill 操作数。

例如 `it("refuses a colliding derived box id without changing the document")`
不仅检查错误文本，还检查 `n`、`n-label` 没有出现、原 `n-rect` 仍在。这样的
用例把“拒绝前不写事务”从口头约束变成可执行证据。

运行单个 CLI 用例：

```sh
npx vitest run tests/cli.test.ts -t "keeps zoom outside the document and history"
```

## 4. 类型级测试怎样算测试

`tests/type-safety.test.ts` 在 `tsc --noEmit` 阶段执行，而不是在 Vitest
运行时执行。它用 `@ts-expect-error` 证明下面的表达式必须编译失败：

| 编号 | 断言 |
| --- | --- |
| S1 | 闭合联合少一个成员时，完整性类型不成立 |
| S2 | enum 成员不能少写 |
| S3 | `readonly` 几何字段不能在原对象上赋值 |
| S4 | 没有 `execute()` 的具体 Command 不能实例化为有效命令 |
| S5 | 调用不存在的方法名（`mov`）必须报错 |
| S8 | refusal 不能访问不存在的字段名 |

如果被注释掉的错误消失了，`@ts-expect-error` 本身会报“未使用预期错误”，
所以删掉实现约束不会被静默接受。`NodeVisitor` 的抽象方法要求所有节点都有
实现，ESLint 的 `switch-exhaustiveness-check` 则覆盖运行时的元素名和事件名
switch。`node-table.test.ts` 另行在运行时检查每个具体节点恰好出现一次，并且
每个节点都有 Schema 记录。

类型测试不能替代行为测试：它证明错误写法无法通过编译，不证明正确写法会产生
正确的 SVG。两层必须同时存在。

## 5. 不能由 CLI 直接观察的部分

### MVCC 重入

CLI 是顺序会话，无法自然制造同一事务重复 commit、在 rollback 后继续写、
或同时打开多个 writer。`hive.test.ts` 直接驱动 `Hive` 和 `HiveTransaction`，
覆盖隔离写、显式 commit、rollback、清空、prune 和 undo/redo 反转。

### `generation.valid`

JavaScript 的 `Map` 不会像复用的 C++ 存储块那样销毁并回收对象，因此不能
依靠真实悬空引用证明旧 `Snapshot` 失效。`Hive` 使用 `generation` 和
`valid` 标志守卫读取；测试清空 generation 后访问旧 snapshot，验证它明确失败。

### 不可变引用相等

“不可变”不能只看类型：运行时仍可能有人替换原对象。`type-safety.test.ts`
在事务提交、update、rollback 前后比较 `document.node(group)` 的引用，证明
staged 写没有修改已提交对象。`hive.test.ts` 也保留旧 snapshot 并检查其值。

### 并发和资源上限

当前没有并发读者、线程竞态、超大文档、深度递归爆栈、fuzz 输入或性能基准。
这些不是“由顺序 CLI 测试间接覆盖”的内容，而是明确的未覆盖区。

## 6. 已知未覆盖与缺陷

- 没有 property-based/fuzz 测试；XML parser 和 transform 数学只覆盖手选边界。
- 没有性能基准、内存上限或大文件退化测试。
- 没有并发 reader/writer 测试；`writerActive` 的拒绝路径只有代码审查证据。
- 文件 I/O 只验证支持的子集，不验证完整 SVG 1.1/2 特性。

## 7. 新增一条规则的落点

假设新增“某个几何值必须非负”：

1. 在 `tests/values.test.ts` 增加解析和显示边界；
2. 在 `tests/cli.test.ts` 增加一个成功会话和一个拒绝会话，检查 HEAD/树未变；
3. 如果加入新的属性规格，在 `src/protocol/attr/spec.ts` 写入 `ATTRIBUTES`
   表项，并在 `tests/editor.test.ts` 验证不可变替换；
4. 如果加入新节点或 Schema 字段，同步 `NODE_TYPES`、`SVG_SCHEMA`、
   `NodeVisitor` 的检查和 `tests/node-table.test.ts`；
5. 若是读者/写者对称规则，在 `tests/model.test.ts` 做保存、读取、再保存；
6. 最后运行三个验证命令，并把新用例计入文档，不使用估算数字。

polygon 的至少三个坐标对规则由 `Points.parse()` 统一承担，创建、Reader 和
`set points` 都经过同一入口；CLI 测试同时覆盖成功更新与每条拒绝路径。

测试名称应写“系统应拒绝/保持什么”，而不是复述实现函数名。CLI 用例尤其应
至少断言一个成功输出、一个拒绝输出和必要的文档/HEAD 不变性。

