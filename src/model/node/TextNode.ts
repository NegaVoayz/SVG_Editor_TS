import type { IdentityAttr } from "../values/IdentityAttr.js";
import type { LengthPercentage } from "../values/LengthPercentage.js";
import type { PaintAttr } from "../values/PaintAttr.js";
import type { TransformAttr } from "../values/TransformAttr.js";
import { ElementNode } from "./ElementNode.js";

export enum TextAnchor {
  Start = "start",
  Middle = "middle",
  End = "end",
}

export class TextCommon {
  public constructor(
    public readonly x: LengthPercentage | null = null,
    public readonly y: LengthPercentage | null = null,
    public readonly dx: LengthPercentage | null = null,
    public readonly dy: LengthPercentage | null = null,
    public readonly textAnchor: TextAnchor | null = null,
    public readonly fontSize: LengthPercentage | null = null,
  ) {}
}

export abstract class TextNode extends ElementNode {
  public constructor(
    public readonly common: TextCommon = new TextCommon(),
    identity?: IdentityAttr,
    paint?: PaintAttr,
    transformAttr?: TransformAttr,
  ) {
    super(identity, paint, transformAttr);
  }
}

