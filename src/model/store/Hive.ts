import { HiveTransaction } from "./HiveTransaction.js";
import type { StagedValue } from "./HiveTransaction.js";
import type {
  CommitId,
  CommitRecord,
  Diff,
  DiffKind,
  HiveState,
  VersionRecord,
  Vid,
} from "./hiveState.js";
import { visibleVersion } from "./hiveState.js";
import { Snapshot } from "./Snapshot.js";

const EMPTY_COMMIT = 0;

function freshState<T>(): HiveState<T> {
  return {
    valid: true,
    rows: new Map(),
    commits: new Map(),
    order: [],
  };
}

export class Hive<T> {
  private state = freshState<T>();
  private checkoutCommit: CommitId = EMPTY_COMMIT;
  private nextVid: Vid = 0;
  private highWaterCommit: CommitId = EMPTY_COMMIT;
  private writerActive = false;
  private historyFloorCleared = false;

  public head(): Snapshot<T> {
    return new Snapshot(this.checkoutCommit, this.state);
  }

  public maxCommitId(): CommitId {
    return this.highWaterCommit;
  }

  public snapshot(commit: CommitId): Snapshot<T> | undefined {
    if (
      commit !== EMPTY_COMMIT &&
      !this.state.commits.has(commit)
    ) {
      return undefined;
    }
    return new Snapshot(commit, this.state);
  }

  public beginTransaction(atCommit?: CommitId): HiveTransaction<T> {
    if (this.writerActive) {
      throw new Error("only one write transaction may be active");
    }
    if (atCommit !== undefined && atCommit !== this.checkoutCommit) {
      throw new Error("writable transactions must start at the current checkout");
    }
    if (atCommit !== undefined && this.snapshot(atCommit) === undefined) {
      throw new RangeError("commit is not available");
    }
    this.writerActive = true;
    const parent = this.head();
    const transaction = new HiveTransaction<T>(
      parent,
      () => {
        const id = this.nextVid;
        this.nextVid += 1;
        return id;
      },
      (active, commitId) => this.commitTransaction(active, commitId),
      () => {
        this.writerActive = false;
      },
    );
    return transaction;
  }

  public undo(): boolean {
    if (this.checkoutCommit === EMPTY_COMMIT) {
      return false;
    }
    const current = this.state.commits.get(this.checkoutCommit);
    if (current === undefined) {
      throw new Error("undo checkout is not retained");
    }
    if (current.parent === null) {
      if (this.historyFloorCleared) {
        throw new Error("undo history has been cleared");
      }
      throw new Error("undo history has been pruned");
    }
    if (
      current.parent !== EMPTY_COMMIT &&
      !this.state.commits.has(current.parent)
    ) {
      throw new Error("undo history has been pruned");
    }
    this.checkoutCommit = current.parent;
    return true;
  }

  public redo(): boolean {
    const index = this.state.order.indexOf(this.checkoutCommit);
    const nextIndex = index + 1;
    const next = this.state.order[nextIndex];
    if (next === undefined) {
      return false;
    }
    this.checkoutCommit = next;
    return true;
  }

  public checkout(commit: CommitId): boolean {
    if (this.snapshot(commit) === undefined) {
      return false;
    }
    const changed = this.checkoutCommit !== commit;
    this.checkoutCommit = commit;
    return changed;
  }

  public diffs(commit: CommitId): readonly Diff[] {
    return this.state.commits.get(commit)?.diffs ?? [];
  }

  public diff(index: number): Diff | undefined {
    let remaining = index;
    for (const id of this.state.order) {
      const diffs = this.diffs(id);
      if (remaining < diffs.length) {
        return diffs[remaining];
      }
      remaining -= diffs.length;
    }
    return undefined;
  }

  public diffCount(): number {
    return this.state.order.reduce(
      (count, id) => count + this.diffs(id).length,
      0,
    );
  }

  public pruneBefore(firstRetained: CommitId): void {
    if (this.state.order.length === 0) {
      return;
    }
    if (firstRetained > this.checkoutCommit) {
      throw new RangeError("first retained commit is beyond the checkout");
    }
    const ids = [...this.state.order];
    for (const id of ids) {
      if (id < firstRetained) {
        this.state.commits.delete(id);
      }
    }
    this.state.order = this.state.order.filter((id) => id >= firstRetained);
    this.historyFloorCleared = false;
  }

  public clearHistory(): void {
    if (this.state.order.length === 0) {
      return;
    }
    const current = this.state.commits.get(this.checkoutCommit);
    if (current === undefined) {
      return;
    }
    this.state.commits.clear();
    this.state.commits.set(this.checkoutCommit, {
      id: current.id,
      parent: null,
      diffs: [],
      touchedValues: current.touchedValues,
    });
    this.state.order = [this.checkoutCommit];
    this.historyFloorCleared = true;
  }

