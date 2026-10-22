import { Length } from "./Length.js";
import type { LengthPercentage } from "./LengthPercentage.js";
import { LengthUnit } from "./LengthUnit.js";
import { exactNumberText, numberText } from "./numberText.js";
import { scaledLength, sumLengths } from "./geometry.js";
import { parseLength, parseNumber } from "./parseValues.js";
import { SkewAxis, TransformParts } from "./TransformParts.js";

const PI = Math.PI;
const RADIANS_PER_DEGREE = PI / 180;
const DEGREES_PER_RADIAN = 180 / PI;
const SUPPRESSION_ULPS = 8;

function radians(degrees: number): number {
  return degrees * RADIANS_PER_DEGREE;
}

function degrees(radiansValue: number): number {
  return radiansValue * DEGREES_PER_RADIAN;
}

function linearTolerance(scaleX: number, scaleY: number): number {
  return (
    SUPPRESSION_ULPS *
    Number.EPSILON *
    Math.max(Math.abs(scaleX), Math.abs(scaleY))
  );
}

function translationTolerance(x: LengthPercentage, y: LengthPercentage): number {
  return (
    SUPPRESSION_ULPS *
    Number.EPSILON *
    Math.max(Math.abs(x.value), Math.abs(y.value))
  );
}

function angleTolerance(scaleX: number, scaleY: number): number {
  const scale = Math.max(Math.abs(scaleX), Math.abs(scaleY));
  return scale === 0
    ? 0
    : (SUPPRESSION_ULPS * Number.EPSILON * DEGREES_PER_RADIAN) / scale;
}

function partsText(parts: TransformParts, exact: boolean): string {
  const numbers = (value: number): string =>
    exact ? exactNumberText(value) : numberText(value);
  const linear = linearTolerance(parts.scaleX, parts.scaleY);
  const translation = translationTolerance(parts.x, parts.y);
  const angle = angleTolerance(parts.scaleX, parts.scaleY);
  const steps: string[] = [];

  const xZero = Math.abs(parts.x.value) <= translation;
  const yZero = Math.abs(parts.y.value) <= translation;
  if (!xZero || !yZero) {
    const x = xZero ? "0" : exact ? parts.x.toSvgText() : parts.x.toDisplayText();
    const y = yZero ? "0" : exact ? parts.y.toSvgText() : parts.y.toDisplayText();
    steps.push(`translate(${x} ${y})`);
  }
  if (Math.abs(parts.rotation) > angle) {
    steps.push(`rotate(${numbers(parts.rotation)})`);
  }
  if (
    Math.abs(parts.scaleX - 1) > linear ||
    Math.abs(parts.scaleY - 1) > linear
  ) {
    steps.push(`scale(${numbers(parts.scaleX)} ${numbers(parts.scaleY)})`);
  }
  if (Math.abs(parts.skew) > angle) {
    const functionName = parts.skewAxis === SkewAxis.Y ? "skewY" : "skewX";
    steps.push(`${functionName}(${numbers(parts.skew)})`);
  }
  return steps.join(" ");
}

export class Transform {
  public constructor(
    public readonly a = 1,
    public readonly b = 0,
    public readonly c = 0,
    public readonly d = 1,
    public readonly e: LengthPercentage = new Length(0),
    public readonly f: LengthPercentage = new Length(0),
  ) {}

  public static identity(): Transform {
    return new Transform();
  }

  public static translated(
    x: LengthPercentage,
    y: LengthPercentage,
  ): Transform {
    return new Transform(1, 0, 0, 1, x, y);
  }

  public static scaled(x: number, y: number = x): Transform {
    return new Transform(x, 0, 0, y);
  }

  public static rotated(degreesValue: number): Transform {
    const angle = radians(degreesValue);
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    return new Transform(cosine, sine, -sine, cosine);
  }

  public static skewedX(degreesValue: number): Transform {
    return new Transform(1, 0, Math.tan(radians(degreesValue)), 1);
  }

  public static skewedY(degreesValue: number): Transform {
    return new Transform(1, Math.tan(radians(degreesValue)), 0, 1);
  }

