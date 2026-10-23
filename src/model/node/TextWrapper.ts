import type { NodeVisitor } from "../visit/NodeVisitor.js";
import type { IdentityAttr } from "../values/IdentityAttr.js";
import type { PaintAttr } from "../values/PaintAttr.js";
import type { TransformAttr } from "../values/TransformAttr.js";
import type { TextCommon } from "./TextNode.js";
import { TextNode } from "./TextNode.js";

export class TextWrapper extends TextNode {
  public constructor(
    common?: TextCommon,
    identity?: IdentityAttr,
    paint?: PaintAttr,
    transformAttr?: TransformAttr,
  ) {
    super(common, identity, paint, transformAttr);
  }

  public override get elementName(): "text" {
    return "text";
  }

  public override accept<Result>(visitor: NodeVisitor<Result>): Result {
    return visitor.visitTextWrapper(this);
  }

  public override withAttributes(
    identity: IdentityAttr,
    paint: PaintAttr,
    transformAttr: TransformAttr,
  ): TextWrapper {
    return new TextWrapper(this.common, identity, paint, transformAttr);
  }
}

