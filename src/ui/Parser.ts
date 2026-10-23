import type { LengthPercentage } from "../model/values/LengthPercentage.js";
import { parseLength, parseNumber } from "../model/values/parseValues.js";
import type { ShapeRegistry } from "../plugin/Registry.js";
import { ProviderParseError } from "../plugin/ShapeProvider.js";
import { AttributeCommand } from "../protocol/attr/AttributeCommand.js";
import {
  ATTRIBUTES,
  AttributeParseError,
} from "../protocol/attr/spec.js";
import type { Command } from "../protocol/cmd/Command.js";
import {
  AddTo,
  Back,
  Delete,
  Front,
  GroupNodes,
  Move,
  ScaleBy,
  Ungroup,
} from "../protocol/cmd/ChangeCommands.js";
import {
  Checkout,
  Init,
  Read,
  Redo,
  Save,
  SetCanvas,
  Show,
  ShowHistory,
  ShowTree,
  Undo,
} from "../protocol/cmd/ContextCommands.js";
import {
  EditScope,
  EditTarget,
  RootRef,
  SvgIdRef,
  type NodeRef,
} from "../protocol/NodeRef.js";
import { Tokenizer } from "./Tokenizer.js";

export class ParseError {
  public constructor(public readonly message: string) {}
}

export class Help {
  public readonly kind = "help";
}

export class Exit {
  public readonly kind = "exit";
}

export class Comment {
  public readonly kind = "comment";
}

export class Zoom {
  public readonly kind = "zoom";
  public constructor(public readonly factor: number) {}
}

export type Request = Command | Help | Exit | Comment | Zoom | ParseError;

class Selectors {
  public constructor(
    public readonly target = EditTarget.Default,
    public readonly scope = EditScope.Default,
  ) {}
}

class ParserFailure extends Error {}

const LENGTH_SYNTAX =
  "a length is a finite number, optionally with px, pt, cm, mm, in, em, ex, or a percentage";

function expectCount(
  words: readonly string[],
  count: number,
  message: string,
): void {
  if (words.length !== count) {
    throw new ParserFailure(message);
  }
}

function expectBetween(
  words: readonly string[],
  least: number,
  most: number,
  message: string,
): void {
  if (words.length < least || words.length > most) {
    throw new ParserFailure(message);
  }
}

function lengthOf(word: string | undefined): LengthPercentage {
  const value = parseLength(word ?? "");
  if (value === null) {
    throw new ParserFailure(
      `cannot read '${word ?? ""}' as a length: ${LENGTH_SYNTAX}`,
    );
  }
  return value;
}

function numberOf(word: string | undefined, noun: string): number {
  const value = parseNumber(word ?? "");
  if (value === null) {
    throw new ParserFailure(`cannot read '${word ?? ""}' as a ${noun}`);
  }
  return value;
}

function nonnegativeInteger(
  word: string | undefined,
  noun: string,
): number {
  if (word === undefined || !/^\d+$/u.test(word)) {
    throw new ParserFailure(
      `cannot read '${word ?? ""}' as a ${noun}`,
    );
  }
  return Number(word);
}

function referenceOf(word: string): NodeRef {
  return word === "/" ? new RootRef() : new SvgIdRef(word);
}

function selectors(
  words: readonly string[],
  start: number,
  owner: string,
): Selectors {
  let target = EditTarget.Default;
  let scope = EditScope.Default;
  for (const word of words.slice(start)) {
    switch (word) {
      case "transform":
        if (target !== EditTarget.Default) {
          throw new ParserFailure(
            `${owner} takes one target selector: transform or params`,
          );
        }
        target = EditTarget.Transform;
        break;
      case "params":
      case "direct":
        if (target !== EditTarget.Default) {
          throw new ParserFailure(
            `${owner} takes one target selector: transform or params`,
          );
        }
        target = EditTarget.Params;
        break;
      case "cascade":
        if (scope !== EditScope.Default) {
          throw new ParserFailure(
            `${owner} takes one scope selector: cascade or restrict`,
          );
        }
        scope = EditScope.Cascade;
        break;
      case "restrict":
        if (scope !== EditScope.Default) {
          throw new ParserFailure(
            `${owner} takes one scope selector: cascade or restrict`,
          );
        }
        scope = EditScope.Restrict;
        break;
      default:
        throw new ParserFailure(
          `unknown ${owner} selector "${word}": expected transform, params, cascade or restrict`,
        );
    }
  }
  if (target === EditTarget.Transform && scope !== EditScope.Default) {
    throw new ParserFailure("transform does not take cascade or restrict");
  }
  return new Selectors(target, scope);
}