  public static matrix(
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
  ): Transform {
    return new Transform(
      a,
      b,
      c,
      d,
      new Length(e),
      new Length(f),
    );
  }

  public static compose(outer: Transform, inner: Transform): Transform | null {
    const oa = outer.a;
    const ob = outer.b;
    const oc = outer.c;
    const od = outer.d;
    const ia = inner.a;
    const ib = inner.b;
    const ic = inner.c;
    const id = inner.d;
    const a = oa * ia + oc * ib;
    const b = ob * ia + od * ib;
    const c = oa * ic + oc * id;
    const d = ob * ic + od * id;

    const innerEScaled = scaledLength(inner.e, oa);
    const innerFScaled = scaledLength(inner.f, oc);
    let x = sumLengths(innerEScaled, innerFScaled);
    if (x === null) {
      return null;
    }
    x = sumLengths(x, outer.e);
    if (x === null) {
      return null;
    }

    const innerEGScaled = scaledLength(inner.e, ob);
    const innerFDScaled = scaledLength(inner.f, od);
    let y = sumLengths(innerEGScaled, innerFDScaled);
    if (y === null) {
      return null;
    }
    y = sumLengths(y, outer.f);
    if (y === null) {
      return null;
    }
    const result = new Transform(a, b, c, d, x, y);
    return result.isFinite() ? result : null;
  }

  public static rotationAbout(
    degreesValue: number,
    x: LengthPercentage,
    y: LengthPercentage,
  ): Transform | null {
    const centered = Transform.compose(
      Transform.rotated(degreesValue),
      Transform.translated(x.scaled(-1), y.scaled(-1)),
    );
    return centered === null
      ? null
      : Transform.compose(Transform.translated(x, y), centered);
  }

  public static parse(text: string): Transform | null {
    const trimmed = text.trim();
    if (trimmed === "" || trimmed === "none") {
      return Transform.identity();
    }

    let result = Transform.identity();
    let index = 0;
    let any = false;
    while (index < trimmed.length) {
      while (
        index < trimmed.length &&
        (" \t,\r\n".includes(trimmed[index] ?? ""))
      ) {
        index += 1;
      }
      if (index === trimmed.length) {
        break;
      }

      const nameStart = index;
      while (index < trimmed.length && trimmed[index] !== "(") {
        index += 1;
      }
      if (index === trimmed.length) {
        return null;
      }
      const name = trimmed.slice(nameStart, index).trim();
      if (name === "") {
        return null;
      }
      const bodyStart = index + 1;
      while (index < trimmed.length && trimmed[index] !== ")") {
        index += 1;
      }
      if (index === trimmed.length) {
        return null;
      }
      const words = trimmed
        .slice(bodyStart, index)
        .split(/[\s,]+/u)
        .filter((word) => word !== "");
      index += 1;

      const step = Transform.step(name, words);
      if (step === null) {
        return null;
      }
      const composed = Transform.compose(result, step);
      if (composed === null) {
        return null;
      }
      result = composed;
      any = true;
    }
    return any ? result : null;
  }

  private static step(name: string, words: readonly string[]): Transform | null {
    if (name === "translate" && (words.length === 1 || words.length === 2)) {
      const x = parseLength(words[0] ?? "");
      if (x === null) {
        return null;
      }
      const y =
        words.length === 1
          ? new Length(0, LengthUnit.UserUnit)
          : parseLength(words[1] ?? "");
      return y === null ? null : Transform.translated(x, y);
    }
    if (name === "scale" && (words.length === 1 || words.length === 2)) {
      const x = parseNumber(words[0] ?? "");
      const y = words.length === 1 ? x : parseNumber(words[1] ?? "");
      return x === null || y === null ? null : Transform.scaled(x, y);
    }
    if (name === "rotate" && (words.length === 1 || words.length === 3)) {
      const rotation = parseNumber(words[0] ?? "");
      if (rotation === null) {
        return null;
      }
      if (words.length === 1) {
        return Transform.rotated(rotation);
      }
      const x = parseLength(words[1] ?? "");
      const y = parseLength(words[2] ?? "");
      return x === null || y === null
        ? null
        : Transform.rotationAbout(rotation, x, y);
    }
    if (name === "skewX" && words.length === 1) {
      const skew = parseNumber(words[0] ?? "");
      return skew === null ? null : Transform.skewedX(skew);
    }
    if (name === "skewY" && words.length === 1) {
      const skew = parseNumber(words[0] ?? "");
      return skew === null ? null : Transform.skewedY(skew);
    }
    if (name === "matrix" && words.length === 6) {
      const values = words.map((word) => parseNumber(word));
      if (values.some((value) => value === null)) {
        return null;
      }
      return Transform.matrix(
        values[0] ?? 0,
        values[1] ?? 0,
        values[2] ?? 0,
        values[3] ?? 0,
        values[4] ?? 0,
        values[5] ?? 0,
      );
    }
    return null;
  }

