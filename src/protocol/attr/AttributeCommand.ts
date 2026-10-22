import type { ElementNode } from "../../model/node/index.js";
import type { NodeRef } from "../NodeRef.js";
import { RootRef } from "../NodeRef.js";
import { Kind } from "../Kind.js";
import type { Outcome } from "../Outcome.js";
import { Command } from "../cmd/Command.js";
import type { CommandContext } from "../cmd/CommandContext.js";

export abstract class AttributeCommand extends Command {
  public readonly kind = Kind.Change;
  public abstract readonly attributeName: string;
  public readonly contentValue: string | null = null;
  public target: NodeRef = new RootRef();

  public abstract applyTo(node: ElementNode): ElementNode | null;

  public execute(context: CommandContext): Outcome {
    return context.setAttribute(this);
  }

  public at(target: NodeRef): this {
    this.target = target;
    return this;
  }
}

