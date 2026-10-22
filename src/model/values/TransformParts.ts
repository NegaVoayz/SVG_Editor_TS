import type { LengthPercentage } from "./LengthPercentage.js";

export enum SkewAxis {
  X = "x",
  Y = "y",
}

export class TransformParts {
  public constructor(
    public readonly x: LengthPercentage,
    public readonly y: LengthPercentage,
    public readonly rotation: number,
    public readonly scaleX: number,
    public readonly scaleY: number,
    public readonly skew: number,
    public readonly skewAxis: SkewAxis,
  ) {}
}

