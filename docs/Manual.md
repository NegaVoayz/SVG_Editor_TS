# arm B 命令手册

本手册描述 `SVG_Editor_TS` 自己实现的命令语言，不要求读者先阅读 C++ 版本。
所有示例都使用仓库构建后的 CLI。命令返回的是可观察结果；拒绝也是结果，不会
为了让命令“看起来成功”而修改文档。

## 1. 启动与输入格式

环境要求是 Node.js 22 或更新版本、npm 10 或更新版本。

```sh
npm install
npm run build
npm run cli
```

交互模式显示 `svg-editor 0.1 — type 'help' for commands`，提示符是 `svg> `。
也可以把一个会话作为单个参数交给构建产物：

```sh
node dist/cli/main.js 'init; create rect r 10 20 30 40 #ff0000; tree'
```

CLI 参数会用空格重新连接，所以最好把整个会话放进同一组命令行引号。Windows
上通过 `npm run cli -- "..."` 传递含分号的参数时，可能先被 `cmd.exe` 拆开；
直接调用 `node dist/cli/main.js "..."` 更可预测。

输入规则如下：

- 一行可以放多条指令，用 ASCII 分号 `;` 分隔；
- 空白行不产生输出，也不进入历史；
- 行的第一个非空白字符是 `#` 时，整行是注释；
- `#` 只有在行首（忽略前导空白）才是注释，图形颜色中的 `#` 仍属于值；
- 双引号把空格和空串合为一个操作数；
- 引号内用 `\"` 表示双引号，用 `\\` 表示反斜杠；
- 引号可以用于文本、路径和 transform；SVG id 即使加了引号也仍是 XML id，
  例如 `"a b"` 不是合法 id；
- 分号扫描发生在词法分析之前，因此引号内不能安全地放分号；
- `help`、`zoom` 和注释由前端处理，不进入文档历史；其余文档命令要求先
  `init` 或 `read`。

未初始化时：

```text
svg> tree
error: no document. use 'init' or 'read' first
```

`help` 与本手册都列出命令，但本手册进一步说明边界条件和提交行为。

## 2. 节点名与基本视图

SVG id 必须是 XML Name：首字符是字母、`_`、`:` 或非 ASCII 起始字符，后续
还可包含数字、`-`、`.`。`svg` 是根节点的保留别名，任何非根元素都不能使用它。
命令中的 `/` 和 `svg` 都表示根；其他名字按 SVG id 查找。内部 Hive 的虚拟 id
不会出现在命令语言或输出中。

`tree [id]` 默认显示整个文档。`tree id` 显示该节点和它的子树；`show id`
显示一个节点的父节点、几何、绘制属性和 transform。

```text
svg> init
canvas 800x600 created
svg> create g layer
g#layer created
svg> create rect box 0 0 10 10 #ff0000 in layer
rect#box created in g#layer
svg> show box
rect#box  parent=g#layer
  x=0 y=0 w=10 h=10
  fill=#ff0000
```

根节点不显示父节点。树的第一行是画布尺寸；同级子节点按从前到后的 SVG
文档顺序显示，最后一项使用 `└──`，其余项使用 `├──`。容器是最后子节点时，
它的后代缩进为四个空格，不再出现多余的竖线。

## 3. 值语法

### 3.1 长度和百分比

长度是一个有限数，可以带以下后缀：

| 后缀 | 含义 |
| --- | --- |
| 无后缀 | SVG user unit |
| `px`、`pt`、`in` | 英制换算族 |
| `mm`、`cm` | 公制换算族 |
| `em`、`ex` | 当前字体相对单位 |
| `%` | 百分比 |

例如 `10`、`1.5px`、`2cm`、`-3mm` 和 `25%` 都是可解析值。几何尺寸和半径
不能为负；画布宽高必须为正。百分比只能与百分比相加，长度只能在与自身能换算的
单位族内相加；公制与英制不会为了“算得出来”而混用。

