import {
  Circle,
  Ellipse,
  Line,
  Rect,
  Svg,
  TextCommon,
  TextNode,
  TextPath,
  TextWrapper,
  Tspan,
  type ElementNode,
} from "../../model/node/index.js";
import type { TextAnchor } from "../../model/node/index.js";
import type { Paint } from "../../model/values/Paint.js";
import type { LengthPercentage } from "../../model/values/LengthPercentage.js";
import type { Transform } from "../../model/values/Transform.js";
import type { ViewBox } from "../../model/values/ViewBox.js";
import { AttributeCommand } from "./AttributeCommand.js";

function withCommon(node: TextNode, common: TextCommon): TextNode | null {
  if (node instanceof TextWrapper) {
    return new TextWrapper(
      common,
      node.identity,
      node.paint,
      node.transformAttr,
    );
  }
  if (node instanceof Tspan) {
    return new Tspan(
      common,
      node.identity,
      node.paint,
      node.transformAttr,
    );
  }
  if (node instanceof TextPath) {
    return new TextPath(
      node.startOffset,
      node.href,
      common,
      node.identity,
      node.paint,
      node.transformAttr,
    );
  }
  return null;
}

function textWithX(
  node: TextNode,
  value: LengthPercentage | null,
): TextNode | null {
  const common = node.common;
  return withCommon(
    node,
    new TextCommon(
      value,
      common.y,
      common.dx,
      common.dy,
      common.textAnchor,
      common.fontSize,
    ),
  );
}

function textWithY(
  node: TextNode,
  value: LengthPercentage | null,
): TextNode | null {
  const common = node.common;
  return withCommon(
    node,
    new TextCommon(
      common.x,
      value,
      common.dx,
      common.dy,
      common.textAnchor,
      common.fontSize,
    ),
  );
}

function textWithDx(
  node: TextNode,
  value: LengthPercentage | null,
): TextNode | null {
  const common = node.common;
  return withCommon(
    node,
    new TextCommon(
      common.x,
      common.y,
      value,
      common.dy,
      common.textAnchor,
      common.fontSize,
    ),
  );
}

function textWithDy(
  node: TextNode,
  value: LengthPercentage | null,
): TextNode | null {
  const common = node.common;
  return withCommon(
    node,
    new TextCommon(
      common.x,
      common.y,
      common.dx,
      value,
      common.textAnchor,
      common.fontSize,
    ),
  );
}

export class SetX extends AttributeCommand {
  public readonly attributeName = "x";
  public constructor(public readonly value: LengthPercentage) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    if (node instanceof Rect) {
      return new Rect(
        this.value,
        node.y,
        node.width,
        node.height,
        node.identity,
        node.paint,
        node.transformAttr,
      );
    }
    return node instanceof TextNode ? textWithX(node, this.value) : null;
  }
}

export class SetY extends AttributeCommand {
  public readonly attributeName = "y";
  public constructor(public readonly value: LengthPercentage) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    if (node instanceof Rect) {
      return new Rect(
        node.x,
        this.value,
        node.width,
        node.height,
        node.identity,
        node.paint,
        node.transformAttr,
      );
    }
    return node instanceof TextNode ? textWithY(node, this.value) : null;
  }
}

export class SetW extends AttributeCommand {
  public readonly attributeName = "w";
  public constructor(public readonly value: LengthPercentage) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    return node instanceof Rect
      ? new Rect(
          node.x,
          node.y,
          this.value,
          node.height,
          node.identity,
          node.paint,
          node.transformAttr,
        )
      : null;
  }
}

export class SetH extends AttributeCommand {
  public readonly attributeName = "h";
  public constructor(public readonly value: LengthPercentage) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    return node instanceof Rect
      ? new Rect(
          node.x,
          node.y,
          node.width,
          this.value,
          node.identity,
          node.paint,
          node.transformAttr,
        )
      : null;
  }
}

export class SetCx extends AttributeCommand {
  public readonly attributeName = "cx";
  public constructor(public readonly value: LengthPercentage) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    if (node instanceof Circle) {
      return new Circle(
        this.value,
        node.cy,
        node.radius,
        node.identity,
        node.paint,
        node.transformAttr,
      );
    }
    return node instanceof Ellipse
      ? new Ellipse(
          this.value,
          node.cy,
          node.radiusX,
          node.radiusY,
          node.identity,
          node.paint,
          node.transformAttr,
        )
      : null;
  }
}

