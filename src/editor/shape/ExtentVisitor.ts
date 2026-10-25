import type {
  Circle,
  Ellipse,
  Line,
  Polygon,
  Rect,
  TextPath,
  TextWrapper,
  Tspan,
  Node,
} from "../../model/node/index.js";
import type { LengthPercentage } from "../../model/values/LengthPercentage.js";
import { NodeVisitor } from "../../model/visit/NodeVisitor.js";

export class ExtentVisitor extends NodeVisitor<LengthPercentage | null> {
  public visitRect(node: Rect): LengthPercentage {
    return node.x;
  }

  public visitCircle(node: Circle): LengthPercentage {
    return node.cx;
  }

  public visitEllipse(node: Ellipse): LengthPercentage {
    return node.cx;
  }

  public visitLine(node: Line): LengthPercentage {
    return node.x1;
  }

  public visitPolygon(node: Polygon): LengthPercentage | null {
    return node.points.values[0]?.x ?? null;
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

  public visitTextWrapper(node: TextWrapper): LengthPercentage | null {
    return node.common.x;
  }

  public visitTspan(node: Tspan): LengthPercentage | null {
    return node.common.x;
  }

  public visitTextPath(node: TextPath): LengthPercentage | null {
    return node.common.x;
  }

  public visitPlainText(): null {
    return null;
  }
}

export function nodeExtent(node: Node): LengthPercentage | null {
  return node.accept(new ExtentVisitor());
}

