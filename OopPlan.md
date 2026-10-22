# arm B 企划：TypeScript + 面向对象

## 1. 目标

用同一个行为规范实现第二套架构，让两套架构承担同一组变更和同一组缺陷，产出四维对照：分派完整性、开放扩展成本、样板量、存储风险。

## 2. 冻结基线

| | 值 |
| --- | --- |
| A（C++） | `95db9b5`，源码 7 527 行 / 70 文件，测试 3 868 行 |
| A 的测试 | 107 个 ctest 用例，`100% tests passed`（Debug，`-Werror` 通过） |
| B（TS） | 本企划的产物 |

A 在实验期间冻结。实验期间对 A 的任何改动走独立分支，实验结束后作为第 7 个对比任务单独处理。

## 3. 行为 oracle

两套实现的 CLI 输出逐字节相同。

| oracle | 位置 |
| --- | --- |
| 107 个 CLI 用例 | `tests/CMakeLists.txt` 的 `add_test` 全集，抽成 `ts/tests/goldens/*.json` |
| §6 / §6.1 会话稿 | `phase_cli_1.md` 第 6 节，逐行 diff |
| 5 个 fixture | `tests/fixtures/*.svg`，原文件复用 |
| 提交 id 序列 | `cli_context_commit_ids`：`init`→2、`canvas`→3、`read`→4，连续无跳号 |
| 往返保真 | 亚微米值 `4e-07`、指数形态 `1e+20`、`1e-07px` 存后重读同值 |

数值有两条策略，B 两条都照抄：

| 用途 | 函数 | 规则 |
| --- | --- | --- |
| 显示（tree / show / set 回显） | `number_text` | 固定 6 位小数，去尾零，`-0` 归一为 `0` |
| 序列化（`save`） | `svg_text` / `exact_number_text` | 最短往返形态，必要时用指数 |

允许的差异只有一条：C++ 存 `float`（`ε = 1.19e-7`），TS 存 `double`（`ε = 2.22e-16`）。两臂用同一条相对阈值 `8 · ε · scale` 判定"这个分量是噪声"，于是抑制点相差 9 个数量级。

因此 oracle 分两类：

| 类别 | 比较方式 |
| --- | --- |
| 除 `transform=` 之外的输出 | 字符串相等 |
| `transform=` 的文本 | 每臂内部字符串相等；跨臂比较矩阵，按各自 `ε` 给相对容差（现成的 9 个矩阵 fixture 就是这么验的） |

`transform=` 的绝对阈值是 A 的现存缺陷（`docs/Issues.md` I-17）。修它属于 `95db9b5` 之后的变更，按 §2 走独立分支，两臂同步改。

## 4. B 的规则

### 4.1 形态

1. TypeScript，`strict`；`Node`、`Command`、`Attribute`、`Event`、`Refusal`、`ShapeProvider` 六个抽象基类。
2. 节点 13 个类，一类一文件。
3. 节点类字段全部 `readonly`，构造后不可变；每个变换返回新实例。
4. 一个 intent 一个 `Command` 子类，`execute(ctx)` 返回 `Outcome`。
5. `UnitOfWork` 是唯一写入者；读走 `Snapshot` / `TreeQuery`。
6. 序列化与渲染用 `NodeVisitor` 实现类，留在上层。

### 4.2 禁止项

每条都是执行者会自然写出、写错后无报错的形态。

| 禁止 | 为什么执行者会这样做 | 违反后的表现 |
| --- | --- | --- |
| 节点类出现 mutator（`move()` 改 `this`） | 这是 OOP 的默认写法 | 旧快照跟着变，undo 显示未来。A 的 `const T&` 把这条堵死在类型层，TS 没有等价物 |
| 存储层返回可变引用（把 `const T&` 放宽成 `T`） | 想要可变就改签名最省事 | 历史一致性失去唯一支点；`diffs()` 与实际改动脱钩 |
| 节点类持有 `TreeStore`/`Document` 引用，或存储 parent/child/sibling 的 id | 写 `container.moveCascade()` 时需要子节点 | `checkout 2` 之后节点读到 HEAD 的树。B 还会因此需要视图投影层，多 15 个类 |
| 属性写入按节点 kind 的名字分派 | 直接从 A 的 `switch` 直译过来最像 | 每加一个属性改 13 个类；`phase_cli_1.md` §2.1 明文禁止 |
| 序列化或渲染写成节点方法 | `node.toSvgAttributes()` 看起来最 OOP | 序列化进入 Model 层；插件要自带序列化就得改模型类 |
| `Command` 内调用 `commit()` | 命令自己收尾最自然 | 命令自行收尾会带出多个 commit；undo 粒度按命令计，随即失效 |

