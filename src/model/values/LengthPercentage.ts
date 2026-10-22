import type { LengthUnit } from "./LengthUnit.js";

export abstract class LengthPercentage {
  public abstract readonly value: number;

  public abstract toDisplayText(): string;

  public abstract toSvgText(): string;

  public abstract scaled(factor: number): LengthPercentage;

  public isZero(): boolean {
    return this.value === 0;
  }
}

export function isLengthUnit(value: unknown): value is LengthUnit {
  return (
    value === "user-unit" ||
    value === "em" ||
    value === "ex" ||
    value === "px" ||
    value === "pt" ||
    value === "mm" ||
    value === "cm" ||
    value === "in"
  );
}

