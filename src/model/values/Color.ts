import { Paint, PaintServer } from "./Paint.js";

const NAMED_COLORS = new Set([
  "aliceblue",
  "antiquewhite",
  "aqua",
  "aquamarine",
  "azure",
  "beige",
  "bisque",
  "black",
  "blanchedalmond",
  "blue",
  "blueviolet",
  "brown",
  "burlywood",
  "cadetblue",
  "chartreuse",
  "chocolate",
  "coral",
  "cornflowerblue",
  "cornsilk",
  "crimson",
  "cyan",
  "darkblue",
  "darkcyan",
  "darkgoldenrod",
  "darkgray",
  "darkgreen",
  "darkgrey",
  "darkkhaki",
  "darkmagenta",
  "darkolivegreen",
  "darkorange",
  "darkorchid",
  "darkred",
  "darksalmon",
  "darkseagreen",
  "darkslateblue",
  "darkslategray",
  "darkslategrey",
  "darkturquoise",
  "darkviolet",
  "deeppink",
  "deepskyblue",
  "dimgray",
  "dimgrey",
  "dodgerblue",
  "firebrick",
  "floralwhite",
  "forestgreen",
  "fuchsia",
  "gainsboro",
  "ghostwhite",
  "gold",
  "goldenrod",
  "gray",
  "green",
  "greenyellow",
  "grey",
  "honeydew",
  "hotpink",
  "indianred",
  "indigo",
  "ivory",
  "khaki",
  "lavender",
  "lavenderblush",
  "lawngreen",
  "lemonchiffon",
  "lightblue",
  "lightcoral",
  "lightcyan",
  "lightgoldenrodyellow",
  "lightgray",
  "lightgreen",
  "lightgrey",
  "lightpink",
  "lightsalmon",
  "lightseagreen",
  "lightskyblue",
  "lightslategray",
  "lightslategrey",
  "lightsteelblue",
  "lightyellow",
  "lime",
  "limegreen",
  "linen",
  "magenta",
  "maroon",
  "mediumaquamarine",
  "mediumblue",
  "mediumorchid",
  "mediumpurple",
  "mediumseagreen",
  "mediumslateblue",
  "mediumspringgreen",
  "mediumturquoise",
  "mediumvioletred",
  "midnightblue",
  "mintcream",
  "mistyrose",
  "moccasin",
  "navajowhite",
  "navy",
  "oldlace",
  "olive",
  "olivedrab",
  "orange",
  "orangered",
  "orchid",
  "palegoldenrod",
  "palegreen",
  "paleturquoise",
  "palevioletred",
  "papayawhip",
  "peachpuff",
  "peru",
  "pink",
  "plum",
  "powderblue",
  "purple",
  "rebeccapurple",
  "red",
  "rosybrown",
  "royalblue",
  "saddlebrown",
  "salmon",
  "sandybrown",
  "seagreen",
  "seashell",
  "sienna",
  "silver",
  "skyblue",
  "slateblue",
  "slategray",
  "slategrey",
  "snow",
  "springgreen",
  "steelblue",
  "tan",
  "teal",
  "thistle",
  "tomato",
  "turquoise",
  "violet",
  "wheat",
  "white",
  "whitesmoke",
  "yellow",
  "yellowgreen",
]);

const SYSTEM_COLORS = new Set([
  "accentcolor",
  "accentcolortext",
  "activetext",
  "buttonborder",
  "buttonface",
  "buttontext",
  "canvas",
  "canvastext",
  "field",
  "fieldtext",
  "graytext",
  "highlight",
  "highlighttext",
  "linktext",
  "mark",
  "marktext",
  "selecteditem",
  "selecteditemtext",
  "visitedtext",
]);

export abstract class Color extends Paint {
  public abstract override toSvgText(): string;
}

export class NoneColor extends Color {
  public override toSvgText(): string {
    return "none";
  }
}

export class CurrentColor extends Color {
  public override toSvgText(): string {
    return "currentColor";
  }
}

export class SystemColor extends Color {
  public constructor(public readonly name: string) {
    super();
  }

  public override toSvgText(): string {
    return this.name;
  }
}

export class NamedColor extends Color {
  public constructor(public readonly name: string) {
    super();
  }

  public override toSvgText(): string {
    return this.name;
  }
}

export class RgbColor extends Color {
  public constructor(
    public readonly red: number,
    public readonly green: number,
    public readonly blue: number,
  ) {
    super();
  }

  public override toSvgText(): string {
    return `#${hex(this.red)}${hex(this.green)}${hex(this.blue)}`;
  }
}

export class FunctionalRgbColor extends Color {
  public constructor(
    public readonly red: number,
    public readonly green: number,
    public readonly blue: number,
  ) {
    super();
  }

  public override toSvgText(): string {
    return `rgb(${String(this.red)},${String(this.green)},${String(this.blue)})`;
  }
}

function hex(value: number): string {
  return Math.round(value).toString(16).padStart(2, "0");
}

function parseRgbFunction(text: string): Color | null {
  const match = /^rgb\((.*)\)$/iu.exec(text);
  if (match === null) {
    return null;
  }
  const parts = (match[1] ?? "").split(",");
  if (parts.length !== 3) {
    return null;
  }
  const channels: number[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    const percent = trimmed.endsWith("%");
    const numeric = Number(percent ? trimmed.slice(0, -1) : trimmed);
    const channel = percent ? (numeric * 255) / 100 : numeric;
    if (!Number.isFinite(channel) || channel < 0 || channel > 255) {
      return null;
    }
    channels.push(Math.round(channel));
  }
  return new FunctionalRgbColor(
    channels[0] ?? 0,
    channels[1] ?? 0,
    channels[2] ?? 0,
  );
}

export function parseColor(text: string): Color | null {
  const trimmed = text.trim();
  const lowered = trimmed.toLowerCase();
  if (lowered === "none") {
    return new NoneColor();
  }
  if (lowered === "currentcolor") {
    return new CurrentColor();
  }
  if (NAMED_COLORS.has(lowered)) {
    return new NamedColor(lowered);
  }
  if (SYSTEM_COLORS.has(lowered)) {
    return new SystemColor(lowered);
  }
  if (lowered.startsWith("rgb(")) {
    return parseRgbFunction(lowered);
  }
  if (!lowered.startsWith("#")) {
    return null;
  }

  const digits = lowered.slice(1);
  if (!/^(?:[\da-f]{3}|[\da-f]{6})$/iu.test(digits)) {
    return null;
  }
  const expanded =
    digits.length === 3
      ? [digits.charAt(0), digits.charAt(1), digits.charAt(2)]
          .map((digit) => `${digit}${digit}`)
          .join("")
      : digits;
  return new RgbColor(
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  );
}

export function parsePaint(text: string): Paint | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("url(")) {
    return parseColor(trimmed);
  }
  const close = trimmed.indexOf(")");
  if (close < 0) {
    return null;
  }
  const target = trimmed.slice(4, close).trim();
  if (!target.startsWith("#") || target.length < 2) {
    return null;
  }
  const fallbackText = trimmed.slice(close + 1).trim();
  const fallback = fallbackText === "" ? null : parseColor(fallbackText);
  return fallbackText !== "" && fallback === null
    ? null
    : new PaintServer(trimmed.slice(0, close + 1), fallback);
}

