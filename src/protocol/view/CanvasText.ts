import type { Svg } from "../../model/node/index.js";
import { Length, LengthUnit } from "../../model/values/index.js";
import type { Percentage } from "../../model/values/index.js";
import { numberText } from "../../model/values/numberText.js";

function canvasSide(value: Length | Percentage | null): string {
  if (value === null) {
    return "unset";
  }
  if (value instanceof Length && value.unit === LengthUnit.UserUnit) {
    return `${value.toDisplayText()} user units`;
  }
  return value.toDisplayText();
}

function unitSuffix(unit: LengthUnit): string {
  return unit === LengthUnit.UserUnit ? " user units" : ` ${unit}`;
}

export function canvasText(node: Svg): string {
  if (node.width === null && node.height === null) {
    return "(unsized)";
  }
  if (
    node.width instanceof Length &&
    node.height instanceof Length &&
    node.width.unit === node.height.unit
  ) {
    return `(${numberText(node.width.value)} x ${numberText(node.height.value)}${unitSuffix(node.width.unit)})`;
  }
  return `(${canvasSide(node.width)} x ${canvasSide(node.height)})`;
}

export function canvasSize(
  width: Length | Percentage | null,
  height: Length | Percentage | null,
): string {
  if (
    width instanceof Length &&
    height instanceof Length &&
    width.unit === height.unit
  ) {
    return `${numberText(width.value)}x${numberText(height.value)}${width.unit === LengthUnit.UserUnit ? "" : width.unit}`;
  }
  return `${width?.toDisplayText() ?? "unset"} x ${height?.toDisplayText() ?? "unset"}`;
}
