#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const documents = resolve(dirname(fileURLToPath(import.meta.url)));
const root = resolve(documents, "..");
const consistencyPath = join(documents, "Consistency.md");
const consistencyFile = "docs/Consistency.md";
const acceptedArguments = new Set(["--write"]);
const argumentsToCheck = process.argv.slice(2);
const unexpectedArguments = argumentsToCheck.filter(
  (argument) => !acceptedArguments.has(argument),
);
if (unexpectedArguments.length > 0) {
  process.stderr.write(
    `unknown argument${unexpectedArguments.length === 1 ? "" : "s"}: ${unexpectedArguments.join(", ")}\nusage: node docs/check_docs.mjs [--write]\n`,
  );
  process.exit(1);
}
const writeRequested = argumentsToCheck.includes("--write");
const failures = [];
const checks = [];

function run(command, args, allowFailure = false) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
  });
  if (!allowFailure && result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`,
    );
  }
  return {
    ok: result.status === 0,
    output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim(),
  };
}

function git(args, allowFailure = false) {
  return run("git", args, allowFailure);
}

function npm(script) {
  const windows = process.platform === "win32";
  return windows
    ? run(
        process.env["ComSpec"] ?? "cmd.exe",
        ["/d", "/s", "/c", `npm run ${script}`],
      )
    : run("npm", ["run", script]);
}

function check(label, passed, evidence) {
  checks.push({ label, passed, evidence });
  if (!passed) {
    failures.push(`${label}: ${evidence}`);
  }
}

function trackedFiles() {
  return git(["ls-files"]).output.split(/\r?\n/u).filter(Boolean);
}

function lineStats(files, nonblankOnly = false) {
  let lines = 0;
  for (const file of files) {
    const content = readFileSync(join(root, file), "utf8")
      .replaceAll("\r\n", "\n");
    const split = content.split("\n");
    if (split.at(-1) === "") {
      split.pop();
    }
    lines += nonblankOnly
      ? split.filter((line) => line.trim() !== "").length
      : split.length;
  }
  return lines;
}

function markdownFiles(tracked) {
  return tracked.filter((file) => extname(file) === ".md");
}

function inputFingerprint(tracked) {
  const hash = createHash("sha256");
  for (const file of tracked) {
    if (file === consistencyFile) {
      continue;
    }
    hash.update(file, "utf8");
    hash.update("\0");
    hash.update(readFileSync(join(root, file)));
    hash.update("\0");
  }
  return hash.digest("hex").slice(0, 12);
}

function slug(text) {
  return text
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/<[^>]*>/gu, "")
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s+/gu, "-");
}

function anchorsIn(file) {
  const content = readFileSync(join(root, file), "utf8");
  const anchors = new Set();
  const counts = new Map();
  for (const match of content.matchAll(/^#{1,6}\s+(.+)$/gmu)) {
    const base = slug(match[1] ?? "");
    const count = counts.get(base) ?? 0;
    anchors.add(count === 0 ? base : `${base}-${String(count)}`);
    counts.set(base, count + 1);
  }
  return anchors;
}

function checkLinks(files) {
  const anchorCache = new Map();
  let linkCount = 0;
  const broken = [];
  for (const file of files) {
    const content = readFileSync(join(root, file), "utf8");
    for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/gu)) {
      let target = (match[1] ?? "").trim();
      if (target.startsWith("<") && target.endsWith(">")) {
        target = target.slice(1, -1);
      }
      if (
        target === "" ||
        /^[a-z][a-z0-9+.-]*:/iu.test(target) ||
        target.startsWith("#")
      ) {
        if (target.startsWith("#")) {
          linkCount += 1;
          const targetFile = file;
          const anchor = decodeURIComponent(target.slice(1));
          const anchors =
            anchorCache.get(targetFile) ?? anchorsIn(targetFile);
          anchorCache.set(targetFile, anchors);
          if (!anchors.has(anchor)) {
            broken.push(`${file}: #${anchor}`);
          }
        }
        continue;
      }
      linkCount += 1;
      const [pathText, fragment = ""] = target.split("#", 2);
      const targetFile = relative(
        root,
        resolve(root, dirname(file), decodeURIComponent(pathText ?? "")),
      ).replaceAll("\\", "/");
      if (!existsSync(join(root, targetFile))) {
        broken.push(`${file}: ${target}`);
        continue;
      }
      if (fragment !== "" && extname(targetFile) === ".md") {
        const anchors =
          anchorCache.get(targetFile) ?? anchorsIn(targetFile);
        anchorCache.set(targetFile, anchors);
        if (!anchors.has(decodeURIComponent(fragment))) {
          broken.push(`${file}: ${target}`);
        }
      }
    }
  }
  check(
    "Markdown links and anchors",
    broken.length === 0,
    `${String(linkCount)} links checked; ${String(broken.length)} broken${
      broken.length === 0 ? "" : `: ${broken.join(", ")}`
    }`,
  );
}

