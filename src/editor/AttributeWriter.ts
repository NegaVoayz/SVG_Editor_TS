import type { Document } from "../model/document/Document.js";
import {
  isElementNode,
  PlainTextNode,
  Svg,
  type Node,
} from "../model/node/index.js";
import type { Vid } from "../model/store/hiveState.js";
import type { ShapeRegistry } from "../plugin/Registry.js";
import type { CompositeShapeProvider } from "../plugin/ShapeProvider.js";
import type { AttributeCommand } from "../protocol/attr/AttributeCommand.js";
import {
  AttributeSet,
  CompositeContentSet,
  ContentSet,
  NodeName,
} from "../protocol/event/EditEvent.js";
import { Kind } from "../protocol/Kind.js";
import { Outcome } from "../protocol/Outcome.js";
import {
  CompositeMissingChild,
  InternalError,
  MissingShape,
  NegativeDimension,
  NoDocument,
  NonPositiveCanvas,
  OpacityOutOfRange,
  UnknownAttribute,
} from "../protocol/refusal/Refusal.js";
import { attributeText, lengthValueOf } from "./attributes.js";
import type { History } from "./history/History.js";
import type { NodeNaming } from "./naming.js";

export class AttributeWriter {
  public constructor(
    private readonly document: Document,
    private readonly history: History,
    private readonly naming: NodeNaming,
    private readonly shapes: ShapeRegistry,
  ) {}

  public apply(command: AttributeCommand): Outcome {
    const id = command.target.resolve(this.document);
    if (id === undefined) {
      return Outcome.refused(
        Kind.Change,
        this.document.hasDocument()
          ? new MissingShape(command.target)
          : new NoDocument(),
      );
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
      return Outcome.refused(
        Kind.Change,
        new CompositeMissingChild(command.target, "label"),
      );
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
    if (composite !== undefined) {
      const targets = composite.attributeTargets(
        this.document,
        source,
        command.attributeName,
      );
      if (targets.length > 0) {
        return this.setAttributeTargets(id, targets, command);
      }
    }
    const lengthValue = lengthValueOf(command);
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
    if (
      command.spec.options.opacity &&
      typeof command.value === "number" &&
      (!Number.isFinite(command.value) ||
        command.value < 0 ||
        command.value > 1)
    ) {
      return Outcome.refused(Kind.Change, new OpacityOutOfRange());
    }
    if (
      lengthValue !== null &&
      command.spec.options.canvasDimension &&
      source instanceof Svg &&
      lengthValue.value <= 0
    ) {
      return Outcome.refused(
        Kind.Change,
        new NonPositiveCanvas(command.attributeName),
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
        this.naming.node(id),
        command.attributeName,
        attributeText(command),
      );
      this.history.record(event);
      return Outcome.happened(Kind.Change, event);
    } catch (error: unknown) {
      edit.rollback();
      return Outcome.refused(Kind.Change, new InternalError(String(error)));
    }
  }

  private setAttributeTargets(
    compositeId: Vid,
    targetIds: readonly Vid[],
    command: AttributeCommand,
  ): Outcome {
    const replacements: { id: Vid; node: Node }[] = [];
    for (const targetId of targetIds) {
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
      replacements.push({ id: targetId, node: replacement });
    }
    const edit = this.document.transaction();
    try {
      for (const replacement of replacements) {
        edit.update(replacement.id, replacement.node);
      }
      edit.commit();
      const composite = this.document.node(compositeId);
      const event = new AttributeSet(
        composite !== undefined && isElementNode(composite)
          ? new NodeName(composite.elementName, composite.id)
          : this.naming.node(compositeId),
        command.attributeName,
        attributeText(command),
      );
      this.history.record(event);
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
        this.naming.node(compositeId),
        provider.contentAttribute,
        content,
        previous,
      );
      this.history.record(event);
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
      } else if (
        source.elementName === "text" ||
        source.elementName === "tspan" ||
        source.elementName === "textPath"
      ) {
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
      const event = new ContentSet(this.naming.node(id), content);
      this.history.record(event);
      return Outcome.happened(Kind.Change, event);
    } catch (error: unknown) {
      edit.rollback();
      return Outcome.refused(Kind.Change, new InternalError(String(error)));
    }
  }
}

