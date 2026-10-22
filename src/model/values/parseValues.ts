import { Length } from "./Length.js";
import type { LengthPercentage } from "./LengthPercentage.js";
import { LengthUnit } from "./LengthUnit.js";
import { Percentage } from "./Percentage.js";

const NUMBER_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/iu;
const LENGTH_PATTERN = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(.*)$/iu;

export function parseNumber(text: string): number | null {
  const trimmed = text.trim();
  if (!NUMBER_PATTERN.test(trimmed)) {
    return null;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

function unitOf(suffix: string): LengthUnit | null {
  switch (suffix) {
    case "":
      return LengthUnit.UserUnit;
    case "em":
      return LengthUnit.Em;
    case "ex":
      return LengthUnit.Ex;
    case "px":
      return LengthUnit.Px;
    case "pt":
      return LengthUnit.Pt;
    case "mm":
      return LengthUnit.Mm;
    case "cm":
      return LengthUnit.Cm;
    case "in":
      return LengthUnit.In;
    default:
      return null;
  }
}

export function parseLength(text: string): LengthPercentage | null {
  const trimmed = text.trim();
  const match = LENGTH_PATTERN.exec(trimmed);
  if (match === null) {
    return null;
  }
  const number = parseNumber(match[1] ?? "");
  const suffix = match[2] ?? "";
  if (number === null) {
    return null;
  }
  if (suffix === "%") {
    return new Percentage(number);
  }
  const unit = unitOf(suffix);
  return unit === null ? null : new Length(number, unit);
}

