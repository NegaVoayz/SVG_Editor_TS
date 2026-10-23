import type { Element } from "../../model/node/index.js";
import { Kind } from "../Kind.js";
import type { NodeRef } from "../NodeRef.js";
import { RootRef } from "../NodeRef.js";
import type { Outcome } from "../Outcome.js";
import { Command } from "../cmd/Command.js";
import type { CommandContext } from "../cmd/CommandContext.js";
import type { AttributeSpec, AttributeValue } from "./spec.js";

export class AttributeCommand extends Command {
  public readonly kind = Kind.Change;

  public constructor(
    public readonly spec: AttributeSpec,
    public readonly value: AttributeValue,
    public target: NodeRef = new RootRef(),
  ) {
    super();
  }

  public get attributeName(): string {
    return this.spec.name;
  }

  public get contentValue(): string | null {
    return this.spec.options.content && typeof this.value === "string"
      ? this.value
      : null;
  }

  public applyTo(node: Element): Element | null {
    return this.spec.apply(node, this.value);
  }

  public execute(context: CommandContext): Outcome {
    return context.setAttribute(this);
  }

  public at(target: NodeRef): this {
    this.target = target;
    return this;
  }
}

