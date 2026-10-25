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
import { NodeVisitor } from "../../model/visit/NodeVisitor.js";
import { textWithCommon } from "./TextCommonEditor.js";

export class ScaleVisitor extends NodeVisitor<Node | null> {
  public constructor(private readonly factor: number) {
    super();
  }

  public visitRect(node: Rect): Node {
    return new Rect(
      node.x.scaled(this.factor),
      node.y.scaled(this.factor),
      node.width.scaled(this.factor),
      node.height.scaled(this.factor),
      node.identity,
      node.paint,
      node.transformAttr,
    );
  }

  public visitCircle(node: Circle): Node {
    return new Circle(
      node.cx.scaled(this.factor),
      node.cy.scaled(this.factor),
      node.radius.scaled(this.factor),
      node.identity,
      node.paint,
      node.transformAttr,
    );
  }

  public visitEllipse(node: Ellipse): Node {
    return new Ellipse(
      node.cx.scaled(this.factor),
      node.cy.scaled(this.factor),
      node.radiusX.scaled(this.factor),
      node.radiusY.scaled(this.factor),
      node.identity,
      node.paint,
      node.transformAttr,
    );
  }

  public visitLine(node: Line): Node {
    return new Line(
      node.x1.scaled(this.factor),
      node.y1.scaled(this.factor),
      node.x2.scaled(this.factor),
      node.y2.scaled(this.factor),
      node.identity,
      node.paint,
      node.transformAttr,
    );
  }

  public visitPolygon(node: Polygon): Node {
    return new Polygon(
      node.points.scaled(this.factor),
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

  public visitTextWrapper(node: TextWrapper): Node {
    return this.scaleText(node);
  }

  public visitTspan(node: Tspan): Node {
    return this.scaleText(node);
  }

  public visitTextPath(node: TextPath): Node {
    return this.scaleText(node);
  }

  public visitPlainText(): null {
    return null;
  }

  private scaleText(node: TextWrapper | Tspan | TextPath): Node {
    const common = node.common;
    return textWithCommon(
      node,
      new TextCommon(
        common.x?.scaled(this.factor) ?? null,
        common.y?.scaled(this.factor) ?? null,
        common.dx?.scaled(this.factor) ?? null,
        common.dy?.scaled(this.factor) ?? null,
        common.textAnchor,
        common.fontSize,
      ),
    );
  }
}

export function scaleParams(node: Node, factor: number): Node | null {
  return node.accept(new ScaleVisitor(factor));
}

