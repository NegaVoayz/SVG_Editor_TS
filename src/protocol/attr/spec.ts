import {
  Circle,
  Ellipse,
  Line,
  Rect,
  Svg,
  TextAnchor,
  TextCommon,
  TextPath,
  withTextCommon,
  type Element,
  type TextWrapper,
  type Tspan,
} from "../../model/node/index.js";
import { parsePaint } from "../../model/values/Color.js";
import { Paint } from "../../model/values/Paint.js";
import { parseLength } from "../../model/values/parseValues.js";
import { LengthPercentage } from "../../model/values/LengthPercentage.js";
import { Transform } from "../../model/values/Transform.js";
import { ViewBox } from "../../model/values/ViewBox.js";

export type AttributeValue =
  | LengthPercentage
  | Paint
  | Transform
  | ViewBox
  | TextAnchor
  | string
  | number;

export class AttributeParseError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AttributeParseError";
  }
}

export interface AttributeSpecOptions {
  readonly lengthValue?: boolean;
  readonly nonnegative?: boolean;
  readonly canvasDimension?: boolean;
  readonly opacity?: boolean;
  readonly content?: boolean;
}

export class AttributeSpec {
  public constructor(
    public readonly name: string,
    public readonly parse: (word: string) => AttributeValue,
    public readonly appliesTo: (node: Element) => boolean,
    public readonly apply: (
      node: Element,
      value: AttributeValue,
    ) => Element | null,
    public readonly options: AttributeSpecOptions = {},
  ) {}
}

function length(word: string): LengthPercentage {
  const value = parseLength(word);
  if (value === null) {
    throw new AttributeParseError(
      `cannot read '${word}' as a length`,
    );
  }
  return value;
}

function paint(word: string, noun: string): Paint {
  const value = parsePaint(word);
  if (value === null) {
    throw new AttributeParseError(
      `cannot read '${word}' as a ${noun}`,
    );
  }
  return value;
}

function lengthSpec(
  name: string,
  appliesTo: (node: Element) => boolean,
  apply: (node: Element, value: AttributeValue) => Element | null,
  options: AttributeSpecOptions = {},
): AttributeSpec {
  return new AttributeSpec(
    name,
    length,
    appliesTo,
    apply,
    { lengthValue: true, ...options },
  );
}

type ConcreteTextNode = TextWrapper | Tspan | TextPath;

function isTextElement(node: Element): node is ConcreteTextNode {
  switch (node.elementName) {
    case "text":
    case "tspan":
    case "textPath":
      return true;
    case "rect":
    case "circle":
    case "ellipse":
    case "line":
    case "polygon":
    case "g":
    case "defs":
    case "svg":
    case "symbol":
    case "switch":
      return false;
  }
}

function withCommon(
  node: ConcreteTextNode,
  common: TextCommon,
): Element {
  return withTextCommon(node, common);
}

const setX = (node: Element, value: AttributeValue): Element | null => {
  if (!(value instanceof LengthPercentage)) {
    return null;
  }
  if (node.elementName === "rect") {
    return new Rect(
      value,
      node.y,
      node.width,
      node.height,
      node.identity,
      node.paint,
      node.transformAttr,
    );
  }
  return isTextElement(node) && node.common.x !== null
    ? withCommon(
        node,
        new TextCommon(
          value,
          node.common.y,
          node.common.dx,
          node.common.dy,
          node.common.textAnchor,
          node.common.fontSize,
        ),
      )
    : null;
};

const setY = (node: Element, value: AttributeValue): Element | null => {
  if (!(value instanceof LengthPercentage)) {
    return null;
  }
  if (node.elementName === "rect") {
    return new Rect(
      node.x,
      value,
      node.width,
      node.height,
      node.identity,
      node.paint,
      node.transformAttr,
    );
  }
  return isTextElement(node) && node.common.y !== null
    ? withCommon(
        node,
        new TextCommon(
          node.common.x,
          value,
          node.common.dx,
          node.common.dy,
          node.common.textAnchor,
          node.common.fontSize,
        ),
      )
    : null;
};

