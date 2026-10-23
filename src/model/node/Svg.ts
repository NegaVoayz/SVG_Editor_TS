import type { NodeVisitor } from "../visit/NodeVisitor.js";
import type { IdentityAttr } from "../values/IdentityAttr.js";
import type { LengthPercentage } from "../values/LengthPercentage.js";
import type { PaintAttr } from "../values/PaintAttr.js";
import type { TransformAttr } from "../values/TransformAttr.js";
import type { ViewBox } from "../values/ViewBox.js";
import { ContainerNode } from "./ContainerNode.js";

export const DEFAULT_SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export class Svg extends ContainerNode {
  public constructor(
    public readonly width: LengthPercentage | null = null,
    public readonly height: LengthPercentage | null = null,
    public readonly xmlns: string = DEFAULT_SVG_NAMESPACE,
    public readonly viewBox: ViewBox | null = null,
    identity?: IdentityAttr,
    paint?: PaintAttr,
    transformAttr?: TransformAttr,
  ) {
    super(identity, paint, transformAttr);
  }

  public override get elementName(): "svg" {
    return "svg";
  }

  public override accept<Result>(visitor: NodeVisitor<Result>): Result {
    return visitor.visitSvg(this);
  }

  public override withAttributes(
    identity: IdentityAttr,
    paint: PaintAttr,
    transformAttr: TransformAttr,
  ): Svg {
    return new Svg(
      this.width,
      this.height,
      this.xmlns,
      this.viewBox,
      identity,
      paint,
      transformAttr,
    );
  }
}