function checkCommitReferences(files) {
  const references = new Set();
  for (const file of files) {
    const content = readFileSync(join(root, file), "utf8");
    for (const match of content.matchAll(/\b[0-9a-f]{7,40}\b/gu)) {
      references.add(match[0]);
    }
  }
  const missing = [];
  const external = new Set(["95db9b5"]);
  for (const reference of references) {
    if (
      !external.has(reference) &&
      !git(["cat-file", "-e", `${reference}^{commit}`], true).ok
    ) {
      missing.push(reference);
    }
  }
  check(
    "Referenced commits",
    missing.length === 0,
    `${String(references.size)} references checked; ${String(external.size)} external; ${String(missing.length)} missing${
      missing.length === 0 ? "" : `: ${missing.join(", ")}`
    }`,
  );

  const expected = new Map([
    ["778b3ed", "Task P4: record A/B parity fixes (arm B)"],
    ["b74446b", "Task P1: align box fill and derived-id safety (arm B)"],
    ["50df835", "Task P2: restore A-compatible history windows (arm B)"],
    ["8ee9b1e", "Task P3: correct tree branch prefixes (arm B)"],
    ["278aaa4", "Task Issues: close polygon, composite, and history gaps (arm B)"],
  ]);
  const mismatches = [];
  for (const [reference, subject] of expected) {
    const actual = git(["show", "-s", "--format=%s", reference], true);
    if (!actual.ok || actual.output !== subject) {
      mismatches.push(`${reference}: ${actual.output}`);
    }
  }
  check(
    "Referenced commit titles",
    mismatches.length === 0,
    `${String(expected.size)} titles checked; ${String(mismatches.length)} mismatched${
      mismatches.length === 0 ? "" : `: ${mismatches.join(", ")}`
    }`,
  );
}

function checkTags() {
  const final = git(["rev-parse", "final^{commit}"], true);
  check(
    "Delivery tag",
    final.ok,
    final.ok ? "final tag resolves to a commit" : "final is missing",
  );
}

function checkFacts(files) {
  const contents = new Map(
    files.map((file) => [file, readFileSync(join(root, file), "utf8")]),
  );
  const banned = [
    "\u4f5c\u4e1a\u8981\u6c42",
    "\u4f5c\u4e1a\u539f\u6587",
    "\u9898\u9762",
    "\u88ab\u5426\u51b3",
    "\u6709\u610f\u4e0d\u652f\u6301",
  ];
  const violations = [];
  for (const [file, content] of contents) {
    for (const phrase of banned) {
      if (content.includes(phrase)) {
        violations.push(`${file}: ${phrase}`);
      }
    }
  }
  check(
    "Documentation wording",
    violations.length === 0,
    violations.length === 0
      ? `none of ${String(banned.length)} removed phrases occurs`
      : violations.join(", "),
  );

  const manual = contents.get("docs/Manual.md") ?? "";
  const testing = contents.get("docs/Testing.md") ?? "";
  const requirements = contents.get("docs/RequirementsMap.md") ?? "";
  const limitations = contents.get("docs/Limitations.md") ?? "";
  const supported =
    manual.includes("set <id> points") &&
    requirements.includes("set points") &&
    !testing.includes("set points 没有实现") &&
    !limitations.includes("set p points ... 会报未知属性");
  check(
    "set points documentation",
    supported,
    supported ? "manual, mapping, tests, and limits agree" : "documents disagree",
  );

  const minimum =
    manual.includes("至少三个") &&
    testing.includes("至少三个") &&
    !limitations.includes("少于三点仍可创建");
  check(
    "polygon minimum documentation",
    minimum,
    minimum ? "three-point minimum is consistent" : "documents disagree",
  );
}

