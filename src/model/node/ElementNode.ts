import { IdentityAttr } from "../values/IdentityAttr.js";
import { PaintAttr } from "../values/PaintAttr.js";
import { TransformAttr } from "../values/TransformAttr.js";
import { Node } from "./Node.js";

export abstract class ElementNode extends Node {
  public constructor(
    public readonly identity: IdentityAttr = new IdentityAttr(""),
    public readonly paint: PaintAttr = new PaintAttr(),
    public readonly transformAttr: TransformAttr = new TransformAttr(),
  ) {
    super();
  }

  public get id(): string {
    return this.identity.id;
  }

  public abstract withAttributes(
    identity: IdentityAttr,
    paint: PaintAttr,
    transformAttr: TransformAttr,
  ): ElementNode;
}

