import type { NodeVisitor } from "../visit/NodeVisitor.js";
import type { IdentityAttr } from "../values/IdentityAttr.js";
import type { PaintAttr } from "../values/PaintAttr.js";
import type { TransformAttr } from "../values/TransformAttr.js";
import { ContainerNode } from "./ContainerNode.js";

export class Symbol extends ContainerNode {
  public override get elementName(): "symbol" {
    return "symbol";
  }

  public override accept<Result>(visitor: NodeVisitor<Result>): Result {
    return visitor.visitSymbol(this);
  }

  public override withAttributes(
    identity: IdentityAttr,
    paint: PaintAttr,
    transformAttr: TransformAttr,
  ): Symbol {
    return new Symbol(identity, paint, transformAttr);
  }
}

