import {
  Group,
  PlainTextNode,
  Rect,
  TextCommon,
  TextWrapper,
} from "../model/node/index.js";
import { parseColor } from "../model/values/Color.js";
import { IdentityAttr } from "../model/values/IdentityAttr.js";
import { Length } from "../model/values/Length.js";
import type { LengthPercentage } from "../model/values/LengthPercentage.js";
import { sumLengths } from "../model/values/geometry.js";
import { parseLength } from "../model/values/parseValues.js";
import { PaintAttr } from "../model/values/PaintAttr.js";
import type { NodeRef } from "../protocol/NodeRef.js";
import {
  CreateCircle,
  CreateEllipse,
  CreateGroup,
  CreateLine,
  CreateRect,
  CreateText,
  CreatedChild,
  CreateIntent,
} from "../protocol/cmd/Create.js";
import { ProviderParseError, ShapeProvider } from "./ShapeProvider.js";

function length(word: string | undefined, name: string): LengthPercentage {
  const value = parseLength(word ?? "");
  if (value === null) {
    throw new ProviderParseError(
      `error: cannot read '${word ?? ""}' as a ${name}`,
    );
  }
  return value;
}

function optionalColor(
  word: string | undefined,
  name: string,
) {
  if (word === undefined) {
    return null;
  }
  const value = parseColor(word);
  if (value === null) {
    throw new ProviderParseError(
      `error: cannot read '${word}' as a ${name}`,
    );
  }
  return value;
}

function arity(args: readonly string[], counts: readonly number[], kind: string): void {
  if (!counts.includes(args.length)) {
    throw new ProviderParseError(
      `error: ${kind} takes ${counts.join(" or ")} operand${counts.some((count) => count !== 1) ? "s" : ""}`,
    );
  }
}

export class RectProvider extends ShapeProvider {
  public readonly kind = "rect";

  public create(
    id: string,
    args: readonly string[],
    parent: NodeRef,
    parentNamed: boolean,
  ): CreateIntent {
    arity(args, [4, 5], this.kind);
    return new CreateRect(
      id,
      length(args[0], "length"),
      length(args[1], "length"),
      length(args[2], "length"),
      length(args[3], "length"),
      optionalColor(args[4], "fill"),
      parent,
      parentNamed,
    );
  }
}

export class CircleProvider extends ShapeProvider {
  public readonly kind = "circle";

  public create(
    id: string,
    args: readonly string[],
    parent: NodeRef,
    parentNamed: boolean,
  ): CreateIntent {
    arity(args, [3, 4], this.kind);
    return new CreateCircle(
      id,
      length(args[0], "length"),
      length(args[1], "length"),
      length(args[2], "length"),
      optionalColor(args[3], "fill"),
      parent,
      parentNamed,
    );
  }
}

export class EllipseProvider extends ShapeProvider {
  public readonly kind = "ellipse";

  public create(
    id: string,
    args: readonly string[],
    parent: NodeRef,
    parentNamed: boolean,
  ): CreateIntent {
    arity(args, [4, 5], this.kind);
    return new CreateEllipse(
      id,
      length(args[0], "length"),
      length(args[1], "length"),
      length(args[2], "length"),
      length(args[3], "length"),
      optionalColor(args[4], "fill"),
      parent,
      parentNamed,
    );
  }
}

export class LineProvider extends ShapeProvider {
  public readonly kind = "line";

  public create(
    id: string,
    args: readonly string[],
    parent: NodeRef,
    parentNamed: boolean,
  ): CreateIntent {
    arity(args, [4, 5], this.kind);
    return new CreateLine(
      id,
      length(args[0], "length"),
      length(args[1], "length"),
      length(args[2], "length"),
      length(args[3], "length"),
      optionalColor(args[4], "stroke"),
      parent,
      parentNamed,
    );
  }
}

export class TextProvider extends ShapeProvider {
  public readonly kind = "text";

  public create(
    id: string,
    args: readonly string[],
    parent: NodeRef,
    parentNamed: boolean,
  ): CreateIntent {
    arity(args, [3], this.kind);
    return new CreateText(
      id,
      length(args[0], "length"),
      length(args[1], "length"),
      args[2] ?? "",
      parent,
      parentNamed,
    );
  }
}

export class GroupProvider extends ShapeProvider {
  public readonly kind = "g";

  public create(
    id: string,
    args: readonly string[],
    parent: NodeRef,
    parentNamed: boolean,
  ): CreateIntent {
    arity(args, [0], this.kind);
    return new CreateGroup(id, parent, parentNamed);
  }
}

export class CreateBox extends ShapeProvider {
  public readonly kind = "box";

  public create(
    id: string,
    args: readonly string[],
    parent: NodeRef,
    parentNamed: boolean,
  ): CreateIntent {
    arity(args, [5], this.kind);
    return new BoxIntent(
      id,
      length(args[0], "length"),
      length(args[1], "length"),
      length(args[2], "length"),
      length(args[3], "length"),
      args[4] ?? "",
      parent,
      parentNamed,
    );
  }
}

export class BoxIntent extends CreateIntent {
  public constructor(
    id: string,
    public readonly x: LengthPercentage,
    public readonly y: LengthPercentage,
    public readonly width: LengthPercentage,
    public readonly height: LengthPercentage,
    public readonly label: string,
    parent: NodeRef,
    parentNamed: boolean,
  ) {
    super(id, parent, parentNamed);
  }

  public build(): ReturnType<CreateIntent["build"]> {
    return new Group(new IdentityAttr(this.id), undefined, undefined, "box");
  }

  public override children(): readonly CreatedChild[] {
    const left = sumLengths(this.x, new Length(20));
    const baseline = sumLengths(this.y, new Length(35));
    if (left === null || baseline === null) {
      throw new ProviderParseError(
        "error: box label position uses incompatible length units",
      );
    }
    return [
      new CreatedChild(
        new Rect(
          this.x,
          this.y,
          this.width,
          this.height,
          new IdentityAttr(`${this.id}-rect`),
          new PaintAttr(parseColor("#4a90d9")),
          undefined,
        ),
      ),
      new CreatedChild(
        new TextWrapper(
          new TextCommon(left, baseline),
          new IdentityAttr(`${this.id}-label`),
          undefined,
          undefined,
        ),
        [new CreatedChild(new PlainTextNode(this.label))],
      ),
    ];
  }
}

export const BUILTIN_PROVIDERS: readonly ShapeProvider[] = [
  new RectProvider(),
  new CircleProvider(),
  new EllipseProvider(),
  new LineProvider(),
  new TextProvider(),
  new GroupProvider(),
  new CreateBox(),
];

