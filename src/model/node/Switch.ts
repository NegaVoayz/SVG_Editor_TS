import type { NodeVisitor } from "../visit/NodeVisitor.js";
import type { IdentityAttr } from "../values/IdentityAttr.js";
import type { PaintAttr } from "../values/PaintAttr.js";
import type { TransformAttr } from "../values/TransformAttr.js";
import { ContainerNode } from "./ContainerNode.js";

export class Switch extends ContainerNode {
  public override get elementName(): string {
    return "switch";
  }

  public override accept<Result>(visitor: NodeVisitor<Result>): Result {
    return visitor.visitSwitch(this);
  }

  public override withAttributes(
    identity: IdentityAttr,
    paint: PaintAttr,
    transformAttr: TransformAttr,
  ): Switch {
    return new Switch(identity, paint, transformAttr);
  }
}