export const ATTRIBUTES: Readonly<Record<string, AttributeSpec>> = {
  x: lengthSpec(
    "x",
    (node) => node.elementName === "rect" || isTextElement(node),
    setX,
  ),
  y: lengthSpec(
    "y",
    (node) => node.elementName === "rect" || isTextElement(node),
    setY,
  ),
  w: lengthSpec(
    "w",
    (node) => node.elementName === "rect",
    (node, value) =>
      node.elementName === "rect" && value instanceof LengthPercentage
        ? new Rect(
            node.x,
            node.y,
            value,
            node.height,
            node.identity,
            node.paint,
            node.transformAttr,
          )
        : null,
    { nonnegative: true },
  ),
  h: lengthSpec(
    "h",
    (node) => node.elementName === "rect",
    (node, value) =>
      node.elementName === "rect" && value instanceof LengthPercentage
        ? new Rect(
            node.x,
            node.y,
            node.width,
            value,
            node.identity,
            node.paint,
            node.transformAttr,
          )
        : null,
    { nonnegative: true },
  ),
  cx: lengthSpec(
    "cx",
    (node) => node.elementName === "circle" || node.elementName === "ellipse",
    (node, value) => {
      if (!(value instanceof LengthPercentage)) {
        return null;
      }
      if (node.elementName === "circle") {
        return new Circle(
          value,
          node.cy,
          node.radius,
          node.identity,
          node.paint,
          node.transformAttr,
        );
      }
      return node.elementName === "ellipse"
        ? new Ellipse(
            value,
            node.cy,
            node.radiusX,
            node.radiusY,
            node.identity,
            node.paint,
            node.transformAttr,
          )
        : null;
    },
  ),
  cy: lengthSpec(
    "cy",
    (node) => node.elementName === "circle" || node.elementName === "ellipse",
    (node, value) => {
      if (!(value instanceof LengthPercentage)) {
        return null;
      }
      if (node.elementName === "circle") {
        return new Circle(
          node.cx,
          value,
          node.radius,
          node.identity,
          node.paint,
          node.transformAttr,
        );
      }
      return node.elementName === "ellipse"
        ? new Ellipse(
            node.cx,
            value,
            node.radiusX,
            node.radiusY,
            node.identity,
            node.paint,
            node.transformAttr,
          )
        : null;
    },
  ),
  r: lengthSpec(
    "r",
    (node) => node.elementName === "circle",
    (node, value) =>
      node.elementName === "circle" && value instanceof LengthPercentage
        ? new Circle(
            node.cx,
            node.cy,
            value,
            node.identity,
            node.paint,
            node.transformAttr,
          )
        : null,
    { nonnegative: true },
  ),
  rx: lengthSpec(
    "rx",
    (node) => node.elementName === "ellipse",
    (node, value) =>
      node.elementName === "ellipse" && value instanceof LengthPercentage
        ? new Ellipse(
            node.cx,
            node.cy,
            value,
            node.radiusY,
            node.identity,
            node.paint,
            node.transformAttr,
          )
        : null,
    { nonnegative: true },
  ),
  ry: lengthSpec(
    "ry",
    (node) => node.elementName === "ellipse",
    (node, value) =>
      node.elementName === "ellipse" && value instanceof LengthPercentage
        ? new Ellipse(
            node.cx,
            node.cy,
            node.radiusX,
            value,
            node.identity,
            node.paint,
            node.transformAttr,
          )
        : null,
    { nonnegative: true },
  ),
  x1: lengthSpec(
    "x1",
    (node) => node.elementName === "line",
    (node, value) =>
      node.elementName === "line" && value instanceof LengthPercentage
        ? new Line(
            value,
            node.y1,
            node.x2,
            node.y2,
            node.identity,
            node.paint,
            node.transformAttr,
          )
        : null,
  ),
  y1: lengthSpec(
    "y1",
    (node) => node.elementName === "line",
    (node, value) =>
      node.elementName === "line" && value instanceof LengthPercentage
        ? new Line(
            node.x1,
            value,
            node.x2,
            node.y2,
            node.identity,
            node.paint,
            node.transformAttr,
          )
        : null,
  ),
  x2: lengthSpec(
    "x2",
    (node) => node.elementName === "line",
    (node, value) =>
      node.elementName === "line" && value instanceof LengthPercentage
        ? new Line(
            node.x1,
            node.y1,
            value,
            node.y2,
            node.identity,
            node.paint,
            node.transformAttr,
          )
        : null,
  ),
  y2: lengthSpec(
    "y2",
    (node) => node.elementName === "line",
    (node, value) =>
      node.elementName === "line" && value instanceof LengthPercentage
        ? new Line(
            node.x1,
            node.y1,
            node.x2,
            value,
            node.identity,
            node.paint,
            node.transformAttr,
          )
        : null,
  ),
  dx: lengthSpec(
    "dx",
    (node) => isTextElement(node),
    (node, value) =>
      isTextElement(node) && value instanceof LengthPercentage
        ? withCommon(
            node,
            new TextCommon(
              node.common.x,
              node.common.y,
              value,
              node.common.dy,
              node.common.textAnchor,
              node.common.fontSize,
            ),
          )
        : null,
  ),
  dy: lengthSpec(
    "dy",
    (node) => isTextElement(node),
    (node, value) =>
      isTextElement(node) && value instanceof LengthPercentage
        ? withCommon(
            node,
            new TextCommon(
              node.common.x,
              node.common.y,
              node.common.dx,
              value,
              node.common.textAnchor,
              node.common.fontSize,
            ),
          )
        : null,
  ),
  "stroke-width": lengthSpec(
    "stroke-width",
    () => true,
    (node, value) =>
      value instanceof LengthPercentage
        ? node.withAttributes(
            node.identity,
            node.paint.withStrokeWidth(value),
            node.transformAttr,
          )
        : null,
    { nonnegative: true },
  ),
  opacity: new AttributeSpec(
    "opacity",
    (word) => {
      const value = Number(word);
      if (word.trim() === "" || !Number.isFinite(value)) {
        throw new AttributeParseError(
          `cannot read '${word}' as an opacity`,
        );
      }
      return value;
    },
    () => true,
    (node, value) =>
      typeof value === "number"
        ? node.withAttributes(
            node.identity,
            node.paint.withOpacity(value),
            node.transformAttr,
          )
        : null,
    { opacity: true },
  ),
  width: lengthSpec(
    "width",
    (node) => node.elementName === "rect" || node.elementName === "svg",
    (node, value) => {
      if (!(value instanceof LengthPercentage)) {
        return null;
      }
      if (node.elementName === "rect") {
        return new Rect(
          node.x,
          node.y,
          value,
          node.height,
          node.identity,
          node.paint,
          node.transformAttr,
        );
      }
      return node.elementName === "svg"
        ? new Svg(
            value,
            node.height,
            node.xmlns,
            node.viewBox,
            node.identity,
            node.paint,
            node.transformAttr,
          )
        : null;
    },
    { nonnegative: true, canvasDimension: true },
  ),
  height: lengthSpec(
    "height",
    (node) => node.elementName === "rect" || node.elementName === "svg",
    (node, value) => {
      if (!(value instanceof LengthPercentage)) {
        return null;
      }
      if (node.elementName === "rect") {
        return new Rect(
          node.x,
          node.y,
          node.width,
          value,
          node.identity,
          node.paint,
          node.transformAttr,
        );
      }
      return node.elementName === "svg"
        ? new Svg(
            node.width,
            value,
            node.xmlns,
            node.viewBox,
            node.identity,
            node.paint,
            node.transformAttr,
          )
        : null;
    },
    { nonnegative: true, canvasDimension: true },
  ),
  startOffset: lengthSpec(
    "startOffset",
    (node) => node.elementName === "textPath",
    (node, value) =>
      node.elementName === "textPath" && value instanceof LengthPercentage
        ? new TextPath(
            value,
            node.href,
            node.common,
            node.identity,
            node.paint,
            node.transformAttr,
          )
        : null,
  ),
  xmlns: new AttributeSpec(
    "xmlns",
    (word) => word,
    (node) => node.elementName === "svg",
    (node, value) =>
      node.elementName === "svg" && typeof value === "string"
        ? new Svg(
            node.width,
            node.height,
            value,
            node.viewBox,
            node.identity,
            node.paint,
            node.transformAttr,
          )
        : null,
  ),
  viewBox: new AttributeSpec(
    "viewBox",
    (word) => {
      const value = ViewBox.parse(word);
      if (value === null) {
        throw new AttributeParseError(
          `cannot read '${word}' as a viewBox: four finite numbers, with a non-negative width and height`,
        );
      }
      return value;
    },
    (node) => node.elementName === "svg",
    (node, value) =>
      node.elementName === "svg" && value instanceof ViewBox
        ? new Svg(
            node.width,
            node.height,
            node.xmlns,
            value,
            node.identity,
            node.paint,
            node.transformAttr,
          )
        : null,
  ),
  "text-anchor": new AttributeSpec(
    "text-anchor",
    (word) => {
      const lowered = word.toLowerCase();
      if (lowered === "start") {
        return TextAnchor.Start;
      }
      if (lowered === "middle") {
        return TextAnchor.Middle;
      }
      if (lowered === "end") {
        return TextAnchor.End;
      }
      throw new AttributeParseError(
        `cannot read '${word}' as a text-anchor: start, middle or end`,
      );
    },
    (node) => isTextElement(node),
    (node, value) => {
      if (
        !(isTextElement(node)) ||
        (value !== TextAnchor.Start &&
          value !== TextAnchor.Middle &&
          value !== TextAnchor.End)
      ) {
        return null;
      }
      return withCommon(
        node,
        new TextCommon(
          node.common.x,
          node.common.y,
          node.common.dx,
          node.common.dy,
          value,
          node.common.fontSize,
        ),
      );
    },
  ),
  "font-size": lengthSpec(
    "font-size",
    (node) => isTextElement(node),
    (node, value) =>
      isTextElement(node) && value instanceof LengthPercentage
        ? withCommon(
            node,
            new TextCommon(
              node.common.x,
              node.common.y,
              node.common.dx,
              node.common.dy,
              node.common.textAnchor,
              value,
            ),
          )
        : null,
    { nonnegative: true },
  ),
  class: new AttributeSpec(
    "class",
    (word) => word,
    () => true,
    (node, value) =>
      typeof value === "string"
        ? node.withAttributes(
            node.identity.withClass(value),
            node.paint,
            node.transformAttr,
          )
        : null,
  ),
  fill: new AttributeSpec(
    "fill",
    (word) => paint(word, "fill"),
    () => true,
    (node, value) =>
      value instanceof Paint
        ? node.withAttributes(
            node.identity,
            node.paint.withFill(value),
            node.transformAttr,
          )
        : null,
  ),
  stroke: new AttributeSpec(
    "stroke",
    (word) => paint(word, "stroke"),
    () => true,
    (node, value) =>
      value instanceof Paint
        ? node.withAttributes(
            node.identity,
            node.paint.withStroke(value),
            node.transformAttr,
          )
        : null,
  ),
  transform: new AttributeSpec(
    "transform",
    (word) => {
      const value = Transform.parse(word);
      if (value === null) {
        throw new AttributeParseError(
          `cannot read '${word}' as a transform list`,
        );
      }
      return value;
    },
    () => true,
    (node, value) =>
      value instanceof Transform
        ? node.withAttributes(
            node.identity,
            node.paint,
            node.transformAttr.withTransform(value),
          )
        : null,
  ),
  href: new AttributeSpec(
    "href",
    (word) => word,
    (node) => node.elementName === "textPath",
    (node, value) =>
      node.elementName === "textPath" && typeof value === "string"
        ? new TextPath(
            node.startOffset,
            value,
            node.common,
            node.identity,
            node.paint,
            node.transformAttr,
          )
        : null,
  ),
  text: new AttributeSpec(
    "text",
    (word) => word,
    (node) => isTextElement(node),
    (node) => node,
    { content: true },
  ),
  content: new AttributeSpec(
    "content",
    (word) => word,
    (node) => isTextElement(node),
    (node) => node,
    { content: true },
  ),
};

