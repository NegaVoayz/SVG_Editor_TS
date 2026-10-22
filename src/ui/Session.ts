import { Editor } from "../editor/Editor.js";
import { Document } from "../model/document/Document.js";
import { Planner } from "../planner/Planner.js";
import { ShapeRegistry } from "../plugin/Registry.js";
import type { Command } from "../protocol/cmd/Command.js";
import {
  Comment,
  Exit,
  Help,
  IntentParser,
  ParseError,
  type Request,
} from "./Parser.js";
import { Rendering } from "./Rendering.js";
import { Tokenizer } from "./Tokenizer.js";

export const VERSION = "0.1";

export function usage(): string {
  return [
    "  view     tree [id]              the tree, the whole document by default",
    "           show <id>              one element's attributes and parent",
    "           history [n]            edits around HEAD, capped at 20 by default",
    "           canvas                 the document's size, which is the root's",
    "           help                   this list",
    "           exit | quit            leave the editor",
    "  change   create <kind> <id> [values] [in <gid>]",
    "             rect | circle | ellipse | line | text | g | box",
    "           delete <id>            the node and its descendants",
    "           move <id> <dx> <dy> [transform|params] [cascade|restrict]",
    "           scale <id> <factor> [transform|params] [cascade|restrict]",
    "           set <id> <attr> <value>   one attribute",
    "           group <newGid> <id> <id> ... | ungroup <gid> | addto <gid> <id>",
    "           front <id> | back <id>   the ends of the child order",
    "           canvas <w> [h]         a new size, and the history starts over",
    "           undo | redo            one edit back or forward",
    "           checkout <commit> [n]  move to a commit and show its timeline",
    "  context  init [w] [h]           a fresh document, 800x600 by default",
    "           read <file.svg>        read a document, naming what it left unnamed",
    "           save [file.svg]        write it, and the history starts over",
    "  a node is an SVG id; '/' or the reserved word 'svg' names the root",
    "  a line starting with '#' is a comment; quoted text accepts \\\" and \\\\",
  ].join("\n");
}

export interface SessionResult {
  readonly output: string;
  readonly ok: boolean;
  readonly exited: boolean;
}

interface InstructionResult {
  readonly output: string;
  readonly ok: boolean;
  readonly exited: boolean;
}

export class Session {
  public readonly document = new Document();
  public readonly editor = new Editor(this.document);
  public readonly planner = new Planner(this.document, this.editor);
  private readonly parser = new IntentParser(new ShapeRegistry());
  private readonly rendering = new Rendering();

  public run(instructions: string): SessionResult {
    let output = "";
    let ok = true;
    let start = 0;
    for (;;) {
      const end = instructions.indexOf(";", start);
      const line =
        end < 0 ? instructions.slice(start) : instructions.slice(start, end);
      if (Tokenizer.startsComment(line)) {
        break;
      }
      const result = this.runInstruction(line);
      if (result.output !== "") {
        output += `${output === "" ? "" : "\n"}${result.output}`;
      }
      ok = result.ok && ok;
      if (result.exited) {
        return { output, ok, exited: true };
      }
      if (end < 0) {
        break;
      }
      start = end + 1;
    }
    return { output, ok, exited: false };
  }

  private runInstruction(line: string): InstructionResult {
    if (line.trim() === "") {
      return { output: "", ok: true, exited: false };
    }
    const request: Request = this.parser.parse(line);
    if (request instanceof ParseError) {
      return {
        output: request.message.startsWith("error:")
          ? request.message
          : `error: ${request.message}`,
        ok: false,
        exited: false,
      };
    }
    if (request instanceof Help) {
      return { output: usage(), ok: true, exited: false };
    }
    if (request instanceof Exit) {
      return { output: "", ok: true, exited: true };
    }
    if (request instanceof Comment) {
      return { output: "", ok: true, exited: false };
    }
    return this.runCommand(request);
  }

  private runCommand(command: Command): InstructionResult {
    try {
      const outcome = this.planner.execute(command);
      return {
        output: this.rendering.outcome(outcome),
        ok: outcome.ok(),
        exited: false,
      };
    } catch (error: unknown) {
      return {
        output: error instanceof Error ? error.message : "error: internal error",
        ok: false,
        exited: false,
      };
    }
  }
}

