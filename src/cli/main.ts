#!/usr/bin/env node

import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

import { Session, VERSION } from "../ui/Session.js";

async function main(): Promise<void> {
  const session = new Session();
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const result = session.run(args.join(" "));
    if (result.output !== "") {
      stdout.write(`${result.output}\n`);
    }
    process.exitCode = result.ok ? 0 : 1;
    return;
  }

  stdout.write(`svg-editor ${VERSION} — type 'help' for commands\n\n`);
  const terminal = createInterface({ input: stdin, output: stdout });
  try {
    stdout.write("svg> ");
    for await (const line of terminal) {
      const result = session.run(line);
      if (result.output !== "") {
        stdout.write(`${result.output}\n`);
      }
      if (result.exited) {
        return;
      }
      stdout.write("svg> ");
    }
  } finally {
    terminal.close();
  }
}

await main();

