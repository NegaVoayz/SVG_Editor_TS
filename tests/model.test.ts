import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  Document,
  Group,
  Length,
  LengthUnit,
  PlainTextNode,
  Rect,
  Svg,
  SvgReader,
  SvgSerializer,
  TreeStore,
} from "../src/index.js";

function fixture(name: string): string {
  return join(import.meta.dirname, "fixtures", name);
}

describe("tree model", () => {
  it("creates an 800x600 root and groups edits into history blocks", () => {
    const document = new Document();
    expect(document.hasDocument()).toBe(false);
    document.reset();
    const root = document.root();
    const rootNode = document.node(root);
    expect(rootNode).toBeInstanceOf(Svg);
    expect(document.children(root)).toEqual([]);
    expect(document.undoBarredByIo()).toBe(true);

    const edit = document.transaction();
    const first = edit.appendChild(root, new Group());
    const second = edit.appendChild(root, new Group());
    edit.commit();
    expect(document.children(root)).toEqual([first, second]);
    expect(document.depth()).toBe(1);
    expect(document.position()).toBe(1);

    document.undo();
    expect(document.children(root)).toEqual([]);
    document.redo();
    expect(document.children(root)).toEqual([first, second]);
  });

  it("splices sibling links when moving and removing nodes", () => {
    const document = new Document();
    document.reset();
    const root = document.root();
    const edit = document.transaction();
    const first = edit.appendChild(root, new Group());
    const second = edit.appendChild(root, new Group());
    const third = edit.appendChild(root, new Group());
    edit.commit();

    const reorder = document.transaction();
    reorder.attachAt(root, first, third);
    reorder.commit();
    expect(document.children(root)).toEqual([third, first, second]);

    const remove = document.transaction();
    remove.erase(first);
    remove.commit();
    expect(document.children(root)).toEqual([third, second]);
    document.undo();
    expect(document.children(root)).toEqual([third, first, second]);
  });

  it("refuses structurally impossible moves without damaging the tree", () => {
    const document = new Document();
    document.reset();
    const root = document.root();
    const edit = document.transaction();
    const outer = edit.appendChild(root, new Group());
    const inner = edit.appendChild(outer, new Group());
    edit.commit();

    const bad = document.transaction();
    expect(() => {
      bad.attachLast(inner, outer);
    }).toThrow(/inside itself/);
    bad.rollback();
    expect(document.parent(outer)).toBe(root);
    expect(document.parent(inner)).toBe(outer);
  });
});

describe("SVG I/O", () => {
  it("loads every supported node kind and invents the missing ids", () => {
    const document = new Document();
    const status = document.open(fixture("load.svg"));
    expect(status.ok).toBe(true);
    if (!status.ok) {
      return;
    }
    expect(status.assignedIds.map((entry) => entry.id)).toEqual([
      "rect1",
      "circle1",
      "ellipse1",
      "line1",
      "defs1",
      "switch1",
      "text1",
    ]);
    expect(document.find("layer")).toBeDefined();
    expect(document.find("rect1")).toBeDefined();
    expect(document.find("text1")).toBeDefined();
    expect(document.elementCount()).toBe(12);
    expect(document.depth()).toBe(0);
  });

  it("preserves mixed text order through a round trip", () => {
    const document = new Document();
    expect(document.open(fixture("mixed-text.svg")).ok).toBe(true);
    const mixed = document.find("mixed");
    expect(mixed).toBeDefined();
    if (mixed === undefined) {
      return;
    }
    expect(document.textContent(mixed)).toBe("beforeinsideafter");

    const output = join(mkdtempSync(join(tmpdir(), "svg-editor-ts-")), "roundtrip.svg");
    const saved = document.save(output);
    expect(saved.ok).toBe(true);
    const reread = new Document();
    expect(reread.open(output).ok).toBe(true);
    const rereadText = reread.find("mixed");
    expect(rereadText).toBeDefined();
    if (rereadText !== undefined) {
      expect(reread.textContent(rereadText)).toBe("beforeinsideafter");
    }
  });

  it("renames the reserved root alias and avoids explicit-id collisions", () => {
    const document = new Document();
    const status = document.open(fixture("reserved-id.svg"));
    expect(status.ok).toBe(true);
    if (!status.ok) {
      return;
    }
    expect(status.assignedIds).toHaveLength(3);
    expect(status.assignedIds[0]?.id).toBe("rect2");
    expect(status.assignedIds[0]?.originalId).toBe("svg");
    expect(status.assignedIds[1]?.id).toBe("g1");
    expect(status.assignedIds[2]?.id).toBe("circle1");
    expect(document.find("svg")).toBeUndefined();
  });

  it("keeps partial canvas attributes optional", () => {
    const boxOnly = new Document();
    expect(boxOnly.open(fixture("viewbox-only.svg")).ok).toBe(true);
    const widthOnly = new Document();
    expect(widthOnly.open(fixture("width-only.svg")).ok).toBe(true);

    const view = boxOnly.node(boxOnly.root());
    expect(view).toBeInstanceOf(Svg);
    if (view instanceof Svg) {
      expect(view.width).toBeNull();
      expect(view.height).toBeNull();
      expect(view.viewBox?.toDisplayText()).toBe("0 0 100 50");
    }
    const partial = widthOnly.node(widthOnly.root());
    if (partial instanceof Svg) {
      expect(partial.width?.toDisplayText()).toBe("300");
      expect(partial.height).toBeNull();
    }
  });

  it("writes deterministic geometry and escapes text", () => {
    const store = new TreeStore();
    store.reset(new Length(100, LengthUnit.Px), new Length(50));
    const edit = store.begin();
    const id = store.appendChild(
      edit,
      store.root(),
      new Rect(
        new Length(1),
        new Length(2),
        new Length(3),
        new Length(4),
      ),
    );
    store.update(
      edit,
      id,
      new Rect(
        new Length(1),
        new Length(2),
        new Length(3),
        new Length(4),
      ),
    );
    store.commit(edit);
    const svg = new SvgSerializer(store).render();
    expect(svg).toContain(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100px" height="50">',
    );
    expect(svg).toContain(
      '<rect x="1" y="2" width="3" height="4"/>',
    );
    expect(new PlainTextNode("<&>").content).toBe("<&>");
  });

  it("rejects unsupported elements, attributes, and invalid ids", () => {
    const reader = new SvgReader();
    expect(() => reader.read("<svg><path/></svg>")).toThrow(/unsupported element/);
    expect(() =>
      reader.read('<svg><rect style="fill:red"/></svg>'),
    ).toThrow(/unsupported attribute/);
    expect(() =>
      reader.read('<svg><g id="same"/><rect id="same"/></svg>'),
    ).toThrow(/duplicate id/);
    expect(() => reader.read('<svg><g id="a b"/></svg>')).toThrow(/invalid XML id/);
  });
});
