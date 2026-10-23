import type { Document } from "../model/document/Document.js";
import {
  ContainerNode,
  Group,
  PlainTextNode,
  Svg,
  TextNode,
  isElementNode,
} from "../model/node/index.js";
import { ElementNode } from "../model/node/ElementNode.js";
import type { Node } from "../model/node/index.js";
import type { Vid } from "../model/store/hiveState.js";
import { IdentityAttr } from "../model/values/IdentityAttr.js";
import { reservedSvgId, validSvgId } from "../model/values/svgId.js";
import { Transform } from "../model/values/Transform.js";
import { ShapeRegistry } from "../plugin/Registry.js";
import type { CompositeShapeProvider } from "../plugin/ShapeProvider.js";
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
  CanvasSet,
  CompositeAttributeSet,
  CompositeContentSet,
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
  Scaled,
  Ungrouped,
  type EditEvent,
} from "../protocol/event/EditEvent.js";
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
  NonPositiveCanvas,
  NotContainer,
  OpacityOutOfRange,
  ReservedId,
  RootCannotBeErased,
  RootHasNoSiblings,
  ScaleFactorNotPositive,
  TransformHasNoScope,
  UnknownAttribute,
  isRefusal,
  type Refusal,
} from "../protocol/refusal/Refusal.js";
import type { HistoryView } from "../protocol/view/View.js";
import {
  attributeText,
  createDimensions,
  firstParam,
  lengthValueOf,
} from "./attributes.js";
import { History } from "./history/History.js";
import { NodeNaming } from "./naming.js";
import { scaleParams } from "./shape/ScaleVisitor.js";
import { translateParams } from "./shape/TranslateVisitor.js";

interface CascadeEntry {
  readonly id: Vid;
  readonly node: Node;
}

function noDocument(): Outcome {
  return Outcome.refused(Kind.Change, new NoDocument());
}

function parentReference(ref: NodeRef): boolean {
  return !(ref instanceof RootRef);
}

function carriesTransform(node: Node): boolean {
  return node instanceof ElementNode &&
    !node.transformAttr.transform.isIdentity();
}

export class Editor {
  private readonly replay: History;
  private readonly naming: NodeNaming;

  public constructor(
    private readonly document: Document,
    defaultHistoryLimit = 20,
    private readonly shapes = new ShapeRegistry(),
  ) {
    this.replay = new History(document, defaultHistoryLimit);
    this.naming = new NodeNaming(document, shapes);
  }

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
    const problem = createDimensions(command);
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
    if (isElementNode(node)) {
      const provider = this.shapes.providerFor(node);
      if (provider !== undefined && !provider.ungroupable) {
        return Outcome.refused(
          Kind.Change,
          new CannotUngroupCompositeShape(command.node),
        );
      }
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
    const composite = isElementNode(source)
      ? this.shapes.providerFor(source)
      : undefined;
    if (
      command.contentValue !== null &&
      composite !== undefined &&
      isElementNode(source)
    ) {
      const target = composite.contentTarget(this.document, source);
      if (target !== null) {
        return this.setCompositeContent(
          id,
          target,
          composite,
          command.contentValue,
        );
      }
    }
    if (command.contentValue !== null) {
      return this.setContent(id, source, command);
    }
    if (!isElementNode(source)) {
      return Outcome.refused(
        Kind.Change,
        new UnknownAttribute(command.attributeName),
      );
    }
    const lengthValue = lengthValueOf(command);
    if (composite !== undefined) {
      const target = composite.attributeTarget(
        this.document,
        source,
        command.attributeName,
      );
      if (target !== null) {
        return this.setCompositeAttribute(id, target, command);
      }
    }
    if (
      lengthValue !== null &&
      command.spec.options.nonnegative &&
      lengthValue.value < 0
    ) {
      return Outcome.refused(
        Kind.Change,
        new NegativeDimension(command.attributeName),
      );
    }
    const opacity =
      command.spec.options.opacity
        ? command.value
        : undefined;
    if (
      typeof opacity === "number" &&
      (!Number.isFinite(opacity) || opacity < 0 || opacity > 1)
    ) {
      return Outcome.refused(Kind.Change, new OpacityOutOfRange());
    }
    if (
      lengthValue !== null &&
      command.spec.options.canvasDimension &&
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
      command.spec.options.canvasDimension &&
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
        attributeText(command),
      );
      this.record(event);
      return Outcome.happened(Kind.Change, event);
    } catch (error: unknown) {
      edit.rollback();
      return Outcome.refused(Kind.Change, new InternalError(String(error)));
    }
  }

  public undo(): Outcome {
    return this.replay.undo();
  }

  public redo(): Outcome {
    return this.replay.redo();
  }

  public checkout(command: Checkout): Outcome {
    return this.replay.checkout(command);
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
      this.replay.clear();
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
    return this.replay.view(limit);
  }

  public forgetHistory(): void {
    this.replay.clear();
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
    if (isRefusal(mode)) {
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
        ? scaleParams(source, (command as ScaleBy).factor)
        : translateParams(
            source,
            (command as Move).dx,
            (command as Move).dy,
          );
      if (replacement === null) {
        const existing = firstParam(source);
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
          (node) => scaleParams(node, (command as ScaleBy).factor),
        )
      : this.planCascade(
          id,
          Transform.translated((command as Move).dx, (command as Move).dy),
          (node) => translateParams(node, (command as Move).dx, (command as Move).dy),
        );
    if (!Array.isArray(plan)) {
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

  private setCompositeAttribute(
    compositeId: Vid,
    targetId: Vid,
    command: AttributeCommand,
  ): Outcome {
    const target = this.document.node(targetId);
    if (target === undefined || !isElementNode(target)) {
      return Outcome.refused(Kind.Change, new InternalError());
    }
    const replacement = command.applyTo(target);
    if (replacement === null) {
      return Outcome.refused(
        Kind.Change,
        new UnknownAttribute(command.attributeName),
      );
    }
    const edit = this.document.transaction();
    try {
      edit.update(targetId, replacement);
      edit.commit();
      const event = new CompositeAttributeSet(
        this.nodeName(compositeId),
        this.nodeName(targetId),
        command.attributeName,
        attributeText(command),
      );
      this.record(event);
      return Outcome.happened(Kind.Change, event);
    } catch (error: unknown) {
      edit.rollback();
      return Outcome.refused(Kind.Change, new InternalError(String(error)));
    }
  }

  private setCompositeContent(
    compositeId: Vid,
    contentId: Vid,
    provider: CompositeShapeProvider,
    content: string,
  ): Outcome {
    const textChild = this.document
      .children(contentId)
      .find((child) => this.document.node(child) instanceof PlainTextNode);
    const previous =
      textChild === undefined
        ? ""
        : (this.document.node(textChild) as PlainTextNode).content;
    const edit = this.document.transaction();
    try {
      if (textChild === undefined) {
        edit.appendChild(contentId, new PlainTextNode(content));
      } else {
        edit.update(textChild, new PlainTextNode(content));
      }
      edit.commit();
      const event = new CompositeContentSet(
        this.nodeName(compositeId),
        provider.contentAttribute,
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

  private record(event: EditEvent): void {
    this.replay.record(event);
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
    return this.naming.node(id);
  }

  private nameOfNode(node: Node): NodeName {
    return this.naming.name(node);
  }

  private inside(candidate: Vid, ancestor: Vid): boolean {
    return this.naming.inside(candidate, ancestor);
  }

  private countElementsBelow(id: Vid): number {
    return this.naming.elementCountBelow(id);
  }

  private topLevelName(): string {
    return this.naming.topLevel();
  }
}
