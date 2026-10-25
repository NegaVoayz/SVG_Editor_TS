import type {
  Circle,
  Ellipse,
  Line,
  PlainTextNode,
  Polygon,
  Rect,
  Svg,
  TextCommon,
  TextPath,
  TextWrapper,
  Tspan,
} from "../../model/node/index.js";
import type { Node } from "../../model/node/index.js";
import { NodeVisitor } from "../../model/visit/NodeVisitor.js";
import { canvasText } from "../../protocol/view/CanvasText.js";

function textDetails(common: TextCommon): string {
  const details: string[] = [];
  if (common.x !== null) {
    details.push(
      common.y === null
        ? `x=${common.x.toDisplayText()}`
        : `(${common.x.toDisplayText()},${common.y.toDisplayText()})`,
    );
  }
  if (common.textAnchor !== null) {
    details.push(`text-anchor=${common.textAnchor}`);
  }
  if (common.fontSize !== null) {
    details.push(`font-size=${common.fontSize.toDisplayText()}`);
  }
  return details.join(" ");
}

export class DetailsVisitor extends NodeVisitor<string | null> {
  public visitRect(node: Rect): string {
    return `x=${node.x.toDisplayText()} y=${node.y.toDisplayText()} w=${node.width.toDisplayText()} h=${node.height.toDisplayText()}`;
  }

  public visitCircle(node: Circle): string {
    return `cx=${node.cx.toDisplayText()} cy=${node.cy.toDisplayText()} r=${node.radius.toDisplayText()}`;
  }

  public visitEllipse(node: Ellipse): string {
    return `cx=${node.cx.toDisplayText()} cy=${node.cy.toDisplayText()} rx=${node.radiusX.toDisplayText()} ry=${node.radiusY.toDisplayText()}`;
  }

  public visitLine(node: Line): string {
    return `x1=${node.x1.toDisplayText()} y1=${node.y1.toDisplayText()} x2=${node.x2.toDisplayText()} y2=${node.y2.toDisplayText()}`;
  }

  public visitPolygon(node: Polygon): string {
    return `points="${node.points.toDisplayText()}"`;
  }

  public visitGroup(): null {
    return null;
  }

  public visitDefs(): null {
    return null;
  }

  public visitSvg(node: Svg): string {
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
    return canvas;
  }

  public visitSymbol(): null {
    return null;
  }

  public visitSwitch(): null {
    return null;
  }

  public visitTextWrapper(node: TextWrapper): string | null {
    return textDetails(node.common) || null;
  }

  public visitTspan(node: Tspan): string | null {
    return textDetails(node.common) || null;
  }

  public visitTextPath(node: TextPath): string | null {
    return textDetails(node.common) || null;
  }

  public visitPlainText(node: PlainTextNode): string {
    return `text="${node.content.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
  }
}

export function geometryDetails(node: Node): string | null {
  return node.accept(new DetailsVisitor());
}

