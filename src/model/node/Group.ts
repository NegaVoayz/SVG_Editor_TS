import type { NodeVisitor } from "../visit/NodeVisitor.js";
import type { IdentityAttr } from "../values/IdentityAttr.js";
import type { PaintAttr } from "../values/PaintAttr.js";
import type { TransformAttr } from "../values/TransformAttr.js";
import { ContainerNode } from "./ContainerNode.js";

export class Group extends ContainerNode {
  public override get elementName(): string {
    return "g";
  }

  public override accept<Result>(visitor: NodeVisitor<Result>): Result {
    return visitor.visitGroup(this);
  }

  public override withAttributes(
    identity: IdentityAttr,
    paint: PaintAttr,
    transformAttr: TransformAttr,
  ): Group {
    return new Group(identity, paint, transformAttr);
  }
}

