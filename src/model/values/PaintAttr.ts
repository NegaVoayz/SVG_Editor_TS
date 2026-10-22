import type { LengthPercentage } from "./LengthPercentage.js";
import type { Paint } from "./Paint.js";

export class PaintAttr {
  public constructor(
    public readonly fill: Paint | null = null,
    public readonly stroke: Paint | null = null,
    public readonly strokeWidth: LengthPercentage | null = null,
  ) {}

  public withFill(fill: Paint | null): PaintAttr {
    return new PaintAttr(fill, this.stroke, this.strokeWidth);
  }

  public withStroke(stroke: Paint | null): PaintAttr {
    return new PaintAttr(this.fill, stroke, this.strokeWidth);
  }

  public withStrokeWidth(strokeWidth: LengthPercentage | null): PaintAttr {
    return new PaintAttr(this.fill, this.stroke, strokeWidth);
  }
}

