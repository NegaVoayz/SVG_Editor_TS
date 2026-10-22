import { LengthPercentage } from "./LengthPercentage.js";
import { exactNumberText, normalizeZero, numberText } from "./numberText.js";

export class Percentage extends LengthPercentage {
  public constructor(public override readonly value: number) {
    super();
  }

  public override toDisplayText(): string {
    return `${numberText(this.value)}%`;
  }

  public override toSvgText(): string {
    return `${exactNumberText(this.value)}%`;
  }

  public override scaled(factor: number): Percentage {
    return new Percentage(normalizeZero(this.value * factor));
  }
}

