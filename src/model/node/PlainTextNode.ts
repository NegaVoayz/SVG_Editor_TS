import type { NodeVisitor } from "../visit/NodeVisitor.js";
import { Node } from "./Node.js";

export class PlainTextNode extends Node {
  public constructor(public readonly content: string) {
    super();
  }

  public override get elementName(): string {
    return "#text";
  }

  public override accept<Result>(visitor: NodeVisitor<Result>): Result {
    return visitor.visitPlainText(this);
  }
}

