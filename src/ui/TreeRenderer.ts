import {
  isElementNode,
  type Node,
} from "../model/node/index.js";
import type { NodeView, TreeView } from "../protocol/view/View.js";
import { geometryDetails } from "../editor/shape/DetailsVisitor.js";
import type { ShapeRegistry } from "../plugin/Registry.js";

export function quoteIfNeeded(text: string): string {
  return /[\s"\\]/u.test(text) || text === ""
    ? `"${text.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`
    : text;
}

export function quoted(text: string): string {
  return `"${text.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

export function nodeDetails(node: Node, text = ""): readonly string[] {
  if (!isElementNode(node)) {
    const detail = geometryDetails(node);
    return detail === null ? [] : [detail];
  }
  const details: string[] = [];
  if (node.identity.class_ !== "") {
    details.push(`class=${quoteIfNeeded(node.identity.class_)}`);
  }
  const geometry = geometryDetails(node);
  if (geometry !== null) {
    details.push(geometry);
  }
  if (node.paint.fill !== null) {
    details.push(`fill=${node.paint.fill.toSvgText()}`);
  }
  if (node.paint.stroke !== null) {
    details.push(`stroke=${node.paint.stroke.toSvgText()}`);
  }
  if (node.paint.strokeWidth !== null) {
    details.push(`stroke-width=${node.paint.strokeWidth.toDisplayText()}`);
  }
  if (node.paint.opacity !== null) {
    details.push(`opacity=${String(node.paint.opacity)}`);
  }
  const transform = node.transformAttr.transform.toDisplayText();
  if (transform !== "") {
    details.push(`transform=${transform}`);
  }
  if (
    (node.elementName === "text" ||
      node.elementName === "tspan" ||
      node.elementName === "textPath") &&
    text !== ""
  ) {
    details.push(`text=${quoted(text)}`);
  }
  return details;
}

export class TreeRenderer {
  public constructor(private readonly shapes: ShapeRegistry) {}

  public render(view: TreeView): string {
    const lines = view.rows.map((row, index) => {
      let prefix = "";
      if (index > 0) {
        const followed = this.followedAt(view.rows, row.depth, index);
        for (let level = 1; level < row.depth; level += 1) {
          prefix += followed[level] ? "│   " : "    ";
        }
        prefix += row.last ? "└── " : "├── ";
      }
      return {
        prefix,
        name: this.nodeLabel(row.shape),
        details: nodeDetails(row.shape, row.text).join(" "),
      };
    });
    let column = 0;
    for (const line of lines.slice(1)) {
      column = Math.max(column, line.prefix.length + line.name.length + 2);
    }
    return lines
      .map((line, index) => {
        if (line.details === "") {
          return line.prefix + line.name;
        }
        const padding =
          index === 0
            ? " "
            : " ".repeat(column - (line.prefix.length + line.name.length));
        return line.prefix + line.name + padding + line.details;
      })
      .join("\n");
  }

  public renderNode(view: NodeView): string {
    let output = this.nodeLabel(view.shape);
    if (view.parent !== null) {
      output += `  parent=${this.nodeLabel(view.parent.shape)}`;
    }
    const details = nodeDetails(view.shape, view.text);
    if (details.length === 0) {
      return output;
    }
    if (view.parent === null && details.length === 1) {
      return `${output} ${details[0] ?? ""}`;
    }
    return `${output}${details.map((detail) => `\n  ${detail}`).join("")}`;
  }

  private followedAt(
    rows: TreeView["rows"],
    depth: number,
    index: number,
  ): boolean[] {
    const followed = Array.from<boolean>({ length: depth + 1 }).fill(false);
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      const row = rows[cursor];
      if (row === undefined) {
        continue;
      }
      if (row.depth < depth && followed[row.depth] === false) {
        followed[row.depth] = !row.last;
      }
      if (row.depth === 0) {
        break;
      }
    }
    return followed;
  }

  private nodeLabel(node: Node): string {
    if (!isElementNode(node)) {
      return "<text-node>";
    }
    const name =
      node.id === ""
        ? node.elementName
        : `${node.elementName}#${quoteIfNeeded(node.id)}`;
    const description = this.shapes.providerFor(node)?.describe(node);
    return description === undefined ? name : `${name} (${description})`;
  }
}

