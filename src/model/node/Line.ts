import type { NodeVisitor } from "../visit/NodeVisitor.js";
import type { IdentityAttr } from "../values/IdentityAttr.js";
import type { LengthPercentage } from "../values/LengthPercentage.js";
import type { PaintAttr } from "../values/PaintAttr.js";
import type { TransformAttr } from "../values/TransformAttr.js";
import { ShapeNode } from "./ShapeNode.js";

export class Line extends ShapeNode {
  public constructor(
    public readonly x1: LengthPercentage,
    public readonly y1: LengthPercentage,
    public readonly x2: LengthPercentage,
    public readonly y2: LengthPercentage,
    identity?: IdentityAttr,
    paint?: PaintAttr,
    transformAttr?: TransformAttr,
  ) {
    super(identity, paint, transformAttr);
  }

  public override get elementName(): "line" {
    return "line";
  }

  public override accept<Result>(visitor: NodeVisitor<Result>): Result {
    return visitor.visitLine(this);
  }

  public override withAttributes(
    identity: IdentityAttr,
    paint: PaintAttr,
    transformAttr: TransformAttr,
  ): Line {
    return new Line(
      this.x1,
      this.y1,
      this.x2,
      this.y2,
      identity,
      paint,
      transformAttr,
    );
  }
}

