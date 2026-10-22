import type { IdentityAttr } from "../values/IdentityAttr.js";
import type { PaintAttr } from "../values/PaintAttr.js";
import type { TransformAttr } from "../values/TransformAttr.js";
import { ElementNode } from "./ElementNode.js";

export abstract class ContainerNode extends ElementNode {
  public constructor(
    identity?: IdentityAttr,
    paint?: PaintAttr,
    transformAttr?: TransformAttr,
  ) {
    super(identity, paint, transformAttr);
  }
}

