import {
  isElementNode,
  Svg,
  type Node,
} from "../node/index.js";
import type { IdentityAttr } from "../values/IdentityAttr.js";
import { Length } from "../values/Length.js";
import type { LengthPercentage } from "../values/LengthPercentage.js";
import { Transform } from "../values/Transform.js";
import { Hive } from "./Hive.js";
import type { CommitId, DiffKind, Vid } from "./hiveState.js";
import type { Snapshot } from "./Snapshot.js";
import { TreeIndex, type TreeReadView } from "./TreeIndex.js";
import {
  NodeLinks,
  TreeRecord,
  TreeStructure,
  type TreeEdit,
} from "./TreeLinks.js";
import { TreeText } from "./TreeText.js";

export const NO_ID = -1;

export type TouchedKind = "insert" | "update" | "remove";

export interface TouchedNode {
  readonly node: Vid;
  readonly kind: TouchedKind;
}

export class TreeStore implements TreeReadView {
  private readonly hive = new Hive<TreeRecord>();
  private readonly structure = new TreeStructure();
  private readonly index = new TreeIndex();
  private readonly text = new TreeText();
  private view: Snapshot<TreeRecord> | undefined;
  private rootId: Vid = NO_ID;
  private readonly checkouts: CommitId[] = [];
  private position = 0;
  private contextHighWater: CommitId = 0;

  public reset(
    width?: LengthPercentage,
    height?: LengthPercentage,
  ): void {
    this.view = undefined;
    this.hive.clear();
    this.checkouts.length = 0;
    this.position = 0;
    this.rootId = NO_ID;
    const edit = this.beginLoad();
    this.rootId = this.createRoot(
      edit,
      new Svg(width ?? new Length(800), height ?? new Length(600)),
    );
    this.commit(edit);
    this.clearHistory();
  }

  public resetEmpty(): void {
    this.view = undefined;
    this.hive.clear();
    this.checkouts.length = 0;
    this.position = 0;
    this.rootId = NO_ID;
  }

  public begin(): TreeEdit {
    if (this.view === undefined) {
      throw new Error("TreeStore: no document");
    }
    return this.hive.beginTransaction();
  }

  public beginLoad(): TreeEdit {
    return this.hive.beginTransaction();
  }

  public commit(edit: TreeEdit, commitId?: CommitId): void {
    const before = this.view?.commitId ?? 0;
    const contextCommit =
      commitId ??
      (this.view === undefined && this.checkouts.length === 0
        ? this.contextHighWater + 1
        : undefined);
    this.view = edit.commit(contextCommit);
    const after = this.view.commitId;
    this.contextHighWater = Math.max(this.contextHighWater, after);
    if (after === before) {
      return;
    }
    if (this.checkouts.length === 0) {
      this.checkouts.push(after);
      this.position = 0;
      return;
    }
    this.checkouts.length = this.position + 1;
    this.checkouts.push(after);
    this.position = this.checkouts.length - 1;
  }

  public rollback(edit: TreeEdit): void {
    edit.rollback();
  }

  public canUndo(): boolean {
    return this.position > 0;
  }

  public canRedo(): boolean {
    return this.position + 1 < this.checkouts.length;
  }

  public undo(): readonly TouchedNode[] {
    if (!this.canUndo() || this.view === undefined) {
      return [];
    }
    const leaving = this.view.commitId;
    this.hive.undo();
    this.position -= 1;
    this.view = this.hive.head();
    return this.touchedBy(leaving, "undo");
  }

  public redo(): readonly TouchedNode[] {
    if (!this.canRedo()) {
      return [];
    }
    this.hive.redo();
    this.position += 1;
    this.view = this.hive.head();
    return this.touchedBy(this.view.commitId, "redo");
  }

  public depth(): number {
    return this.checkouts.length === 0 ? 0 : this.checkouts.length - 1;
  }

  public historyPosition(): number {
    return this.position;
  }

  public commitId(): CommitId {
    return this.view?.commitId ?? 0;
  }

  public baselineCommit(): CommitId {
    return this.checkouts[0] ?? 0;
  }

  public commitAt(position: number): CommitId | undefined {
    return position >= 0 ? this.checkouts[position + 1] : undefined;
  }

  public checkout(
    commit: CommitId,
  ):
    | {
        readonly position: number;
        readonly touched: readonly TouchedNode[];
        readonly noEffect: boolean;
      }
    | undefined {
    const target = this.checkouts.indexOf(commit);
    if (target < 0 || this.view === undefined) {
      return undefined;
    }
    if (target === this.position) {
      return { position: this.position, touched: [], noEffect: true };
    }
    const touched = new Map<Vid, TouchedKind>();
    while (this.position > target) {
      const leaving = this.view.commitId;
      this.hive.undo();
      this.position -= 1;
      this.view = this.hive.head();
      for (const step of this.touchedBy(leaving, "undo")) {
        touched.set(step.node, step.kind);
      }
    }
    while (this.position < target) {
      this.hive.redo();
      this.position += 1;
      this.view = this.hive.head();
      for (const step of this.touchedBy(this.view.commitId, "redo")) {
        touched.set(step.node, step.kind);
      }
    }
    return {
      position: this.position,
      touched: [...touched].map(([node, kind]) => ({ node, kind })),
      noEffect: false,
    };
  }

