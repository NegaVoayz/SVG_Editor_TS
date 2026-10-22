import { Length } from "./Length.js";
import type { LengthPercentage } from "./LengthPercentage.js";
import { LengthUnit } from "./LengthUnit.js";
import { Percentage } from "./Percentage.js";

enum UnitSystem {
  Metric,
  Imperial,
}

function systemOf(unit: LengthUnit): UnitSystem | null {
  switch (unit) {
    case LengthUnit.Mm:
    case LengthUnit.Cm:
      return UnitSystem.Metric;
    case LengthUnit.In:
    case LengthUnit.Pt:
    case LengthUnit.Px:
      return UnitSystem.Imperial;
    case LengthUnit.UserUnit:
    case LengthUnit.Em:
    case LengthUnit.Ex:
      return null;
  }
}

function perAnchor(unit: LengthUnit): number | null {
  switch (unit) {
    case LengthUnit.Mm:
      return 10;
    case LengthUnit.Cm:
    case LengthUnit.In:
      return 1;
    case LengthUnit.Pt:
      return 72;
    case LengthUnit.Px:
      return 96;
    case LengthUnit.UserUnit:
    case LengthUnit.Em:
    case LengthUnit.Ex:
      return null;
  }
}

function factorBetween(from: LengthUnit, to: LengthUnit): number | null {
  if (from === to) {
    return 1;
  }
  const fromSystem = systemOf(from);
  const toSystem = systemOf(to);
  if (fromSystem === null || fromSystem !== toSystem) {
    return null;
  }
  const fromAnchor = perAnchor(from);
  const toAnchor = perAnchor(to);
  return fromAnchor === null || toAnchor === null ? null : toAnchor / fromAnchor;
}

export function sumLengths(
  left: LengthPercentage,
  right: LengthPercentage,
): LengthPercentage | null {
  if (right.isZero()) {
    return left;
  }
  if (left.isZero()) {
    return right;
  }
  if (left instanceof Percentage) {
    return right instanceof Percentage
      ? new Percentage(left.value + right.value)
      : null;
  }
  if (!(left instanceof Length) || !(right instanceof Length)) {
    return null;
  }
  if (left.unit === right.unit) {
    return new Length(left.value + right.value, left.unit);
  }
  const factor = factorBetween(right.unit, left.unit);
  return factor === null
    ? null
    : new Length(left.value + right.value * factor, left.unit);
}

export function scaledLength(value: LengthPercentage, factor: number): LengthPercentage {
  return value.scaled(factor);
}

export function finiteLength(value: LengthPercentage): boolean {
  return Number.isFinite(value.value);
}

