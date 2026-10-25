import {
  Circle,
  Defs,
  Ellipse,
  Group,
  Line,
  Polygon,
  Rect,
  Svg,
  Switch,
  Symbol as SvgSymbol,
  TextAnchor,
  TextCommon,
  TextPath,
  TextWrapper,
  Tspan,
  type Element,
  type ElementName,
} from "../model/node/index.js";
import { IdentityAttr } from "../model/values/IdentityAttr.js";
import { Length } from "../model/values/Length.js";
import type { LengthPercentage } from "../model/values/LengthPercentage.js";
import { LengthUnit } from "../model/values/LengthUnit.js";
import { PaintAttr } from "../model/values/PaintAttr.js";
import { Points } from "../model/values/Points.js";
import { parsePaint } from "../model/values/Color.js";
import { parseLength, parseNumber } from "../model/values/parseValues.js";
import { Transform } from "../model/values/Transform.js";
import { TransformAttr } from "../model/values/TransformAttr.js";
import { ViewBox } from "../model/values/ViewBox.js";
import type { XmlElement } from "./XmlParser.js";
import { failSvg } from "./SvgError.js";

type Content = "elements" | "text" | "none";

interface ElementSpec {
  readonly attributes: ReadonlySet<string>;
  readonly content: Content;
  readonly read: (
    element: XmlElement,
    common: CommonAttributes,
  ) => Element;
}

interface CommonAttributes {
  readonly identity: IdentityAttr;
  readonly paint: PaintAttr;
  readonly transformAttr: TransformAttr;
}

const NO_ATTRIBUTES: ReadonlySet<string> = new Set();
const TEXT_ATTRIBUTES = new Set([
  "x",
  "y",
  "dx",
  "dy",
  "text-anchor",
  "font-size",
]);
const COMMON_ATTRIBUTES = new Set([
  "id",
  "class",
  "fill",
  "stroke",
  "stroke-width",
  "opacity",
  "transform",
]);

function spec(
  attributes: ReadonlySet<string>,
  content: Content,
  read: ElementSpec["read"],
): ElementSpec {
  return { attributes, content, read };
}

function optionalLength(
  element: XmlElement,
  name: string,
): LengthPercentage | null {
  const raw = element.attribute(name);
  if (raw === undefined) {
    return null;
  }
  const value = parseLength(raw);
  if (value === null) {
    failSvg(`invalid ${name} on <${element.localName}>: ${raw}`);
  }
  return value;
}

function lengthOrZero(
  element: XmlElement,
  name: string,
): LengthPercentage {
  return optionalLength(element, name) ?? new Length(0, LengthUnit.UserUnit);
}

function requireNonnegative(
  element: XmlElement,
  name: string,
  value: LengthPercentage,
): void {
  if (value.value < 0) {
    failSvg(`${name} must not be negative on <${element.localName}>`);
  }
}

function commonAttributes(element: XmlElement): CommonAttributes {
  const fillText = element.attribute("fill");
  const strokeText = element.attribute("stroke");
  const fill = fillText === undefined ? null : parsePaint(fillText);
  const stroke = strokeText === undefined ? null : parsePaint(strokeText);
  if (fillText !== undefined && fill === null) {
    failSvg(`invalid fill on <${element.localName}>: ${fillText}`);
  }
  if (strokeText !== undefined && stroke === null) {
    failSvg(`invalid stroke on <${element.localName}>: ${strokeText}`);
  }
  const strokeWidth = optionalLength(element, "stroke-width");
  if (strokeWidth !== null) {
    requireNonnegative(element, "stroke-width", strokeWidth);
  }
  const opacityText = element.attribute("opacity");
  const opacity = opacityText === undefined ? null : parseNumber(opacityText);
  if (
    opacityText !== undefined &&
    (opacity === null || opacity < 0 || opacity > 1)
  ) {
    failSvg(`invalid opacity on <${element.localName}>: ${opacityText}`);
  }
  const transformText = element.attribute("transform");
  const transform =
    transformText === undefined
      ? Transform.identity()
      : Transform.parse(transformText);
  if (transform === null) {
    failSvg(
      `invalid transform on <${element.localName}>: ${transformText ?? ""}`,
    );
  }
  return {
    identity: new IdentityAttr(
      element.attribute("id") ?? "",
      element.attribute("class") ?? "",
    ),
    paint: new PaintAttr(fill, stroke, strokeWidth, opacity),
    transformAttr: new TransformAttr(transform),
  };
}

function parseAnchor(text: string | undefined): TextAnchor | null {
  if (text === undefined) {
    return null;
  }
  switch (text.toLowerCase()) {
    case "start":
      return TextAnchor.Start;
    case "middle":
      return TextAnchor.Middle;
    case "end":
      return TextAnchor.End;
    default:
      return failSvg(`invalid text-anchor: ${text}`);
  }
}

