import { Transform } from "./Transform.js";

export class TransformAttr {
  public constructor(public readonly transform: Transform = Transform.identity()) {}

  public withTransform(transform: Transform): TransformAttr {
    return new TransformAttr(transform);
  }
}

