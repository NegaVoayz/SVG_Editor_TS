import type { NodeVisitor } from "../visit/NodeVisitor.js";

export abstract class Node {
  public abstract accept<Result>(visitor: NodeVisitor<Result>): Result;

  public abstract get elementName(): string;
}