显示值最多保留六位小数并去掉尾零；当前值小到六位小数会变成零时，显示精确
拼写而不是伪造一个零。负零显示为 `0`。文件序列化使用能读回同一数值的最短
表达，避免把亚微米几何值舍掉。

### 3.2 paint

`fill`、`stroke` 和创建时最后的颜色操作数接受：

- `none`、`currentColor`；
- CSS 命名颜色和系统颜色；
- `#rgb` 或 `#rrggbb`；
- `rgb(r,g,b)`，通道为 0..255；
- `rgb(r%,g%,b%)`；
- `url(#id)`，可带纯颜色 fallback。

三位十六进制会展开为六位，例如 `#f00` 显示为 `#ff0000`。当前子集不支持
`rgba(...)`、`hsl(...)`、alpha 颜色或渐变定义；`url(...)` 只作为 paint server
文字保存，不解析被引用资源的几何。

### 3.3 `viewBox`、`points` 与 `transform`

`viewBox` 接受四个有限数，可用空格或逗号分隔；后两个数是宽高，不能为负。

```text
svg> set svg viewBox "0 0 800 600"
svg updated: viewBox="0 0 800 600"
```

`polygon` 的点由至少三个 x/y 坐标对构成。`create` 可以接受 A 风格的引号点串，
也可以接受扁平的坐标操作数：

```text
svg> create polygon tri "0,0 10,0 5,10" #00ff00
polygon#tri created
svg> create polygon flat 0 0 10 0 10 10
polygon#flat created
```

点对可以用空格或逗号分隔。少于三对、坐标数为奇数或任一坐标无法解析时，
创建会被拒绝。`set <id> points "<x,y ...>"` 会以不可变替换更新完整点表，
并沿用同一条三对最小值规则。

`transform` 是一个或多个以下函数，可空格或逗号分隔：

```text
translate(tx [ty])
scale(sx [sy])
rotate(angle [cx cy])
skewX(angle)
skewY(angle)
matrix(a b c d e f)
```

空串、纯空白和 `none` 都是单位 transform。读取和显示会把矩阵归一化为
`translate(...) rotate(...) scale(...) skewX(...)` 或 `skewY(...)`，省略
恒等步骤，并选择更短、稳定的一种 skew 分解。

### 3.4 opacity

`opacity` 接受有限数，范围是 0 到 1。它与 paint 的 alpha 分开保存：

```text
svg> set tri opacity 0.5
polygon#tri updated: opacity=0.5
svg> set tri opacity 2
error: opacity must be between 0 and 1
```

## 4. 完整命令表

下表省略 `create` 的公共后缀 `[in <parent-id>]`，但每一行都允许它。

| 命令 | 语义与成功输出 |
| --- | --- |
| `tree [id]` | 显示根或指定节点的子树 |
| `show <id>` | 显示一个节点及其属性 |
| `history [n]` | 显示 HEAD 附近最多 `n` 个邻居、折叠行和 baseline |
| `canvas` | 显示根画布，例如 `svg (800 x 600 user units)` |
| `canvas <w> [h]` | 设置画布；重置历史并从新 baseline 开始 |
| `zoom <factor>` | 只改前端显示倍率，例如 `zoom 2x`；不写文档或历史 |
| `create rect <id> <x> <y> <w> <h> [fill]` | 创建矩形 |
| `create circle <id> <cx> <cy> <r> [fill]` | 创建圆 |
| `create ellipse <id> <cx> <cy> <rx> <ry> [fill]` | 创建椭圆 |
| `create line <id> <x1> <y1> <x2> <y2> [stroke]` | 创建线段，颜色写入 stroke |
| `create polygon <id> "<x,y ...>" [fill]` | 创建多边形；也接受展开的 `<x> <y> ...` |
| `create text <id> <x> <y> <content>` | 创建 text 包装节点及一个文本子节点 |
| `create g <id>` | 创建空 group |
| `create box <id> <x> <y> <w> <h> <label> [fill]` | 原子创建组合 box |
| `delete <id>` | 删除节点和它的完整子树 |
| `move <id> <dx> <dy> [target] [scope]` | 移动 transform 或几何参数 |
| `scale <id> <factor> [target] [scope]` | 缩放 transform 或几何参数 |
| `set <id> <attribute> <value>` | 不可变地替换一个属性 |
| `group <new-id> <id> <id> ...` | 在共同父节点中建立 group 并移入成员 |
| `ungroup <group-id>` | 把普通 group 的子节点放回它原来的位置 |
| `addto <parent-id> <id>` | 把节点移到容器的最后一个子节点位置 |
| `front <id>` | 把节点移到同层最后；已在最后时报告已在前 |
| `back <id>` | 把节点移到同层最前；已在最前时报告已在后 |
| `undo` | 反向移动一个编辑提交 |
| `redo` | 重放一个被 undo/checkout 留下的提交 |
| `checkout <commit> [n]` | 切到明确提交并显示时间线 |
| `init [w] [h]` | 新建画布；省略尺寸为 800×600，单给宽时高仍为 600 |
| `read <path>` | 读取 B 支持范围内的 SVG |
| `save [path]` | 保存到指定路径，或保存回最近一次读取路径 |
| `help` | 显示内置简表 |
| `exit`、`quit` | 结束会话 |