export class SetCy extends AttributeCommand {
  public readonly attributeName = "cy";
  public constructor(public readonly value: LengthPercentage) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    if (node instanceof Circle) {
      return new Circle(
        node.cx,
        this.value,
        node.radius,
        node.identity,
        node.paint,
        node.transformAttr,
      );
    }
    return node instanceof Ellipse
      ? new Ellipse(
          node.cx,
          this.value,
          node.radiusX,
          node.radiusY,
          node.identity,
          node.paint,
          node.transformAttr,
        )
      : null;
  }
}

export class SetR extends AttributeCommand {
  public readonly attributeName = "r";
  public constructor(public readonly value: LengthPercentage) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    return node instanceof Circle
      ? new Circle(
          node.cx,
          node.cy,
          this.value,
          node.identity,
          node.paint,
          node.transformAttr,
        )
      : null;
  }
}

export class SetRx extends AttributeCommand {
  public readonly attributeName = "rx";
  public constructor(public readonly value: LengthPercentage) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    return node instanceof Ellipse
      ? new Ellipse(
          node.cx,
          node.cy,
          this.value,
          node.radiusY,
          node.identity,
          node.paint,
          node.transformAttr,
        )
      : null;
  }
}

export class SetRy extends AttributeCommand {
  public readonly attributeName = "ry";
  public constructor(public readonly value: LengthPercentage) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    return node instanceof Ellipse
      ? new Ellipse(
          node.cx,
          node.cy,
          node.radiusX,
          this.value,
          node.identity,
          node.paint,
          node.transformAttr,
        )
      : null;
  }
}

export class SetX1 extends AttributeCommand {
  public readonly attributeName = "x1";
  public constructor(public readonly value: LengthPercentage) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    return node instanceof Line
      ? new Line(
          this.value,
          node.y1,
          node.x2,
          node.y2,
          node.identity,
          node.paint,
          node.transformAttr,
        )
      : null;
  }
}

export class SetY1 extends AttributeCommand {
  public readonly attributeName = "y1";
  public constructor(public readonly value: LengthPercentage) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    return node instanceof Line
      ? new Line(
          node.x1,
          this.value,
          node.x2,
          node.y2,
          node.identity,
          node.paint,
          node.transformAttr,
        )
      : null;
  }
}

export class SetX2 extends AttributeCommand {
  public readonly attributeName = "x2";
  public constructor(public readonly value: LengthPercentage) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    return node instanceof Line
      ? new Line(
          node.x1,
          node.y1,
          this.value,
          node.y2,
          node.identity,
          node.paint,
          node.transformAttr,
        )
      : null;
  }
}

export class SetY2 extends AttributeCommand {
  public readonly attributeName = "y2";
  public constructor(public readonly value: LengthPercentage) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    return node instanceof Line
      ? new Line(
          node.x1,
          node.y1,
          node.x2,
          this.value,
          node.identity,
          node.paint,
          node.transformAttr,
        )
      : null;
  }
}

export class SetDx extends AttributeCommand {
  public readonly attributeName = "dx";
  public constructor(public readonly value: LengthPercentage) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    return node instanceof TextNode ? textWithDx(node, this.value) : null;
  }
}

export class SetDy extends AttributeCommand {
  public readonly attributeName = "dy";
  public constructor(public readonly value: LengthPercentage) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    return node instanceof TextNode ? textWithDy(node, this.value) : null;
  }
}

export class SetStrokeWidth extends AttributeCommand {
  public readonly attributeName = "stroke-width";
  public constructor(public readonly value: LengthPercentage) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    return node.withAttributes(
      node.identity,
      node.paint.withStrokeWidth(this.value),
      node.transformAttr,
    );
  }
}

export class SetOpacity extends AttributeCommand {
  public readonly attributeName = "opacity";
  public constructor(public readonly value: number) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    return node.withAttributes(
      node.identity,
      node.paint.withOpacity(this.value),
      node.transformAttr,
    );
  }
}

export class SetWidth extends AttributeCommand {
  public readonly attributeName = "width";
  public constructor(public readonly value: LengthPercentage) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    if (node instanceof Rect) {
      return new Rect(
        node.x,
        node.y,
        this.value,
        node.height,
        node.identity,
        node.paint,
        node.transformAttr,
      );
    }
    return node instanceof Svg
      ? new Svg(
          this.value,
          node.height,
          node.xmlns,
          node.viewBox,
          node.identity,
          node.paint,
          node.transformAttr,
        )
      : null;
  }
}