  public clear(): void {
    this.state.valid = false;
    this.state = freshState<T>();
    this.checkoutCommit = EMPTY_COMMIT;
    this.nextVid = 0;
    this.writerActive = false;
    this.historyFloorCleared = false;
  }

  public resetEmpty(): Snapshot<T> {
    this.clear();
    return this.head();
  }

  private commitTransaction(
    transaction: HiveTransaction<T>,
    commitId?: CommitId,
  ): Snapshot<T> {
    const parentCommit = transaction.parent.commitId;
    return this.publish(transaction, parentCommit, commitId);
  }

  private publish(
    transaction: HiveTransaction<T>,
    parentCommit: CommitId,
    requested: CommitId | undefined,
  ): Snapshot<T> {
    const changes = transaction.changes();
    const effective = [...changes.entries()].filter(([vid, staged]) => {
      const previous = transaction.parent.find(vid);
      return !sameStaged(previous, staged);
    });
    if (requested !== undefined && requested <= this.highWaterCommit) {
      throw new RangeError("commit ID must be greater than the maximum issued ID");
    }
    if (requested !== undefined && requested <= 0) {
      throw new RangeError("commit ID must be positive");
    }
    const explicit = requested !== undefined;
    const commitId = explicit
      ? requested
      : parentCommit === Number.MAX_SAFE_INTEGER
        ? (() => {
            throw new RangeError("commit ID space exhausted");
          })()
        : parentCommit + 1;

    if (effective.length === 0 && requested === undefined) {
      const unchanged = transaction.parent;
      transaction.markCommitted();
      return unchanged;
    }

    if (this.state.order.length > 0 && parentCommit !== this.tipCommit()) {
      this.truncateAfter(parentCommit);
    }

    const touchedValues = new Map<Vid, T | undefined>();
    const diffs: Diff[] = [];
    for (const [vid, staged] of effective) {
      const previous = transaction.parent.find(vid);
      const current = staged.kind === "value" ? staged.value : undefined;
      let kind: DiffKind;
      if (previous === undefined) {
        kind = "insert";
      } else if (current === undefined) {
        kind = "remove";
      } else {
        kind = "update";
      }
      diffs.push({ commitId, vid, kind });
      touchedValues.set(vid, current);
      this.applyChange(vid, previous, current, commitId);
    }

    const record: CommitRecord<T> = {
      id: commitId,
      parent: parentCommit,
      diffs,
      touchedValues,
    };
    this.state.commits.set(commitId, record);
    this.state.order.push(commitId);
    this.checkoutCommit = commitId;
    this.highWaterCommit = Math.max(this.highWaterCommit, commitId);
    this.historyFloorCleared = false;
    transaction.markCommitted();
    return new Snapshot(commitId, this.state);
  }

  private applyChange(
    vid: Vid,
    previous: T | undefined,
    current: T | undefined,
    commit: CommitId,
  ): void {
    const versions = this.state.rows.get(vid) ?? [];
    if (previous !== undefined) {
      const visible = visibleVersion(
        this.state,
        vid,
        this.checkoutCommit,
      );
      if (visible !== undefined) {
        visible.removedAt = commit;
      }
    }
    if (current !== undefined) {
      const version: VersionRecord<T> = {
        createdAt: commit,
        removedAt: null,
        value: current,
      };
      versions.push(version);
      this.state.rows.set(vid, versions);
    }
  }

  private truncateAfter(parentCommit: CommitId): void {
    const retained = this.state.order.filter((id) => id <= parentCommit);
    const removed = this.state.order.filter((id) => id > parentCommit);
    for (const commit of removed) {
      const record = this.state.commits.get(commit);
      if (record === undefined) {
        continue;
      }
      for (const vid of record.touchedValues.keys()) {
        const versions = this.state.rows.get(vid) ?? [];
        const kept = versions.filter((version) => version.createdAt < commit);
        for (const version of kept) {
          if (version.removedAt === commit) {
            version.removedAt = null;
          }
        }
        if (kept.length === 0) {
          this.state.rows.delete(vid);
        } else {
          this.state.rows.set(vid, kept);
        }
      }
      this.state.commits.delete(commit);
    }
    this.state.order = retained;
  }

  private tipCommit(): CommitId {
    return this.state.order.at(-1) ?? EMPTY_COMMIT;
  }
}

function sameStaged<T>(previous: T | undefined, staged: StagedValue<T>): boolean {
  return staged.kind === "value"
    ? previous !== undefined && Object.is(previous, staged.value)
    : previous === undefined;
}