### 4.3 工具链

```json
{ "strict": true, "noUncheckedIndexedAccess": true, "exactOptionalPropertyTypes": true,
  "noImplicitOverride": true, "noFallthroughCasesInSwitch": true,
  "noUnusedLocals": true, "noUnusedParameters": true }
```

`npm run check` = `tsc --noEmit && eslint . --max-warnings 0`。ESLint 开 `@typescript-eslint/switch-exhaustiveness-check`，并禁 `any`。这三项对应 A 的 `-Werror`。

## 5. 目录与模块映射

```text
ts/src/model/{values,node,store,query,uow,document}
ts/src/protocol/{cmd,attr,event,refusal,view}
ts/src/plugin
ts/src/editor
ts/src/io
ts/src/ui
ts/src/cli
ts/tests/{goldens,fixtures}
```

| A | B | 行数 |
| --- | --- | --- |
| `Model/`（3 018） | `src/model/**` | 3 400 + hive 900 |
| `Protocol/`（774） | `src/protocol/**` | 1 000 |
| `Editor/`（1 695） | `src/editor/**` | 2 100 |
| `Planner/`（256） | `src/planner/**` | 260 |
| `Ui/`（1 784） | `src/ui/**` | 2 100 |
| 测试 3 868 | `ts/tests/**` | 3 800 |

护栏对照：`cmake/CheckLayering.cmake` ↔ ESLint `no-restricted-imports`（`model/` 不得 import 上层）。

## 6. MVCC 移植

### 6.1 操作

| C++ | TS |
| --- | --- |
| `MVCCHive<T>` | `class Hive<T>` |
| `begin_transaction()` | `beginTransaction(): Tx` |
| `edit.emplace(args…)` | `tx.emplace(payload): Vid` |
| `edit.replace(id, v)` / `erase(id)` / `find(id)` | 同名，`find` 返回 `T \| undefined` |
| `edit.commit()` / `commit(id)` / `rollback()` | `tx.commit(id?): Snapshot` / `tx.rollback()` |
| `head()` / `snapshot.commit_id()` | `hive.head()` / `snap.commitId()` |
| `hive.diffs(commit)` | `hive.diffs(c): Diff[]`，`{vid, kind: 'insert'\|'update'\|'remove'}` |
| `hive.undo()` / `redo()` | 同名，返回 `boolean` |
| `clear_history()` / `prune_before()` / `clear()` | 同名 |
| `reset_empty()` / `begin_load()` / `create_root()` | 同名。装载器先清空再建真正的根，第一个分块即基线 |

`reset_empty` / `begin_load` / `create_root` 三个方法只服务装载器。照抄，因为 `read` 的提交 id 序列是 oracle 的一部分。

### 6.2 不变量

1. 虚拟 id 单调递增、永不复用。
2. 快照只看到 `commitId` 不大于自己的版本。
3. `diffs(commit)` 逐虚拟 id 分类，含链接被改动的邻居。
4. 从旧 checkout 提交截断 redo 尾巴。
5. 显式 commit id 大于高水位；空提交也推进 checkout。
6. 检查点（`save`、`canvas`）复用当前 checkout id 作为基线；`init` 与 `read` 的第一分块产生真实提交。

### 6.3 不移植

blocked array、32 字节对齐、`std::array<T,2048>` 块、`release_empty_blocks()` 的每提交全扫。TS 换 `Map<Vid, Version<T>[]>` + commit 图 + 快照引用计数。

### 6.4 只读契约

一条规则：`Snapshot.at()` 与 `Tx.find()` 返回 `Readonly<T>` 视图；节点类本身不可变，所以调用方拿不到写入路径。

### 6.5 验收门