  public clearHistory(): void {
    if (this.view === undefined) {
      return;
    }
    const current = this.checkouts[this.position] ?? this.view.commitId;
    this.hive.clearHistory();
    this.checkouts.length = 0;
    this.checkouts.push(current);
    this.position = 0;
    this.view = this.hive.head();
  }

  public root(): Vid {
    return this.rootId;
  }

  public hasNode(id: Vid): boolean {
    return this.record(id) !== undefined;
  }

  public record(id: Vid): TreeRecord | undefined {
    return this.view?.find(id);
  }

  public node(id: Vid): Node | undefined {
    return this.record(id)?.node;
  }

  public parent(id: Vid): Vid | undefined {
    return this.record(id)?.links.parent ?? undefined;
  }

  public children(parent: Vid): readonly Vid[] {
    const result: Vid[] = [];
    let child = this.record(parent)?.links.firstChild ?? null;
    while (child !== null) {
      result.push(child);
      child = this.record(child)?.links.next ?? null;
    }
    return result;
  }

  public transform(id: Vid): Transform {
    const node = this.node(id);
    return node !== undefined && isElementNode(node)
      ? node.transformAttr.transform
      : Transform.identity();
  }

  public find(svgId: string): Vid | undefined {
    return this.hasDocument()
      ? this.index.find(this, this.rootId, svgId)
      : undefined;
  }

  public elementCount(): number {
    return this.hasDocument()
      ? this.index.elementCount(this, this.rootId)
      : 0;
  }

  public textContent(id: Vid): string {
    return this.text.content(this, id);
  }

  public directText(id: Vid): string {
    return this.text.direct(this, id);
  }

  public hasDocument(): boolean {
    return (
      this.view !== undefined &&
      this.rootId !== NO_ID &&
      this.hasNode(this.rootId)
    );
  }

  public createRoot(edit: TreeEdit, node: Node): Vid {
    if (this.rootId !== NO_ID && edit.find(this.rootId) !== undefined) {
      throw new Error("TreeStore: document already has a root");
    }
    const id = edit.emplace(new TreeRecord(node, new NodeLinks()));
    this.rootId = id;
    return id;
  }

  public appendChild(edit: TreeEdit, parent: Vid, node: Node): Vid {
    return this.insertAt(edit, parent, null, node);
  }

  public attachLast(edit: TreeEdit, parent: Vid, node: Vid): void {
    this.attachAt(edit, parent, null, node);
  }

  public insertAt(
    edit: TreeEdit,
    parent: Vid,
    before: Vid | null,
    node: Node,
  ): Vid {
    return this.structure.insertAt(edit, parent, before, node);
  }

  public attachAt(
    edit: TreeEdit,
    parent: Vid,
    before: Vid | null,
    node: Vid,
  ): void {
    this.structure.attachAt(edit, this.rootId, parent, before, node);
  }

  public update(edit: TreeEdit, id: Vid, payload: Node): void {
    this.structure.update(edit, id, payload);
  }

  public eraseSubtree(edit: TreeEdit, node: Vid): void {
    this.structure.eraseSubtree(edit, this.rootId, node);
  }

  public replaceNodeLinks(
    edit: TreeEdit,
    id: Vid,
    replacement: NodeLinks,
  ): void {
    const record = this.record(id);
    if (record === undefined) {
      throw new RangeError("TreeStore: no live node at this id");
    }
    edit.replace(id, record.withLinks(replacement));
  }

  public identity(id: Vid): IdentityAttr | undefined {
    const node = this.node(id);
    return node !== undefined && isElementNode(node)
      ? node.identity
      : undefined;
  }

  public renameNode(
    edit: TreeEdit,
    id: Vid,
    identity: IdentityAttr,
  ): void {
    this.structure.renameNode(edit, id, identity);
  }

  private touchedBy(
    commit: CommitId,
    direction: "undo" | "redo",
  ): readonly TouchedNode[] {
    return this.hive.diffs(commit).map((diff) => ({
      node: diff.vid,
      kind: this.touchedKind(diff.kind, direction),
    }));
  }

  private touchedKind(
    kind: DiffKind,
    direction: "undo" | "redo",
  ): TouchedKind {
    if (direction === "redo") {
      return kind;
    }
    return kind === "insert"
      ? "remove"
      : kind === "remove"
        ? "insert"
        : "update";
  }
}

