import type { NodeVisitor } from "../visit/NodeVisitor.js";
import type { IdentityAttr } from "../values/IdentityAttr.js";
import type { LengthPercentage } from "../values/LengthPercentage.js";
import type { PaintAttr } from "../values/PaintAttr.js";
import type { TransformAttr } from "../values/TransformAttr.js";
import type { TextCommon } from "./TextNode.js";
import { TextNode } from "./TextNode.js";

export class TextPath extends TextNode {
  public constructor(
    public readonly startOffset: LengthPercentage | null = null,
    public readonly href = "",
    common?: TextCommon,
    identity?: IdentityAttr,
    paint?: PaintAttr,
    transformAttr?: TransformAttr,
  ) {
    super(common, identity, paint, transformAttr);
  }

  public override get elementName(): "textPath" {
    return "textPath";
  }

  public override accept<Result>(visitor: NodeVisitor<Result>): Result {
    return visitor.visitTextPath(this);
  }

  public override withAttributes(
    identity: IdentityAttr,
    paint: PaintAttr,
    transformAttr: TransformAttr,
  ): TextPath {
    return new TextPath(
      this.startOffset,
      this.href,
      this.common,
      identity,
      paint,
      transformAttr,
    );
  }
}

