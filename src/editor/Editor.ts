import type { Document } from "../model/document/Document.js";
import {
  Circle,
  ContainerNode,
  Ellipse,
  Group,
  Line,
  PlainTextNode,
  Polygon,
  Rect,
  Svg,
  TextCommon,
  TextNode,
  TextPath,
  TextWrapper,
  Tspan,
} from "../model/node/index.js";
import { ElementNode } from "../model/node/ElementNode.js";
import type { Node } from "../model/node/index.js";
import type { Vid } from "../model/store/hiveState.js";
import { LengthPercentage } from "../model/values/LengthPercentage.js";
import { IdentityAttr } from "../model/values/IdentityAttr.js";
import { Paint } from "../model/values/Paint.js";
import { sumLengths } from "../model/values/geometry.js";
import { reservedSvgId, validSvgId } from "../model/values/svgId.js";
import { Transform } from "../model/values/Transform.js";
import { ViewBox } from "../model/values/ViewBox.js";
import { Coordinate } from "../model/values/Coordinate.js";
import type { AttributeCommand } from "../protocol/attr/AttributeCommand.js";
import type {
  AddTo,
  Back,
  Delete,
  Front,
  GroupNodes,
  Move,
  ScaleBy,
  Ungroup,
} from "../protocol/cmd/ChangeCommands.js";
import type {
  CreateIntent,
  CreatedChild,
} from "../protocol/cmd/Create.js";
import type { Checkout, SetCanvas } from "../protocol/cmd/ContextCommands.js";
import {
  AddedTo,
  AlreadyBack,
  AlreadyFront,
  AttributeSet,
  BoxFillPropagated,
  BoxLabelSet,
  CanvasSet,
  CheckedOut,
  ContentSet,
  CompositeCreated,
  Created,
  Deleted,
  Grouped,
  Moved,
  MovedToBack,
  MovedToFront,
  NodeName,
  NothingMoved,
  Redone,
  Scaled,
  Ungrouped,
  Undone,
  type EditEvent,
} from "../protocol/event/EditEvent.js";
import { HistoryEntry } from "../protocol/event/HistoryEntry.js";
import { Kind } from "../protocol/Kind.js";
import type { NodeRef } from "../protocol/NodeRef.js";
import { EditScope, EditTarget, EditMode, RootRef, SvgIdRef } from "../protocol/NodeRef.js";
import { Outcome } from "../protocol/Outcome.js";
import {
  CannotAddToOwnDescendant,
  CannotGroupIntoOwnDescendant,
  CannotGroupTopLevelContainer,
  CannotUngroupNonContainer,
  CannotUngroupCompositeShape,
  CannotUngroupTopLevelContainer,
  DuplicateGroupMember,
  DuplicateId,
  EmptyContainer,
  EmptyGroup,
  IncompatibleLengths,
  InternalError,
  InvalidId,
  MissingContainer,
  MissingShape,
  NegativeDimension,
  NoDocument,
  NonFiniteValue,
  NonPositiveCanvas,
  NotContainer,
  NothingToRedo,
  NothingToUndo,
  OpacityOutOfRange,
  ReservedId,
  RootCannotBeErased,
  RootHasNoSiblings,
  ScaleFactorNotPositive,
  TransformHasNoScope,
  UndoAfterIo,
  UnknownAttribute,
  UnknownCommit,
  Refusal,
} from "../protocol/refusal/Refusal.js";
import type { HistoryView } from "../protocol/view/View.js";

interface CascadeEntry {
  readonly id: Vid;
  readonly node: Node;
}

const NONNEGATIVE_ATTRIBUTES = new Set([
  "w",
  "h",
  "r",
  "rx",
  "ry",
  "stroke-width",
  "width",
  "height",
  "font-size",
]);

const LENGTH_ATTRIBUTES = new Set([
  "x",
  "y",
  "w",
  "h",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x1",
  "y1",
  "x2",
  "y2",
  "dx",
  "dy",
  "stroke-width",
  "width",
  "height",
  "startOffset",
  "font-size",
]);

function noDocument(): Outcome {
  return Outcome.refused(Kind.Change, new NoDocument());
}

function parentReference(ref: NodeRef): boolean {
  return !(ref instanceof RootRef);
}