`build/_deps/mvcchive-src/tests/` 的 8 个语义测试移植后全绿：`transaction`、`undo_redo`、`history`、`commit_id`、`prune`、`lifetime`、`storage`、`model`。跳过 `layout`、`blocked_vector`、`concurrency`。

## 7. 类清单

```text
values/     Transform Color ViewBox IdentityAttr PaintAttr TransformAttr                    8
node/       Node(abstract)
              ShapeNode → Rect Circle Ellipse Line
              ContainerNode → Group Defs Svg Symbol Switch
              TextNode → TextWrapper Tspan TextPath
              PlainTextNode                                                                15
visit/      NodeVisitor(abstract)                                                            1
store/      Hive TreeStore Snapshot                                                          3
query/      TreeQuery                                                                        1
uow/        UnitOfWork                                                                       1
document/   Document DocumentInfo                                                            2
cmd/        Command(abstract) + 20 子类                                                     21
attr/       With* 30 个接口 + 30 个 Set*Command                                             60
event/      EditEvent(abstract) + 21 子类                                                   22
refusal/    Refusal(abstract) + 38 子类                                                     39
plugin/     ShapeProvider(abstract) + Registry + 6 provider                                  8
editor/     Editor MovePlanner ScalePlanner CreateWriter SetWriter                            6
io/         SvgSerializer(visitor) SvgReader Loader                                           3
ui/         Tokenizer Parser TreeRenderer EventRenderer RefusalRenderer                       5
cli/        main                                                                             1
```

约 197 个类，按一类一文件约 190 个文件，源码 9 500–11 000 行。A 是 70 文件 / 7 527 行。

## 8. 四个分派点

| 问题 | 形态 | §2.1 |
| --- | --- | --- |
| 这行是什么命令 | `Command` 子类 + `verbs` 表 | 允许的"命令分发" |
| 创建哪种元素 | `ShapeProvider` 注册表，`build()` 返回递归 `NewNodeTree` | 允许的"图形工厂" |
| 哪种属性 | 能力接口 `WithX { withX(v): this }`，`isWithX = (n) => 'withX' in n`，`SetX.execute` 内探测 | 不走 tag 分派 |
| 哪种节点 | 纯行为用虚方法（`moved`、`scaledBy`、`svgTag`）；序列化与渲染用 `NodeVisitor` | GoF Visitor |

属性用能力接口是 A 的 `requires { specific.x = value; }` 在 TS 的等价物：探测的是能力存在，判断点落在拥有该字段的类上。加一个属性 = 一个 3 行接口 + 一个 10 行命令，不改任何不认识它的类。声明接口而未实现方法由 tsc 报错。

## 9. 视图投影

A 的 `View.hh` 已把视图改成独立投影：`ElementShape`、`ContainerShape`、`TextShape`、`NodeShape`、`CharacterView`，不含 parent、sibling、`child_attr`。

B 的节点类本身就只携带 SVG 属性，与视图形状重合，因此 B 不建投影类族。这一条依赖 §4.2 第三条禁止项：节点类一旦存储 parent id，B 就必须补 15 个投影类，两臂的样板量对比也随之改变。

## 10. 工作包

| # | 内容 | 出口标准 | 人日 |
| --- | --- | --- | --- |
| W0 | pnpm、vitest、tsconfig、eslint、目录、空接口 | `npm run check` 绿 | 0.3 |
| W1 | 值类型 + `number_text` / `exact_number_text` 两套 | C++ 单测搬 60 条断言全绿（9 个矩阵 fixture、双向 skew 分解） | 1.0 |
| W2 | Hive | §6.5 的 8 个测试绿 | 1.5–2.0 |
| W3 | Model：TreeStore、Document、Reader、Writer、Loader | 5 个 fixture 读入后 `tree` 与 A 逐字节同 | 1.5 |
| W4 | Protocol 类族 | 类型层能构造全部 20 条命令 | 0.8 |
| W5 | Editor：命令执行、几何、属性写入、历史、ShapeProvider | §6 编辑语义全过 | 1.5 |
| W6 | Planner、UI、CLI | §6 / §6.1 逐行同 | 1.2 |
| W7 | 107 条 golden 全绿 | `npm test` 107/107 | 1.0 |

合计 8.8–9.3 人日。

## 11. 度量

### 11.1 静态