export class IntentParser {
  private readonly tokenizer = new Tokenizer();

  public constructor(
    private readonly shapes: ShapeRegistry,
    private readonly moveDefaultsToTransform = true,
  ) {}

  public parse(line: string): Request {
    try {
      if (Tokenizer.startsComment(line)) {
        return new Comment();
      }
      const words = this.tokenizer.tokenize(line);
      if (words.length === 0) {
        throw new ParserFailure("an empty instruction");
      }
      return this.read(words);
    } catch (error: unknown) {
      if (error instanceof ParserFailure || error instanceof ProviderParseError) {
        return new ParseError(
          error.message.startsWith("error:")
            ? error.message
            : `error: ${error.message}`,
        );
      }
      return new ParseError("error: internal parse error");
    }
  }

  private read(words: readonly string[]): Request {
    const verb = words[0] ?? "";
    switch (verb) {
      case "help":
        expectCount(words, 1, "help takes no operand");
        return new Help();
      case "exit":
      case "quit":
        expectCount(words, 1, "exit takes no operand");
        return new Exit();
      case "tree":
        expectBetween(words, 1, 2, "tree takes an optional '<id>'");
        return new ShowTree(
          words[1] === undefined ? new RootRef() : referenceOf(words[1]),
        );
      case "show":
        expectCount(words, 2, "show takes '<id>'");
        return new Show(referenceOf(words[1] ?? ""));
      case "history":
        expectBetween(words, 1, 2, "history takes an optional count");
        return new ShowHistory(
          words[1] === undefined
            ? null
            : nonnegativeInteger(words[1], "a history count"),
        );
      case "zoom": {
        expectCount(words, 2, "zoom takes '<factor>'");
        const factor = numberOf(words[1], "a zoom factor");
        if (factor <= 0) {
          throw new ParserFailure("zoom factor must be positive");
        }
        return new Zoom(factor);
      }
      case "canvas":
        return this.canvas(words);
      case "create":
        return this.create(words);
      case "set":
        return this.set(words);
      case "delete":
        expectCount(words, 2, "delete takes '<id>'");
        return new Delete(referenceOf(words[1] ?? ""));
      case "move": {
        expectBetween(
          words,
          4,
          6,
          "move takes '<id> <dx> <dy> [transform|params] [cascade|restrict]'",
        );
        const chosen = selectors(words, 4, "move");
        return new Move(
          referenceOf(words[1] ?? ""),
          lengthOf(words[2]),
          lengthOf(words[3]),
          words.length === 4 && this.moveDefaultsToTransform
            ? EditTarget.Transform
            : chosen.target,
          chosen.scope,
        );
      }
      case "scale": {
        expectBetween(
          words,
          3,
          5,
          "scale takes '<id> <factor> [transform|params] [cascade|restrict]'",
        );
        const chosen = selectors(words, 3, "scale");
        return new ScaleBy(
          referenceOf(words[1] ?? ""),
          numberOf(words[2], "a scale"),
          chosen.target,
          chosen.scope,
        );
      }
      case "group":
        if (words.length < 3) {
          throw new ParserFailure(
            "group takes '<newGid> <id> <id> ...': at least one node to put inside",
          );
        }
        return new GroupNodes(
          words[1] ?? "",
          words.slice(2).map(referenceOf),
        );
      case "ungroup":
        expectCount(words, 2, "ungroup takes '<gid>'");
        return new Ungroup(referenceOf(words[1] ?? ""));
      case "addto":
        expectCount(words, 3, "addto takes '<gid> <id>'");
        return new AddTo(
          referenceOf(words[1] ?? ""),
          referenceOf(words[2] ?? ""),
        );
      case "front":
        expectCount(words, 2, "front takes '<id>'");
        return new Front(referenceOf(words[1] ?? ""));
      case "back":
        expectCount(words, 2, "back takes '<id>'");
        return new Back(referenceOf(words[1] ?? ""));
      case "undo":
        expectCount(words, 1, "undo takes no operand");
        return new Undo();
      case "redo":
        expectCount(words, 1, "redo takes no operand");
        return new Redo();
      case "checkout": {
        expectBetween(
          words,
          2,
          3,
          "checkout takes '<commit>' and an optional timeline count",
        );
        const commit = nonnegativeInteger(words[1], "a commit id");
        if (commit <= 0) {
          throw new ParserFailure(
            `cannot read '${words[1] ?? ""}' as a commit id`,
          );
        }
        return new Checkout(
          commit,
          words[2] === undefined
            ? null
            : nonnegativeInteger(words[2], "a checkout timeline count"),
        );
      }
      case "init":
        expectBetween(
          words,
          1,
          3,
          "init takes an optional width and height, 800x600 by default",
        );
        return new Init(
          words[1] === undefined ? null : lengthOf(words[1]),
          words[2] === undefined ? null : lengthOf(words[2]),
        );
      case "read":
        expectCount(words, 2, "read takes '<file.svg>'");
        return new Read(words[1] ?? "");
      case "save":
        expectBetween(
          words,
          1,
          2,
          "save takes an optional '<file.svg>', and none means the file it was read from",
        );
        return new Save(words[1] ?? null);
      default:
        throw new ParserFailure(
          `error: unknown instruction "${verb}", try "help"`,
        );
    }
  }

