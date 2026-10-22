import {
  Circle,
  Defs,
  Ellipse,
  Group,
  Line,
  PlainTextNode,
  Rect,
  Svg,
  Switch,
  Symbol as SvgSymbol,
  TextAnchor,
  TextCommon,
  TextPath,
  TextWrapper,
  Tspan,
} from "../model/node/index.js";
import { ElementNode } from "../model/node/ElementNode.js";
import type { Node } from "../model/node/index.js";
import { IdentityAttr } from "../model/values/IdentityAttr.js";
import { Length } from "../model/values/Length.js";
import type { LengthPercentage } from "../model/values/LengthPercentage.js";
import { LengthUnit } from "../model/values/LengthUnit.js";
import { PaintAttr } from "../model/values/PaintAttr.js";
import { parsePaint } from "../model/values/Color.js";
import { parseLength } from "../model/values/parseValues.js";
import { reservedSvgId, validSvgId } from "../model/values/svgId.js";
import { Transform } from "../model/values/Transform.js";
import { TransformAttr } from "../model/values/TransformAttr.js";
import { ViewBox } from "../model/values/ViewBox.js";
import type { XmlElement } from "./XmlParser.js";
import { XmlParser } from "./XmlParser.js";

const COMMON_ATTRIBUTES = new Set([
  "id",
  "class",
  "fill",
  "stroke",
  "stroke-width",
  "transform",
]);

const ELEMENT_ATTRIBUTES: Readonly<Record<string, ReadonlySet<string>>> = {
  svg: new Set(["width", "height", "viewBox", "xmlns"]),
  g: new Set(),
  defs: new Set(),
  symbol: new Set(),
  switch: new Set(),
  rect: new Set(["x", "y", "width", "height"]),
  circle: new Set(["cx", "cy", "r"]),
  ellipse: new Set(["cx", "cy", "rx", "ry"]),
  line: new Set(["x1", "y1", "x2", "y2"]),
  text: new Set(["x", "y", "dx", "dy", "text-anchor", "font-size"]),
  tspan: new Set(["x", "y", "dx", "dy", "text-anchor", "font-size"]),
  textPath: new Set([
    "x",
    "y",
    "dx",
    "dy",
    "text-anchor",
    "font-size",
    "startOffset",
    "href",
    "xlink:href",
  ]),
};

export class ParsedNode {
  public constructor(
    public readonly node: Node,
    public readonly children: readonly ParsedNode[],
  ) {}
}

export class AssignedId {
  public constructor(
    public readonly id: string,
    public readonly element: string,
    public readonly originalId: string,
  ) {}
}

export class ParsedSvg {
  public constructor(
    public readonly root: ParsedNode,
    public readonly assignedIds: readonly AssignedId[],
  ) {}
}

export class SvgReadError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SvgReadError";
  }
}

function fail(message: string): never {
  throw new SvgReadError(message);
}

function whitespaceOnly(text: string): boolean {
  return text.trim() === "";
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
    fail(`invalid ${name} on <${element.localName}>: ${raw}`);
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
    fail(`${name} must not be negative on <${element.localName}>`);
  }
}

function commonNode(element: XmlElement): {
  readonly identity: IdentityAttr;
  readonly paint: PaintAttr;
  readonly transformAttr: TransformAttr;
} {
  const fillText = element.attribute("fill");
  const strokeText = element.attribute("stroke");
  const fill = fillText === undefined ? null : parsePaint(fillText);
  const stroke = strokeText === undefined ? null : parsePaint(strokeText);
  if (fillText !== undefined && fill === null) {
    fail(`invalid fill on <${element.localName}>: ${fillText}`);
  }
  if (strokeText !== undefined && stroke === null) {
    fail(`invalid stroke on <${element.localName}>: ${strokeText}`);
  }
  const strokeWidth = optionalLength(element, "stroke-width");
  if (strokeWidth !== null) {
    requireNonnegative(element, "stroke-width", strokeWidth);
  }
  const transformText = element.attribute("transform");
  const transform =
    transformText === undefined ? Transform.identity() : Transform.parse(transformText);
  if (transform === null) {
    fail(`invalid transform on <${element.localName}>: ${transformText ?? ""}`);
  }
  return {
    identity: new IdentityAttr(
      element.attribute("id") ?? "",
      element.attribute("class") ?? "",
    ),
    paint: new PaintAttr(fill, stroke, strokeWidth),
    transformAttr: new TransformAttr(transform),
  };
}

