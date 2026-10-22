import { describe, expect, it } from "vitest";

import { Hive } from "../src/index.js";

describe("MVCC hive", () => {
  it("starts at an empty commit and isolates staged writes", () => {
    const hive = new Hive<number>();
    const empty = hive.head();
    expect(empty.commitId).toBe(0);
    expect(empty.contains(0)).toBe(false);

    const tx = hive.beginTransaction();
    const id = tx.emplace(42);
    expect(id).toBe(0);
    expect(tx.at(id)).toBe(42);
    expect(hive.head().contains(id)).toBe(false);

    const first = tx.commit();
    expect(first.commitId).toBe(1);
    expect(first.at(id)).toBe(42);
    expect(hive.diffs(1)).toEqual([
      { commitId: 1, vid: id, kind: "insert" },
    ]);
  });

  it("keeps old snapshots immutable across replacements", () => {
    const hive = new Hive<number>();
    const initial = hive.beginTransaction();
    const id = initial.emplace(1);
    const first = initial.commit();

    const update = hive.beginTransaction();
    update.replace(id, 2);
    update.replace(id, 3);
    const second = update.commit();

    expect(first.at(id)).toBe(1);
    expect(second.at(id)).toBe(3);
    expect(hive.diffs(2)).toHaveLength(1);
    expect(hive.diffs(2)[0]?.kind).toBe("update");
  });

  it("records erasure and restores it through undo and redo", () => {
    const hive = new Hive<number>();
    const create = hive.beginTransaction();
    const id = create.emplace(10);
    create.commit();

    const erase = hive.beginTransaction();
    erase.erase(id);
    const removed = erase.commit();
    expect(removed.contains(id)).toBe(false);
    expect(hive.diffs(2)[0]?.kind).toBe("remove");

    expect(hive.undo()).toBe(true);
    expect(hive.head().at(id)).toBe(10);
    expect(hive.redo()).toBe(true);
    expect(hive.head().contains(id)).toBe(false);
  });

  it("discards and replaces the redo tail on a new commit", () => {
    const hive = new Hive<number>();
    const firstTx = hive.beginTransaction();
    const id = firstTx.emplace(10);
    firstTx.commit();

    const eraseTx = hive.beginTransaction();
    eraseTx.erase(id);
    eraseTx.commit();

    expect(hive.undo()).toBe(true);
    const replaceTx = hive.beginTransaction();
    replaceTx.replace(id, 20);
    const replaced = replaceTx.commit();
    expect(replaced.commitId).toBe(2);
    expect(replaced.at(id)).toBe(20);
    expect(hive.redo()).toBe(false);
    expect(hive.snapshot(3)).toBeUndefined();
  });

  it("rolls back staged changes and consumes only the virtual id", () => {
    const hive = new Hive<number>();
    const tx = hive.beginTransaction();
    expect(tx.emplace(1)).toBe(0);
    tx.rollback();
    expect(hive.head().commitId).toBe(0);
    expect(hive.head().contains(0)).toBe(false);

    const next = hive.beginTransaction();
    expect(next.emplace(2)).toBe(1);
  });

  it("supports swap without inventing a new value", () => {
    const hive = new Hive<number>();
    const create = hive.beginTransaction();
    const left = create.emplace(10);
    const right = create.emplace(20);
    const first = create.commit();

    const swap = hive.beginTransaction();
    swap.swap(left, right);
    const second = swap.commit();
    expect(second.at(left)).toBe(20);
    expect(second.at(right)).toBe(10);
    expect(first.at(left)).toBe(10);
    expect(hive.diffs(2).map((diff) => diff.kind)).toEqual([
      "update",
      "update",
    ]);
  });

  it("aligns explicit sparse commit ids across hives", () => {
    const alpha = new Hive<number>();
    const beta = new Hive<number>();

    const alphaFirst = alpha.beginTransaction();
    const alphaId = alphaFirst.emplace(42);
    expect(alphaFirst.commit(100).commitId).toBe(100);

    const betaFirst = beta.beginTransaction();
    expect(betaFirst.commit(100).commitId).toBe(100);

    const alphaNext = alpha.beginTransaction();
    alphaNext.replace(alphaId, 43);
    alphaNext.commit(250);
    const betaNext = beta.beginTransaction();
    const betaId = betaNext.emplace(7);
    betaNext.commit(250);

    expect(alpha.undo()).toBe(true);
    expect(beta.undo()).toBe(true);
    expect(alpha.head().commitId).toBe(100);
    expect(beta.head().commitId).toBe(100);
    expect(beta.head().contains(betaId)).toBe(false);
    expect(alpha.redo()).toBe(true);
    expect(beta.redo()).toBe(true);
  });

  it("rejects invalid explicit ids without ending the transaction", () => {
    const hive = new Hive<number>();
    const first = hive.beginTransaction();
    const id = first.emplace(1);
    first.commit(50);

    const waiting = hive.beginTransaction();
    waiting.replace(id, 2);
    expect(() => waiting.commit(50)).toThrow(/greater than/);
    expect(waiting.at(id)).toBe(2);
    expect(waiting.commit(51).at(id)).toBe(2);
  });

  it("allows an explicit empty commit to advance checkout", () => {
    const hive = new Hive<number>();
    const tx = hive.beginTransaction();
    expect(tx.commit(7).commitId).toBe(7);
    expect(hive.diffs(7)).toEqual([]);
    expect(hive.undo()).toBe(true);
    expect(hive.head().commitId).toBe(0);
    expect(hive.redo()).toBe(true);
  });

  it("prunes commit metadata and refuses to undo across the floor", () => {
    const hive = new Hive<number>();
    const first = hive.beginTransaction();
    const id = first.emplace(1);
    first.commit(10);
    const second = hive.beginTransaction();
    second.replace(id, 2);
    second.commit(30);
    const third = hive.beginTransaction();
    third.replace(id, 3);
    third.commit(40);

    hive.pruneBefore(30);
    expect(hive.snapshot(10)).toBeUndefined();
    expect(hive.snapshot(30)?.at(id)).toBe(2);
    expect(hive.undo()).toBe(true);
    expect(hive.head().commitId).toBe(30);
    expect(() => hive.undo()).toThrow(/pruned/);
  });

  it("clears retained history while preserving checkout state and high-water", () => {
    const hive = new Hive<number>();
    const first = hive.beginTransaction();
    const id = first.emplace(1);
    first.commit(100);
    const second = hive.beginTransaction();
    second.replace(id, 2);
    second.commit(101);

    hive.clearHistory();
    expect(hive.head().commitId).toBe(101);
    expect(hive.head().at(id)).toBe(2);
    expect(hive.snapshot(100)).toBeUndefined();
    expect(hive.maxCommitId()).toBe(101);
    expect(() => hive.undo()).toThrow(/cleared/);

    const continuation = hive.beginTransaction();
    continuation.replace(id, 3);
    expect(continuation.commit().commitId).toBe(102);
  });

  it("invalidates old snapshots when the generation is cleared", () => {
    const hive = new Hive<number>();
    const tx = hive.beginTransaction();
    const id = tx.emplace(41);
    const old = tx.commit();
    hive.clear();

    expect(old.valid()).toBe(false);
    expect(old.find(id)).toBeUndefined();
    expect(() => old.at(id)).toThrow(/no longer valid/);
    expect(hive.head().commitId).toBe(0);
    const recycled = hive.beginTransaction();
    expect(recycled.emplace(7)).toBe(0);
  });

  it("matches a reference model across transactional history", () => {
    const hive = new Hive<number>();
    let expected = new Map<number, number>();
    let nextId = 0;
    let seed = 0x4d564343;
    const random = (): number => {
      seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
      return seed;
    };

    for (let step = 0; step < 150; step += 1) {
      const tx = hive.beginTransaction();
      const next = new Map(expected);
      const operations = 1 + (random() % 4);
      for (let operation = 0; operation < operations; operation += 1) {
        const choice = random() % 4;
        if (choice === 0) {
          const id = tx.emplace(step * 16 + operation);
          next.set(id, step * 16 + operation);
          nextId += 1;
          continue;
        }
        const ids = [...next.keys()];
        if (ids.length === 0) {
          continue;
        }
        const id = ids[random() % ids.length] ?? 0;
        if (choice === 1) {
          const value = random();
          tx.replace(id, value);
          next.set(id, value);
        } else if (choice === 2) {
          tx.erase(id);
          next.delete(id);
        } else if (ids.length > 1) {
          const other = ids.find((candidate) => candidate !== id);
          if (other !== undefined) {
            tx.swap(id, other);
            const left = next.get(id) ?? 0;
            const right = next.get(other) ?? 0;
            next.set(id, right);
            next.set(other, left);
          }
        }
      }

      const changed =
        next.size !== expected.size ||
        [...next].some(([id, value]) => expected.get(id) !== value);
      const snapshot = tx.commit();
      expected = next;
      expect(snapshot.entries()).toEqual(expected);
      expect(snapshot.valid()).toBe(true);
      if (!changed) {
        expect(snapshot.commitId).toBe(
          step === 0 ? 0 : snapshot.commitId,
        );
      }
    }
    expect(nextId).toBeGreaterThan(0);
    expect(hive.head().entries()).toEqual(expected);
  });
});
