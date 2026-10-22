import type { NodeVisitor } from "../visit/NodeVisitor.js";
import type { IdentityAttr } from "../values/IdentityAttr.js";
import type { LengthPercentage } from "../values/LengthPercentage.js";
import type { PaintAttr } from "../values/PaintAttr.js";
import type { TransformAttr } from "../values/TransformAttr.js";
import { ShapeNode } from "./ShapeNode.js";

export class Circle extends ShapeNode {
  public constructor(
    public readonly cx: LengthPercentage,
    public readonly cy: LengthPercentage,
    public readonly radius: LengthPercentage,
    identity?: IdentityAttr,
    paint?: PaintAttr,
    transformAttr?: TransformAttr,
  ) {
    super(identity, paint, transformAttr);
  }

  public override get elementName(): string {
    return "circle";
  }

  public override accept<Result>(visitor: NodeVisitor<Result>): Result {
    return visitor.visitCircle(this);
  }

  public override withAttributes(
    identity: IdentityAttr,
    paint: PaintAttr,
    transformAttr: TransformAttr,
  ): Circle {
    return new Circle(
      this.cx,
      this.cy,
      this.radius,
      identity,
      paint,
      transformAttr,
    );
  }
}

