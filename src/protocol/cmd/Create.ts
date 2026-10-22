import {
  Circle,
  Ellipse,
  Group,
  Line,
  PlainTextNode,
  Rect,
  TextCommon,
  TextWrapper,
  type Node,
} from "../../model/node/index.js";
import type { Color } from "../../model/values/Color.js";
import { IdentityAttr } from "../../model/values/IdentityAttr.js";
import type { LengthPercentage } from "../../model/values/LengthPercentage.js";
import { PaintAttr } from "../../model/values/PaintAttr.js";
import { Kind } from "../Kind.js";
import type { NodeRef } from "../NodeRef.js";
import { RootRef } from "../NodeRef.js";
import type { Outcome } from "../Outcome.js";
import { Command } from "./Command.js";
import type { CommandContext } from "./CommandContext.js";

export class CreatedChild {
  public constructor(
    public readonly node: Node,
    public readonly children: readonly CreatedChild[] = [],
  ) {}
}

export abstract class CreateIntent extends Command {
  public readonly kind = Kind.Change;

  public constructor(
    public readonly id: string,
    public readonly parent: NodeRef = new RootRef(),
    public readonly parentNamed = false,
  ) {
    super();
  }

  public abstract build(): Node;

  public children(): readonly CreatedChild[] {
    return [];
  }

  public execute(context: CommandContext): Outcome {
    return context.create(this);
  }
}

export class CreateRect extends CreateIntent {
  public constructor(
    id: string,
    public readonly x: LengthPercentage,
    public readonly y: LengthPercentage,
    public readonly width: LengthPercentage,
    public readonly height: LengthPercentage,
    public readonly fill: Color | null = null,
    parent: NodeRef = new RootRef(),
    parentNamed = false,
  ) {
    super(id, parent, parentNamed);
  }

  public build(): Node {
    return new Rect(
      this.x,
      this.y,
      this.width,
      this.height,
      new IdentityAttr(this.id),
      new PaintAttr(this.fill),
    );
  }
}

export class CreateCircle extends CreateIntent {
  public constructor(
    id: string,
    public readonly cx: LengthPercentage,
    public readonly cy: LengthPercentage,
    public readonly radius: LengthPercentage,
    public readonly fill: Color | null = null,
    parent: NodeRef = new RootRef(),
    parentNamed = false,
  ) {
    super(id, parent, parentNamed);
  }

  public build(): Node {
    return new Circle(
      this.cx,
      this.cy,
      this.radius,
      new IdentityAttr(this.id),
      new PaintAttr(this.fill),
    );
  }
}

export class CreateEllipse extends CreateIntent {
  public constructor(
    id: string,
    public readonly cx: LengthPercentage,
    public readonly cy: LengthPercentage,
    public readonly radiusX: LengthPercentage,
    public readonly radiusY: LengthPercentage,
    public readonly fill: Color | null = null,
    parent: NodeRef = new RootRef(),
    parentNamed = false,
  ) {
    super(id, parent, parentNamed);
  }

  public build(): Node {
    return new Ellipse(
      this.cx,
      this.cy,
      this.radiusX,
      this.radiusY,
      new IdentityAttr(this.id),
      new PaintAttr(this.fill),
    );
  }
}

export class CreateLine extends CreateIntent {
  public constructor(
    id: string,
    public readonly x1: LengthPercentage,
    public readonly y1: LengthPercentage,
    public readonly x2: LengthPercentage,
    public readonly y2: LengthPercentage,
    public readonly stroke: Color | null = null,
    parent: NodeRef = new RootRef(),
    parentNamed = false,
  ) {
    super(id, parent, parentNamed);
  }

  public build(): Node {
    return new Line(
      this.x1,
      this.y1,
      this.x2,
      this.y2,
      new IdentityAttr(this.id),
      new PaintAttr(null, this.stroke),
    );
  }
}

export class CreateText extends CreateIntent {
  public constructor(
    id: string,
    public readonly x: LengthPercentage,
    public readonly y: LengthPercentage,
    public readonly content: string,
    parent: NodeRef = new RootRef(),
    parentNamed = false,
  ) {
    super(id, parent, parentNamed);
  }

  public build(): Node {
    return new TextWrapper(
      new TextCommon(this.x, this.y),
      new IdentityAttr(this.id),
      undefined,
      undefined,
    );
  }

  public override children(): readonly CreatedChild[] {
    return [new CreatedChild(new PlainTextNode(this.content))];
  }
}

export class CreateGroup extends CreateIntent {
  public constructor(
    id: string,
    parent: NodeRef = new RootRef(),
    parentNamed = false,
  ) {
    super(id, parent, parentNamed);
  }

  public build(): Node {
    return new Group(new IdentityAttr(this.id));
  }
}