function parseAnchor(text: string | undefined): TextAnchor | null {
  switch (text?.toLowerCase()) {
    case undefined:
      return null;
    case "start":
      return TextAnchor.Start;
    case "middle":
      return TextAnchor.Middle;
    case "end":
      return TextAnchor.End;
    default:
      fail(`invalid text-anchor: ${text ?? ""}`);
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
    fail(`invalid viewBox: ${text}`);
  }
  return box;
}

function validateAttributes(element: XmlElement): void {
  const accepted = ELEMENT_ATTRIBUTES[element.localName];
  if (accepted === undefined) {
    fail(`unsupported element: ${element.localName}`);
  }
  for (const name of element.attributes.keys()) {
    if (name === "xmlns" || name.startsWith("xmlns:")) {
      continue;
    }
    if (!COMMON_ATTRIBUTES.has(name) && !accepted.has(name)) {
      fail(`unsupported attribute ${name} on <${element.localName}>`);
    }
  }
}

function rawElement(element: XmlElement, isRoot: boolean): ParsedNode {
  validateAttributes(element);
  const common = commonNode(element);
  const name = element.localName;
  let node: Node;
  switch (name) {
    case "svg":
      node = new Svg(
        optionalLength(element, "width"),
        optionalLength(element, "height"),
        element.attribute("xmlns") ?? "",
        parseViewBox(element),
        common.identity,
        common.paint,
        common.transformAttr,
      );
      break;
    case "g":
      node = new Group(
        common.identity,
        common.paint,
        common.transformAttr,
      );
      break;
    case "defs":
      node = new Defs(
        common.identity,
        common.paint,
        common.transformAttr,
      );
      break;
    case "symbol":
      node = new SvgSymbol(
        common.identity,
        common.paint,
        common.transformAttr,
      );
      break;
    case "switch":
      node = new Switch(
        common.identity,
        common.paint,
        common.transformAttr,
      );
      break;
    case "rect": {
      const width = lengthOrZero(element, "width");
      const height = lengthOrZero(element, "height");
      requireNonnegative(element, "width", width);
      requireNonnegative(element, "height", height);
      node = new Rect(
        lengthOrZero(element, "x"),
        lengthOrZero(element, "y"),
        width,
        height,
        common.identity,
        common.paint,
        common.transformAttr,
      );
      break;
    }
    case "circle": {
      const radius = lengthOrZero(element, "r");
      requireNonnegative(element, "r", radius);
      node = new Circle(
        lengthOrZero(element, "cx"),
        lengthOrZero(element, "cy"),
        radius,
        common.identity,
        common.paint,
        common.transformAttr,
      );
      break;
    }
    case "ellipse": {
      const radiusX = lengthOrZero(element, "rx");
      const radiusY = lengthOrZero(element, "ry");
      requireNonnegative(element, "rx", radiusX);
      requireNonnegative(element, "ry", radiusY);
      node = new Ellipse(
        lengthOrZero(element, "cx"),
        lengthOrZero(element, "cy"),
        radiusX,
        radiusY,
        common.identity,
        common.paint,
        common.transformAttr,
      );
      break;
    }
    case "line":
      node = new Line(
        lengthOrZero(element, "x1"),
        lengthOrZero(element, "y1"),
        lengthOrZero(element, "x2"),
        lengthOrZero(element, "y2"),
        common.identity,
        common.paint,
        common.transformAttr,
      );
      break;
    case "text":
      node = new TextWrapper(
        textCommon(element),
        common.identity,
        common.paint,
        common.transformAttr,
      );
      break;
    case "tspan":
      node = new Tspan(
        textCommon(element),
        common.identity,
        common.paint,
        common.transformAttr,
      );
      break;
    case "textPath":
      node = new TextPath(
        optionalLength(element, "startOffset"),
        element.attribute("href") ??
          element.attribute("xlink:href") ??
          "",
        textCommon(element),
        common.identity,
        common.paint,
        common.transformAttr,
      );
      break;
    default:
      fail(`unsupported element: ${name}`);
  }

  const children: ParsedNode[] = [];
  const content =
    name === "svg" ||
    name === "g" ||
    name === "defs" ||
    name === "symbol" ||
    name === "switch"
      ? "elements"
      : name === "text" || name === "tspan" || name === "textPath"
        ? "text"
        : "none";
  for (const child of element.children) {
    if (typeof child === "string") {
      if (whitespaceOnly(child)) {
        continue;
      }
      if (content !== "text") {
        fail(`unexpected text inside <${name}>`);
      }
      children.push(new ParsedNode(new PlainTextNode(child), []));
      continue;
    }
    if (content === "none") {
      fail(`unexpected element inside <${name}>`);
    }
    if (
      content === "text" &&
      child.localName !== "tspan" &&
      child.localName !== "textPath"
    ) {
      fail(`unsupported element in text: ${child.localName}`);
    }
    children.push(rawElement(child, false));
  }
  if (!isRoot && element.localName === "svg") {
    fail("an <svg> element may only be the document root");
  }
  return new ParsedNode(node, children);
}

