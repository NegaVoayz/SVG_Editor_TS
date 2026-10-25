import { describe, expect, it } from "vitest";

import {
  exactNumberText,
  Length,
  LengthUnit,
  NamedColor,
  numberText,
  parseColor,
  parseLength,
  parsePaint,
  Percentage,
  Points,
  RgbColor,
  sumLengths,
  Transform,
  validSvgId,
  ViewBox,
} from "../src/index.js";

describe("numeric text", () => {
  it("uses six-place display rounding and suppresses negative zero", () => {
    expect(numberText(1.23456789)).toBe("1.234568");
    expect(numberText(-0)).toBe("0");
    expect(numberText(0.0000001)).toBe("1e-7");
    expect(exactNumberText(-0)).toBe("0");
  });

  it("preserves the exact spelling needed by serialization", () => {
    expect(exactNumberText(0.0000001234)).toBe("1.234e-7");
  });
});

describe("lengths", () => {
  it("parses every supported unit and percentages", () => {
    expect(parseLength("12.5px")).toBeInstanceOf(Length);
    expect(parseLength("50%")).toBeInstanceOf(Percentage);
    expect(parseLength("1e-7")).toBeInstanceOf(Length);
    expect(parseLength("12furlong")).toBeNull();
    expect(parseLength("nan")).toBeNull();
  });

  it("adds only compatible unit systems", () => {
    const metric = sumLengths(new Length(1, LengthUnit.Cm), new Length(10, LengthUnit.Mm));
    expect(metric?.toDisplayText()).toBe("2cm");
    expect(
      sumLengths(new Length(1, LengthUnit.Cm), new Length(1, LengthUnit.In)),
    ).toBeNull();
  });

  it("keeps a present sub-micro value visible", () => {
    expect(new Length(1e-7, LengthUnit.Px).toDisplayText()).toBe("1e-7px");
  });
});

describe("colours and paints", () => {
  it("canonicalizes hex but preserves named colours", () => {
    expect(parseColor("#0f0")).toEqual(expect.any(RgbColor));
    expect(parseColor("#0f0")?.toSvgText()).toBe("#00ff00");
    expect(parseColor("RebeccaPurple")?.toSvgText()).toBe("rebeccapurple");
    expect(parseColor("red")).toEqual(expect.any(NamedColor));
  });

  it("parses functional RGB and paint servers", () => {
    expect(parseColor("rgb(100%, 0%, 50%)")?.toSvgText()).toBe("rgb(255,0,128)");
    expect(parsePaint("url(#paint) red")?.toSvgText()).toBe("url(#paint) red");
  });
});

describe("viewBox and identifiers", () => {
  it("round-trips four finite numbers", () => {
    expect(ViewBox.parse("0, 0 100 50")?.toDisplayText()).toBe("0 0 100 50");
    expect(ViewBox.parse("0 0 -1 50")).toBeNull();
  });

  it("accepts XML names and rejects quoted whitespace", () => {
    expect(validSvgId("start-label")).toBe(true);
    expect(validSvgId("a b")).toBe(false);
    expect(validSvgId("#2")).toBe(false);
  });
});

describe("point lists", () => {
  it("accepts comma or whitespace pairs and requires three points", () => {
    const points = Points.parse("0,0 10 0 5,10");
    expect(points?.toDisplayText()).toBe("0,0 10,0 5,10");
    expect(Points.parse("0 0 10 0")).toBeNull();
    expect(Points.parse("0 0 10 0 nope 1")).toBeNull();
  });
});

describe("transforms", () => {
  it("parses and composes an SVG transform list", () => {
    const transform = Transform.parse("scale(2 2) rotate(30) scale(3 1) rotate(45)");
    expect(transform?.a).toBeCloseTo(2.9671278, 5);
    expect(transform?.b).toBeCloseTo(3.3460652, 5);
    expect(transform?.c).toBeCloseTo(-4.3813414, 5);
    expect(transform?.d).toBeCloseTo(-0.8965755, 5);
  });

  it("decomposes rotation about a centre", () => {
    const transform = Transform.parse("rotate(30 10 20)");
    expect(transform?.toDisplayText()).toBe(
      "translate(11.339746 -2.320508) rotate(30)",
    );
  });

  it("keeps pure skew axes stable", () => {
    expect(Transform.parse("skewX(15)")?.toDisplayText()).toBe("skewX(15)");
    expect(Transform.parse("skewY(15)")?.toDisplayText()).toBe("skewY(15)");
  });

  it("treats empty, none, and whitespace as identity", () => {
    expect(Transform.parse("")?.isIdentity()).toBe(true);
    expect(Transform.parse("none")?.isIdentity()).toBe(true);
    expect(Transform.parse("  ")?.isIdentity()).toBe(true);
    expect(Transform.identity().toDisplayText()).toBe("");
  });

  it("rejects mixing incompatible translation units", () => {
    expect(
      Transform.compose(
        Transform.translated(new Length(1, LengthUnit.In), new Length(0)),
        Transform.translated(new Length(1, LengthUnit.Cm), new Length(0)),
      ),
    ).toBeNull();
  });
});
