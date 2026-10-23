import type { NodeVisitor } from "../visit/NodeVisitor.js";
import type { IdentityAttr } from "../values/IdentityAttr.js";
import type { LengthPercentage } from "../values/LengthPercentage.js";
import type { PaintAttr } from "../values/PaintAttr.js";
import type { TransformAttr } from "../values/TransformAttr.js";
import { ShapeNode } from "./ShapeNode.js";

export class Rect extends ShapeNode {
  public constructor(
    public readonly x: LengthPercentage,
    public readonly y: LengthPercentage,
    public readonly width: LengthPercentage,
    public readonly height: LengthPercentage,
    identity?: IdentityAttr,
    paint?: PaintAttr,
    transformAttr?: TransformAttr,
  ) {
    super(identity, paint, transformAttr);
  }

  public override get elementName(): "rect" {
    return "rect";
  }

  public override accept<Result>(visitor: NodeVisitor<Result>): Result {
    return visitor.visitRect(this);
  }

  public override withAttributes(
    identity: IdentityAttr,
    paint: PaintAttr,
    transformAttr: TransformAttr,
  ): Rect {
    return new Rect(
      this.x,
      this.y,
      this.width,
      this.height,
      identity,
      paint,
      transformAttr,
    );
  }
}