export class SetHeight extends AttributeCommand {
  public readonly attributeName = "height";
  public constructor(public readonly value: LengthPercentage) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    if (node instanceof Rect) {
      return new Rect(
        node.x,
        node.y,
        node.width,
        this.value,
        node.identity,
        node.paint,
        node.transformAttr,
      );
    }
    return node instanceof Svg
      ? new Svg(
          node.width,
          this.value,
          node.xmlns,
          node.viewBox,
          node.identity,
          node.paint,
          node.transformAttr,
        )
      : null;
  }
}

export class SetStartOffset extends AttributeCommand {
  public readonly attributeName = "startOffset";
  public constructor(public readonly value: LengthPercentage) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    return node instanceof TextPath
      ? new TextPath(
          this.value,
          node.href,
          node.common,
          node.identity,
          node.paint,
          node.transformAttr,
        )
      : null;
  }
}

export class SetXmlns extends AttributeCommand {
  public readonly attributeName = "xmlns";
  public constructor(public readonly value: string) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    return node instanceof Svg
      ? new Svg(
          node.width,
          node.height,
          this.value,
          node.viewBox,
          node.identity,
          node.paint,
          node.transformAttr,
        )
      : null;
  }
}

export class SetViewBox extends AttributeCommand {
  public readonly attributeName = "viewBox";
  public constructor(public readonly value: ViewBox) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    return node instanceof Svg
      ? new Svg(
          node.width,
          node.height,
          node.xmlns,
          this.value,
          node.identity,
          node.paint,
          node.transformAttr,
        )
      : null;
  }
}

export class SetTextAnchor extends AttributeCommand {
  public readonly attributeName = "text-anchor";
  public constructor(public readonly value: TextAnchor) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    if (!(node instanceof TextNode)) {
      return null;
    }
    const common = node.common;
    return withCommon(
      node,
      new TextCommon(
        common.x,
        common.y,
        common.dx,
        common.dy,
        this.value,
        common.fontSize,
      ),
    );
  }
}

export class SetFontSize extends AttributeCommand {
  public readonly attributeName = "font-size";
  public constructor(public readonly value: LengthPercentage) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    if (!(node instanceof TextNode)) {
      return null;
    }
    const common = node.common;
    return withCommon(
      node,
      new TextCommon(
        common.x,
        common.y,
        common.dx,
        common.dy,
        common.textAnchor,
        this.value,
      ),
    );
  }
}

export class SetClass extends AttributeCommand {
  public readonly attributeName = "class";
  public constructor(public readonly value: string) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    return node.withAttributes(
      node.identity.withClass(this.value),
      node.paint,
      node.transformAttr,
    );
  }
}

export class SetFill extends AttributeCommand {
  public readonly attributeName = "fill";
  public constructor(public readonly value: Paint) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    return node.withAttributes(
      node.identity,
      node.paint.withFill(this.value),
      node.transformAttr,
    );
  }
}

export class SetStroke extends AttributeCommand {
  public readonly attributeName = "stroke";
  public constructor(public readonly value: Paint) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    return node.withAttributes(
      node.identity,
      node.paint.withStroke(this.value),
      node.transformAttr,
    );
  }
}

export class SetTransform extends AttributeCommand {
  public readonly attributeName = "transform";
  public constructor(public readonly value: Transform) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    return node.withAttributes(
      node.identity,
      node.paint,
      node.transformAttr.withTransform(this.value),
    );
  }
}

export class SetHref extends AttributeCommand {
  public readonly attributeName = "href";
  public constructor(public readonly value: string) {
    super();
  }

  public applyTo(node: ElementNode): ElementNode | null {
    return node instanceof TextPath
      ? new TextPath(
          node.startOffset,
          this.value,
          node.common,
          node.identity,
          node.paint,
          node.transformAttr,
        )
      : null;
  }
}

export class SetText extends AttributeCommand {
  public readonly attributeName = "text";
  public override readonly contentValue: string;

  public constructor(value: string) {
    super();
    this.contentValue = value;
  }

  public applyTo(node: ElementNode): ElementNode | null {
    return node;
  }
}

export class SetContent extends AttributeCommand {
  public readonly attributeName = "content";
  public override readonly contentValue: string;

  public constructor(value: string) {
    super();
    this.contentValue = value;
  }

  public applyTo(node: ElementNode): ElementNode | null {
    return node;
  }
}