function checkPublishedStats(
  files,
  sourceCount,
  sourceLines,
  testFileCount,
  totalTestLines,
  testCount,
  instanceofLines,
  instanceofCount,
) {
  const contents = new Map(
    files.map((file) => [file, readFileSync(join(root, file), "utf8")]),
  );
  const mismatches = [];
  const require = (file, snippets) => {
    const content = contents.get(file) ?? "";
    for (const snippet of snippets) {
      if (!content.includes(snippet)) {
        mismatches.push(`${file}: ${snippet}`);
      }
    }
  };
  require("SUBMISSION.md", [
    `${String(sourceCount)} 个文件、${sourceLines.toLocaleString("en-US")} 行`,
    `${String(testFileCount)} 个文件、${totalTestLines.toLocaleString("en-US")} 个物理行、${String(testCount)} 条测试`,
  ]);
  require("docs/Testing.md", [
    `| **合计** | **${totalTestLines.toLocaleString("en-US")}** | **${String(testCount)}** |`,
    `Tests  ${String(testCount)} passed (${String(testCount)})`,
  ]);
  require("docs/DesignComparison.md", [
    `${String(sourceCount)} 个 TypeScript 源文件、${sourceLines.toLocaleString("en-US")} 个非空源码行、${String(testCount)} 个通过测试`,
  ]);
  require("docs/StructuralRefactor.md", [
    `| \`instanceof\` 命中行数 | 211 | ${String(instanceofLines)} |`,
    `| \`instanceof\` 文本出现次数 | 216 | ${String(instanceofCount)} |`,
    `${String(testFileCount)} files / ${String(testCount)} tests PASS`,
  ]);
  check(
    "Published statistics",
    mismatches.length === 0,
    mismatches.length === 0
      ? "source, test, and instanceof totals agree"
      : mismatches.join(", "),
  );
}

function checkPackage(tracked) {
  const required = [
    "SUBMISSION.md",
    "README.md",
    "docs/Architecture.md",
    "docs/Changelog.md",
    "docs/Consistency.md",
    "docs/Decisions.md",
    "docs/Demo.md",
    "docs/DesignComparison.md",
    "docs/Limitations.md",
    "docs/Manual.md",
    "docs/OopImpedanceLog.md",
    "docs/OopPlan.md",
    "docs/RequirementsMap.md",
    "docs/StructuralRefactor.md",
    "docs/Testing.md",
    "docs/check_docs.mjs",
    "docs/demo.mjs",
  ];
  const missing = required.filter((file) => !tracked.includes(file));
  const forbidden = tracked.filter((file) =>
    /^(?:node_modules|dist|coverage)\//u.test(file),
  );
  const packageIndex = readFileSync(join(root, "SUBMISSION.md"), "utf8");
  const unlistedDocs = required
    .filter((file) => file.startsWith("docs/"))
    .filter((file) => !packageIndex.includes(file.slice("docs/".length)));
  check(
    "Package manifest",
    missing.length === 0 &&
      forbidden.length === 0 &&
      unlistedDocs.length === 0,
    [
      `${String(required.length)} required files`,
      `${String(missing.length)} missing`,
      `${String(forbidden.length)} forbidden paths`,
      `${String(unlistedDocs.length)} docs absent from SUBMISSION.md`,
    ].join("; "),
  );
}

function checkCommands() {
  const verified = [];
  try {
    npm("check");
    verified.push(["npm run check", "exit 0"]);
    const test = npm("test");
    const summary =
      /Test Files\s+(\d+) passed[\s\S]*?Tests\s+(\d+) passed/u.exec(
        test.output,
      );
    if (summary === null) {
      throw new Error(`cannot parse npm test summary:\n${test.output}`);
    }
    verified.push([
      "npm test",
      `${summary[1]} files / ${summary[2]} tests`,
    ]);
    npm("build");
    verified.push(["npm run build", "exit 0"]);
    check("Verification commands", true, verified.map((row) => row.join(": ")).join("; "));
  } catch (error) {
    check(
      "Verification commands",
      false,
      error instanceof Error ? error.message : String(error),
    );
  }
  return verified;
}

