import type { LengthPercentage } from "./LengthPercentage.js";

export class Coordinate {
  public constructor(
    public readonly x: LengthPercentage,
    public readonly y: LengthPercentage,
  ) {}

  public toDisplayText(): string {
    return `${this.x.toDisplayText()},${this.y.toDisplayText()}`;
  }

  public toSvgText(): string {
    return `${this.x.toSvgText()},${this.y.toSvgText()}`;
  }

  public scaled(factor: number): Coordinate {
    return new Coordinate(this.x.scaled(factor), this.y.scaled(factor));
  }
}

