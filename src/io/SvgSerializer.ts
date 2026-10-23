import {
  isElementNode,
  PlainTextNode,
  Svg,
  type Element,
  type Node,
} from "../model/node/index.js";
import { DEFAULT_SVG_NAMESPACE } from "../model/node/Svg.js";
import type { Vid } from "../model/store/hiveState.js";
import type { TreeStore } from "../model/store/TreeStore.js";
import { NodeVisitor } from "../model/visit/NodeVisitor.js";
import {
  elementDataAttributes,
  svgAttribute,
} from "./SvgSchema.js";

function escapedText(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\r", "&#13;");
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

  public visitRect(): void {
    this.writeElement();
  }

  public visitCircle(): void {
    this.writeElement();
  }

  public visitEllipse(): void {
    this.writeElement();
  }

  public visitLine(): void {
    this.writeElement();
  }

  public visitPolygon(): void {
    this.writeElement();
  }

  public visitGroup(): void {
    this.writeElement();
  }

  public visitDefs(): void {
    this.writeElement();
  }

  public visitSvg(): void {
    this.writeElement();
  }

  public visitSymbol(): void {
    this.writeElement();
  }

  public visitSwitch(): void {
    this.writeElement();
  }

  public visitTextWrapper(): void {
    this.writeElement();
  }

  public visitTspan(): void {
    this.writeElement();
  }

  public visitTextPath(): void {
    this.writeElement();
  }

  public visitPlainText(node: PlainTextNode): void {
    this.output += escapedText(node.content);
  }

  private writeElement(): void {
    const node = this.store.node(this.id);
    if (node === undefined || !isElementNode(node)) {
      throw new Error(`write_svg: no live element ${String(this.id)}`);
    }
    const name = node.elementName;
    if (!this.inline) {
      this.output += " ".repeat(this.depth * 2);
    }
    this.output += `<${name}`;
    if (name === "svg" && this.depth === 0) {
      this.output += ` ${svgAttribute(
        "xmlns",
        node.xmlns === "" ? DEFAULT_SVG_NAMESPACE : node.xmlns,
      )}`;
    }
    this.output += this.commonAttributes(node);

    const children = this.store.children(this.id);
    if (children.length === 0) {
      this.output += "/>";
      return;
    }
    this.output += ">";
    const inline = children.some(
      (child) => this.store.node(child) instanceof PlainTextNode,
    );
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

  private commonAttributes(node: Element): string {
    const attributes: string[] = [];
    if (node.id !== "") {
      attributes.push(svgAttribute("id", node.id));
    }
    if (node.identity.class_ !== "") {
      attributes.push(svgAttribute("class", node.identity.class_));
    }
    const data = elementDataAttributes(node);
    if (data !== "") {
      attributes.push(data);
    }
    if (node.paint.fill !== null) {
      attributes.push(
        svgAttribute("fill", node.paint.fill.toSvgText()),
      );
    }
    if (node.paint.stroke !== null) {
      attributes.push(
        svgAttribute("stroke", node.paint.stroke.toSvgText()),
      );
    }
    if (node.paint.strokeWidth !== null) {
      attributes.push(
        svgAttribute(
          "stroke-width",
          node.paint.strokeWidth.toSvgText(),
        ),
      );
    }
    if (node.paint.opacity !== null) {
      attributes.push(
        svgAttribute("opacity", String(node.paint.opacity)),
      );
    }
    const transform = node.transformAttr.transform.toSvgText();
    if (transform !== "") {
      attributes.push(svgAttribute("transform", transform));
    }
    return attributes.length === 0 ? "" : ` ${attributes.join(" ")}`;
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
    if (!inline && isElementNode(node)) {
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

