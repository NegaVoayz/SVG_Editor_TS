import { LengthPercentage } from "./LengthPercentage.js";
import { LengthUnit, unitText } from "./LengthUnit.js";
import { exactNumberText, normalizeZero, numberText } from "./numberText.js";

export class Length extends LengthPercentage {
  public constructor(
    public override readonly value: number,
    public readonly unit: LengthUnit = LengthUnit.UserUnit,
  ) {
    super();
  }

  public override toDisplayText(): string {
    return `${numberText(this.value)}${unitText(this.unit)}`;
  }

  public override toSvgText(): string {
    return `${exactNumberText(this.value)}${unitText(this.unit)}`;
  }

  public override scaled(factor: number): Length {
    return new Length(normalizeZero(this.value * factor), this.unit);
  }
}

