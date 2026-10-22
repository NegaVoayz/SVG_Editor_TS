import type { NodeVisitor } from "../visit/NodeVisitor.js";
import type { IdentityAttr } from "../values/IdentityAttr.js";
import type { PaintAttr } from "../values/PaintAttr.js";
import type { TransformAttr } from "../values/TransformAttr.js";
import type { TextCommon } from "./TextNode.js";
import { TextNode } from "./TextNode.js";

export class Tspan extends TextNode {
  public constructor(
    common?: TextCommon,
    identity?: IdentityAttr,
    paint?: PaintAttr,
    transformAttr?: TransformAttr,
  ) {
    super(common, identity, paint, transformAttr);
  }

  public override get elementName(): string {
    return "tspan";
  }

  public override accept<Result>(visitor: NodeVisitor<Result>): Result {
    return visitor.visitTspan(this);
  }

  public override withAttributes(
    identity: IdentityAttr,
    paint: PaintAttr,
    transformAttr: TransformAttr,
  ): Tspan {
    return new Tspan(this.common, identity, paint, transformAttr);
  }
}