const tracked = trackedFiles();
const workspace = git([
  "ls-files",
  "--cached",
  "--others",
  "--exclude-standard",
]).output.split(/\r?\n/u).filter(Boolean);
const markdown = markdownFiles(tracked);
const documentedClaims = markdown.filter((file) => file !== consistencyFile);
const sourceFiles = tracked.filter(
  (file) => file.startsWith("src/") && file.endsWith(".ts"),
);
const testFiles = tracked.filter(
  (file) => file.startsWith("tests/") && file.endsWith(".test.ts"),
);
const sourceNonblank = lineStats(sourceFiles, true);
const testLines = lineStats(testFiles);
const tests = testFiles.reduce(
  (total, file) =>
    total +
    (readFileSync(join(root, file), "utf8").match(/^\s*it\(/gmu) ?? []).length,
  0,
);
const grepLines = git([
  "grep",
  "-h",
  "instanceof",
  "HEAD",
  "--",
  "src/**/*.ts",
]).output.split(/\r?\n/u).filter(Boolean);
const instanceofOccurrences = grepLines.reduce(
  (total, line) => total + (line.match(/instanceof/gu) ?? []).length,
  0,
);

const commands = checkCommands();
checkLinks(markdown);
checkCommitReferences(documentedClaims);
checkTags();
checkFacts(documentedClaims);
checkPublishedStats(
  documentedClaims,
  sourceFiles.length,
  sourceNonblank,
  testFiles.length,
  testLines,
  tests,
  grepLines.length,
  instanceofOccurrences,
);
checkPackage(workspace);

const rows = checks.map(
  (entry) =>
    `| ${entry.label} | ${entry.passed ? "PASS" : "FAIL"} | ${entry.evidence.replaceAll("|", "\\|")} |`,
);
const report = [
  "# 一致性自查报告",
  "",
  `由 \`node docs/check_docs.mjs --write\` 生成。输入指纹为 \`${inputFingerprint(tracked)}\`；默认执行只校验本报告，不重写文件。`,
  "",
  "## 重算统计",
  "",
  "| 指标 | 当前值 |",
  "| --- | ---: |",
  `| TypeScript 源文件 | ${String(sourceFiles.length)} |`,
  `| 非空源码行 | ${String(sourceNonblank)} |`,
  `| 测试文件 | ${String(testFiles.length)} |`,
  `| 测试物理行 | ${String(testLines)} |`,
  `| 测试用例 | ${String(tests)} |`,
  `| \`instanceof\` 命中行 | ${String(grepLines.length)} |`,
  `| \`instanceof\` 文本出现 | ${String(instanceofOccurrences)} |`,
  "",
  "## 检查结果",
  "",
  "| 检查 | 结果 | 证据 |",
  "| --- | --- | --- |",
  ...rows,
  "",
  "## 验收命令",
  "",
  "```text",
  ...commands.map(([command, result]) => `${command}: ${result}`),
  "```",
  "",
  "本报告只把可执行检查标记为 PASS。SVG 子集边界和未覆盖风险仍以",
  "[Limitations.md](./Limitations.md) 与 [Testing.md](./Testing.md) 为准。",
  "",
].join("\n");

if (failures.length > 0) {
  process.stderr.write(
    `${failures.join("\n")}\nchecks failed; ${consistencyFile} was not written\n`,
  );
  process.exitCode = 1;
} else if (writeRequested) {
  writeFileSync(consistencyPath, report, "utf8");
  process.stdout.write(`wrote ${consistencyFile}; all checks passed\n`);
} else {
  const currentReport = existsSync(consistencyPath)
    ? readFileSync(consistencyPath, "utf8")
    : null;
  if (currentReport !== report) {
    process.stderr.write(
      `${consistencyFile} is missing or stale; run \`node docs/check_docs.mjs --write\` and commit the result\n`,
    );
    process.exitCode = 1;
  } else {
    process.stdout.write(`${consistencyFile} matches current checks\n`);
  }
}
