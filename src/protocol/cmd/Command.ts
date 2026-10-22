import type { Kind } from "../Kind.js";
import type { Outcome } from "../Outcome.js";
import type { CommandContext } from "./CommandContext.js";

export abstract class Command {
  public abstract readonly kind: Kind;

  public abstract execute(context: CommandContext): Outcome;
}

