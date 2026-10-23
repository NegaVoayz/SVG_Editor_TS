import {
  Circle,
  Ellipse,
  Line,
  Polygon,
  Rect,
  TextCommon,
  type Node,
  type TextPath,
  type TextWrapper,
  type Tspan,
} from "../../model/node/index.js";
import { Coordinate } from "../../model/values/Coordinate.js";
import type { LengthPercentage } from "../../model/values/LengthPercentage.js";
import { sumLengths } from "../../model/values/geometry.js";
import { NodeVisitor } from "../../model/visit/NodeVisitor.js";
import { textWithCommon } from "./TextCommonEditor.js";

export class TranslateVisitor extends NodeVisitor<Node | null> {
  public constructor(
    private readonly dx: LengthPercentage,
    private readonly dy: LengthPercentage,
  ) {
    super();
  }

  public visitRect(node: Rect): Node | null {
    const x = sumLengths(node.x, this.dx);
    const y = sumLengths(node.y, this.dy);
    return x === null || y === null
      ? null
      : new Rect(
          x,
          y,
          node.width,
          node.height,
          node.identity,
          node.paint,
          node.transformAttr,
        );
  }

  public visitCircle(node: Circle): Node | null {
    const cx = sumLengths(node.cx, this.dx);
    const cy = sumLengths(node.cy, this.dy);
    return cx === null || cy === null
      ? null
      : new Circle(
          cx,
          cy,
          node.radius,
          node.identity,
          node.paint,
          node.transformAttr,
        );
  }

  public visitEllipse(node: Ellipse): Node | null {
    const cx = sumLengths(node.cx, this.dx);
    const cy = sumLengths(node.cy, this.dy);
    return cx === null || cy === null
      ? null
      : new Ellipse(
          cx,
          cy,
          node.radiusX,
          node.radiusY,
          node.identity,
          node.paint,
          node.transformAttr,
        );
  }

  public visitLine(node: Line): Node | null {
    const x1 = sumLengths(node.x1, this.dx);
    const y1 = sumLengths(node.y1, this.dy);
    const x2 = sumLengths(node.x2, this.dx);
    const y2 = sumLengths(node.y2, this.dy);
    return x1 === null || y1 === null || x2 === null || y2 === null
      ? null
      : new Line(
          x1,
          y1,
          x2,
          y2,
          node.identity,
          node.paint,
          node.transformAttr,
        );
  }

  public visitPolygon(node: Polygon): Node | null {
    const points: Coordinate[] = [];
    for (const point of node.points) {
      const x = sumLengths(point.x, this.dx);
      const y = sumLengths(point.y, this.dy);
      if (x === null || y === null) {
        return null;
      }
      points.push(new Coordinate(x, y));
    }
    return new Polygon(
      points,
      node.identity,
      node.paint,
      node.transformAttr,
    );
  }

  public visitGroup(): null {
    return null;
  }

  public visitDefs(): null {
    return null;
  }

  public visitSvg(): null {
    return null;
  }

  public visitSymbol(): null {
    return null;
  }

  public visitSwitch(): null {
    return null;
  }

  public visitTextWrapper(node: TextWrapper): Node | null {
    return this.translateText(node);
  }

  public visitTspan(node: Tspan): Node | null {
    return this.translateText(node);
  }

  public visitTextPath(node: TextPath): Node | null {
    return this.translateText(node);
  }

  public visitPlainText(): null {
    return null;
  }

  private translateText(node: TextWrapper | Tspan | TextPath): Node | null {
    const common = node.common;
    const x = common.x === null ? null : sumLengths(common.x, this.dx);
    const y = common.y === null ? null : sumLengths(common.y, this.dy);
    if ((common.x !== null && x === null) || (common.y !== null && y === null)) {
      return null;
    }
    return textWithCommon(
      node,
      new TextCommon(
        x,
        y,
        common.dx,
        common.dy,
        common.textAnchor,
        common.fontSize,
      ),
    );
  }
}

export function translateParams(
  node: Node,
  dx: LengthPercentage,
  dy: LengthPercentage,
): Node | null {
  return node.accept(new TranslateVisitor(dx, dy));
}