function textCommon(element: XmlElement): TextCommon {
  const fontSize = optionalLength(element, "font-size");
  if (fontSize !== null) {
    requireNonnegative(element, "font-size", fontSize);
  }
  return new TextCommon(
    optionalLength(element, "x"),
    optionalLength(element, "y"),
    optionalLength(element, "dx"),
    optionalLength(element, "dy"),
    parseAnchor(element.attribute("text-anchor")),
    fontSize,
  );
}

function parseViewBox(element: XmlElement): ViewBox | null {
  const text = element.attribute("viewBox");
  if (text === undefined) {
    return null;
  }
  const box = ViewBox.parse(text);
  if (box === null) {
    failSvg(`invalid viewBox: ${text}`);
  }
  return box;
}

function polygonPoints(element: XmlElement): Points {
  const text = element.attribute("points");
  const points = text === undefined ? null : Points.parse(text);
  if (points === null) {
    failSvg(`invalid points on <polygon>: ${text ?? ""}`);
  }
  return points;
}

export const SVG_SCHEMA: Readonly<Record<ElementName, ElementSpec>> = {
  svg: spec(
    new Set(["width", "height", "viewBox", "xmlns"]),
    "elements",
    (element, common) =>
      new Svg(
        optionalLength(element, "width"),
        optionalLength(element, "height"),
        element.attribute("xmlns") ?? "",
        parseViewBox(element),
        common.identity,
        common.paint,
        common.transformAttr,
      ),
  ),
  g: spec(
    new Set(["data-kind"]),
    "elements",
    (element, common) =>
      new Group(
        common.identity,
        common.paint,
        common.transformAttr,
        element.attribute("data-kind") ?? null,
      ),
  ),
  defs: spec(
    NO_ATTRIBUTES,
    "elements",
    (_element, common) =>
      new Defs(common.identity, common.paint, common.transformAttr),
  ),
  symbol: spec(
    NO_ATTRIBUTES,
    "elements",
    (_element, common) =>
      new SvgSymbol(common.identity, common.paint, common.transformAttr),
  ),
  switch: spec(
    NO_ATTRIBUTES,
    "elements",
    (_element, common) =>
      new Switch(common.identity, common.paint, common.transformAttr),
  ),
  rect: spec(
    new Set(["x", "y", "width", "height"]),
    "none",
    (element, common) => {
      const width = lengthOrZero(element, "width");
      const height = lengthOrZero(element, "height");
      requireNonnegative(element, "width", width);
      requireNonnegative(element, "height", height);
      return new Rect(
        lengthOrZero(element, "x"),
        lengthOrZero(element, "y"),
        width,
        height,
        common.identity,
        common.paint,
        common.transformAttr,
      );
    },
  ),
  circle: spec(
    new Set(["cx", "cy", "r"]),
    "none",
    (element, common) => {
      const radius = lengthOrZero(element, "r");
      requireNonnegative(element, "r", radius);
      return new Circle(
        lengthOrZero(element, "cx"),
        lengthOrZero(element, "cy"),
        radius,
        common.identity,
        common.paint,
        common.transformAttr,
      );
    },
  ),
  ellipse: spec(
    new Set(["cx", "cy", "rx", "ry"]),
    "none",
    (element, common) => {
      const radiusX = lengthOrZero(element, "rx");
      const radiusY = lengthOrZero(element, "ry");
      requireNonnegative(element, "rx", radiusX);
      requireNonnegative(element, "ry", radiusY);
      return new Ellipse(
        lengthOrZero(element, "cx"),
        lengthOrZero(element, "cy"),
        radiusX,
        radiusY,
        common.identity,
        common.paint,
        common.transformAttr,
      );
    },
  ),
  line: spec(
    new Set(["x1", "y1", "x2", "y2"]),
    "none",
    (element, common) =>
      new Line(
        lengthOrZero(element, "x1"),
        lengthOrZero(element, "y1"),
        lengthOrZero(element, "x2"),
        lengthOrZero(element, "y2"),
        common.identity,
        common.paint,
        common.transformAttr,
      ),
  ),
  polygon: spec(
    new Set(["points"]),
    "none",
    (element, common) =>
      new Polygon(
        polygonPoints(element),
        common.identity,
        common.paint,
        common.transformAttr,
      ),
  ),
  text: spec(
    TEXT_ATTRIBUTES,
    "text",
    (element, common) =>
      new TextWrapper(
        textCommon(element),
        common.identity,
        common.paint,
        common.transformAttr,
      ),
  ),
  tspan: spec(
    TEXT_ATTRIBUTES,
    "text",
    (element, common) =>
      new Tspan(
        textCommon(element),
        common.identity,
        common.paint,
        common.transformAttr,
      ),
  ),
  textPath: spec(
    new Set([
      ...TEXT_ATTRIBUTES,
      "startOffset",
      "href",
      "xlink:href",
    ]),
    "text",
    (element, common) =>
      new TextPath(
        optionalLength(element, "startOffset"),
        element.attribute("href") ??
          element.attribute("xlink:href") ??
          "",
        textCommon(element),
        common.identity,
        common.paint,
        common.transformAttr,
      ),
  ),
};