function collectExplicitIds(
  parsed: ParsedNode,
  isRoot: boolean,
  used: Set<string>,
): void {
  const node = parsed.node;
  if (node instanceof ElementNode && node.id !== "") {
    if (!validSvgId(node.id)) {
      fail(`invalid XML id: ${node.id}`);
    }
    if (!isRoot && !reservedSvgId(node.id)) {
      if (used.has(node.id)) {
        fail(`duplicate id: ${node.id}`);
      }
      used.add(node.id);
    }
  }
  for (const child of parsed.children) {
    collectExplicitIds(child, false, used);
  }
}

function assignIds(
  parsed: ParsedNode,
  isRoot: boolean,
  used: Set<string>,
  counters: Map<string, number>,
  assigned: AssignedId[],
): ParsedNode {
  let node = parsed.node;
  if (node instanceof ElementNode && !isRoot) {
    const original = node.id;
    if (original === "" || reservedSvgId(original)) {
      const kind = node.elementName;
      let number = (counters.get(kind) ?? 0) + 1;
      let generated = `${kind}${String(number)}`;
      while (used.has(generated)) {
        number += 1;
        generated = `${kind}${String(number)}`;
      }
      counters.set(kind, number);
      used.add(generated);
      assigned.push(new AssignedId(generated, kind, original));
      node = node.withAttributes(
        new IdentityAttr(generated, node.identity.class_),
        node.paint,
        node.transformAttr,
      );
    }
  }
  return new ParsedNode(
    node,
    parsed.children.map((child) =>
      assignIds(child, false, used, counters, assigned),
    ),
  );
}

export class SvgReader {
  public read(source: string): ParsedSvg {
    let xml: XmlElement;
    try {
      xml = new XmlParser(source).parse();
    } catch (error: unknown) {
      if (error instanceof Error) {
        fail(`malformed XML: ${error.message}`);
      }
      fail("malformed XML");
    }
    if (xml.localName !== "svg") {
      fail("root element is not <svg>");
    }
    const raw = rawElement(xml, true);
    const used = new Set<string>();
    collectExplicitIds(raw, true, used);
    const assigned: AssignedId[] = [];
    return new ParsedSvg(
      assignIds(raw, true, used, new Map(), assigned),
      assigned,
    );
  }
}

