#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const documents = resolve(dirname(fileURLToPath(import.meta.url)));
const root = resolve(documents, "..");
const demoDirectory = mkdtempSync(join(tmpdir(), "svg-editor-ts-demo-"));
const bFile = join(demoDirectory, "from-b.svg");
const aFile = join(demoDirectory, "from-a.svg");
const duplicateFile = join(demoDirectory, "duplicate.svg");
function findAExecutable() {
  const explicit = process.env["SVG_EDITOR_A_EXE"];
  if (explicit !== undefined && existsSync(explicit)) {
    return explicit;
  }
  const buildDirectory = resolve(
    root,
    "..",
    "..",
    "CPP",
    "SVG_Editor",
    "build",
  );
  if (!existsSync(buildDirectory)) {
    return null;
  }
  const candidates = readdirSync(buildDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(buildDirectory, entry.name, "Ui"))
    .flatMap((directory) => [
      join(directory, "svg-editor.exe"),
      join(directory, "svg-editor"),
    ])
    .filter((path) => existsSync(path))
    .sort((left, right) => {
      const leftRelease = left.includes("release") ? 0 : 1;
      const rightRelease = right.includes("release") ? 0 : 1;
      return leftRelease - rightRelease || left.localeCompare(right);
    });
  return candidates[0] ?? null;
}

const executable = findAExecutable();

function redact(text) {
  return text
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replaceAll(demoDirectory.replaceAll("\\", "\\\\"), "<demo-dir>")
    .replaceAll(demoDirectory, "<demo-dir>")
    .replaceAll(demoDirectory.replaceAll("\\", "/"), "<demo-dir>")
    .replaceAll("<demo-dir>\\\\", "<demo-dir>\\");
}

function runNpm(script) {
  const windows = process.platform === "win32";
  const command = windows ? (process.env["ComSpec"] ?? "cmd.exe") : "npm";
  const args = windows
    ? ["/d", "/s", "/c", `npm run ${script}`]
    : ["run", script];
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `npm run ${script} failed:\n${result.stdout}\n${result.stderr}`,
    );
  }
  return redact(`${result.stdout ?? ""}\n${result.stderr ?? ""}`).trim();
}

function codeHead() {
  const result = spawnSync(
    "git",
    ["rev-parse", "--short=7", "HEAD"],
    { cwd: root, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`cannot read git HEAD: ${result.stderr}`);
  }
  return result.stdout.trim();
}

function runInstructions(session, instructions) {
  const lines = [];
  for (const instruction of instructions.split(";")) {
    const command = instruction.trim();
    if (command === "") {
      continue;
    }
    lines.push(`svg> ${redact(command)}`);
    const result = session.run(command);
    if (result.output !== "") {
      lines.push(redact(result.output));
    }
  }
  return lines.join("\n");
}

function runA(instructions) {
  if (executable === null) {
    return {
      ok: false,
      output:
        "A executable not found; set SVG_EDITOR_A_EXE or build arm A. Cross-check skipped.",
    };
  }
  const result = spawnSync(executable, [instructions], {
    cwd: demoDirectory,
    encoding: "utf8",
  });
  return {
    ok: result.status === 0,
    output: redact(`${result.stdout ?? ""}\n${result.stderr ?? ""}`).trim(),
  };
}

runNpm("check");
const testOutput = runNpm("test");
runNpm("build");
const testSummary = /Test Files\s+(\d+) passed[\s\S]*?Tests\s+(\d+) passed/u.exec(
  testOutput,
);
if (testSummary === null) {
  throw new Error(`cannot read test summary:\n${testOutput}`);
}
const { Session } = await import("../dist/ui/Session.js");

const basics = new Session();
const basicTranscript = runInstructions(
  basics,
  [
    "init 640 480",
    "canvas",
    "create g layer",
    "create rect r 10 20 30 40 #ff0000 in layer",
    "create circle c 50 60 10 #00ff00 in layer",
    "create ellipse e 70 80 20 10 blue in layer",
    "create line ln 0 0 10 10 #000000 in layer",
    "create polygon p \"0,0 16,0 8,14\" #00ff00 in layer",
    "set p points \"0,0 16,0 8,14 6,16\"",
    "create text t 20 140 \"Hello SVG\" in layer",
    "set r opacity 0.75",
    "set t text \"Changed text\"",
    "move r 5 7",
    "scale r 2",
    "show r",
    "tree",
  ].join(";"),
);

const structures = new Session();
const structureTranscript = runInstructions(
  structures,
  [
    "init",
    "create g parent",
    "create rect a 0 0 2 2 in parent",
    "create rect b 3 3 2 2 in parent",
    "group pair a b",
    "ungroup pair",
    "addto parent b",
    "back b",
    "front b",
    "delete a",
    "tree",
  ].join(";"),
);

const boxes = new Session();
const boxTranscript = runInstructions(
  boxes,
  [
    "init",
    "create box status 20 30 140 50 \"Start\" #4a90d9",
    "tree",
    "show status",
    "set status fill #00ff00",
    "set status content \"Ready\"",
    "create rect bad-rect 0 0 1 1",
    "create box bad 0 0 1 1 \"Nope\"",
    "tree",
    `save ${bFile}`,
    `read ${bFile}`,
    "set status content \"Reloaded\"",
    "show status",
  ].join(";"),
);

