import { Coordinate } from "./Coordinate.js";
import { parseLength } from "./parseValues.js";

export class Points {
  private constructor(public readonly values: readonly Coordinate[]) {}

  public static fromCoordinates(
    coordinates: readonly Coordinate[],
  ): Points | null {
    return coordinates.length < 3
      ? null
      : new Points([...coordinates]);
  }

  public static parse(text: string): Points | null {
    const words = text.trim().split(/[\s,]+/u).filter(Boolean);
    if (words.length < 6 || words.length % 2 !== 0) {
      return null;
    }
    const points: Coordinate[] = [];
    for (let index = 0; index < words.length; index += 2) {
      const x = parseLength(words[index] ?? "");
      const y = parseLength(words[index + 1] ?? "");
      if (x === null || y === null) {
        return null;
      }
      points.push(new Coordinate(x, y));
    }
    return new Points(points);
  }

  public toDisplayText(): string {
    return this.values.map((point) => point.toDisplayText()).join(" ");
  }

  public toSvgText(): string {
    return this.values.map((point) => point.toSvgText()).join(" ");
  }

  public scaled(factor: number): Points {
    return new Points(this.values.map((point) => point.scaled(factor)));
  }
}
