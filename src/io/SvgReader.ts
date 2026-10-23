import {
  isElementNode,
  PlainTextNode,
  type Node,
} from "../model/node/index.js";
import { IdentityAttr } from "../model/values/IdentityAttr.js";
import { reservedSvgId, validSvgId } from "../model/values/svgId.js";
import { failSvg, SvgReadError } from "./SvgError.js";
import { contentOf, readSvgElement } from "./SvgSchema.js";
import type { XmlElement } from "./XmlParser.js";
import { XmlParser } from "./XmlParser.js";

export { SvgReadError };

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

function whitespaceOnly(text: string): boolean {
  return text.trim() === "";
}

function rawElement(element: XmlElement, isRoot: boolean): ParsedNode {
  if (!isRoot && element.localName === "svg") {
    failSvg("an <svg> element may only be the document root");
  }
  const node = readSvgElement(element);
  const content = contentOf(element);
  const children: ParsedNode[] = [];
  for (const child of element.children) {
    if (typeof child === "string") {
      if (whitespaceOnly(child)) {
        continue;
      }
      if (content !== "text") {
        failSvg(`unexpected text inside <${element.localName}>`);
      }
      children.push(new ParsedNode(new PlainTextNode(child), []));
      continue;
    }
    if (content === "none") {
      failSvg(`unexpected element inside <${element.localName}>`);
    }
    if (
      content === "text" &&
      child.localName !== "tspan" &&
      child.localName !== "textPath"
    ) {
      failSvg(`unsupported element in text: ${child.localName}`);
    }
    children.push(rawElement(child, false));
  }
  return new ParsedNode(node, children);
}

function collectExplicitIds(
  parsed: ParsedNode,
  isRoot: boolean,
  used: Set<string>,
): void {
  const node = parsed.node;
  if (isElementNode(node) && node.id !== "") {
    if (!validSvgId(node.id)) {
      failSvg(`invalid XML id: ${node.id}`);
    }
    if (!isRoot && !reservedSvgId(node.id)) {
      if (used.has(node.id)) {
        failSvg(`duplicate id: ${node.id}`);
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
  if (isElementNode(node) && !isRoot) {
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
        failSvg(`malformed XML: ${error.message}`);
      }
      failSvg("malformed XML");
    }
    if (xml.localName !== "svg") {
      failSvg("root element is not <svg>");
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

