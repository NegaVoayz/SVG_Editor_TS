import type { NodeRef } from "../protocol/NodeRef.js";
import type { CreateIntent } from "../protocol/cmd/Create.js";

export class ProviderParseError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ProviderParseError";
  }
}

export abstract class ShapeProvider {
  public abstract readonly kind: string;

  public abstract create(
    id: string,
    args: readonly string[],
    parent: NodeRef,
    parentNamed: boolean,
  ): CreateIntent;
}

