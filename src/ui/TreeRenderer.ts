import {
  Circle,
  Ellipse,
  Group,
  Line,
  PlainTextNode,
  Polygon,
  Rect,
  Svg,
  TextNode,
} from "../model/node/index.js";
import { ElementNode } from "../model/node/ElementNode.js";
import type { Node } from "../model/node/index.js";
import { Length, LengthUnit, numberText } from "../model/values/index.js";
import type { Percentage } from "../model/values/index.js";
import type { NodeView, TreeView } from "../protocol/view/View.js";

export function quoteIfNeeded(text: string): string {
  return /[\s"\\]/u.test(text) || text === ""
    ? `"${text.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`
    : text;
}

export function quoted(text: string): string {
  return `"${text.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

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

export function canvasSize(width: Length | Percentage | null, height: Length | Percentage | null): string {
  if (
    width instanceof Length &&
    height instanceof Length &&
    width.unit === height.unit
  ) {
    return `${numberText(width.value)}x${numberText(height.value)}${width.unit === LengthUnit.UserUnit ? "" : width.unit}`;
  }
  return `${width?.toDisplayText() ?? "unset"} x ${height?.toDisplayText() ?? "unset"}`;
}

export function nodeLabel(node: Node): string {
  if (!(node instanceof ElementNode)) {
    return "<text-node>";
  }
  const name =
    node.id === ""
      ? node.elementName
      : `${node.elementName}#${quoteIfNeeded(node.id)}`;
  return node instanceof Group && node.dataKind !== null
    ? `${name} (${node.dataKind})`
    : name;
}

export function nodeDetails(node: Node, text = ""): readonly string[] {
  if (node instanceof PlainTextNode) {
    return [`text=${quoted(node.content)}`];
  }
  if (!(node instanceof ElementNode)) {
    return [];
  }
  const details: string[] = [];
  if (node.identity.class_ !== "") {
    details.push(`class=${quoteIfNeeded(node.identity.class_)}`);
  }
  if (node instanceof Rect) {
    details.push(
      `x=${node.x.toDisplayText()} y=${node.y.toDisplayText()} w=${node.width.toDisplayText()} h=${node.height.toDisplayText()}`,
    );
  } else if (node instanceof Circle) {
    details.push(
      `cx=${node.cx.toDisplayText()} cy=${node.cy.toDisplayText()} r=${node.radius.toDisplayText()}`,
    );
  } else if (node instanceof Ellipse) {
    details.push(
      `cx=${node.cx.toDisplayText()} cy=${node.cy.toDisplayText()} rx=${node.radiusX.toDisplayText()} ry=${node.radiusY.toDisplayText()}`,
    );
  } else if (node instanceof Line) {
    details.push(
      `x1=${node.x1.toDisplayText()} y1=${node.y1.toDisplayText()} x2=${node.x2.toDisplayText()} y2=${node.y2.toDisplayText()}`,
    );
  } else if (node instanceof Polygon) {
    details.push(
      `points=${node.points.map((point) => point.toDisplayText()).join(" ")}`,
    );
  } else if (node instanceof Svg) {
    let canvas = "";
    if (
      node.xmlns !== "" &&
      node.xmlns !== "http://www.w3.org/2000/svg"
    ) {
      canvas += `xmlns="${node.xmlns}" `;
    }
    canvas += canvasText(node);
    if (node.viewBox !== null) {
      canvas += ` viewBox="${node.viewBox.toDisplayText()}"`;
    }
    details.push(canvas);
  } else if (node instanceof TextNode) {
    const common = node.common;
    const textDetails: string[] = [];
    if (common.x !== null) {
      textDetails.push(
        common.y === null
          ? `x=${common.x.toDisplayText()}`
          : `(${common.x.toDisplayText()},${common.y.toDisplayText()})`,
      );
    }
    if (common.textAnchor !== null) {
      textDetails.push(`text-anchor=${common.textAnchor}`);
    }
    if (common.fontSize !== null) {
      textDetails.push(`font-size=${common.fontSize.toDisplayText()}`);
    }
    if (textDetails.length > 0) {
      details.push(textDetails.join(" "));
    }
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
  if (node instanceof TextNode && text !== "") {
    details.push(`text=${quoted(text)}`);
  }
  return details;
}

export class TreeRenderer {
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
        name: nodeLabel(row.shape),
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
    let output = nodeLabel(view.shape);
    if (view.parent !== null) {
      output += `  parent=${nodeLabel(view.parent.shape)}`;
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
}

