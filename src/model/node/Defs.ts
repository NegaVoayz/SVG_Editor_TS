import type { NodeVisitor } from "../visit/NodeVisitor.js";
import type { IdentityAttr } from "../values/IdentityAttr.js";
import type { PaintAttr } from "../values/PaintAttr.js";
import type { TransformAttr } from "../values/TransformAttr.js";
import { ContainerNode } from "./ContainerNode.js";

export class Defs extends ContainerNode {
  public override get elementName(): string {
    return "defs";
  }

  public override accept<Result>(visitor: NodeVisitor<Result>): Result {
    return visitor.visitDefs(this);
  }

  public override withAttributes(
    identity: IdentityAttr,
    paint: PaintAttr,
    transformAttr: TransformAttr,
  ): Defs {
    return new Defs(identity, paint, transformAttr);
  }
}

