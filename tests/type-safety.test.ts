import { describe, expect, it } from "vitest";

import {
  Command,
  Document,
  EditEvent,
  Group,
  Hive,
  Length,
  Undone,
} from "../src/index.js";
import type { Editor, Rect, Refusal } from "../src/index.js";

type Equal<Left, Right> =
  [Left] extends [Right]
    ? [Right] extends [Left]
      ? true
      : false
    : false;
type Assert<Value extends true> = Value;

export type Exhaustive<Union extends string> = Record<Union, number>;
export type CompleteKind = Exhaustive<"insert" | "update" | "remove">;
// @ts-expect-error S1: the remove case is missing.
export type MissingKind = Assert<{ insert: number; update: number } extends Exhaustive<"insert" | "update" | "remove"> ? true : false>;

export enum HiveOnlyKind {
  Snapshot,
  Checkout,
}
export type CompleteEnum = Record<HiveOnlyKind, string>;
// @ts-expect-error S2: enum members are not interchangeable.
export type MissingEnum = Assert<{ [HiveOnlyKind.Snapshot]: string } extends Record<HiveOnlyKind, string> ? true : false>;

export function readonlyGuard(rect: Rect): void {
  // @ts-expect-error S3: geometry cannot be mutated in place.
  rect.x = new Length(2);
}

// @ts-expect-error S4: this concrete command has no execute handler.
export class MissingExecute extends Command {}

export function methodNameGuard(editor: Editor): unknown {
  // @ts-expect-error S5: the method is move, not mov.
  return editor.mov;
}

export type ExactHive = Assert<Equal<typeof Hive, typeof Hive>>;
export const exactHive: ExactHive = true;

export function refusalGuard(refusal: Refusal): unknown {
  // @ts-expect-error S8: refusal field names are closed and typed.
  return refusal.no_such_refusal;
}

describe("static and history invariants", () => {
  it("S6: undo and redo invert insert and remove diffs", () => {
    const hive = new Hive<number>();
    const edit = hive.beginTransaction();
    const id = edit.emplace(1);
    edit.commit();
    const remove = hive.beginTransaction();
    remove.erase(id);
    remove.commit();
    expect(hive.undo()).toBe(true);
    expect(hive.head().at(id)).toBe(1);
    expect(hive.redo()).toBe(true);
    expect(hive.head().contains(id)).toBe(false);
  });

  it("S7: a staged write does not alter the committed node", () => {
    const document = new Document();
    document.reset();
    const create = document.transaction();
    const group = create.appendChild(document.root(), new Group());
    create.commit();
    const before = document.node(group);
    const edit = document.transaction();
    edit.update(group, new Group());
    expect(document.node(group)).toBe(before);
    edit.rollback();
    expect(document.node(group)).toBe(before);
  });

  it("keeps edit events in the typed protocol hierarchy", () => {
    const event = new Undone(0, 1, null, 1);
    expect(event).toBeInstanceOf(EditEvent);
  });
});
