import { describe, expect, it } from "vitest";

import {
  Document,
  Group,
  ATTRIBUTES,
  AttributeCommand,
  Length,
  Rect,
  TreeQuery,
  parseColor,
} from "../src/index.js";

describe("protocol projections", () => {
  it("walks a subtree with depth and sibling-end information", () => {
    const document = new Document();
    document.reset();
    const root = document.root();
    const edit = document.transaction();
    const group = edit.appendChild(root, new Group());
    const shape = edit.appendChild(
      group,
      new Rect(
        new Length(1),
        new Length(2),
        new Length(3),
        new Length(4),
      ),
    );
    edit.commit();

    const rows = new TreeQuery(document).subtree();
    expect(rows.map((row) => [row.nodeId, row.depth, row.last])).toEqual([
      [root, 0, true],
      [group, 1, true],
      [shape, 2, true],
    ]);
    expect(new TreeQuery(document).show(shape)?.parentId).toBe(group);
  });

  it("applies typed attribute commands without mutating the source", () => {
    const shape = new Rect(
      new Length(0),
      new Length(0),
      new Length(10),
      new Length(10),
    );
    const xSpec = ATTRIBUTES["x"];
    expect(xSpec).toBeDefined();
    const moved =
      xSpec === undefined
        ? null
        : new AttributeCommand(xSpec, new Length(5)).applyTo(shape);
    expect(moved).toBeInstanceOf(Rect);
    expect(shape.x.value).toBe(0);
    if (moved instanceof Rect) {
      expect(moved.x.value).toBe(5);
    }

    const color = parseColor("red");
    expect(color).not.toBeNull();
    if (color !== null) {
      const fillSpec = ATTRIBUTES["fill"];
      const filled =
        fillSpec === undefined
          ? null
          : new AttributeCommand(fillSpec, color).applyTo(shape);
      expect(filled?.paint.fill?.toSvgText()).toBe("red");
    }
  });
});
