import { ContainerNode, ElementNode, PlainTextNode, Svg, TextNode } from "../node/index.js";
import type { Node } from "../node/index.js";
import type { IdentityAttr } from "../values/IdentityAttr.js";
import { Length } from "../values/Length.js";
import type { LengthPercentage } from "../values/LengthPercentage.js";
import { Transform } from "../values/Transform.js";
import { Hive } from "./Hive.js";
import type { HiveTransaction } from "./HiveTransaction.js";
import type { CommitId, DiffKind, Vid } from "./hiveState.js";
import type { Snapshot } from "./Snapshot.js";

export const NO_ID = -1;

export type TouchedKind = "insert" | "update" | "remove";

export interface TouchedNode {
  readonly node: Vid;
  readonly kind: TouchedKind;
}

export class NodeLinks {
  public constructor(
    public readonly parent: Vid | null = null,
    public readonly previous: Vid | null = null,
    public readonly next: Vid | null = null,
    public readonly firstChild: Vid | null = null,
    public readonly lastChild: Vid | null = null,
  ) {}

  public withParent(parent: Vid | null): NodeLinks {
    return new NodeLinks(
      parent,
      this.previous,
      this.next,
      this.firstChild,
      this.lastChild,
    );
  }

  public withSiblings(
    previous: Vid | null,
    next: Vid | null,
  ): NodeLinks {
    return new NodeLinks(
      this.parent,
      previous,
      next,
      this.firstChild,
      this.lastChild,
    );
  }

  public withChildren(
    firstChild: Vid | null,
    lastChild: Vid | null,
  ): NodeLinks {
    return new NodeLinks(
      this.parent,
      this.previous,
      this.next,
      firstChild,
      lastChild,
    );
  }
}

export class TreeRecord {
  public constructor(
    public readonly node: Node,
    public readonly links: NodeLinks,
  ) {}

  public withNode(node: Node): TreeRecord {
    return new TreeRecord(node, this.links);
  }

  public withLinks(links: NodeLinks): TreeRecord {
    return new TreeRecord(this.node, links);
  }
}

export type TreeEdit = HiveTransaction<TreeRecord>;

function isParentCapable(node: Node): boolean {
  return node instanceof ContainerNode || node instanceof TextNode;
}

