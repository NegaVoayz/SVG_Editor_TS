import type { CommitId, HiveState, Vid } from "./hiveState.js";
import { visibleValue } from "./hiveState.js";

export class Snapshot<T> {
  public constructor(
    public readonly commitId: CommitId,
    private readonly state: HiveState<T>,
  ) {}

  public valid(): boolean {
    return this.state.valid;
  }

  public contains(vid: Vid): boolean {
    return this.valid() && this.find(vid) !== undefined;
  }

  public at(vid: Vid): T {
    if (!this.valid()) {
      throw new Error("snapshot is no longer valid");
    }
    const value = this.find(vid);
    if (value === undefined) {
      throw new RangeError("virtual ID is not visible");
    }
    return value;
  }

  public find(vid: Vid): T | undefined {
    return this.valid()
      ? visibleValue(this.state, vid, this.commitId)
      : undefined;
  }

  public forEach(callback: (vid: Vid, value: T) => void): void {
    if (!this.valid()) {
      return;
    }
    const ids = [...this.state.rows.keys()].sort((left, right) => left - right);
    for (const id of ids) {
      const value = this.find(id);
      if (value !== undefined) {
        callback(id, value);
      }
    }
  }

  public entries(): ReadonlyMap<Vid, T> {
    const result = new Map<Vid, T>();
    this.forEach((id, value) => {
      result.set(id, value);
    });
    return result;
  }
}

