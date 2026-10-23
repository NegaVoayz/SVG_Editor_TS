import type { NodeVisitor } from "../visit/NodeVisitor.js";

export abstract class NodeBase {
  public abstract accept<Result>(visitor: NodeVisitor<Result>): Result;

  public abstract get elementName(): string;
}