  private canvas(words: readonly string[]): Request {
    if (words.length === 1) {
      return new Show(new RootRef());
    }
    expectBetween(
      words,
      2,
      3,
      "canvas takes a new width, with an optional height",
    );
    return new SetCanvas(
      lengthOf(words[1]),
      words[2] === undefined ? null : lengthOf(words[2]),
    );
  }

  private create(words: readonly string[]): Request {
    if (words.length < 3) {
      throw new ParserFailure(
        "create takes an element kind and an id: 'create rect box 0 0 10 10', or 'create g layer'",
      );
    }
    const kind = words[1] ?? "";
    const id = words[2] ?? "";
    const values = words.slice(3);
    let parent: NodeRef = new RootRef();
    let parentNamed = false;
    if (values.at(-2) === "in") {
      parent = referenceOf(values.at(-1) ?? "");
      parentNamed = true;
      values.splice(values.length - 2, 2);
    }
    const provider = this.shapes.provider(kind);
    if (provider === undefined) {
      throw new ParserFailure(
        `error: unknown shape type: "${kind}" (is the plugin loaded?)`,
      );
    }
    return provider.create(id, values, parent, parentNamed);
  }

  private set(words: readonly string[]): Request {
    expectCount(words, 4, "set takes '<id> <attribute> <value>'");
    const target = referenceOf(words[1] ?? "");
    const name = words[2] ?? "";
    const value = words[3] ?? "";
    const command = this.attribute(name, value);
    return command.at(target);
  }

  private attribute(name: string, value: string): AttributeCommand {
    const spec = ATTRIBUTES[name === "label" ? "text" : name];
    if (spec === undefined) {
      throw new ParserFailure(
        `error: unknown attribute: "${name}"`,
      );
    }
    try {
      return new AttributeCommand(spec, spec.parse(value));
    } catch (error: unknown) {
      if (error instanceof AttributeParseError) {
        throw new ParserFailure(error.message);
      }
      throw error;
    }
  }
}

