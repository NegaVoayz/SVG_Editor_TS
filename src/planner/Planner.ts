import type { Editor } from "../editor/Editor.js";
import type { Document } from "../model/document/Document.js";
import { ElementNode, Svg, type Node } from "../model/node/index.js";
import { TreeQuery } from "../model/query/TreeQuery.js";
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
import type { CommandContext } from "../protocol/cmd/CommandContext.js";
import type { CreateIntent } from "../protocol/cmd/Create.js";
import type {
  Checkout,
  Init,
  Read,
  Save,
  SetCanvas,
  Show,
  ShowHistory,
  ShowTree,
} from "../protocol/cmd/ContextCommands.js";
import { AssignedIdName, Initialized, Opened, Saved } from "../protocol/event/EditEvent.js";
import { Kind } from "../protocol/Kind.js";
import type { NodeRef } from "../protocol/NodeRef.js";
import { Outcome } from "../protocol/Outcome.js";
import {
  CannotReadFile,
  CannotWriteFile,
  InternalError,
  InvalidSvg,
  MissingShape,
  MissingSourcePath,
  NoDocument,
  NonFiniteValue,
  NonPositiveCanvas,
} from "../protocol/refusal/Refusal.js";
import {
  NodeParent,
  NodeView,
  TreeRow,
  TreeView,
  type HistoryView,
} from "../protocol/view/View.js";

function missingDocument(kind: Kind): Outcome {
  return Outcome.refused(kind, new NoDocument());
}

function finiteOrRefusal(
  name: string,
  value: { readonly value: number } | null,
  kind: Kind,
): Outcome | null {
  return value !== null && !Number.isFinite(value.value)
    ? Outcome.refused(kind, new NonFiniteValue(name))
    : null;
}

export class Planner implements CommandContext {
  private readonly query: TreeQuery;

  public constructor(
    private readonly document: Document,
    private readonly editor: Editor,
  ) {
    this.query = new TreeQuery(document);
  }

  public execute(command: { execute(context: CommandContext): Outcome }): Outcome {
    return command.execute(this);
  }

  public create(command: CreateIntent): Outcome {
    return this.editor.create(command);
  }

  public delete(command: Delete): Outcome {
    return this.editor.delete(command);
  }

  public move(command: Move): Outcome {
    return this.editor.move(command);
  }

  public scale(command: ScaleBy): Outcome {
    return this.editor.scale(command);
  }

  public group(command: GroupNodes): Outcome {
    return this.editor.group(command);
  }

  public ungroup(command: Ungroup): Outcome {
    return this.editor.ungroup(command);
  }

  public addTo(command: AddTo): Outcome {
    return this.editor.addTo(command);
  }

  public front(command: Front): Outcome {
    return this.editor.front(command);
  }

  public back(command: Back): Outcome {
    return this.editor.back(command);
  }

  public setAttribute(command: AttributeCommand): Outcome {
    return this.editor.setAttribute(command);
  }

  public undo(): Outcome {
    return this.editor.undo();
  }

  public redo(): Outcome {
    return this.editor.redo();
  }

  public checkout(command: Checkout): Outcome {
    return this.editor.checkout(command);
  }

  public setCanvas(command: SetCanvas): Outcome {
    return this.editor.setCanvas(command);
  }

  public init(command: Init): Outcome {
    const kind = Kind.Context;
    const widthProblem = finiteOrRefusal("width", command.width, kind);
    if (widthProblem !== null) {
      return widthProblem;
    }
    const heightProblem = finiteOrRefusal("height", command.height, kind);
    if (heightProblem !== null) {
      return heightProblem;
    }
    if (command.width !== null && command.width.value <= 0) {
      return Outcome.refused(kind, new NonPositiveCanvas("width"));
    }
    if (command.height !== null && command.height.value <= 0) {
      return Outcome.refused(kind, new NonPositiveCanvas("height"));
    }
    this.document.reset(
      command.width ?? undefined,
      command.height ?? undefined,
    );
    this.editor.forgetHistory();
    const root = this.document.node(this.document.root());
    if (!(root instanceof Svg)) {
      return Outcome.refused(kind, new InternalError());
    }
    return Outcome.happened(
      kind,
      new Initialized(root.width, root.height),
    );
  }

  public read(command: Read): Outcome {
    const status = this.document.open(command.path);
    if (!status.ok) {
      return Outcome.refused(
        Kind.Context,
        status.reason === "cannot-read-file"
          ? new CannotReadFile(status.path)
          : new InvalidSvg(status.detail ?? status.reason),
      );
    }
    this.editor.forgetHistory();
    return Outcome.happened(
      Kind.Context,
      new Opened(
        status.path,
        status.assignedIds.map(
          (assigned) =>
            new AssignedIdName(
              assigned.id,
              assigned.element,
              assigned.originalId,
            ),
        ),
        status.elements,
      ),
    );
  }

  public save(command: Save): Outcome {
    if (!this.document.hasDocument()) {
      return missingDocument(Kind.Context);
    }
    const status = this.document.save(command.path ?? undefined);
    if (!status.ok) {
      return Outcome.refused(
        Kind.Context,
        status.reason === "cannot-write-file"
          ? new CannotWriteFile(status.path)
          : status.reason === "missing-source-path"
            ? new MissingSourcePath()
            : new NoDocument(),
      );
    }
    this.editor.forgetHistory();
    return Outcome.happened(
      Kind.Context,
      new Saved(status.path, status.elements),
    );
  }

  public showTree(command: ShowTree): Outcome {
    if (!this.document.hasDocument()) {
      return missingDocument(Kind.View);
    }
    const id = command.node.resolve(this.document);
    if (id === undefined) {
      return Outcome.refused(Kind.View, new MissingShape(command.node));
    }
    const rows = this.query.subtree(id).map(
      (row) =>
        new TreeRow(
          row.depth,
          row.last,
          row.nodeId,
          row.node,
          row.text,
          row.transform,
        ),
    );
    return Outcome.viewed(Kind.View, new TreeView(rows));
  }

  public show(command: Show): Outcome {
    if (!this.document.hasDocument()) {
      return missingDocument(Kind.View);
    }
    const id = command.node.resolve(this.document);
    if (id === undefined) {
      return Outcome.refused(Kind.View, new MissingShape(command.node));
    }
    const shown = this.query.show(id);
    if (shown === undefined) {
      return Outcome.refused(Kind.View, new InternalError());
    }
    const parent =
      shown.parentId !== null && shown.parentNode instanceof ElementNode
        ? new NodeParent(shown.parentId, shown.parentNode)
        : null;
    return Outcome.viewed(
      Kind.View,
      new NodeView(
        shown.nodeId,
        shown.node,
        shown.text,
        shown.transform,
        parent,
      ),
    );
  }

  public showHistory(command: ShowHistory): Outcome {
    if (!this.document.hasDocument()) {
      return missingDocument(Kind.View);
    }
    return Outcome.viewed(
      Kind.View,
      this.editor.history(command.limit),
    );
  }

  public viewHistory(limit: number | null = null): HistoryView {
    return this.editor.history(limit);
  }

  public resolve(reference: NodeRef) {
    return reference.resolve(this.document);
  }

  public rootNode(): Node | undefined {
    return this.document.hasDocument()
      ? this.document.node(this.document.root())
      : undefined;
  }
}

