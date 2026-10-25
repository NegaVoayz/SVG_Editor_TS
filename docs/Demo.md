# 可复现演示会话

生成时的代码 HEAD：`9f61dc0`。本文件由 `node docs/demo.mjs` 生成；
脚本先验证、再构建，然后直接驱动同一个 `Session` 类产生下列输出。
临时 SVG 路径在文本中替换为 `<demo-dir>`，所以重启脚本不会改变路径噪音。

> 生成脚本会尝试调用相邻的 A 侧 release CLI 做双向读取。找不到该可执行文件时，
> 互通节会明确写 skipped，而不是伪造一次成功。

## 1. 三项验证

```text
PASS npm run check   exit 0
PASS npm test        9 files / 132 tests
PASS npm run build   exit 0
```

## 2. 基本图元、值与视图

```text
svg> init 640 480
canvas 640x480 created
svg> canvas
svg (640 x 480 user units)
svg> create g layer
g#layer created
svg> create rect r 10 20 30 40 #ff0000 in layer
rect#r created in g#layer
svg> create circle c 50 60 10 #00ff00 in layer
circle#c created in g#layer
svg> create ellipse e 70 80 20 10 blue in layer
ellipse#e created in g#layer
svg> create line ln 0 0 10 10 #000000 in layer
line#ln created in g#layer
svg> create polygon p "0,0 16,0 8,14" #00ff00 in layer
polygon#p created in g#layer
svg> set p points "0,0 16,0 8,14 6,16"
polygon#p updated: points="0,0 16,0 8,14 6,16"
svg> create text t 20 140 "Hello SVG" in layer
text#t created in g#layer
svg> set r opacity 0.75
rect#r updated: opacity=0.75
svg> set t text "Changed text"
text#t updated: text="Changed text"
svg> move r 5 7
rect#r moved by (5, 7)
svg> scale r 2
rect#r scaled by 2
svg> show r
rect#r  parent=g#layer
  x=10 y=20 w=30 h=40
  fill=#ff0000
  opacity=0.75
  transform=translate(10 14) scale(2 2)
svg> tree
svg (640 x 480 user units)
└── g#layer
    ├── rect#r     x=10 y=20 w=30 h=40 fill=#ff0000 opacity=0.75 transform=translate(10 14) scale(2 2)
    ├── circle#c   cx=50 cy=60 r=10 fill=#00ff00
    ├── ellipse#e  cx=70 cy=80 rx=20 ry=10 fill=blue
    ├── line#ln    x1=0 y1=0 x2=10 y2=10 stroke=#000000
    ├── polygon#p  points="0,0 16,0 8,14 6,16" fill=#00ff00
    └── text#t     (20,140) text="Changed text"
```

这一步同时覆盖长度、颜色、text、polygon、opacity、默认 transform 移动、缩放、
`show` 和 `tree`。树中 `line` 与最后子节点格式可直接与 A 侧对照。

## 3. 分组和顺序

```text
svg> init
canvas 800x600 created
svg> create g parent
g#parent created
svg> create rect a 0 0 2 2 in parent
rect#a created in g#parent
svg> create rect b 3 3 2 2 in parent
rect#b created in g#parent
svg> group pair a b
g#pair created (2 elements)
svg> ungroup pair
g#pair ungrouped into g#parent (2 elements)
svg> addto parent b
rect#b moved to the end of g#parent
svg> back b
rect#b moved to the back of g#parent
svg> front b
rect#b moved to the front of g#parent
svg> delete a
rect#a deleted
svg> tree
svg (800 x 600 user units)
└── g#parent
    └── rect#b  x=3 y=3 w=2 h=2
```

`group`、`ungroup`、`addto`、`back`、`front`、`delete` 都只产生一次提交。

## 4. box 的完整生命周期

```text
svg> init
canvas 800x600 created
svg> create box status 20 30 140 50 "Start" #4a90d9
box#status created (box#status + rect#status-rect + text#status-label)
svg> tree
svg (800 x 600 user units)
└── g#status (box)
    ├── rect#status-rect   x=20 y=30 w=140 h=50 fill=#4a90d9
    └── text#status-label  (40,65) text="Start"
svg> show status
g#status (box)  parent=svg
svg> set status fill #00ff00
g#status updated: fill=#00ff00
svg> set status content "Ready"
box#status label updated: "Ready"
svg> create rect bad-rect 0 0 1 1
rect#bad-rect created
svg> create box bad 0 0 1 1 "Nope"
error: id already exists: bad-rect
svg> tree
svg (800 x 600 user units)
├── g#status (box)         fill=#00ff00
│   ├── rect#status-rect   x=20 y=30 w=140 h=50 fill=#00ff00
│   └── text#status-label  (40,65) text="Ready"
└── rect#bad-rect          x=0 y=0 w=1 h=1
svg> save <demo-dir>\from-b.svg
saved to "<demo-dir>\from-b.svg" (4 elements)
svg> read <demo-dir>\from-b.svg
read "<demo-dir>\from-b.svg" (4 elements)
svg> set status content "Reloaded"
box#status label updated: "Reloaded"
svg> show status
g#status (box)  parent=svg
  fill=#00ff00
```

