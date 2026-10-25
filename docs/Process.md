# 评审与纠正过程

本表记录具有代表性的评审事件。每行保留原始产物或建议、确认方法、纠正提交和防复发措施；
全部纠正提交均可从当前 `HEAD` 到达。

| 产物或建议 | 哪里错了 | 如何确认 | 如何纠正 | 如何防止复发 |
| --- | --- | --- | --- | --- |
| AI 生成的树形渲染器 | `followedAt` 把已确定为 `false` 的同层状态再次当作未设置，最后由更早的兄弟覆盖成 `true`；最后子容器下的后代因此多一条竖线 | `npx vitest run tests/cli.test.ts -t "does not draw a branch bar below a last-child container"`<br>`Tests  1 passed \| 78 skipped (79)` | `8ee9b1e` 按行维护前缀，并加入“最后子容器前面仍有同层兄弟”的反例 | 保留针对该形状的命名测试，而不是只覆盖单链或唯一子节点 |
| AI 生成的 history 窗口实现 | 请求 `n` 条时只显示 `n-1` 条邻居，并静默省略折叠提示 | `npx vitest run tests/cli.test.ts -t "shows HEAD, the requested neighbours, folded commits, and baseline"`<br>`Tests  1 passed \| 78 skipped (79)` | `50df835` 恢复 HEAD、`n` 条邻居、折叠行和 baseline 的完整窗口 | 用精确字符串比较 HEAD、邻居、折叠行和 baseline，锁定边界 |
| AI 建议让一致性报告每次运行自动重写 | 失败证据会被写入下一轮扫描的报告；随后又因检出换行差异产生不稳定输入指纹 | `node docs/check_docs.mjs`<br>`docs/Consistency.md matches current checks` | `d39b8f6` 改为默认校验、`--write` 显式生成；`4429a66` 加入输入指纹与交付标签检查，本次修正指纹规范化 | 默认模式不写文件，报告不扫描自身，门槛命令列入交付验证 |
| AI 给出的文档结论“`Changelog.md` 已经是过程记录” | 该文档只有阶段变更、度量和提交规范，没有五列评审事件，不能替代过程证据 | `node -e "const s=require('fs').readFileSync('docs/Changelog.md','utf8'); console.log('过程事件表:', s.includes('如何防止复发'))"`<br>`过程事件表: false` | `4429a66` 明确区分变更记录与评审记录；本文件补充事件表和可执行证据 | 将 `Process.md` 纳入文档清单和一致性门禁，并在变更记录中指向独立过程记录 |