常用拒绝：

| 情况 | 输出 |
| --- | --- |
| 未初始化 | `error: no document. use 'init' or 'read' first` |
| 找不到节点 | `error: no such shape: <id>` |
| 重复 id | `error: id already exists: <id>` |
| 使用根保留名 | `error: id "svg" is reserved for the root` |
| 非法 XML id | `error: invalid XML id: "..."` |
| 未知图元 | `error: unknown shape type: "..." (is the plugin loaded?)` |
| 操作数数量错误 | 例如 `error: box takes 5 or 6 operands` |
| 尝试删除根 | `error: the root cannot be erased` |
| 不存在的提交 | `error: no such commit: <n>` |

解析或执行失败时不创建编辑事务；已经存在的文档、树和当前 HEAD 保持不变。

## 5. 创建、结构与组合图元

`create` 先解析图元 Provider，再检查 id、尺寸、父容器和所有派生 id。
成功后整次创建只占一个编辑提交。显式 `in gid` 让成功输出带上父节点：

```text
svg> create g layer
g#layer created
svg> create circle dot 20 30 5 blue in layer
circle#dot created in g#layer
```

没有 `in` 时，节点追加到根；成功输出不额外写根父节点。`g` 没有几何值。
text 的内容可以含空格，但必须用双引号合成一个操作数：

```text
svg> create text title 20 40 "Hello \"SVG\""
text#title created
```

### 5.1 box 的生命周期

box 是一次用户操作、一个提交，却对应三个真实 SVG 节点：

```text
svg> create box card 10 20 160 60 "Start" #4a90d9
box#card created (box#card + rect#card-rect + text#card-label)
svg> tree
svg (800 x 600 user units)
└── g#card (box)
    ├── rect#card-rect   x=10 y=20 w=160 h=60 fill=#4a90d9
    └── text#card-label  (30,55) text="Start"
```

`g#card` 带 `data-kind="box"`；矩形 id 是 `<id>-rect`，标签包装器 id 是
`<id>-label`。标签位置固定偏移为 `x+20`、`y+35`，不是自动排版。若两种偏移
所需长度单位不能相加，创建被拒绝。

box 属性按语义路由：

```text
svg> set card fill #00ff00
g#card updated: fill=#00ff00
svg> set card content "Begin"
box#card label updated: "Begin"
```

`fill` 在一个事务里同时写 group 和 `card-rect`；撤销会一并恢复。
`content` 与 `label` 都是标签文本的别名。`set card x` 被拒绝，因为组合对象
本身是 group，不携带 x；应编辑 `card-rect` 或重新创建 box。

派生 id 冲突在写事务之前拒绝：

