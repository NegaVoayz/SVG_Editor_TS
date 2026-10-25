# 已知限制

本清单记录当前支持边界、残余缺陷和未验证风险，便于判断哪些能力可以直接使用。

## 1. SVG 子集边界

Reader 只接受 `SVG_SCHEMA` 声明的元素：

```text
svg, g, defs, symbol, switch, rect, circle, ellipse, line, polygon,
text, tspan, textPath, 以及 text 内的字符数据
```

以下内容不支持，遇到未知元素或属性时整个读取被拒绝，不会静默丢弃：

- `use`、`path`、`image`、`foreignObject` 等元素；
- 渐变、pattern、filter、mask、clipPath 及其完整资源语义；
- CSS `style` 表、外部样式、动画和事件属性；
- `rgba(...)`、alpha 颜色、`hsl(...)` 等超出当前 paint parser 的语法；
- 完整 namespace/扩展属性；除标准 xmlns 声明外只接受固定 allowlist；
- 嵌套 `<svg>` 和当前 Schema 之外的混合内容。

`url(#id)` 可以作为 paint server 文本保存，但不解析或渲染所引用的资源。

## 2. 可观察缺陷

### box 标签位置是固定偏移

`box` 的文本位置是 `(x+20, y+35)`，没有字体测量、换行、居中对齐或自动布局。
当 x/y 与偏移量使用不能相加的单位时，创建被拒绝。

### 数字模型不同

A 侧核心使用 `float`，B 侧 JavaScript 使用 IEEE-754 `double`。两边在普通值上
可能输出相同短格式，但极端精度、累计 transform 和舍入边界不保证逐字一致。
B 的文件输出追求 shortest round-trip 拼写，显示最多六位小数；完整数值对比需
使用正式 parity goldens。

### zoom 不是图形预览

当前项目没有可视画布或 GUI。`zoom <factor>` 保存前端显示倍率并输出例如
`zoom 2x`，不改文档和历史；它不会缩放终端树或重采样 SVG。该行为的价值是
证明表示状态与文档状态分离，不代表已经实现图形界面。

### 引号内分号不安全

会话先用 `indexOf(";")` 切分，再对片段做词法分析。含分号的文本或路径即使
放在双引号里也会被当成下一条指令。这个限制在当前版本未修复。

### 自定义 box 标记信任文件

Reader 把带 `data-kind="box"` 的 `g` 识别为组合图元，但不会自动补齐文件里
缺失的 `-rect` 或 `-label`。对应属性会明确拒绝并指出缺少的 `rect` 或
`label` 子节点；文件结构本身仍需要调用方修正。

## 3. 未验证风险

- 没有 fuzz 测试、XML parser 资源上限或恶意深度输入防护；
- 没有大文档性能、内存用量和序列化吞吐基准；
- 没有并发 reader、跨进程 writer 或崩溃恢复验证；
- `writerActive` 只提供进程内单 writer 拒绝，不提供分布式锁；
- 递归树操作未验证超深文档下是否可能触发 JavaScript 调用栈上限；
- 单元测试只覆盖当前手写 goldens，不证明与 A 的每个浮点边界都一致。

## 4. 运行依赖和互操作

- 运行需要 Node.js 22+；依赖按 `package-lock.json` 安装；
- `docs/demo.mjs` 的 A 侧双向会话是可选验证。它会先读取
  `SVG_EDITOR_A_EXE`，再查找 `build/*/Ui/svg-editor[.exe]` 并优先 release
  目录；两者都没有时明确写 skipped，B 自身仍可完整构建；
- A/B 互通目前证明共同 SVG 子集可交换，不证明双方任意扩展命令的文件都能互读；
- 不支持浏览器直接加载未构建的 TypeScript 源码。