function translatedParams(
  node: Node,
  dx: LengthPercentage,
  dy: LengthPercentage,
): Node | null {
  const moveX = (value: LengthPercentage): LengthPercentage | null =>
    sumLengths(value, dx);
  const moveY = (value: LengthPercentage): LengthPercentage | null =>
    sumLengths(value, dy);
  if (node instanceof Rect) {
    const x = moveX(node.x);
    const y = moveY(node.y);
    return x === null || y === null
      ? null
      : new Rect(x, y, node.width, node.height, node.identity, node.paint, node.transformAttr);
  }
  if (node instanceof Circle) {
    const cx = moveX(node.cx);
    const cy = moveY(node.cy);
    return cx === null || cy === null
      ? null
      : new Circle(cx, cy, node.radius, node.identity, node.paint, node.transformAttr);
  }
  if (node instanceof Ellipse) {
    const cx = moveX(node.cx);
    const cy = moveY(node.cy);
    return cx === null || cy === null
      ? null
      : new Ellipse(cx, cy, node.radiusX, node.radiusY, node.identity, node.paint, node.transformAttr);
  }
  if (node instanceof Line) {
    const x1 = moveX(node.x1);
    const y1 = moveY(node.y1);
    const x2 = moveX(node.x2);
    const y2 = moveY(node.y2);
    return x1 === null || y1 === null || x2 === null || y2 === null
      ? null
      : new Line(x1, y1, x2, y2, node.identity, node.paint, node.transformAttr);
  }
  if (node instanceof Polygon) {
    const points: Coordinate[] = [];
    for (const point of node.points) {
      const x = moveX(point.x);
      const y = moveY(point.y);
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
  if (node instanceof TextNode) {
    const common = node.common;
    const x = common.x === null ? null : moveX(common.x);
    const y = common.y === null ? null : moveY(common.y);
    if ((common.x !== null && x === null) || (common.y !== null && y === null)) {
      return null;
    }
    return textWithCommon(node, x, y, common.dx, common.dy);
  }
  return null;
}

function textWithCommon(
  node: TextNode,
  x: LengthPercentage | null,
  y: LengthPercentage | null,
  dx: LengthPercentage | null,
  dy: LengthPercentage | null,
): Node {
  const common = node.common;
  const replacement = new TextCommon(
    x,
    y,
    dx,
    dy,
    common.textAnchor,
    common.fontSize,
  );
  if (node instanceof TextWrapper) {
    return new TextWrapper(
      replacement,
      node.identity,
      node.paint,
      node.transformAttr,
    );
  }
  if (node instanceof Tspan) {
    return new Tspan(
      replacement,
      node.identity,
      node.paint,
      node.transformAttr,
    );
  }
  if (node instanceof TextPath) {
    return new TextPath(
      node.startOffset,
      node.href,
      replacement,
      node.identity,
      node.paint,
      node.transformAttr,
    );
  }
  return node;
}

function scaledParams(node: Node, factor: number): Node | null {
  if (
    node instanceof Rect ||
    node instanceof Circle ||
    node instanceof Ellipse ||
    node instanceof Line ||
    node instanceof Polygon ||
    node instanceof TextNode
  ) {
    const source = node;
    if (source instanceof Rect) {
      return new Rect(
        source.x.scaled(factor),
        source.y.scaled(factor),
        source.width.scaled(factor),
        source.height.scaled(factor),
        source.identity,
        source.paint,
        source.transformAttr,
      );
    }
    if (source instanceof Circle) {
      return new Circle(
        source.cx.scaled(factor),
        source.cy.scaled(factor),
        source.radius.scaled(factor),
        source.identity,
        source.paint,
        source.transformAttr,
      );
    }
    if (source instanceof Ellipse) {
      return new Ellipse(
        source.cx.scaled(factor),
        source.cy.scaled(factor),
        source.radiusX.scaled(factor),
        source.radiusY.scaled(factor),
        source.identity,
        source.paint,
        source.transformAttr,
      );
    }
    if (source instanceof Line) {
      return new Line(
        source.x1.scaled(factor),
        source.y1.scaled(factor),
        source.x2.scaled(factor),
        source.y2.scaled(factor),
        source.identity,
        source.paint,
        source.transformAttr,
      );
    }
    if (source instanceof Polygon) {
      return new Polygon(
        source.points.map((point) => point.scaled(factor)),
        source.identity,
        source.paint,
        source.transformAttr,
      );
    }
    const common = source.common;
    return textWithCommon(
      source,
      common.x?.scaled(factor) ?? null,
      common.y?.scaled(factor) ?? null,
      common.dx?.scaled(factor) ?? null,
      common.dy?.scaled(factor) ?? null,
    );
  }
  return null;
}

function carriesTransform(node: Node): boolean {
  return node instanceof ElementNode &&
    !node.transformAttr.transform.isIdentity();
}

export class Editor {
  private readonly historyEvents = new Map<number, EditEvent>();

  public constructor(
    private readonly document: Document,
    private readonly defaultHistoryLimit = 20,
  ) {}

  public create(command: CreateIntent): Outcome {
    if (!this.document.hasDocument()) {
      return noDocument();
    }
    if (!validSvgId(command.id)) {
      return Outcome.refused(Kind.Change, new InvalidId(command.id));
    }
    if (reservedSvgId(command.id)) {
      return Outcome.refused(Kind.Change, new ReservedId(command.id));
    }
    const problem = this.createDimensions(command);
    if (problem !== null) {
      return Outcome.refused(Kind.Change, problem);
    }
    if (this.document.find(command.id) !== undefined) {
      return Outcome.refused(Kind.Change, new DuplicateId(command.id));
    }
    const parent = command.parent.resolve(this.document);
    if (parent === undefined) {
      return Outcome.refused(
        Kind.Change,
        new MissingContainer(command.parent),
      );
    }
    const parentNode = this.document.node(parent);
    if (!(parentNode instanceof ContainerNode)) {
      return Outcome.refused(Kind.Change, new NotContainer(command.parent));
    }

    const edit = this.document.transaction();
    try {
      const id = edit.appendChild(parent, command.build());
      const children = command.children();
      this.appendCreatedChildren(edit, id, children);
      edit.commit();
      const event =
        children.length > 0 &&
        children.every((child) => child.node instanceof ElementNode)
          ? new CompositeCreated(
              this.nodeName(id),
              children.map((child) => this.nameOfNode(child.node)),
            )
          : new Created(
              this.nodeName(id),
              this.nodeName(parent),
              command.parentNamed || parentReference(command.parent),
            );
      this.record(event);
      return Outcome.happened(Kind.Change, event);
    } catch (error: unknown) {
      edit.rollback();
      return Outcome.refused(Kind.Change, new InternalError(String(error)));
    }
  }

  public delete(command: Delete): Outcome {
    const id = command.node.resolve(this.document);
    if (id === undefined) {
      return this.missing(command.node);
    }
    if (id === this.document.root()) {
      return Outcome.refused(Kind.Change, new RootCannotBeErased());
    }
    const descendants = this.countElementsBelow(id);
    const event = new Deleted(this.nodeName(id), descendants);
    const edit = this.document.transaction();
    try {
      edit.erase(id);
      edit.commit();
      this.record(event);
      return Outcome.happened(Kind.Change, event);
    } catch (error: unknown) {
      edit.rollback();
      return Outcome.refused(Kind.Change, new InternalError(String(error)));
    }
  }

  public addTo(command: AddTo): Outcome {
    const parent = command.parent.resolve(this.document);
    if (parent === undefined) {
      return Outcome.refused(Kind.Change, new MissingContainer(command.parent));
    }
    if (!(this.document.node(parent) instanceof ContainerNode)) {
      return Outcome.refused(Kind.Change, new NotContainer(command.parent));
    }
    const node = command.node.resolve(this.document);
    if (node === undefined) {
      return this.missing(command.node);
    }
    if (this.inside(parent, node)) {
      return Outcome.refused(
        Kind.Change,
        new CannotAddToOwnDescendant(command.node),
      );
    }
    const event = new AddedTo(this.nodeName(node), this.nodeName(parent));
    const edit = this.document.transaction();
    try {
      edit.attachLast(parent, node);
      edit.commit();
      this.record(event);
      return Outcome.happened(Kind.Change, event);
    } catch (error: unknown) {
      edit.rollback();
      return Outcome.refused(Kind.Change, new InternalError(String(error)));
    }
  }

  public front(command: Front): Outcome {
    const id = command.node.resolve(this.document);
    if (id === undefined) {
      return this.missing(command.node);
    }
    const parent = this.document.parent(id);
    if (parent === undefined) {
      return Outcome.refused(Kind.Change, new RootHasNoSiblings());
    }
    const siblings = this.document.children(parent);
    const name = this.nodeName(id);
    if (siblings.at(-1) === id) {
      return Outcome.happened(Kind.Change, new AlreadyFront(name));
    }
    const event = new MovedToFront(name, this.nodeName(parent));
    const edit = this.document.transaction();
    try {
      edit.attachLast(parent, id);
      edit.commit();
      this.record(event);
      return Outcome.happened(Kind.Change, event);
    } catch (error: unknown) {
      edit.rollback();
      return Outcome.refused(Kind.Change, new InternalError(String(error)));
    }
  }

  public back(command: Back): Outcome {
    const id = command.node.resolve(this.document);
    if (id === undefined) {
      return this.missing(command.node);
    }
    const parent = this.document.parent(id);
    if (parent === undefined) {
      return Outcome.refused(Kind.Change, new RootHasNoSiblings());
    }
    const siblings = this.document.children(parent);
    const name = this.nodeName(id);
    if (siblings[0] === id) {
      return Outcome.happened(Kind.Change, new AlreadyBack(name));
    }
    const anchor = siblings[0];
    if (anchor === undefined) {
      return Outcome.refused(Kind.Change, new InternalError());
    }
    const event = new MovedToBack(name, this.nodeName(parent));
    const edit = this.document.transaction();
    try {
      edit.attachAt(parent, anchor, id);
      edit.commit();
      this.record(event);
      return Outcome.happened(Kind.Change, event);
    } catch (error: unknown) {
      edit.rollback();
      return Outcome.refused(Kind.Change, new InternalError(String(error)));
    }
  }

  public group(command: GroupNodes): Outcome {
    if (command.nodes.length === 0) {
      return Outcome.refused(Kind.Change, new EmptyGroup());
    }
    if (!validSvgId(command.id)) {
      return Outcome.refused(Kind.Change, new InvalidId(command.id));
    }
    if (reservedSvgId(command.id)) {
      return Outcome.refused(Kind.Change, new ReservedId(command.id));
    }
    if (this.document.find(command.id) !== undefined) {
      return Outcome.refused(Kind.Change, new DuplicateId(command.id));
    }
    const members: Vid[] = [];
    for (const reference of command.nodes) {
      const id = reference.resolve(this.document);
      if (id === undefined) {
        return this.missing(reference);
      }
      if (members.includes(id)) {
        return Outcome.refused(
          Kind.Change,
          new DuplicateGroupMember(reference),
        );
      }
      members.push(id);
    }
    const first = members[0];
    if (first === undefined) {
      return Outcome.refused(Kind.Change, new EmptyGroup());
    }
    const parent = this.document.parent(first);
    if (parent === undefined) {
      return Outcome.refused(
        Kind.Change,
        new CannotGroupTopLevelContainer(this.topLevelName()),
      );
    }
    for (const member of members) {
      if (this.inside(parent, member)) {
        return Outcome.refused(
          Kind.Change,
          new CannotGroupIntoOwnDescendant(
            new SvgIdRef(this.nodeName(member).id),
          ),
        );
      }
    }
    const taken = new Set(members);
    const siblings = this.document.children(parent);
    const start = siblings.indexOf(first);
    const anchor = siblings.slice(start + 1).find((id) => !taken.has(id)) ?? null;
    const edit = this.document.transaction();
    try {
      const made = edit.insertAt(
        parent,
        anchor,
        new Group(new IdentityAttr(command.id)),
      );
      for (const member of members) {
        edit.attachLast(made, member);
      }
      edit.commit();
      const named = new NodeName("g", command.id);
      const event = new Grouped(
        named,
        this.nodeName(parent),
        members.length,
      );
      this.record(event);
      return Outcome.happened(Kind.Change, event);
    } catch (error: unknown) {
      edit.rollback();
      return Outcome.refused(Kind.Change, new InternalError(String(error)));
    }
  }

  public ungroup(command: Ungroup): Outcome {
    const id = command.node.resolve(this.document);
    if (id === undefined) {
      return Outcome.refused(
        Kind.Change,
        new MissingContainer(command.node),
      );
    }
    if (id === this.document.root()) {
      return Outcome.refused(
        Kind.Change,
        new CannotUngroupTopLevelContainer(this.topLevelName()),
      );
    }
    const node = this.document.node(id);
    if (!(node instanceof ContainerNode)) {
      return Outcome.refused(
        Kind.Change,
        new CannotUngroupNonContainer(command.node),
      );
    }
    if (node instanceof Group && node.dataKind !== null) {
      return Outcome.refused(
        Kind.Change,
        new CannotUngroupCompositeShape(command.node),
      );
    }
    const parent = this.document.parent(id);
    if (parent === undefined) {
      return Outcome.refused(
        Kind.Change,
        new CannotUngroupTopLevelContainer(this.topLevelName()),
      );
    }
    if (parent === this.document.root()) {
      return Outcome.refused(
        Kind.Change,
        new CannotUngroupTopLevelContainer(this.nodeName(id).id),
      );
    }
    const members = this.document.children(id);
    const siblings = this.document.children(parent);
    const at = siblings.indexOf(id);
    const anchor = at >= 0 ? siblings[at + 1] ?? null : null;
    const erased = this.nodeName(id);
    const parentName = this.nodeName(parent);
    const edit = this.document.transaction();
    try {
      for (const member of members) {
        edit.attachAt(parent, anchor, member);
      }
      edit.erase(id);
      edit.commit();
      const event = new Ungrouped(erased, parentName, members.length);
      this.record(event);
      return Outcome.happened(Kind.Change, event);
    } catch (error: unknown) {
      edit.rollback();
      return Outcome.refused(Kind.Change, new InternalError(String(error)));
    }
  }

  public move(command: Move): Outcome {
    const id = command.node.resolve(this.document);
    if (id === undefined) {
      return this.missing(command.node);
    }
    if (
      command.dx.value === 0 &&
      command.dy.value === 0
    ) {
      return Outcome.happened(Kind.Change, new NothingMoved());
    }
    return this.transformNode(command, id, false);
  }

  public scale(command: ScaleBy): Outcome {
    if (!Number.isFinite(command.factor) || command.factor <= 0) {
      return Outcome.refused(Kind.Change, new ScaleFactorNotPositive());
    }
    const id = command.node.resolve(this.document);
    return id === undefined
      ? this.missing(command.node)
      : this.transformNode(command, id, true);
  }

  public setAttribute(command: AttributeCommand): Outcome {
    const id = command.target.resolve(this.document);
    if (id === undefined) {
      return this.missing(command.target);
    }
    const source = this.document.node(id);
    if (source === undefined) {
      return Outcome.refused(Kind.Change, new InternalError());
    }
    if (command.contentValue !== null) {
      if (source instanceof Group && source.dataKind === "box") {
        return this.setBoxLabel(id, command.contentValue);
      }
      return this.setContent(id, source, command);
    }
    if (!(source instanceof ElementNode)) {
      return Outcome.refused(
        Kind.Change,
        new UnknownAttribute(command.attributeName),
      );
    }
    const lengthValue = this.lengthValueOf(command);
    if (source instanceof Group && source.dataKind === "box") {
      const candidate = (command as unknown as { value?: unknown }).value;
      if (command.attributeName === "fill" && candidate instanceof Paint) {
        return this.setBoxFill(id, candidate);
      }
    }
    if (
      lengthValue !== null &&
      NONNEGATIVE_ATTRIBUTES.has(command.attributeName) &&
      lengthValue.value < 0
    ) {
      return Outcome.refused(
        Kind.Change,
        new NegativeDimension(command.attributeName),
      );
    }
    const opacity =
      command.attributeName === "opacity"
        ? (command as unknown as { value?: unknown }).value
        : undefined;
    if (
      typeof opacity === "number" &&
      (!Number.isFinite(opacity) || opacity < 0 || opacity > 1)
    ) {
      return Outcome.refused(Kind.Change, new OpacityOutOfRange());
    }
    if (
      lengthValue !== null &&
      command.attributeName === "width" &&
      source instanceof Svg &&
      lengthValue.value <= 0
    ) {
      return Outcome.refused(
        Kind.Change,
        new NonPositiveCanvas("width"),
      );
    }
    if (
      lengthValue !== null &&
      command.attributeName === "height" &&
      source instanceof Svg &&
      lengthValue.value <= 0
    ) {
      return Outcome.refused(
        Kind.Change,
        new NonPositiveCanvas("height"),
      );
    }
    const replacement = command.applyTo(source);
    if (replacement === null) {
      return Outcome.refused(
        Kind.Change,
        new UnknownAttribute(command.attributeName),
      );
    }
    const edit = this.document.transaction();
    try {
      edit.update(id, replacement);
      edit.commit();
      const event = new AttributeSet(
        this.nodeName(id),
        command.attributeName,
        this.attributeText(command),
      );
      this.record(event);
      return Outcome.happened(Kind.Change, event);
    } catch (error: unknown) {
      edit.rollback();
      return Outcome.refused(Kind.Change, new InternalError(String(error)));
    }
  }

  public undo(): Outcome {
    if (!this.document.canUndo()) {
      return Outcome.refused(
        Kind.Change,
        this.document.undoBarredByIo()
          ? new UndoAfterIo()
          : new NothingToUndo(),
      );
    }
    const leaving = this.document.commitId();
    this.document.undo();
    const event = new Undone(
      this.document.position(),
      this.document.depth(),
      this.historyEvents.get(leaving) ?? null,
      this.document.commitId(),
    );
    return Outcome.happened(Kind.Change, event);
  }

  public redo(): Outcome {
    if (!this.document.canRedo()) {
      return Outcome.refused(Kind.Change, new NothingToRedo());
    }
    this.document.redo();
    const entered = this.document.commitAt(this.document.position() - 1);
    const event = new Redone(
      this.document.position(),
      this.document.depth(),
      entered === undefined ? null : (this.historyEvents.get(entered) ?? null),
      this.document.commitId(),
    );
    return Outcome.happened(Kind.Change, event);
  }

  public checkout(command: Checkout): Outcome {
    const moved = this.document.checkout(command.commit);
    if (moved === undefined) {
      return Outcome.refused(Kind.Change, new UnknownCommit(command.commit));
    }
    const timeline = this.history(command.limit);
    return Outcome.happened(
      Kind.Change,
      new CheckedOut(
        moved.position,
        this.document.depth(),
        command.commit,
        moved.noEffect,
        timeline.baseline,
        timeline.entries,
      ),
    );
  }

  public setCanvas(command: SetCanvas): Outcome {
    if (!this.document.hasDocument()) {
      return noDocument();
    }
    if (
      command.width !== null &&
      (!Number.isFinite(command.width.value) || command.width.value <= 0)
    ) {
      return Outcome.refused(Kind.Change, new NonPositiveCanvas("width"));
    }
    if (
      command.height !== null &&
      (!Number.isFinite(command.height.value) || command.height.value <= 0)
    ) {
      return Outcome.refused(Kind.Change, new NonPositiveCanvas("height"));
    }
    const root = this.document.root();
    const node = this.document.node(root);
    if (!(node instanceof Svg)) {
      return Outcome.refused(Kind.Change, new InternalError());
    }
    const replacement = new Svg(
      command.width ?? node.width,
      command.height ?? node.height,
      node.xmlns,
      node.viewBox,
      node.identity,
      node.paint,
      node.transformAttr,
    );
    const edit = this.document.transaction();
    try {
      edit.update(root, replacement);
      edit.commit();
      this.document.clearHistory(true);
      this.historyEvents.clear();
      return Outcome.happened(
        Kind.Change,
        new CanvasSet(replacement.width, replacement.height),
      );
    } catch (error: unknown) {
      edit.rollback();
      return Outcome.refused(Kind.Change, new InternalError(String(error)));
    }
  }

  public history(limit: number | null = null): HistoryView {
    const depth = this.document.depth();
    const entries: HistoryEntry[] = [];
    for (let position = 0; position < depth; position += 1) {
      const commit = this.document.commitAt(position);
      const event = commit === undefined ? undefined : this.historyEvents.get(commit);
      if (commit !== undefined && event !== undefined) {
        entries.push(new HistoryEntry(commit, event, position));
      }
    }
    const cap = Math.max(0, limit ?? this.defaultHistoryLimit);
    const selected =
      entries.length <= cap
        ? entries
        : entries.slice(Math.max(0, entries.length - cap));
    return {
      baseline: this.document.baselineCommit(),
      head: this.document.commitId(),
      position: this.document.position(),
      depth,
      entries: selected,
    };
  }

  public forgetHistory(): void {
    this.historyEvents.clear();
  }

  private transformNode(
    command: Move | ScaleBy,
    id: Vid,
    scaling: boolean,
  ): Outcome {
    const source = this.document.node(id);
    if (source === undefined) {
      return Outcome.refused(Kind.Change, new InternalError());
    }
    const mode = this.resolveMode(source, command.target, command.scope);
    if (mode instanceof Refusal) {
      return Outcome.refused(Kind.Change, mode);
    }
    const name = this.nodeName(id);
    if (
      (mode === EditMode.Transform || mode === EditMode.ContainerTransform) &&
      source instanceof ContainerNode &&
      this.document.children(id).length === 0
    ) {
      return Outcome.refused(
        Kind.Change,
        new EmptyContainer(name.element, name.id),
      );
    }

    if (mode === EditMode.Transform || mode === EditMode.ContainerTransform) {
      if (!(source instanceof ElementNode)) {
        return Outcome.refused(Kind.Change, new InternalError());
      }
      const operation = scaling
        ? Transform.scaled((command as ScaleBy).factor)
        : Transform.translated(
            (command as Move).dx,
            (command as Move).dy,
          );
      const composed = operation.compose(source.transformAttr.transform);
      if (composed === null) {
        return Outcome.refused(Kind.Change, new InternalError());
      }
      const replacement = source.withAttributes(
        source.identity,
        source.paint,
        source.transformAttr.withTransform(composed),
      );
      return this.updateOne(
        id,
        replacement,
        scaling
          ? new Scaled(name, (command as ScaleBy).factor, mode, 1)
          : new Moved(name, (command as Move).dx, (command as Move).dy, mode, 1),
      );
    }

    if (mode === EditMode.Params) {
      const replacement = scaling
        ? scaledParams(source, (command as ScaleBy).factor)
        : translatedParams(
            source,
            (command as Move).dx,
            (command as Move).dy,
          );
      if (replacement === null) {
        const existing = this.firstParam(source);
        return Outcome.refused(
          Kind.Change,
          existing === null
            ? new UnknownAttribute("params")
            : new IncompatibleLengths(
                scaling
                  ? String((command as ScaleBy).factor)
                  : (command as Move).dx.toDisplayText(),
                existing.toDisplayText(),
              ),
        );
      }
      return this.updateOne(
        id,
        replacement,
        scaling
          ? new Scaled(name, (command as ScaleBy).factor, mode, 1)
          : new Moved(name, (command as Move).dx, (command as Move).dy, mode, 1),
      );
    }

    const plan = scaling
      ? this.planCascade(
          id,
          Transform.scaled((command as ScaleBy).factor),
          (node) => scaledParams(node, (command as ScaleBy).factor),
        )
      : this.planCascade(
          id,
          Transform.translated((command as Move).dx, (command as Move).dy),
          (node) => translatedParams(node, (command as Move).dx, (command as Move).dy),
        );
    if (plan instanceof Refusal) {
      return Outcome.refused(Kind.Change, plan);
    }
    if (plan.length === 0) {
      return Outcome.refused(
        Kind.Change,
        new EmptyContainer(name.element, name.id),
      );
    }
    const edit = this.document.transaction();
    try {
      for (const entry of plan) {
        edit.update(entry.id, entry.node);
      }
      edit.commit();
      const event = scaling
        ? new Scaled(name, (command as ScaleBy).factor, EditMode.Cascade, plan.length)
        : new Moved(name, (command as Move).dx, (command as Move).dy, EditMode.Cascade, plan.length);
      this.record(event);
      return Outcome.happened(Kind.Change, event);
    } catch (error: unknown) {
      edit.rollback();
      return Outcome.refused(Kind.Change, new InternalError(String(error)));
    }
  }

  private resolveMode(
    node: Node,
    target: EditTarget,
    scope: EditScope,
  ): EditMode | Refusal {
    if (target === EditTarget.Transform) {
      return scope === EditScope.Default
        ? EditMode.Transform
        : new TransformHasNoScope();
    }
    const effective = scope === EditScope.Default ? EditScope.Cascade : scope;
    const container = node instanceof ContainerNode;
    const transformed = carriesTransform(node);
    if (effective === EditScope.Cascade) {
      if (!container) {
        return transformed ? EditMode.Transform : EditMode.Params;
      }
      return transformed ? EditMode.Transform : EditMode.Cascade;
    }
    if (container) {
      return EditMode.ContainerTransform;
    }
    return transformed ? EditMode.Transform : EditMode.Params;
  }

  private planCascade(
    parent: Vid,
    operation: Transform,
    apply: (node: Node) => Node | null,
  ): CascadeEntry[] | Refusal {
    const plan: CascadeEntry[] = [];
    const visit = (id: Vid): Refusal | null => {
      for (const child of this.document.children(id)) {
        const node = this.document.node(child);
        if (node === undefined || node instanceof PlainTextNode) {
          continue;
        }
        if (carriesTransform(node) && node instanceof ElementNode) {
          const composed = operation.compose(node.transformAttr.transform);
          if (composed === null) {
            return new InternalError("incompatible transform lengths");
          }
          plan.push({
            id: child,
            node: node.withAttributes(
              node.identity,
              node.paint,
              node.transformAttr.withTransform(composed),
            ),
          });
          continue;
        }
        if (!(node instanceof ContainerNode)) {
          const changed = apply(node);
          if (changed === null) {
            return new InternalError("cannot change node params");
          }
          plan.push({ id: child, node: changed });
        }
        const nested = visit(child);
        if (nested !== null) {
          return nested;
        }
      }
      return null;
    };
    const problem = visit(parent);
    return problem ?? plan;
  }

  private updateOne(id: Vid, node: Node, event: EditEvent): Outcome {
    const edit = this.document.transaction();
    try {
      edit.update(id, node);
      edit.commit();
      this.record(event);
      return Outcome.happened(Kind.Change, event);
    } catch (error: unknown) {
      edit.rollback();
      return Outcome.refused(Kind.Change, new InternalError(String(error)));
    }
  }

  private setContent(
    id: Vid,
    source: Node,
    command: AttributeCommand,
  ): Outcome {
    const content = command.contentValue;
    if (content === null) {
      return Outcome.refused(Kind.Change, new InternalError());
    }
    const edit = this.document.transaction();
    try {
      if (source instanceof PlainTextNode) {
        edit.update(id, new PlainTextNode(content));
      } else if (source instanceof TextNode) {
        const textChildren = this.document
          .children(id)
          .map((child) => ({ id: child, node: edit.find(child) }))
          .filter(
            (entry): entry is { id: Vid; node: PlainTextNode } =>
              entry.node instanceof PlainTextNode,
          );
        const first = textChildren[0];
        if (first === undefined) {
          edit.appendChild(id, new PlainTextNode(content));
        } else {
          edit.update(first.id, new PlainTextNode(content));
          for (const extra of textChildren.slice(1)) {
            edit.erase(extra.id);
          }
        }
      } else {
        edit.rollback();
        return Outcome.refused(
          Kind.Change,
          new UnknownAttribute(command.attributeName),
        );
      }
      edit.commit();
      const event = new ContentSet(this.nodeName(id), content);
      this.record(event);
      return Outcome.happened(Kind.Change, event);
    } catch (error: unknown) {
      edit.rollback();
      return Outcome.refused(Kind.Change, new InternalError(String(error)));
    }
  }

  private setBoxFill(boxId: Vid, fill: Paint): Outcome {
    const box = this.document.node(boxId);
    if (!(box instanceof Group) || box.dataKind !== "box") {
      return Outcome.refused(Kind.Change, new InternalError());
    }
    const rectId = this.document.find(`${box.id}-rect`);
    if (rectId === undefined) {
      return Outcome.refused(Kind.Change, new InternalError());
    }
    const rect = this.document.node(rectId);
    if (!(rect instanceof ElementNode)) {
      return Outcome.refused(Kind.Change, new InternalError());
    }
    const replacement = rect.withAttributes(
      rect.identity,
      rect.paint.withFill(fill),
      rect.transformAttr,
    );
    const edit = this.document.transaction();
    try {
      edit.update(rectId, replacement);
      edit.commit();
      const event = new BoxFillPropagated(
        this.nodeName(boxId),
        this.nodeName(rectId),
        fill.toSvgText(),
      );
      this.record(event);
      return Outcome.happened(Kind.Change, event);
    } catch (error: unknown) {
      edit.rollback();
      return Outcome.refused(Kind.Change, new InternalError(String(error)));
    }
  }

  private setBoxLabel(boxId: Vid, content: string): Outcome {
    const box = this.document.node(boxId);
    if (!(box instanceof Group) || box.dataKind !== "box") {
      return Outcome.refused(Kind.Change, new InternalError());
    }
    const labelId = this.document.find(`${box.id}-label`);
    if (labelId === undefined) {
      return Outcome.refused(Kind.Change, new InternalError());
    }
    const textChild = this.document
      .children(labelId)
      .find((child) => this.document.node(child) instanceof PlainTextNode);
    const previous =
      textChild === undefined
        ? ""
        : (this.document.node(textChild) as PlainTextNode).content;
    const edit = this.document.transaction();
    try {
      if (textChild === undefined) {
        edit.appendChild(labelId, new PlainTextNode(content));
      } else {
        edit.update(textChild, new PlainTextNode(content));
      }
      edit.commit();
      const event = new BoxLabelSet(
        this.nodeName(boxId),
        content,
        previous,
      );
      this.record(event);
      return Outcome.happened(Kind.Change, event);
    } catch (error: unknown) {
      edit.rollback();
      return Outcome.refused(Kind.Change, new InternalError(String(error)));
    }
  }

  private createDimensions(command: CreateIntent): Refusal | null {
    const values: [string, LengthPercentage, boolean][] = [];
    if (command instanceof CreateRectValue) {
      values.push(["x", command.x, false], ["y", command.y, false], ["width", command.width, true], ["height", command.height, true]);
    } else if (command instanceof CreateCircleValue) {
      values.push(["cx", command.cx, false], ["cy", command.cy, false], ["r", command.radius, true]);
    } else if (command instanceof CreateEllipseValue) {
      values.push(["cx", command.cx, false], ["cy", command.cy, false], ["rx", command.radiusX, true], ["ry", command.radiusY, true]);
    } else if (command instanceof CreateLineValue) {
      values.push(["x1", command.x1, false], ["y1", command.y1, false], ["x2", command.x2, false], ["y2", command.y2, false]);
    } else if (command instanceof CreateTextValue) {
      values.push(["x", command.x, false], ["y", command.y, false]);
    }
    for (const [name, value, nonnegative] of values) {
      if (!Number.isFinite(value.value)) {
        return new NonFiniteValue(name);
      }
      if (nonnegative && value.value < 0) {
        return new NegativeDimension(name);
      }
    }
    return null;
  }

  private appendCreatedChildren(
    edit: ReturnType<Document["transaction"]>,
    parent: Vid,
    children: readonly CreatedChild[],
  ): void {
    for (const child of children) {
      const id = edit.appendChild(parent, child.node);
      this.appendCreatedChildren(edit, id, child.children);
    }
  }

  private lengthValueOf(command: AttributeCommand): LengthPercentage | null {
    if (!LENGTH_ATTRIBUTES.has(command.attributeName)) {
      return null;
    }
    const candidate = (command as unknown as { value?: unknown }).value;
    return candidate instanceof LengthPercentage ? candidate : null;
  }

  private firstParam(node: Node): LengthPercentage | null {
    if (node instanceof Rect || node instanceof Circle || node instanceof Ellipse) {
      return node instanceof Rect
        ? node.x
        : node instanceof Circle
          ? node.cx
          : node.cx;
    }
    if (node instanceof Line) {
      return node.x1;
    }
    if (node instanceof Polygon) {
      return node.points[0]?.x ?? null;
    }
    if (node instanceof TextNode) {
      return node.common.x;
    }
    return null;
  }

  private attributeText(command: AttributeCommand): string {
    const candidate = (command as unknown as { value?: unknown }).value;
    if (candidate instanceof LengthPercentage) {
      return candidate.toDisplayText();
    }
    if (candidate instanceof Paint) {
      return candidate.toSvgText();
    }
    if (candidate instanceof Transform) {
      return candidate.toDisplayText() || "none";
    }
    if (candidate instanceof ViewBox) {
      return candidate.toDisplayText();
    }
    if (
      typeof candidate === "string" ||
      typeof candidate === "number" ||
      typeof candidate === "boolean"
    ) {
      return String(candidate);
    }
    return command.attributeName;
  }

  private record(event: EditEvent): void {
    this.historyEvents.set(this.document.commitId(), event);
  }

  private missing(ref: NodeRef): Outcome {
    return Outcome.refused(
      Kind.Change,
      this.document.hasDocument()
        ? new MissingShape(ref)
        : new NoDocument(),
    );
  }

  private nodeName(id: Vid): NodeName {
    const node = this.document.node(id);
    if (node instanceof ElementNode) {
      return new NodeName(
        node instanceof Group && node.dataKind !== null
          ? node.dataKind
          : node.elementName,
        node.id,
      );
    }
    return new NodeName("#text", `#${String(id)}`);
  }

  private nameOfNode(node: Node): NodeName {
    return node instanceof ElementNode
      ? new NodeName(node.elementName, node.id)
      : new NodeName("#text", "");
  }

  private inside(candidate: Vid, ancestor: Vid): boolean {
    let current: Vid | undefined = candidate;
    while (current !== undefined) {
      if (current === ancestor) {
        return true;
      }
      current = this.document.parent(current);
    }
    return false;
  }

  private countElementsBelow(id: Vid): number {
    let count = 0;
    const pending = [...this.document.children(id)];
    while (pending.length > 0) {
      const child = pending.pop();
      if (child === undefined) {
        continue;
      }
      if (this.document.node(child) instanceof ElementNode) {
        count += 1;
      }
      pending.push(...this.document.children(child));
    }
    return count;
  }

  private topLevelName(): string {
    const root = this.document.node(this.document.root());
    return root instanceof ElementNode && root.id !== ""
      ? root.id
      : "/";
  }
}

// Structural imports kept behind aliases so the creation switch in this file remains
// visually separate from the semantic branches above.
import {
  CreateCircle as CreateCircleValue,
  CreateEllipse as CreateEllipseValue,
  CreateLine as CreateLineValue,
  CreateRect as CreateRectValue,
  CreateText as CreateTextValue,
} from "../protocol/cmd/Create.js";
