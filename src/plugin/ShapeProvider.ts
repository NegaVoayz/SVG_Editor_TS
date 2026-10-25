import type { Document } from "../model/document/Document.js";
import type { Element } from "../model/node/index.js";
import type { Vid } from "../model/store/hiveState.js";
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

export interface CompositeShapeProvider {
  readonly composite: true;
  readonly ungroupable: boolean;
  readonly contentAttribute: string;

  matches(node: Element): boolean;

  describe(node: Element): string;

  handlesAttribute(attribute: string): boolean;

  attributeTargets(
    document: Document,
    node: Element,
    attribute: string,
  ): readonly Vid[];

  contentTarget(document: Document, node: Element): Vid | null;
}

export function isCompositeProvider(
  provider: ShapeProvider,
): provider is ShapeProvider & CompositeShapeProvider {
  return "composite" in provider && provider.composite === true;
}

