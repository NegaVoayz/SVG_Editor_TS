import { exactNumberText, numberText } from "./numberText.js";
import { parseNumber } from "./parseValues.js";

export class ViewBox {
  public constructor(
    public readonly minX: number,
    public readonly minY: number,
    public readonly width: number,
    public readonly height: number,
  ) {}

  public toDisplayText(): string {
    return [
      numberText(this.minX),
      numberText(this.minY),
      numberText(this.width),
      numberText(this.height),
    ].join(" ");
  }

  public toSvgText(): string {
    return [
      exactNumberText(this.minX),
      exactNumberText(this.minY),
      exactNumberText(this.width),
      exactNumberText(this.height),
    ].join(" ");
  }

  public static parse(text: string): ViewBox | null {
    const words = text.trim().split(/[\s,]+/u);
    if (words.length !== 4) {
      return null;
    }
    const values = words.map((word) => parseNumber(word));
    const [minX, minY, width, height] = values;
    if (
      minX === null ||
      minY === null ||
      width === null ||
      height === null ||
      minX === undefined ||
      minY === undefined ||
      width === undefined ||
      height === undefined ||
      width < 0 ||
      height < 0
    ) {
      return null;
    }
    return new ViewBox(minX, minY, width, height);
  }
}