```text
svg> init; create rect n-rect 0 0 1 1; create box n 0 0 1 1 "L"
canvas 800x600 created
rect#n-rect created
error: id already exists: n-rect
```

此后树中只有原来的 `n-rect`，不会留下半个 box。box 也不可 `ungroup`：
`error: cannot ungroup composite shape: card`。

### 5.2 group、ungroup 与顺序

`group` 要求至少一个成员；成员必须位于同一父节点，且不能重复。新 group
占据第一个成员原来的层级位置，成员按命令列出的顺序加入。顶层容器不能被
收进自己的后代。成功输出是：

```text
g#pair created (2 elements)
g#pair ungrouped into g#layer (2 elements)
```

顶层 group 不能 ungroup。box 以及其他声明不可拆分的组合图元同样拒绝。
`addto` 是移动到容器末尾；`front`/`back` 只改变同一父节点下的顺序。
`tree` 的显示顺序就是 SVG 文件顺序。

## 6. `set` 属性

`set` 的通用成功格式是 `<kind>#<id> updated: <attribute>=<value>`。
可编辑属性如下；未列出的父节点、children、id 和顺序不通过 `set` 修改。

| 属性 | 适用节点 | 说明 |
| --- | --- | --- |
| `x`、`y` | rect、text 类 | 长度或百分比 |
| `w`、`h` | rect | 非负长度；`width`、`height` 是别名 |
| `cx`、`cy` | circle、ellipse | 中心坐标 |
| `r` | circle | 非负半径 |
| `rx`、`ry` | ellipse | 非负半径 |
| `x1`、`y1`、`x2`、`y2` | line | 端点坐标 |
| `dx`、`dy` | text 类 | 文本偏移 |
| `text`、`content` | text 类 | 设置文本子节点内容；`label` 路由到 box |
| `text-anchor` | text 类 | `start`、`middle`、`end` |
| `font-size` | text 类 | 非负长度 |
| `startOffset` | textPath | 文本路径起点 |
| `href` | textPath | 引用文字 |
| `fill`、`stroke` | 任意 SVG element | paint |
| `stroke-width` | 任意 SVG element | 非负长度 |
| `opacity` | 任意 SVG element | 0..1 |
| `class` | 任意 SVG element | 字符串 |
| `transform` | 任意 SVG element | transform 列表 |
| `xmlns` | svg | 字符串 |
| `viewBox` | svg | 四个有限数 |
| `width`、`height` | rect 或 svg | 非负；svg 上必须为正 |
| `points` | polygon | 至少三个坐标对 |

在不适用的节点上设置属性会被拒绝，不会静默忽略：

```text
svg> set line fill red
line#line updated: fill=red
svg> set r cx 5
error: unknown attribute: "cx"
```

`fill` 是公共绘制属性，所以 line 接受它；`cx` 不是 rect 的几何属性。

## 7. 编辑模式、历史与文件

### 7.1 move 与 scale

可选 target 是 `transform` 或 `params`（`direct` 也可作为 params 别名），
可选 scope 是 `cascade` 或 `restrict`。

- 无选择器时，当前 B 版本默认使用 `transform`；设置
  `SVG_EDITOR_MOVE_DEFAULT=params` 可恢复 params+cascade 默认。
- `params` 改变几何字段，不生成 transform。
- `params cascade` 遍历未带 transform 的后代并修改参数。
- `params restrict` 只修改指定节点自身。
- `transform` 把平移或缩放左乘到节点矩阵；不能与 cascade/restrict 组合。
- 容器 `restrict` 走容器自身 transform；空容器无法移动或缩放。
- 已带非单位 transform 的节点是坐标系边界。cascade 到这个节点时更新它的
  矩阵，不再继续修改其子树参数。

示例：

```text
svg> create rect r 0 0 10 10
rect#r created
svg> move r 5 7
rect#r moved by (5, 7)
svg> show r
rect#r  parent=svg
  x=0 y=0 w=10 h=10
  transform=translate(5 7)
svg> move r 1 2 params restrict
rect#r moved by (1, 2)
```

