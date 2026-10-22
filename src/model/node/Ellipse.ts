import type { NodeVisitor } from "../visit/NodeVisitor.js";
import type { IdentityAttr } from "../values/IdentityAttr.js";
import type { LengthPercentage } from "../values/LengthPercentage.js";
import type { PaintAttr } from "../values/PaintAttr.js";
import type { TransformAttr } from "../values/TransformAttr.js";
import { ShapeNode } from "./ShapeNode.js";

export class Ellipse extends ShapeNode {
  public constructor(
    public readonly cx: LengthPercentage,
    public readonly cy: LengthPercentage,
    public readonly radiusX: LengthPercentage,
    public readonly radiusY: LengthPercentage,
    identity?: IdentityAttr,
    paint?: PaintAttr,
    transformAttr?: TransformAttr,
  ) {
    super(identity, paint, transformAttr);
  }

  public override get elementName(): string {
    return "ellipse";
  }

  public override accept<Result>(visitor: NodeVisitor<Result>): Result {
    return visitor.visitEllipse(this);
  }

  public override withAttributes(
    identity: IdentityAttr,
    paint: PaintAttr,
    transformAttr: TransformAttr,
  ): Ellipse {
    return new Ellipse(
      this.cx,
      this.cy,
      this.radiusX,
      this.radiusY,
      identity,
      paint,
      transformAttr,
    );
  }
}