源码行数、测试行数、文件数、类数。

### 11.2 变更成本

两臂各做一遍，顺序固定。每个任务记录：改动文件数、净增行数、首次绿前的强制错误数、测试发现的静默缺口数、用时。

| # | 任务 |
| --- | --- |
| T1 | 新增只影响显示的命令 `zoom <factor>` |
| T2 | 新增属性 `opacity`（0..1，tree/show/save/read 全链路） |
| T3 | 新增叶子类型 `polygon <points…>`（含 move / scale 规则） |
| T4 | 新增复合类型 `box`（`phase_cli_1.md` §4.4 全套） |
| T5 | `history` 默认 cap 从 20 改为可配置 |
| T6 | `move` 默认选择器从 `params+cascade` 改为 `transform` |

A 侧预登记答案见 `docs/Issues.md`。T4 在 A 上是 14 个文件、+201 生产行、6 处强制 14 处静默。

### 11.3 种子缺陷

| # | 注入 | A | B |
| --- | --- | --- | --- |
| S1 | 从穷尽分派删掉一个 case | 编译错 | tsc 错 |
| S2 | enum 加成员不处理 | 编译错（`-Werror`） | ESLint 错 |
| S3 | 节点加字段不改序列化 | 静默 | 静默 |
| S4 | 加 Command 不写 handler | 编译错 | tsc 错 |
| S5 | 表里属性名拼错 | 静默 | 静默 |
| S6 | undo 的 insert/remove 反转 | 静默 | 静默 |
| S7 | 编辑前不复制节点 | 不存在此缺陷 | 静默，历史被改写 |
| S8 | 新增 refusal 不写句子 | 编译错 | tsc 错 |

`-Werror` 落地后 S2 已不属于差异点。S3、S5、S6 两臂都漏。

### 11.4 运行时

`set`、单节点读、undo 各 10 万次。只记录，不作判据。

## 12. 判据

分维度判定，不给总分。

| 维度 | A 胜 | B 胜 |
| --- | --- | --- |
| 分派完整性 | S1–S8 中 A 的捕获数不低于 B | B 的捕获数不低于 A |
| 开放扩展 | T4 的 LOC 低于 B | T4 的 LOC 低于 A，且 T3 同 |
| 样板量 | 源码行数、文件数、类数三项均低于 B | 三项均低于 A |
| 变更成本 | T1–T6 总行数低于 B | T1–T6 总行数低于 A |
| 存储风险 | S7 在 A 上不可达 | B 用测试证明 S7 不可达 |

平局是预期结果。A 的强保证来自关闭集合，B 的扩展性来自打开集合。

## 13. 风险

| 风险 | 对策 |
| --- | --- |
| 直译污染：B 里出现 tag 分派 | 去直译阶段 + ESLint 禁 `switch` on kind（两处允许点除外） |
| `float` → `double` 打红 golden | 先移植 golden 再改代码；按 §3 的白名单放宽末位 |
| 100+ 条 golden 锁死散文 | 散文改动集中到 `src/ui` 一层 |
| 进度失控在 W2 | W2 只求 §6.5 的 8 个测试，不追性能，不搬 blocked array |
| 两臂不同步 | A 冻结在 `95db9b5` |

## 14. 交付物

1. `ts/` 实现，`npm run check` 与 `npm test` 全绿（107 条）。
2. `docs/OopImpedanceLog.md`：去直译阶段逐处登记"翻成 OOP 后变长、变弱、无处安放"的位置，预期 10–20 条。
3. `docs/DesignComparison.md`：§11 实测表 + §12 判定 + 一页结论。
4. 每臂每个任务一个 commit，消息 `Task Tn: <name> (arm A|B)`。

## 15. 时间

| 阶段 | 内容 | 人日 |
| --- | --- | --- |
| P0 | W0–W1 | 1.3 |
| P1 | W2 | 1.5–2.0 |
| P2 | W3–W6 | 5.0 |
| P3 | W7 | 1.0 |
| P4 | T1–T6 双臂 | 2.0 |
| P5 | S1–S8 双臂 | 0.5 |
| P6 | 去直译 + 阻抗日志 | 1.0 |
| P7 | 报告 | 0.5 |
| | | 12.8–13.3 |