const histories = new Session();
const historyTranscript = runInstructions(
  histories,
  [
    "init",
    "create g g0",
    "create g g1",
    "create g g2",
    "create g g3",
    "create g g4",
    "create g g5",
    "create g g6",
    "history 2",
    "zoom 2",
    "history 2",
    "undo",
    "redo",
    "checkout 5",
    "checkout 8",
  ].join(";"),
);

const refusals = new Session();
const refusalTranscript = runInstructions(
  refusals,
  [
    "init",
    "create g empty",
    "move empty 1 1",
    "create rect r 1mm 0 1 1",
    "move r 1in 0 params restrict",
    "create g svg",
    "undo",
    "undo",
    "undo",
  ].join(";"),
);

writeFileSync(
  duplicateFile,
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">',
    '  <rect id="same" x="0" y="0" width="1" height="1"/>',
    '  <rect id="same" x="2" y="2" width="1" height="1"/>',
    "</svg>",
    "",
  ].join("\n"),
  "utf8",
);
const duplicateTranscript = runInstructions(
  new Session(),
  `read ${duplicateFile}`,
);

const aReadsB = runA(`read ${bFile}; tree`);
const aWrites = runA(
  `init; create g layer; create rect fromA 1 2 30 40 #abcdef in layer; save ${aFile}`,
);
const bReadsA = runInstructions(new Session(), `read ${aFile}; tree`);

const helpSession = new Session();
const helpOutput = runInstructions(helpSession, "help");
const exitSession = new Session();
const exitOutput = runInstructions(exitSession, "init; exit");

const report = [
  "# 可复现演示会话",
  "",
  `生成时的代码 HEAD：\`${codeHead()}\`。本文件由 \`node docs/demo.mjs\` 生成；`,
  "脚本先验证、再构建，然后直接驱动同一个 `Session` 类产生下列输出。",
  "临时 SVG 路径在文本中替换为 `<demo-dir>`，所以重启脚本不会改变路径噪音。",
  "",
  "> 生成脚本会尝试调用相邻的 A 侧 release CLI 做双向读取。找不到该可执行文件时，",
  "> 互通节会明确写 skipped，而不是伪造一次成功。",
  "",
  "## 1. 三项验证",
  "",
  "```text",
  "PASS npm run check   exit 0",
  `PASS npm test        ${testSummary[1]} files / ${testSummary[2]} tests`,
  "PASS npm run build   exit 0",
  "```",
  "",
  "## 2. 基本图元、值与视图",
  "",
  "```text",
  basicTranscript,
  "```",
  "",
  "这一步同时覆盖长度、颜色、text、polygon、opacity、默认 transform 移动、缩放、",
  "`show` 和 `tree`。树中 `line` 与最后子节点格式可直接与 A 侧对照。",
  "",
  "## 3. 分组和顺序",
  "",
  "```text",
  structureTranscript,
  "```",
  "",
  "`group`、`ungroup`、`addto`、`back`、`front`、`delete` 都只产生一次提交。",
  "",
  "## 4. box 的完整生命周期",
  "",
  "```text",
  boxTranscript,
  "```",
  "",
  "注意 `set fill` 同时更新 group 与 outline，`set content` 在保存/读取后仍可编辑。",
  "`bad-rect` 已存在时，box `bad` 在事务之前被拒绝，树中没有半个 `bad`。",
  "",
  "## 5. 历史窗口与 checkout",
  "",
  "```text",
  historyTranscript,
  "```",
  "",
  "`zoom` 前后同一 `history 2` 完全相同；它只改变前端倍率。`checkout 5` 后",
  "仍保留上方 redo 分支，`checkout 8` 又回到最新提交。",
  "",
  "## 6. 值得展示的拒绝",
  "",
  "```text",
  refusalTranscript,
  "```",
  "",
  "顺序依次覆盖空容器、单位混用、根保留 id 和 IO baseline undo。所有拒绝都",
  "不产生新提交。文件重复 id 单独演示：",
  "",
  "```text",
  duplicateTranscript,
  "```",
  "",
  "## 7. front end 的本地命令",
  "",
  "```text",
  helpOutput,
  "```",
  "",
  "`exit` 不打印伪造的事件；它终止会话：",
  "",
  "```text",
  exitOutput,
  "```",
  "",
  "## 8. 与 A 侧的互通",
  "",
  "A 读取 B 写出的 `from-b.svg`：",
  "",
  "```text",
  aReadsB.output || "(no output)",
  "```",
  "",
  "A 写出的 `from-a.svg` 再由 B 读取：",
  "",
  "```text",
  aWrites.output || "(no A output)",
  "",
  bReadsA,
  "```",
  "",
  `双向结果：${aReadsB.ok && aWrites.ok ? "PASS" : "skipped 或未通过，详见上方输出"}。`,
  "这一步只证明共同子集可交换文件；两边的完整命令语义和内部结构不在本演示中比较。",
  "",
  "## 9. 复现",
  "",
  "```sh",
  "npm ci",
  "node docs/demo.mjs",
  "```",
  "",
  "脚本需要仓库内已有的 `node_modules` 或可用的 npm cache。若要指定 A 可执行文件，",
  "可设置 `SVG_EDITOR_A_EXE`；否则脚本按 `build/*/Ui/svg-editor[.exe]` 查找并优先",
  "使用 release 构建。生成结束后临时目录会被删除。",
  "",
].join("\n");

writeFileSync(join(documents, "Demo.md"), report, "utf8");
rmSync(demoDirectory, { recursive: true, force: true });
process.stdout.write("wrote docs/Demo.md\n");

