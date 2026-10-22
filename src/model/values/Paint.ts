import type { Color } from "./Color.js";

export abstract class Paint {
  public abstract toSvgText(): string;
}

export class PaintServer extends Paint {
  public constructor(
    public readonly url: string,
    public readonly fallback: Color | null = null,
  ) {
    super();
  }

  public override toSvgText(): string {
    return this.fallback === null
      ? this.url
      : `${this.url} ${this.fallback.toSvgText()}`;
  }
}

