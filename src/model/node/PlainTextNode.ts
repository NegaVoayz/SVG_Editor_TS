import type { NodeVisitor } from "../visit/NodeVisitor.js";
import { NodeBase } from "./NodeBase.js";

export class PlainTextNode extends NodeBase {
  public constructor(public readonly content: string) {
    super();
  }

  public override get elementName(): "#text" {
    return "#text";
  }

  public override accept<Result>(visitor: NodeVisitor<Result>): Result {
    return visitor.visitPlainText(this);
  }
}

