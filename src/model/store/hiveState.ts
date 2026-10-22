export type CommitId = number;
export type Vid = number;
export type DiffKind = "insert" | "update" | "remove";

export interface Diff {
  readonly commitId: CommitId;
  readonly vid: Vid;
  readonly kind: DiffKind;
}

export interface VersionRecord<T> {
  readonly createdAt: CommitId;
  removedAt: CommitId | null;
  readonly value: T;
}

export interface CommitRecord<T> {
  readonly id: CommitId;
  readonly parent: CommitId | null;
  readonly diffs: readonly Diff[];
  readonly touchedValues: ReadonlyMap<Vid, T | undefined>;
}

export interface HiveState<T> {
  valid: boolean;
  readonly rows: Map<Vid, VersionRecord<T>[]>;
  readonly commits: Map<CommitId, CommitRecord<T>>;
  order: CommitId[];
}

export function visibleVersion<T>(
  state: HiveState<T>,
  vid: Vid,
  commit: CommitId,
): VersionRecord<T> | undefined {
  const versions = state.rows.get(vid);
  if (versions === undefined) {
    return undefined;
  }
  for (let index = versions.length - 1; index >= 0; index -= 1) {
    const version = versions[index];
    if (version === undefined) {
      continue;
    }
    if (
      version.createdAt <= commit &&
      (version.removedAt === null || commit < version.removedAt)
    ) {
      return version;
    }
  }
  return undefined;
}

export function visibleValue<T>(
  state: HiveState<T>,
  vid: Vid,
  commit: CommitId,
): T | undefined {
  return visibleVersion(state, vid, commit)?.value;
}