若此时已有 transform，`params restrict` 不会写 params，而是因该节点是坐标
边界而更新 transform；要直接改几何应使用 `set x` 等属性。零位移报告
`the offset is zero, nothing moved`。缩放因子必须有限且大于 0。

### 7.2 提交与历史

`init` 建立 baseline commit 和仅含 baseline 的时间线。每个成功的文档编辑
对应一个连续提交号。无变化的查询不提交；被拒绝的命令不提交。

`history [n]` 总是显示 HEAD、最多 `n` 个邻近提交、折叠提示和 baseline。
`n` 默认是 20，可通过 `SVG_EDITOR_HISTORY_LIMIT=<n>` 设置默认值。当窗口
跳过提交时，显示如 `... 4 commits folded ...`；不省略时不显示该行。

```text
svg> history 2
8  g#g6 created (HEAD)
7  g#g5 created
6  g#g4 created
... 4 commits folded ...
1  baseline
```

`checkout <commit> [n]` 切到可见分支中的提交，保留其上的 redo 分支，并打印
新的 HEAD 时间线；`n` 使用与 `history` 相同的窗口规则。切到当前 HEAD 会
额外显示 `(no effect)`。在 redo 分支上做新编辑会截断旧 redo 尾部。

`init`、`read`、`save` 和 `canvas` 建立 IO barrier。停在 barrier 时 undo
被明确拒绝：

```text
error: undo not allowed after io command
```

一旦 barrier 之后有编辑，undo 可逐项返回，直到再次到达 barrier。

### 7.3 读写与 SVG 子集

`read` 接受 UTF-8 SVG 根元素以及 B 能无损表示的节点：
`svg`、`g`、`defs`、`symbol`、`switch`、`rect`、`circle`、`ellipse`、
`line`、`polygon`、`text`、`tspan`、`textPath` 和文本内容。
公共属性包括 `id`、`class`、`fill`、`stroke`、`stroke-width`、`opacity`、
`transform`，以及与各元素对应的几何、文本、`data-kind`、`viewBox` 属性。

未知元素、未知属性、非法 XML 结构、重复 id 和非法数值都会被拒绝。省略 id
的非根元素会按元素种类生成 `rect1`、`g1` 等未占用名称，并逐条输出 warning。
非根元素若占用根保留名 `svg`，Reader 也会改名并告警。

`save` 输出 XML 声明、两个空格缩进、固定属性顺序和确定性空白；文本中的
`&`、`<`、`>` 等会转义。`save` 成功后以当前文档作为新 IO baseline；
之后的 `save` 无路径时使用最近一次成功 `read` 的源路径。新建文档从未有来源
路径时，必须写 `save <path>`，否则得到
`error: this document came from nowhere yet: save <path> says where to write it`。

一个 `data-kind="box"` 的 group 在读取后仍被识别为 `(box)`，其 `-rect` 和
`-label` 也按普通真实节点恢复。保存结果因此可以继续执行 `set fill`、
`set content`，而不是退化成一张不可编辑的贴图。

## 8. 拒绝与验证示例

下列会话覆盖最容易误判的边界：

```text
svg> init
canvas 800x600 created
svg> create g empty
g#empty created
svg> move empty 1 1
error: cannot move or scale an empty group
svg> create rect r 0 0 10 10
rect#r created
svg> set r w -1
error: w must not be negative
svg> create g svg
error: id "svg" is reserved for the root
svg> undo
undo: rect#r created (HEAD 2)
svg> undo
error: undo not allowed after io command
```

正式验证命令和期望尾行：

```sh
npm run check
# tsc 与 eslint 无输出即成功

npm test
# Test Files  9 passed (9)
# Tests  132 passed (132)

npm run build
# tsc 无错误即成功
```

开发时依次运行 `check`、`test`、`build`；`npm run cli` 会先构建再进入
交互模式。

