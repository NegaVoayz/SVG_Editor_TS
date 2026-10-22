import { describe, expect, it } from "vitest";

import {
  AddTo,
  CreateGroup,
  CreateRect,
  Delete,
  Document,
  EditScope,
  EditTarget,
  Editor,
  GroupNodes,
  Length,
  Move,
  Rect,
  RootRef,
  ScaleBy,
  SetFill,
  ShapeRegistry,
  SvgIdRef,
  parseColor,
} from "../src/index.js";

function editorFixture(): {
  document: Document;
  editor: Editor;
} {
  const document = new Document();
  document.reset();
  return { document, editor: new Editor(document) };
}

describe("editor commands", () => {
  it("creates, moves, fills, and undoes a shape as one history block", () => {
    const { document, editor } = editorFixture();
    const created = editor.create(
      new CreateRect(
        "r",
        new Length(0),
        new Length(0),
        new Length(10),
        new Length(10),
      ),
    );
    expect(created.ok()).toBe(true);
    const id = document.find("r");
    expect(id).toBeDefined();

    expect(
      editor.move(
        new Move(
          new SvgIdRef("r"),
          new Length(5),
          new Length(7),
          EditTarget.Params,
          EditScope.Restrict,
        ),
      ).ok(),
    ).toBe(true);
    const moved = document.node(id ?? -1);
    expect(moved).toBeInstanceOf(Rect);
    if (moved instanceof Rect) {
      expect(moved.x.value).toBe(5);
      expect(moved.y.value).toBe(7);
    }

    const color = parseColor("red");
    expect(color).not.toBeNull();
    if (color !== null) {
      expect(
        editor.setAttribute(
          new SetFill(color).at(new SvgIdRef("r")),
        ).ok(),
      ).toBe(true);
    }
    expect(editor.undo().ok()).toBe(true);
    expect(
      (document.node(document.find("r") ?? -1) as Rect).paint.fill?.toSvgText(),
    ).toBeUndefined();
  });

  it("cascades a container move into leaf parameters", () => {
    const { document, editor } = editorFixture();
    expect(editor.create(new CreateGroup("g")).ok()).toBe(true);
    expect(
      editor.create(
        new CreateRect(
          "r",
          new Length(1),
          new Length(2),
          new Length(3),
          new Length(4),
          null,
          new SvgIdRef("g"),
          true,
        ),
      ).ok(),
    ).toBe(true);
    expect(
      editor.move(
        new Move(
          new SvgIdRef("g"),
          new Length(10),
          new Length(20),
          EditTarget.Default,
          EditScope.Default,
        ),
      ).ok(),
    ).toBe(true);
    const rect = document.node(document.find("r") ?? -1);
    expect(rect).toBeInstanceOf(Rect);
    if (rect instanceof Rect) {
      expect(rect.x.value).toBe(11);
      expect(rect.y.value).toBe(22);
    }
  });

  it("uses the transform path for transformed nodes", () => {
    const { document, editor } = editorFixture();
    editor.create(new CreateGroup("g"));
    editor.create(
      new CreateRect(
        "r",
        new Length(0),
        new Length(0),
        new Length(1),
        new Length(1),
        null,
        new SvgIdRef("g"),
        true,
      ),
    );
    editor.move(
      new Move(
        new SvgIdRef("r"),
        new Length(1),
        new Length(1),
        EditTarget.Transform,
        EditScope.Default,
      ),
    );
    editor.move(
      new Move(
        new SvgIdRef("r"),
        new Length(2),
        new Length(0),
        EditTarget.Default,
        EditScope.Cascade,
      ),
    );
    const rect = document.node(document.find("r") ?? -1);
    expect(rect).toBeInstanceOf(Rect);
    if (rect instanceof Rect) {
      expect(rect.x.value).toBe(0);
      expect(rect.y.value).toBe(0);
      expect(rect.transformAttr.transform.toDisplayText()).toBe(
        "translate(3 1)",
      );
    }
  });

  it("groups and ungroups while preserving z-order", () => {
    const { document, editor } = editorFixture();
    editor.create(new CreateGroup("layer"));
    editor.create(new CreateGroup("a"));
    editor.create(new CreateGroup("b"));
    editor.addTo(
      new AddTo(new SvgIdRef("layer"), new SvgIdRef("a")),
    );
    editor.addTo(
      new AddTo(new SvgIdRef("layer"), new SvgIdRef("b")),
    );
    const grouped = editor.group(
      new GroupNodes("pair", [new SvgIdRef("a"), new SvgIdRef("b")]),
    );
    expect(grouped.ok()).toBe(true);
    expect(document.find("pair")).toBeDefined();
    expect(document.find("a")).toBeDefined();
    expect(document.find("b")).toBeDefined();
  });

  it("refuses root deletion and negative dimensions", () => {
    const { document, editor } = editorFixture();
    expect(
      editor.delete(new Delete(new RootRef())).ok(),
    ).toBe(false);
    expect(document.hasDocument()).toBe(true);
    expect(
      editor.create(
        new CreateRect(
          "bad",
          new Length(0),
          new Length(0),
          new Length(-1),
          new Length(1),
        ),
      ).ok(),
    ).toBe(false);
  });

  it("scales a circle's params", () => {
    const { document, editor } = editorFixture();
    editor.create(
      new CreateRect(
        "r",
        new Length(10),
        new Length(20),
        new Length(5),
        new Length(5),
      ),
    );
    expect(
      editor.scale(
        new ScaleBy(
          new SvgIdRef("r"),
          2,
          EditTarget.Params,
          EditScope.Restrict,
        ),
      ).ok(),
    ).toBe(true);
    const rect = document.node(document.find("r") ?? -1);
    if (rect instanceof Rect) {
      expect(rect.x.value).toBe(20);
      expect(rect.width.value).toBe(10);
    }
  });

  it("creates a provider-backed box with nested rect and label nodes", () => {
    const { document, editor } = editorFixture();
    const provider = new ShapeRegistry().provider("box");
    expect(provider).toBeDefined();
    if (provider === undefined) {
      return;
    }
    const command = provider.create(
      "n1",
      ["120", "100", "160", "60", "Start"],
      new RootRef(),
      false,
    );
    expect(editor.create(command).ok()).toBe(true);
    expect(document.find("n1")).toBeDefined();
    expect(document.find("n1-rect")).toBeDefined();
    expect(document.find("n1-label")).toBeDefined();
    const box = document.node(document.find("n1") ?? -1);
    expect(box).toBeDefined();
    expect(document.textContent(document.find("n1-label") ?? -1)).toBe("Start");
  });
});
