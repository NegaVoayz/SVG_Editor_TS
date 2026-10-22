import type { Circle } from "../node/Circle.js";
import type { Defs } from "../node/Defs.js";
import type { Ellipse } from "../node/Ellipse.js";
import type { Group } from "../node/Group.js";
import type { Line } from "../node/Line.js";
import type { PlainTextNode } from "../node/PlainTextNode.js";
import type { Rect } from "../node/Rect.js";
import type { Svg } from "../node/Svg.js";
import type { Switch } from "../node/Switch.js";
import type { Symbol as SvgSymbol } from "../node/Symbol.js";
import type { TextPath } from "../node/TextPath.js";
import type { TextWrapper } from "../node/TextWrapper.js";
import type { Tspan } from "../node/Tspan.js";

export abstract class NodeVisitor<Result> {
  public abstract visitRect(node: Rect): Result;

  public abstract visitCircle(node: Circle): Result;

  public abstract visitEllipse(node: Ellipse): Result;

  public abstract visitLine(node: Line): Result;

  public abstract visitGroup(node: Group): Result;

  public abstract visitDefs(node: Defs): Result;

  public abstract visitSvg(node: Svg): Result;

  public abstract visitSymbol(node: SvgSymbol): Result;

  public abstract visitSwitch(node: Switch): Result;

  public abstract visitTextWrapper(node: TextWrapper): Result;

  public abstract visitTspan(node: Tspan): Result;

  public abstract visitTextPath(node: TextPath): Result;

  public abstract visitPlainText(node: PlainTextNode): Result;
}

