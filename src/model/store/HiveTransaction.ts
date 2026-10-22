import type { CommitId, Vid } from "./hiveState.js";
import type { Snapshot } from "./Snapshot.js";

export type StagedValue<T> =
  | { readonly kind: "value"; readonly value: T }
  | { readonly kind: "erase" };

export class HiveTransaction<T> {
  private readonly overlay = new Map<Vid, StagedValue<T>>();
  private active = true;
  private finished = false;

  public constructor(
    public readonly parent: Snapshot<T>,
    private readonly allocateId: () => Vid,
    private readonly commitAction: (
      transaction: HiveTransaction<T>,
      commitId?: CommitId,
    ) => Snapshot<T>,
    private readonly finishAction: () => void,
  ) {}

  public emplace(value: T): Vid {
    this.ensureActive();
    const id = this.allocateId();
    this.overlay.set(id, { kind: "value", value });
    return id;
  }

  public replace(vid: Vid, value: T): void {
    this.ensureActive();
    this.requireLive(vid);
    this.overlay.set(vid, { kind: "value", value });
  }

  public erase(vid: Vid): void {
    this.ensureActive();
    this.requireLive(vid);
    this.overlay.set(vid, { kind: "erase" });
  }

  public swap(left: Vid, right: Vid): void {
    this.ensureActive();
    const leftValue = this.requireLive(left);
    const rightValue = this.requireLive(right);
    if (left === right) {
      return;
    }
    this.overlay.set(left, { kind: "value", value: rightValue });
    this.overlay.set(right, { kind: "value", value: leftValue });
  }

  public at(vid: Vid): T {
    this.ensureActive();
    const value = this.find(vid);
    if (value === undefined) {
      throw new RangeError("virtual ID is not visible");
    }
    return value;
  }

  public find(vid: Vid): T | undefined {
    if (!this.active) {
      return undefined;
    }
    const staged = this.overlay.get(vid);
    if (staged !== undefined) {
      return staged.kind === "value" ? staged.value : undefined;
    }
    return this.parent.find(vid);
  }

  public commit(commitId?: CommitId): Snapshot<T> {
    this.ensureActive();
    return this.commitAction(this, commitId);
  }

  public rollback(): void {
    if (!this.active) {
      return;
    }
    this.active = false;
    this.finished = true;
    this.overlay.clear();
    this.finishAction();
  }

  public changes(): ReadonlyMap<Vid, StagedValue<T>> {
    return this.overlay;
  }

  public markCommitted(): void {
    this.active = false;
    this.finished = true;
    this.overlay.clear();
    this.finishAction();
  }

  private ensureActive(): void {
    if (!this.active) {
      throw new Error(
        this.finished
          ? "transaction is no longer active"
          : "transaction is not active",
      );
    }
  }

  private requireLive(vid: Vid): T {
    const value = this.find(vid);
    if (value === undefined) {
      throw new RangeError("virtual ID is not visible");
    }
    return value;
  }
}