export class TreeStore {
  private readonly hive = new Hive<TreeRecord>();
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
      new Svg(
        width ?? new Length(800),
        height ?? new Length(600),
      ),
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
  ): { readonly position: number; readonly touched: readonly TouchedNode[]; readonly noEffect: boolean } | undefined {
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
    return node instanceof ElementNode
      ? node.transformAttr.transform
      : Transform.identity();
  }

  public find(svgId: string): Vid | undefined {
    if (svgId === "" || !this.hasDocument()) {
      return undefined;
    }
    const pending = [this.rootId];
    while (pending.length > 0) {
      const id = pending.pop();
      if (id === undefined) {
        continue;
      }
      const node = this.node(id);
      if (node instanceof ElementNode && node.id === svgId) {
        return id;
      }
      pending.push(...this.children(id));
    }
    return undefined;
  }

  public elementCount(): number {
    if (!this.hasDocument()) {
      return 0;
    }
    let count = 0;
    const pending = [...this.children(this.rootId)];
    while (pending.length > 0) {
      const id = pending.pop();
      if (id === undefined) {
        continue;
      }
      if (this.node(id) instanceof ElementNode) {
        count += 1;
      }
      pending.push(...this.children(id));
    }
    return count;
  }

  public textContent(id: Vid): string {
    let content = "";
    const pending = [...this.children(id)].reverse();
    while (pending.length > 0) {
      const child = pending.pop();
      if (child === undefined) {
        continue;
      }
      const node = this.node(child);
      if (node instanceof PlainTextNode) {
        content += node.content;
      } else {
        pending.push(...[...this.children(child)].reverse());
      }
    }
    return content;
  }

  public directText(id: Vid): string {
    return this.children(id)
      .map((child) => this.node(child))
      .filter((node): node is PlainTextNode => node instanceof PlainTextNode)
      .map((node) => node.content)
      .join("");
  }

  public hasDocument(): boolean {
    return this.view !== undefined && this.rootId !== NO_ID && this.hasNode(this.rootId);
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
    this.requireParent(edit, parent);
    this.requireSibling(edit, parent, before);
    const parentRecord = this.requireStaged(edit, parent);
    const previous =
      before === null
        ? parentRecord.links.lastChild
        : this.requireStaged(edit, before).links.previous;
    const id = edit.emplace(
      new TreeRecord(node, new NodeLinks(parent, previous, before)),
    );
    if (previous !== null) {
      this.replaceLinks(edit, previous, (links) =>
        links.withSiblings(links.previous, id),
      );
    } else {
      this.replaceLinks(edit, parent, (links) =>
        links.withChildren(id, links.lastChild),
      );
    }
    if (before === null) {
      this.replaceLinks(edit, parent, (links) =>
        links.withChildren(links.firstChild, id),
      );
    } else {
      this.replaceLinks(edit, before, (links) =>
        links.withSiblings(id, links.next),
      );
    }
    return id;
  }

  public attachAt(
    edit: TreeEdit,
    parent: Vid,
    before: Vid | null,
    node: Vid,
  ): void {
    this.requireParent(edit, parent);
    this.requireSibling(edit, parent, before);
    if (node === this.rootId || node === parent) {
      throw new Error("TreeStore: the node cannot be moved there");
    }
    if (this.isDescendant(edit, parent, node)) {
      throw new Error("TreeStore: a node cannot move inside itself");
    }
    if (before === node) {
      throw new Error("TreeStore: a node cannot be placed before itself");
    }
    if (edit.find(node) === undefined) {
      throw new RangeError("TreeStore: no live node at this id");
    }

    this.detach(edit, node);
    const parentRecord = this.requireStaged(edit, parent);
    const previous =
      before === null
        ? parentRecord.links.lastChild
        : this.requireStaged(edit, before).links.previous;
    this.replaceLinks(edit, node, (links) =>
      links.withParent(parent).withSiblings(previous, before),
    );

    if (previous !== null) {
      this.replaceLinks(edit, previous, (links) =>
        links.withSiblings(links.previous, node),
      );
    } else {
      this.replaceLinks(edit, parent, (links) =>
        links.withChildren(node, links.lastChild),
      );
    }

    if (before !== null) {
      this.replaceLinks(edit, before, (links) =>
        links.withSiblings(node, links.next),
      );
    } else {
      this.replaceLinks(edit, parent, (links) =>
        links.withChildren(links.firstChild, node),
      );
    }
  }

  public update(edit: TreeEdit, id: Vid, payload: Node): void {
    const stored = this.requireStaged(edit, id);
    if (isParentCapable(stored.node) !== isParentCapable(payload)) {
      throw new Error(
        "TreeStore: an update cannot change whether a node holds children",
      );
    }
    edit.replace(id, stored.withNode(payload));
  }

  public eraseSubtree(edit: TreeEdit, node: Vid): void {
    if (node === this.rootId) {
      throw new Error("TreeStore: the root cannot be erased");
    }
    this.requireStaged(edit, node);
    this.detach(edit, node);
    const doomed: Vid[] = [];
    const pending = [node];
    while (pending.length > 0) {
      const id = pending.pop();
      if (id === undefined) {
        continue;
      }
      const current = this.requireStaged(edit, id);
      doomed.push(id);
      let child = current.links.firstChild;
      while (child !== null) {
        pending.push(child);
        child = this.requireStaged(edit, child).links.next;
      }
    }
    for (const id of doomed) {
      edit.erase(id);
    }
  }

  public replaceNodeLinks(
    edit: TreeEdit,
    id: Vid,
    replacement: NodeLinks,
  ): void {
    const record = this.requireStaged(edit, id);
    edit.replace(id, record.withLinks(replacement));
  }

  public identity(id: Vid): IdentityAttr | undefined {
    const node = this.node(id);
    return node instanceof ElementNode ? node.identity : undefined;
  }

  public renameNode(edit: TreeEdit, id: Vid, identity: IdentityAttr): void {
    const node = this.requireStaged(edit, id).node;
    if (!(node instanceof ElementNode)) {
      throw new Error("TreeStore: character data has no identity");
    }
    this.update(edit, id, node.withAttributes(
      identity,
      node.paint,
      node.transformAttr,
    ));
  }

  private detach(edit: TreeEdit, node: Vid): void {
    const links = this.requireStaged(edit, node).links;
    const parent = links.parent;
    if (parent === null) {
      throw new Error("TreeStore: this node is not linked under anything");
    }
    if (links.previous !== null) {
      this.replaceLinks(edit, links.previous, (current) =>
        current.withSiblings(current.previous, links.next),
      );
    } else {
      this.replaceLinks(edit, parent, (current) =>
        current.withChildren(links.next, current.lastChild),
      );
    }
    if (links.next !== null) {
      this.replaceLinks(edit, links.next, (current) =>
        current.withSiblings(links.previous, current.next),
      );
    } else {
      this.replaceLinks(edit, parent, (current) =>
        current.withChildren(current.firstChild, links.previous),
      );
    }
    this.replaceLinks(edit, node, (current) =>
      current.withParent(null).withSiblings(null, null),
    );
  }

  private isDescendant(edit: TreeEdit, candidate: Vid, ancestor: Vid): boolean {
    let current: Vid | null = candidate;
    while (current !== null) {
      if (current === ancestor) {
        return true;
      }
      current = edit.find(current)?.links.parent ?? null;
    }
    return false;
  }

  private requireParent(edit: TreeEdit, parent: Vid): void {
    const node = this.requireStaged(edit, parent).node;
    if (!isParentCapable(node)) {
      throw new Error("TreeStore: not a container");
    }
  }

  private requireSibling(
    edit: TreeEdit,
    parent: Vid,
    before: Vid | null,
  ): void {
    if (before === null) {
      return;
    }
    if (this.requireStaged(edit, before).links.parent !== parent) {
      throw new Error("TreeStore: the insertion anchor is not a child");
    }
  }

  private requireStaged(edit: TreeEdit, id: Vid): TreeRecord {
    const record = edit.find(id);
    if (record === undefined) {
      throw new RangeError("TreeStore: no live node at this id");
    }
    return record;
  }

  private replaceLinks(
    edit: TreeEdit,
    id: Vid,
    patch: (links: NodeLinks) => NodeLinks,
  ): void {
    const record = this.requireStaged(edit, id);
    const links = patch(record.links);
    edit.replace(id, record.withLinks(links));
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