注意 `set fill` 同时更新 group 与 outline，`set content` 在保存/读取后仍可编辑。
`bad-rect` 已存在时，box `bad` 在事务之前被拒绝，树中没有半个 `bad`。

## 5. 历史窗口与 checkout

```text
svg> init
canvas 800x600 created
svg> create g g0
g#g0 created
svg> create g g1
g#g1 created
svg> create g g2
g#g2 created
svg> create g g3
g#g3 created
svg> create g g4
g#g4 created
svg> create g g5
g#g5 created
svg> create g g6
g#g6 created
svg> history 2
8  g#g6 created (HEAD)
7  g#g5 created
6  g#g4 created
... 4 commits folded ...
1  baseline
svg> zoom 2
zoom 2x
svg> history 2
8  g#g6 created (HEAD)
7  g#g5 created
6  g#g4 created
... 4 commits folded ...
1  baseline
svg> undo
undo: g#g6 created (HEAD 7)
svg> redo
redo: g#g6 created (HEAD 8)
svg> checkout 5
checked out 5
8  g#g6 created
7  g#g5 created
6  g#g4 created
5  g#g3 created (HEAD)
4  g#g2 created
3  g#g1 created
2  g#g0 created
1  baseline
svg> checkout 8
checked out 8
8  g#g6 created (HEAD)
7  g#g5 created
6  g#g4 created
5  g#g3 created
4  g#g2 created
3  g#g1 created
2  g#g0 created
1  baseline
```

`zoom` 前后同一 `history 2` 完全相同；它只改变前端倍率。`checkout 5` 后
仍保留上方 redo 分支，`checkout 8` 又回到最新提交。

## 6. 值得展示的拒绝

```text
svg> init
canvas 800x600 created
svg> create g empty
g#empty created
svg> move empty 1 1
error: cannot move or scale an empty group
svg> create rect r 1mm 0 1 1
rect#r created
svg> move r 1in 0 params restrict
error: the offset 1in does not add up with 1mm
svg> create g svg
error: id "svg" is reserved for the root
svg> undo
undo: rect#r created (HEAD 2)
svg> undo
undo: g#empty created (HEAD 1)
svg> undo
error: undo not allowed after io command
```

顺序依次覆盖空容器、单位混用、根保留 id 和 IO baseline undo。所有拒绝都
不产生新提交。文件重复 id 单独演示：

```text
svg> read <demo-dir>\duplicate.svg
error: cannot parse SVG: duplicate id: same
```

## 7. front end 的本地命令

```text
svg> help
  view     tree [id]              the tree, the whole document by default
           show <id>              one element's attributes and parent
           history [n]            edits around HEAD, capped at 20 by default
           canvas                 the document's size, which is the root's
           zoom <factor>          display zoom only; document and history stay unchanged
           help                   this list
           exit | quit            leave the editor
  change   create <kind> <id> [values] [in <gid>]
             rect | circle | ellipse | line | polygon | text | g | box
           delete <id>            the node and its descendants
           move <id> <dx> <dy> [transform|params] [cascade|restrict]
           scale <id> <factor> [transform|params] [cascade|restrict]
           set <id> <attr> <value>   one attribute
           group <newGid> <id> <id> ... | ungroup <gid> | addto <gid> <id>
           front <id> | back <id>   the ends of the child order
           canvas <w> [h]         a new size, and the history starts over
           undo | redo            one edit back or forward
           checkout <commit> [n]  move to a commit and show its timeline
  context  init [w] [h]           a fresh document, 800x600 by default
           read <file.svg>        read a document, naming what it left unnamed
           save [file.svg]        write it, and the history starts over
  a node is an SVG id; '/' or the reserved word 'svg' names the root
  a line starting with '#' is a comment; quoted text accepts \" and \\
```

`exit` 不打印伪造的事件；它终止会话：

```text
svg> init
canvas 800x600 created
svg> exit
```

## 8. 与 A 侧的互通

A 读取 B 写出的 `from-b.svg`：

```text
read "<demo-dir>\from-b.svg" (4 elements)
svg (800 x 600 user units)
├── g#status (box)         fill=#00ff00
│   ├── rect#status-rect   x=20 y=30 w=140 h=50 fill=#00ff00
│   └── text#status-label  (40,65) text="Ready"
└── rect#bad-rect          x=0 y=0 w=1 h=1
```

A 写出的 `from-a.svg` 再由 B 读取：

```text
canvas 800x600 created
g#layer created
rect#fromA created in g#layer
saved to "<demo-dir>\from-a.svg" (2 elements)

svg> read <demo-dir>\from-a.svg
read "<demo-dir>\from-a.svg" (2 elements)
svg> tree
svg (800 x 600 user units)
└── g#layer
    └── rect#fromA  x=1 y=2 w=30 h=40 fill=#abcdef
```

双向结果：PASS。
这一步只证明共同子集可交换文件；两边的完整命令语义和内部结构不在本演示中比较。

## 9. 复现

```sh
npm ci
node docs/demo.mjs
```

脚本需要仓库内已有的 `node_modules` 或可用的 npm cache。若要指定 A 可执行文件，
可设置 `SVG_EDITOR_A_EXE`；否则脚本按 `build/*/Ui/svg-editor[.exe]` 查找并优先
使用 release 构建。生成结束后临时目录会被删除。
