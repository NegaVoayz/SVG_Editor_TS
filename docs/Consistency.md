# 一致性自查报告

由 `node docs/check_docs.mjs --write` 生成。输入指纹为 `af1a9f002279`；默认执行只校验本报告，不重写文件。

## 重算统计

| 指标 | 当前值 |
| --- | ---: |
| TypeScript 源文件 | 111 |
| 非空源码行 | 10260 |
| 测试文件 | 9 |
| 测试物理行 | 1801 |
| 测试用例 | 132 |
| `instanceof` 命中行 | 85 |
| `instanceof` 文本出现 | 88 |

## 检查结果

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| Verification commands | PASS | npm run check: exit 0; npm test: 9 files / 132 tests; npm run build: exit 0 |
| Markdown links and anchors | PASS | 61 links checked; 0 broken |
| Referenced commits | PASS | 40 references checked; 1 external; 0 missing |
| Referenced commit titles | PASS | 5 titles checked; 0 mismatched |
| Delivery tag | PASS | final points to HEAD |
| Documentation wording | PASS | none of 5 removed phrases occurs |
| set points documentation | PASS | manual, mapping, tests, and limits agree |
| polygon minimum documentation | PASS | three-point minimum is consistent |
| Published statistics | PASS | source, test, and instanceof totals agree |
| Package manifest | PASS | 18 required files; 0 missing; 0 forbidden paths; 0 docs absent from SUBMISSION.md |

## 验收命令

```text
npm run check: exit 0
npm test: 9 files / 132 tests
npm run build: exit 0
```

本报告只把可执行检查标记为 PASS。SVG 子集边界和未覆盖风险仍以
[Limitations.md](./Limitations.md) 与 [Testing.md](./Testing.md) 为准。