export function validateSvgElement(element: XmlElement): ElementSpec {
  if (!Object.hasOwn(SVG_SCHEMA, element.localName)) {
    failSvg(`unsupported element: ${element.localName}`);
  }
  const schema = SVG_SCHEMA[element.localName as ElementName];
  for (const name of element.attributes.keys()) {
    if (name === "xmlns" || name.startsWith("xmlns:")) {
      continue;
    }
    if (!COMMON_ATTRIBUTES.has(name) && !schema.attributes.has(name)) {
      failSvg(`unsupported attribute ${name} on <${element.localName}>`);
    }
  }
  return schema;
}

export function readSvgElement(element: XmlElement): Element {
  const schema = validateSvgElement(element);
  return schema.read(element, commonAttributes(element));
}

export function contentOf(element: XmlElement): Content {
  return validateSvgElement(element).content;
}

function escapedAttribute(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("\n", "&#10;")
    .replaceAll("\r", "&#13;")
    .replaceAll("\t", "&#9;");
}

export function svgAttribute(name: string, value: string): string {
  return `${name}="${escapedAttribute(value)}"`;
}

function textAttributes(node: TextWrapper | Tspan | TextPath): string[] {
  const common = node.common;
  const attributes: string[] = [];
  if (common.x !== null) {
    attributes.push(svgAttribute("x", common.x.toSvgText()));
  }
  if (common.y !== null) {
    attributes.push(svgAttribute("y", common.y.toSvgText()));
  }
  if (common.dx !== null) {
    attributes.push(svgAttribute("dx", common.dx.toSvgText()));
  }
  if (common.dy !== null) {
    attributes.push(svgAttribute("dy", common.dy.toSvgText()));
  }
  if (common.textAnchor !== null) {
    attributes.push(svgAttribute("text-anchor", common.textAnchor));
  }
  if (common.fontSize !== null) {
    attributes.push(
      svgAttribute("font-size", common.fontSize.toSvgText()),
    );
  }
  return attributes;
}

export function elementDataAttributes(node: Element): string {
  switch (node.elementName) {
    case "rect":
      return [
        svgAttribute("x", node.x.toSvgText()),
        svgAttribute("y", node.y.toSvgText()),
        svgAttribute("width", node.width.toSvgText()),
        svgAttribute("height", node.height.toSvgText()),
      ].join(" ");
    case "circle":
      return [
        svgAttribute("cx", node.cx.toSvgText()),
        svgAttribute("cy", node.cy.toSvgText()),
        svgAttribute("r", node.radius.toSvgText()),
      ].join(" ");
    case "ellipse":
      return [
        svgAttribute("cx", node.cx.toSvgText()),
        svgAttribute("cy", node.cy.toSvgText()),
        svgAttribute("rx", node.radiusX.toSvgText()),
        svgAttribute("ry", node.radiusY.toSvgText()),
      ].join(" ");
    case "line":
      return [
        svgAttribute("x1", node.x1.toSvgText()),
        svgAttribute("y1", node.y1.toSvgText()),
        svgAttribute("x2", node.x2.toSvgText()),
        svgAttribute("y2", node.y2.toSvgText()),
      ].join(" ");
    case "polygon":
      return svgAttribute("points", node.points.toSvgText());
    case "g":
      return node.dataKind === null
        ? ""
        : svgAttribute("data-kind", node.dataKind);
    case "defs":
    case "symbol":
    case "switch":
      return "";
    case "svg": {
      const attributes: string[] = [];
      if (node.width !== null) {
        attributes.push(svgAttribute("width", node.width.toSvgText()));
      }
      if (node.height !== null) {
        attributes.push(svgAttribute("height", node.height.toSvgText()));
      }
      if (node.viewBox !== null) {
        attributes.push(
          svgAttribute("viewBox", node.viewBox.toSvgText()),
        );
      }
      return attributes.join(" ");
    }
    case "text":
      return textAttributes(node).join(" ");
    case "tspan":
      return textAttributes(node).join(" ");
    case "textPath": {
      const attributes = textAttributes(node);
      if (node.startOffset !== null) {
        attributes.push(
          svgAttribute("startOffset", node.startOffset.toSvgText()),
        );
      }
      if (node.href !== "") {
        attributes.push(svgAttribute("href", node.href));
      }
      return attributes.join(" ");
    }
  }
}

