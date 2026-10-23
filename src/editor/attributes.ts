import { Paint } from "../model/values/Paint.js";
import type { Node } from "../model/node/index.js";
import { LengthPercentage } from "../model/values/LengthPercentage.js";
import { Transform } from "../model/values/Transform.js";
import { ViewBox } from "../model/values/ViewBox.js";
import type { AttributeCommand } from "../protocol/attr/AttributeCommand.js";
import type { CreateIntent } from "../protocol/cmd/Create.js";
import {
  CreateCircle,
  CreateEllipse,
  CreateLine,
  CreateRect,
  CreateText,
} from "../protocol/cmd/Create.js";
import {
  NegativeDimension,
  NonFiniteValue,
  type Refusal,
} from "../protocol/refusal/Refusal.js";
import { nodeExtent } from "./shape/ExtentVisitor.js";

export function lengthValueOf(
  command: AttributeCommand,
): LengthPercentage | null {
  return command.spec.options.lengthValue &&
    command.value instanceof LengthPercentage
    ? command.value
    : null;
}

export function firstParam(
  node: Node,
): LengthPercentage | null {
  return nodeExtent(node);
}

export function attributeText(command: AttributeCommand): string {
  const candidate = command.value;
  if (candidate instanceof LengthPercentage) {
    return candidate.toDisplayText();
  }
  if (candidate instanceof Paint) {
    return candidate.toSvgText();
  }
  if (candidate instanceof Transform) {
    return candidate.toDisplayText() || "none";
  }
  if (candidate instanceof ViewBox) {
    return candidate.toDisplayText();
  }
  if (
    typeof candidate === "string" ||
    typeof candidate === "number" ||
    typeof candidate === "boolean"
  ) {
    return String(candidate);
  }
  return command.attributeName;
}

export function createDimensions(command: CreateIntent): Refusal | null {
  const values: [string, LengthPercentage, boolean][] = [];
  if (command instanceof CreateRect) {
    values.push(
      ["x", command.x, false],
      ["y", command.y, false],
      ["width", command.width, true],
      ["height", command.height, true],
    );
  } else if (command instanceof CreateCircle) {
    values.push(
      ["cx", command.cx, false],
      ["cy", command.cy, false],
      ["r", command.radius, true],
    );
  } else if (command instanceof CreateEllipse) {
    values.push(
      ["cx", command.cx, false],
      ["cy", command.cy, false],
      ["rx", command.radiusX, true],
      ["ry", command.radiusY, true],
    );
  } else if (command instanceof CreateLine) {
    values.push(
      ["x1", command.x1, false],
      ["y1", command.y1, false],
      ["x2", command.x2, false],
      ["y2", command.y2, false],
    );
  } else if (command instanceof CreateText) {
    values.push(
      ["x", command.x, false],
      ["y", command.y, false],
    );
  }
  for (const [name, value, nonnegative] of values) {
    if (!Number.isFinite(value.value)) {
      return new NonFiniteValue(name);
    }
    if (nonnegative && value.value < 0) {
      return new NegativeDimension(name);
    }
  }
  return null;
}