  public compose(inner: Transform): Transform | null {
    return Transform.compose(this, inner);
  }

  public isFinite(): boolean {
    return (
      Number.isFinite(this.a) &&
      Number.isFinite(this.b) &&
      Number.isFinite(this.c) &&
      Number.isFinite(this.d) &&
      Number.isFinite(this.e.value) &&
      Number.isFinite(this.f.value)
    );
  }

  public isIdentity(): boolean {
    return (
      this.a === 1 &&
      this.b === 0 &&
      this.c === 0 &&
      this.d === 1 &&
      this.e.isZero() &&
      this.f.isZero()
    );
  }

  public toDisplayText(): string {
    return partsText(this.decomposed(), false);
  }

  public toSvgText(): string {
    return partsText(this.decomposed(), true);
  }

  public parts(): TransformParts {
    return this.decomposed();
  }

  private decomposed(): TransformParts {
    const x = this.decomposedWithX();
    const y = this.decomposedWithY();
    const xText = partsText(x, false);
    const yText = partsText(y, false);
    if (xText.length !== yText.length) {
      return yText.length < xText.length ? y : x;
    }
    return Math.abs(y.skew) < Math.abs(x.skew) ? y : x;
  }

  private decomposedWithX(): TransformParts {
    const a = this.a;
    const b = this.b;
    const c = this.c;
    const d = this.d;
    const scaleX = Math.hypot(a, b);
    if (scaleX > 0) {
      const cosine = a / scaleX;
      const sine = b / scaleX;
      const determinant = a * d - b * c;
      const scaleY = determinant / scaleX;
      const rotation = degrees(Math.atan2(b, a));
      const skew =
        Math.abs(a) >= Math.abs(b)
          ? (c + sine * scaleY) / a
          : (d - cosine * scaleY) / b;
      return new TransformParts(
        this.e,
        this.f,
        rotation,
        scaleX,
        scaleY,
        degrees(Math.atan(skew)),
        SkewAxis.X,
      );
    }
    const scaleY = Math.hypot(c, d);
    return new TransformParts(
      this.e,
      this.f,
      scaleY > 0 ? degrees(Math.atan2(-c, d)) : 0,
      1,
      scaleY,
      0,
      SkewAxis.X,
    );
  }

  private decomposedWithY(): TransformParts {
    const a = this.a;
    const b = this.b;
    const c = this.c;
    const d = this.d;
    const scaleY = Math.hypot(c, d);
    if (scaleY > 0) {
      const cosine = d / scaleY;
      const sine = -c / scaleY;
      const rotation = degrees(Math.atan2(-c, d));
      const scaleX = a * cosine + b * sine;
      const skew = (b * cosine - a * sine) / scaleY;
      return new TransformParts(
        this.e,
        this.f,
        rotation,
        scaleX,
        scaleY,
        degrees(Math.atan(skew)),
        SkewAxis.Y,
      );
    }
    const scaleX = Math.hypot(a, b);
    return new TransformParts(
      this.e,
      this.f,
      scaleX > 0 ? degrees(Math.atan2(b, a)) : 0,
      scaleX,
      1,
      0,
      SkewAxis.Y,
    );
  }
}

