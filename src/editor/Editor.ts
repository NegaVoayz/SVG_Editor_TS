import type { Document } from "../model/document/Document.js";
import {
  ContainerNode,
  Svg,
} from "../model/node/index.js";
import { ElementNode } from "../model/node/ElementNode.js";
import type { Node } from "../model/node/index.js";
import type { Vid } from "../model/store/hiveState.js";
import { reservedSvgId, validSvgId } from "../model/values/svgId.js";
import { ShapeRegistry } from "../plugin/Registry.js";
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
  CanvasSet,
  CompositeCreated,
  Created,
  type EditEvent,
  type NodeName,
} from "../protocol/event/EditEvent.js";
import { Kind } from "../protocol/Kind.js";
import type { NodeRef } from "../protocol/NodeRef.js";
import { RootRef } from "../protocol/NodeRef.js";
import { Outcome } from "../protocol/Outcome.js";
import {
  DuplicateId,
  InternalError,
  InvalidId,
  MissingContainer,
  NoDocument,
  NonPositiveCanvas,
  NotContainer,
  ReservedId,
} from "../protocol/refusal/Refusal.js";
import type { HistoryView } from "../protocol/view/View.js";
import {
  createDimensions,
} from "./attributes.js";
import { History } from "./history/History.js";
import { AttributeWriter } from "./AttributeWriter.js";
import { NodeNaming } from "./naming.js";
import { TransformService } from "./TransformService.js";
import { StructureService } from "./StructureService.js";

function noDocument(): Outcome {
  return Outcome.refused(Kind.Change, new NoDocument());
}

function parentReference(ref: NodeRef): boolean {
  return !(ref instanceof RootRef);
}


export class Editor {
  private readonly replay: History;
  private readonly naming: NodeNaming;
  private readonly attributes: AttributeWriter;
  private readonly transforms: TransformService;
  private readonly structure: StructureService;

  public constructor(
    private readonly document: Document,
    defaultHistoryLimit = 20,
    shapes = new ShapeRegistry(),
  ) {
    this.replay = new History(document, defaultHistoryLimit);
    this.naming = new NodeNaming(document, shapes);
    this.attributes = new AttributeWriter(
      document,
      this.replay,
      this.naming,
      shapes,
    );
    this.transforms = new TransformService(
      document,
      this.replay,
      this.naming,
    );
    this.structure = new StructureService(
      document,
      this.replay,
      this.naming,
      shapes,
    );
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
    return this.structure.delete(command);
  }

  public addTo(command: AddTo): Outcome {
    return this.structure.addTo(command);
  }

  public front(command: Front): Outcome {
    return this.structure.front(command);
  }

  public back(command: Back): Outcome {
    return this.structure.back(command);
  }

  public group(command: GroupNodes): Outcome {
    return this.structure.group(command);
  }

  public ungroup(command: Ungroup): Outcome {
    return this.structure.ungroup(command);
  }

  public move(command: Move): Outcome {
    return this.transforms.move(command);
  }

  public scale(command: ScaleBy): Outcome {
    return this.transforms.scale(command);
  }

  public setAttribute(command: AttributeCommand): Outcome {
    return this.attributes.apply(command);
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

  private nodeName(id: Vid): NodeName {
    return this.naming.node(id);
  }

  private nameOfNode(node: Node): NodeName {
    return this.naming.name(node);
  }

}
