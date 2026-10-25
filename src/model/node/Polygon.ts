import type { NodeVisitor } from "../visit/NodeVisitor.js";
import type { IdentityAttr } from "../values/IdentityAttr.js";
import type { PaintAttr } from "../values/PaintAttr.js";
import type { Points } from "../values/Points.js";
import type { TransformAttr } from "../values/TransformAttr.js";
import { ShapeNode } from "./ShapeNode.js";

export class Polygon extends ShapeNode {
  public constructor(
    public readonly points: Points,
    identity?: IdentityAttr,
    paint?: PaintAttr,
    transformAttr?: TransformAttr,
  ) {
    super(identity, paint, transformAttr);
  }

  public override get elementName(): "polygon" {
    return "polygon";
  }

  public override accept<Result>(visitor: NodeVisitor<Result>): Result {
    return visitor.visitPolygon(this);
  }

  public override withAttributes(
    identity: IdentityAttr,
    paint: PaintAttr,
    transformAttr: TransformAttr,
  ): Polygon {
    return new Polygon(this.points, identity, paint, transformAttr);
  }
}

