import { PlainTextNode, Svg } from "../model/node/index.js";
import { ElementNode } from "../model/node/ElementNode.js";
import type {
  Circle,
  Defs,
  Ellipse,
  Group,
  Line,
  Node,
  Rect,
  Switch,
  Symbol as SvgSymbol,
  TextNode,
  TextPath,
  TextWrapper,
  Tspan,
} from "../model/node/index.js";
import type { TreeStore } from "../model/store/TreeStore.js";
import type { Vid } from "../model/store/hiveState.js";
import { NodeVisitor } from "../model/visit/NodeVisitor.js";
import { DEFAULT_SVG_NAMESPACE } from "../model/node/Svg.js";

function escapedText(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\r", "&#13;");
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

function attribute(name: string, value: string): string {
  return `${name}="${escapedAttribute(value)}"`;
}

export class SvgSerializer extends NodeVisitor<void> {
  private output = "";
  private id: Vid = -1;
  private depth = 0;
  private inline = false;

  public constructor(private readonly store: TreeStore) {
    super();
  }

  public render(): string {
    if (!this.store.hasDocument()) {
      throw new Error("write_svg: the document has no root");
    }
    const root = this.store.node(this.store.root());
    if (!(root instanceof Svg)) {
      throw new Error("write_svg: the document root is not <svg>");
    }
    this.output = '<?xml version="1.0" encoding="UTF-8"?>\n';
    this.writeNode(this.store.root(), 0, false);
    return this.output;
  }

  public visitRect(node: Rect): void {
    this.writeElement(
      node,
      [
        attribute("x", node.x.toSvgText()),
        attribute("y", node.y.toSvgText()),
        attribute("width", node.width.toSvgText()),
        attribute("height", node.height.toSvgText()),
      ].join(" "),
    );
  }

  public visitCircle(node: Circle): void {
    this.writeElement(
      node,
      [
        attribute("cx", node.cx.toSvgText()),
        attribute("cy", node.cy.toSvgText()),
        attribute("r", node.radius.toSvgText()),
      ].join(" "),
    );
  }

  public visitEllipse(node: Ellipse): void {
    this.writeElement(
      node,
      [
        attribute("cx", node.cx.toSvgText()),
        attribute("cy", node.cy.toSvgText()),
        attribute("rx", node.radiusX.toSvgText()),
        attribute("ry", node.radiusY.toSvgText()),
      ].join(" "),
    );
  }

  public visitLine(node: Line): void {
    this.writeElement(
      node,
      [
        attribute("x1", node.x1.toSvgText()),
        attribute("y1", node.y1.toSvgText()),
        attribute("x2", node.x2.toSvgText()),
        attribute("y2", node.y2.toSvgText()),
      ].join(" "),
    );
  }

  public visitGroup(node: Group): void {
    this.writeElement(node, "");
  }

  public visitDefs(node: Defs): void {
    this.writeElement(node, "");
  }

  public visitSvg(node: Svg): void {
    const data: string[] = [];
    if (node.width !== null) {
      data.push(attribute("width", node.width.toSvgText()));
    }
    if (node.height !== null) {
      data.push(attribute("height", node.height.toSvgText()));
    }
    if (node.viewBox !== null) {
      data.push(attribute("viewBox", node.viewBox.toSvgText()));
    }
    this.writeElement(node, data.join(" "));
  }

  public visitSymbol(node: SvgSymbol): void {
    this.writeElement(node, "");
  }

  public visitSwitch(node: Switch): void {
    this.writeElement(node, "");
  }

  public visitTextWrapper(node: TextWrapper): void {
    this.writeElement(node, this.textAttributes(node));
  }

  public visitTspan(node: Tspan): void {
    this.writeElement(node, this.textAttributes(node));
  }

  public visitTextPath(node: TextPath): void {
    const data = [this.textAttributes(node)];
    if (node.startOffset !== null) {
      data.push(attribute("startOffset", node.startOffset.toSvgText()));
    }
    if (node.href !== "") {
      data.push(attribute("href", node.href));
    }
    this.writeElement(node, data.filter((part) => part !== "").join(" "));
  }

  public visitPlainText(node: PlainTextNode): void {
    this.output += escapedText(node.content);
  }

  private textAttributes(node: TextNode): string {
    const data: string[] = [];
    if (node.common.x !== null) {
      data.push(attribute("x", node.common.x.toSvgText()));
    }
    if (node.common.y !== null) {
      data.push(attribute("y", node.common.y.toSvgText()));
    }
    if (node.common.dx !== null) {
      data.push(attribute("dx", node.common.dx.toSvgText()));
    }
    if (node.common.dy !== null) {
      data.push(attribute("dy", node.common.dy.toSvgText()));
    }
    if (node.common.textAnchor !== null) {
      data.push(attribute("text-anchor", node.common.textAnchor));
    }
    if (node.common.fontSize !== null) {
      data.push(attribute("font-size", node.common.fontSize.toSvgText()));
    }
    return data.join(" ");
  }

  private writeElement(node: ElementNode, data: string): void {
    const name = node.elementName;
    if (!this.inline) {
      this.output += " ".repeat(this.depth * 2);
    }
    this.output += `<${name}`;
    if (name === "svg" && this.depth === 0 && node instanceof Svg) {
      this.output += ` ${attribute(
        "xmlns",
        node.xmlns === "" ? DEFAULT_SVG_NAMESPACE : node.xmlns,
      )}`;
    }
    if (node.id !== "") {
      this.output += ` ${attribute("id", node.id)}`;
    }
    if (node.identity.class_ !== "") {
      this.output += ` ${attribute("class", node.identity.class_)}`;
    }
    if (data !== "") {
      this.output += ` ${data}`;
    }
    if (node.paint.fill !== null) {
      this.output += ` ${attribute("fill", node.paint.fill.toSvgText())}`;
    }
    if (node.paint.stroke !== null) {
      this.output += ` ${attribute("stroke", node.paint.stroke.toSvgText())}`;
    }
    if (node.paint.strokeWidth !== null) {
      this.output += ` ${attribute(
        "stroke-width",
        node.paint.strokeWidth.toSvgText(),
      )}`;
    }
    const transform = node.transformAttr.transform.toSvgText();
    if (transform !== "") {
      this.output += ` ${attribute("transform", transform)}`;
    }

    const children = this.store.children(this.id);
    if (children.length === 0) {
      this.output += "/>";
      return;
    }
    this.output += ">";
    const inline = this.hasTextChild(children);
    if (!inline) {
      this.output += "\n";
    }
    for (const child of children) {
      this.writeNode(child, this.depth + 1, inline);
    }
    if (!inline) {
      this.output += " ".repeat(this.depth * 2);
    }
    this.output += `</${name}>`;
  }

  private hasTextChild(children: readonly Vid[]): boolean {
    return children.some(
      (child) => this.store.node(child) instanceof PlainTextNode,
    );
  }

  private writeNode(id: Vid, depth: number, inline: boolean): void {
    const node = this.store.node(id);
    if (node === undefined) {
      throw new Error(`write_svg: no live node ${String(id)}`);
    }
    const previous = {
      id: this.id,
      depth: this.depth,
      inline: this.inline,
    };
    this.id = id;
    this.depth = depth;
    this.inline = inline;
    this.emit(node);
    if (!inline && node instanceof ElementNode) {
      this.output += "\n";
    }
    this.id = previous.id;
    this.depth = previous.depth;
    this.inline = previous.inline;
  }

  private emit(node: Node): void {
    node.accept(this);
  }
}

