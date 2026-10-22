import { readFileSync, writeFileSync } from "node:fs";

import type { AssignedId } from "../../io/SvgReader.js";
import { SvgReader, SvgReadError } from "../../io/SvgReader.js";
import { SvgLoader } from "../../io/Loader.js";
import { SvgSerializer } from "../../io/SvgSerializer.js";
import type { Node } from "../node/index.js";
import type {
  TouchedNode,
  TreeEdit,
} from "../store/TreeStore.js";
import { TreeStore } from "../store/TreeStore.js";
import type { CommitId, Vid } from "../store/hiveState.js";
import type { LengthPercentage } from "../values/LengthPercentage.js";
import type { Transform } from "../values/Transform.js";
import { DocumentInfo } from "./DocumentInfo.js";

export type OpenStatus =
  | {
      readonly ok: true;
      readonly path: string;
      readonly assignedIds: readonly AssignedId[];
      readonly elements: number;
    }
  | {
      readonly ok: false;
      readonly reason:
        | "cannot-read-file"
        | "malformed-xml"
        | "invalid-svg";
      readonly path: string;
      readonly detail?: string;
    };

export type SaveStatus =
  | { readonly ok: true; readonly path: string; readonly elements: number }
  | {
      readonly ok: false;
      readonly reason: "no-document" | "missing-source-path" | "cannot-write-file";
      readonly path: string;
    };

export class Document {
  private readonly store = new TreeStore();
  private info = new DocumentInfo();

  public root(): Vid {
    return this.store.root();
  }

  public hasDocument(): boolean {
    return this.store.hasDocument();
  }

  public node(id: Vid): Node | undefined {
    return this.store.node(id);
  }

  public hasNode(id: Vid): boolean {
    return this.store.hasNode(id);
  }

  public children(parent: Vid): readonly Vid[] {
    return this.store.children(parent);
  }

  public parent(node: Vid): Vid | undefined {
    return this.store.parent(node);
  }

  public find(id: string): Vid | undefined {
    return this.store.find(id);
  }

  public transform(id: Vid): Transform {
    return this.store.transform(id);
  }

  public elementCount(): number {
    return this.store.elementCount();
  }

  public textContent(id: Vid): string {
    return this.store.textContent(id);
  }

  public transaction(): DocumentTransaction {
    return new DocumentTransaction(this.store);
  }

  public canUndo(): boolean {
    return this.store.canUndo();
  }

  public canRedo(): boolean {
    return this.store.canRedo();
  }

  public undoBarredByIo(): boolean {
    return this.info.ioBarrier;
  }

  public undo(): readonly TouchedNode[] {
    return this.store.undo();
  }

  public redo(): readonly TouchedNode[] {
    return this.store.redo();
  }

  public depth(): number {
    return this.store.depth();
  }

  public position(): number {
    return this.store.historyPosition();
  }

  public commitId(): CommitId {
    return this.store.commitId();
  }

  public baselineCommit(): CommitId {
    return this.store.baselineCommit();
  }

  public commitAt(position: number): CommitId | undefined {
    return this.store.commitAt(position);
  }

  public checkout(commit: CommitId): ReturnType<TreeStore["checkout"]> {
    return this.store.checkout(commit);
  }

  public sourcePath(): string {
    return this.info.sourcePath;
  }

  public reset(
    width?: LengthPercentage,
    height?: LengthPercentage,
  ): void {
    this.store.reset(width, height);
    this.info = new DocumentInfo("", true);
  }

  public clearHistory(io = false): void {
    this.store.clearHistory();
    this.info = this.info.withIoBarrier(io);
  }

  public open(path: string): OpenStatus {
    let source: string;
    try {
      source = readFileSync(path, "utf8");
    } catch {
      return { ok: false, reason: "cannot-read-file", path };
    }

    let parsed;
    try {
      parsed = new SvgReader().read(source);
    } catch (error: unknown) {
      return {
        ok: false,
        reason:
          error instanceof SvgReadError
            ? "invalid-svg"
            : "malformed-xml",
        path,
        ...(error instanceof Error ? { detail: error.message } : {}),
      };
    }

    const loaded = new SvgLoader().load(this.store, parsed);
    this.info = new DocumentInfo(path, true);
    return {
      ok: true,
      path,
      assignedIds: loaded.assignedIds,
      elements: this.elementCount(),
    };
  }

  public save(path?: string): SaveStatus {
    if (!this.hasDocument()) {
      return { ok: false, reason: "no-document", path: path ?? "" };
    }
    const target = path ?? this.info.sourcePath;
    if (target === "") {
      return { ok: false, reason: "missing-source-path", path: "" };
    }
    let serialized: string;
    try {
      serialized = new SvgSerializer(this.store).render();
    } catch {
      return { ok: false, reason: "cannot-write-file", path: target };
    }
    try {
      writeFileSync(target, serialized, "utf8");
    } catch {
      return { ok: false, reason: "cannot-write-file", path: target };
    }
    this.clearHistory(true);
    return { ok: true, path: target, elements: this.elementCount() };
  }
}

export class DocumentTransaction {
  private readonly edit: TreeEdit;
  private closed = false;

  public constructor(private readonly store: TreeStore) {
    this.edit = store.begin();
  }

  public appendChild(parent: Vid, payload: Node): Vid {
    this.requireOpen();
    return this.store.appendChild(this.edit, parent, payload);
  }

  public attachLast(parent: Vid, node: Vid): void {
    this.requireOpen();
    this.store.attachLast(this.edit, parent, node);
  }

  public insertAt(parent: Vid, before: Vid | null, payload: Node): Vid {
    this.requireOpen();
    return this.store.insertAt(this.edit, parent, before, payload);
  }

  public attachAt(parent: Vid, before: Vid | null, node: Vid): void {
    this.requireOpen();
    this.store.attachAt(this.edit, parent, before, node);
  }

  public update(node: Vid, payload: Node): void {
    this.requireOpen();
    this.store.update(this.edit, node, payload);
  }

  public erase(node: Vid): void {
    this.requireOpen();
    this.store.eraseSubtree(this.edit, node);
  }

  public find(id: Vid): Node | undefined {
    return this.edit.find(id)?.node;
  }

  public commit(commit?: CommitId): void {
    if (this.closed) {
      return;
    }
    this.store.commit(this.edit, commit);
    this.closed = true;
  }

  public rollback(): void {
    if (this.closed) {
      return;
    }
    this.store.rollback(this.edit);
    this.closed = true;
  }

  private requireOpen(): void {
    if (this.closed) {
      throw new Error("Transaction: this edit is already closed");
    }
  }
}

