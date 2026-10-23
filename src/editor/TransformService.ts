import type { Document } from "../model/document/Document.js";
import {
  ContainerNode,
  ElementNode,
  PlainTextNode,
  type Node,
} from "../model/node/index.js";
import type { Vid } from "../model/store/hiveState.js";
import { Transform } from "../model/values/Transform.js";
import type { Move, ScaleBy } from "../protocol/cmd/ChangeCommands.js";
import {
  EmptyContainer,
  IncompatibleLengths,
  InternalError,
  MissingShape,
  NoDocument,
  ScaleFactorNotPositive,
  TransformHasNoScope,
  UnknownAttribute,
  isRefusal,
  type Refusal,
} from "../protocol/refusal/Refusal.js";
import { Moved, NothingMoved, Scaled, type EditEvent } from "../protocol/event/EditEvent.js";
import { Kind } from "../protocol/Kind.js";
import {
  EditMode,
  EditScope,
  EditTarget,
} from "../protocol/NodeRef.js";
import { Outcome } from "../protocol/Outcome.js";
import { firstParam } from "./attributes.js";
import type { History } from "./history/History.js";
import type { NodeNaming } from "./naming.js";
import { scaleParams } from "./shape/ScaleVisitor.js";
import { translateParams } from "./shape/TranslateVisitor.js";

interface CascadeEntry {
  readonly id: Vid;
  readonly node: Node;
}

function carriesTransform(node: Node): boolean {
  return (
    node instanceof ElementNode &&
    !node.transformAttr.transform.isIdentity()
  );
}

export class TransformService {
  public constructor(
    private readonly document: Document,
    private readonly history: History,
    private readonly naming: NodeNaming,
  ) {}

  public move(command: Move): Outcome {
    const id = command.node.resolve(this.document);
    if (id === undefined) {
      return this.missing(command);
    }
    if (command.dx.value === 0 && command.dy.value === 0) {
      return Outcome.happened(Kind.Change, new NothingMoved());
    }
    return this.apply(command, id, false);
  }

  public scale(command: ScaleBy): Outcome {
    if (!Number.isFinite(command.factor) || command.factor <= 0) {
      return Outcome.refused(
        Kind.Change,
        new ScaleFactorNotPositive(),
      );
    }
    const id = command.node.resolve(this.document);
    return id === undefined
      ? this.missing(command)
      : this.apply(command, id, true);
  }

  private apply(
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
    const name = this.naming.node(id);
    if (
      (mode === EditMode.Transform ||
        mode === EditMode.ContainerTransform) &&
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
        : Transform.translated((command as Move).dx, (command as Move).dy);
      const composed = operation.compose(source.transformAttr.transform);
      if (composed === null) {
        return Outcome.refused(Kind.Change, new InternalError());
      }
      return this.updateOne(
        id,
        source.withAttributes(
          source.identity,
          source.paint,
          source.transformAttr.withTransform(composed),
        ),
        this.resultEvent(command, name, mode, 1, scaling),
      );
    }

    if (mode === EditMode.Params) {
      const replacement = scaling
        ? scaleParams(source, (command as ScaleBy).factor)
        : translateParams(source, (command as Move).dx, (command as Move).dy);
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
        this.resultEvent(command, name, mode, 1, scaling),
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
          (node) =>
            translateParams(node, (command as Move).dx, (command as Move).dy),
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
      const event = this.resultEvent(
        command,
        name,
        EditMode.Cascade,
        plan.length,
        scaling,
      );
      this.history.record(event);
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
    const effective =
      scope === EditScope.Default ? EditScope.Cascade : scope;
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
      this.history.record(event);
      return Outcome.happened(Kind.Change, event);
    } catch (error: unknown) {
      edit.rollback();
      return Outcome.refused(Kind.Change, new InternalError(String(error)));
    }
  }

  private resultEvent(
    command: Move | ScaleBy,
    name: ReturnType<NodeNaming["node"]>,
    mode: EditMode,
    nodes: number,
    scaling: boolean,
  ): EditEvent {
    return scaling
      ? new Scaled(name, (command as ScaleBy).factor, mode, nodes)
      : new Moved(
          name,
          (command as Move).dx,
          (command as Move).dy,
          mode,
          nodes,
        );
  }

  private missing(
    command: Move | ScaleBy,
  ): Outcome {
    return Outcome.refused(
      Kind.Change,
      this.document.hasDocument()
        ? new MissingShape(command.node)
        : new NoDocument(),
    );
  }
}

