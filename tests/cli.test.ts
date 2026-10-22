import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { Session } from "../src/index.js";

function fixture(name: string): string {
  return join(import.meta.dirname, "fixtures", name);
}

function run(instructions: string): string {
  return new Session().run(instructions).output;
}

describe("CLI behaviour", () => {
  it("starts without a document", () => {
    expect(run("tree")).toContain(
      "error: no document. use 'init' or 'read' first",
    );
  });

  it("creates the default canvas and prints the tree", () => {
    const output = run("init; tree");
    expect(output).toContain("canvas 800x600 created");
    expect(output).toContain("svg (800 x 600 user units)");
  });

  it("creates a nested rectangle and moves its params", () => {
    const output = run(
      "init; create g layer; create rect box 0 0 10 10 #ff0000; addto layer box; move box 5 5 params restrict; tree",
    );
    expect(output).toContain(
      "rect#box moved by (5, 5)",
    );
    expect(output).toContain(
      "x=5 y=5 w=10 h=10 fill=#ff0000",
    );
  });

  it("moves a leaf transform", () => {
    expect(
      run("init; create rect r 0 0 10 10; move r 5 0 transform; show r"),
    ).toContain("transform=translate(5 0)");
  });

  it("cascades a group move into text coordinates", () => {
    const output = run(
      'init; create g g1; create text t 5 6 "hi" in g1; move g1 2 3; tree',
    );
    expect(output).toContain("(7,9) text=\"hi\"");
  });

  it("scales a group's descendants", () => {
    expect(
      run(
        "init; create g g1; create rect r 0 0 10 10 in g1; scale g1 2; tree",
      ),
    ).toContain("x=0 y=0 w=20 h=20");
  });

  it("reports a circular scale", () => {
    expect(
      run(
        "init; create circle c1 10 10 5; scale c1 2 params restrict",
      ),
    ).toContain("circle#c1 scaled by 2");
  });

  it("refuses moving an empty container", () => {
    expect(run("init; create g g1; move g1 1 1 restrict")).toContain(
      "error: cannot move or scale an empty group",
    );
  });

  it("uses a transformed node as a coordinate boundary", () => {
    const output = run(
      'init; create g gR; create rect a 0 0 10 10 in gR; set gR transform "rotate(90)"; move gR 10 0; show gR',
    );
    expect(output).toContain("translate(10 0) rotate(90)");
  });

  it("rejects a scope on a transform target", () => {
    expect(
      run(
        "init; create rect r 0 0 1 1; move r 1 1 transform cascade",
      ),
    ).toContain("error: transform does not take cascade or restrict");
  });

  it("shows a node parent", () => {
    expect(
      run(
        "init; create g markers; create circle c1 100 100 20 red in markers; show c1",
      ),
    ).toContain("circle#c1  parent=g#markers");
  });

  it("sets attributes in save order", () => {
    const output = run(
      'init; create rect r 1 2 3 4 red; set r class c; set r stroke blue; set r stroke-width 2; set r transform "translate(5 6)"; tree',
    );
    expect(output).toContain(
      "class=c x=1 y=2 w=3 h=4 fill=red stroke=blue stroke-width=2 transform=translate(5 6)",
    );
  });

  it("parses a rotate about a centre", () => {
    expect(
      run(
        'init; create rect box 0 0 10 10; set box transform "rotate(30 10 20)"; show box',
      ),
    ).toContain("transform=translate(11.339746 -2.320508) rotate(30)");
  });

  it("keeps a skew form stable", () => {
    expect(
      run(
        'init; create rect box 0 0 10 10; set box transform "skewY(15)"; show box',
      ),
    ).toContain("transform=skewY(15)");
  });

  it("refuses an attribute the node does not carry", () => {
    expect(
      run("init; create circle dot 1 1 1; set dot x 5"),
    ).toContain("error: unknown attribute: x");
  });

  it("stores text content as a child node", () => {
    const output = run(
      'init; create text title 20 40 "My Diagram"; set title text "My Diagram v2"; tree',
    );
    expect(output).toContain("text=\"My Diagram v2\"");
  });

  it("deletes a text leaf without claiming nested elements", () => {
    expect(
      run('init; create text title 0 0 "hello"; delete title'),
    ).toContain("text#title deleted");
  });

  it("counts only elements removed with a subtree", () => {
    expect(
      run(`read ${fixture("mixed-text.svg")}; delete mixed`),
    ).toContain("text#mixed deleted (1 element)");
  });

  it("reserves the root id", () => {
    expect(run("init; create g svg")).toContain(
      'error: id "svg" is reserved for the root',
    );
  });

  it("renames reserved ids while reading", () => {
    expect(run(`read ${fixture("reserved-id.svg")}`)).toContain(
      'warning: id "svg" is reserved for the root, renamed <rect> to rect2',
    );
  });

  it("reports duplicate group members", () => {
    expect(
      run("init; create rect a 0 0 1 1; group g a a"),
    ).toContain("error: duplicate node in group: a");
  });

  it("groups nodes and preserves order", () => {
    expect(
      run(
        "init; create rect a 0 0 1 1; create rect b 0 0 1 1; group gg a b",
      ),
    ).toContain("g#gg created (2 elements)");
  });

  it("ungroups inside its old parent", () => {
    expect(
      run(
        "init; create g layer; create rect a 0 0 1 1 in layer; create rect b 0 0 1 1 in layer; group gg a b; ungroup gg",
      ),
    ).toContain("g#gg ungrouped into g#layer (2 elements)");
  });

  it("refuses adding a container to its descendant", () => {
    expect(
      run(
        "init; create g layer; create g inner in layer; addto inner layer",
      ),
    ).toContain(
      "error: cannot add a container to its own descendant: layer",
    );
  });

  it("uses names rather than hive handles in events", () => {
    const output = run(
      "init; create g g1; create rect r1 0 0 1 1 in g1; create circle c1 0 0 1 in g1; move r1 5 5 params restrict; set r1 fill red; front r1; back r1; addto g1 r1",
    );
    expect(output).toContain("rect#r1 moved to the end of g#g1");
    expect(output).not.toMatch(/#[1-9]/u);
  });

  it("does not mix metric and imperial lengths", () => {
    expect(
      run(
        "init; create rect r 1cm 0 10mm 10mm; move r 1in 0 params restrict",
      ),
    ).toContain("does not add up with 1cm");
  });

  it("rejects non-positive canvases", () => {
    expect(run("init -5 -5")).toContain(
      "error: canvas width must be positive",
    );
    expect(run("init; canvas 0")).toContain(
      "error: canvas width must be positive",
    );
  });

  it("rejects negative dimensions", () => {
    expect(run("init; create rect r 0 0 -1 1")).toContain(
      "error: width must not be negative",
    );
    expect(run("init; create rect r 0 0 1 1; set r width -1")).toContain(
      "error: width must not be negative",
    );
  });

  it("rejects malformed lengths", () => {
    expect(run("init; create rect nn nan 0 1 1")).toContain(
      "cannot read 'nan' as a length",
    );
  });

  it("undoes and redoes an original edit", () => {
    expect(
      run("init; create rect r 0 0 1 1; move r 5 7; undo; redo"),
    ).toContain(
      "undo: rect#r moved by (5, 7) (HEAD 2)\nredo: rect#r moved by (5, 7) (HEAD 3)",
    );
  });

  it("shows the current branch newest first", () => {
    expect(
      run("init; create rect r 0 0 1 1; move r 5 7; history"),
    ).toContain(
      "3 +rect#r moved by (5, 7) (HEAD)\n2 +rect#r created\n1 +baseline",
    );
  });

  it("checks out an earlier commit and returns", () => {
    const output = run(
      "init; create rect r 0 0 1 1; move r 5 7; checkout 2; show r; checkout 3; show r",
    );
    expect(output).toContain("checked out 2");
    expect(output).toContain("2 +rect#r created (HEAD)");
    expect(output).toContain("x=0 y=0 w=1 h=1");
  });

  it("keeps context commit ids continuous across save and read", () => {
    const directory = mkdtempSync(join(tmpdir(), "svg-editor-ts-context-"));
    const path = join(directory, "context.svg");
    expect(
      run(
        `init; create rect a 0 0 1 1; save ${path}; create rect b 0 0 1 1; history; canvas 800 600; read ${path}; history`,
      ),
    ).toContain("5 +baseline (HEAD)");
  });

  it("quotes ids and rejects quoted whitespace as an XML id", () => {
    expect(run('init; create g "a b"')).toContain(
      'error: invalid XML id: "a b"',
    );
  });

  it("supports escaped quotes in text", () => {
    expect(
      run('init; create text t 0 0 "say \\"hi\\""; tree'),
    ).toContain('text="say \\"hi\\""');
  });

  it("sets viewBox and reports an unsized canvas", () => {
    expect(
      run(`read ${fixture("viewbox-only.svg")}; show svg`),
    ).toContain('svg (unsized) viewBox="0 0 100 50"');
  });

  it("shows a partial canvas safely", () => {
    expect(
      run(`read ${fixture("width-only.svg")}; show svg`),
    ).toContain("svg (300 user units x unset)");
  });

  it("round-trips a document with named paints", () => {
    const directory = mkdtempSync(join(tmpdir(), "svg-editor-ts-save-"));
    const path = join(directory, "roundtrip.svg");
    expect(
      run(
        `read ${fixture("load.svg")}; save ${path}; read ${path}; tree`,
      ),
    ).toContain("fill=rebeccapurple");
  });

  it("handles comments and semicolon sessions", () => {
    const output = run(
      'init; create rect before 0 0 1 1; # a note; without an init; tree',
    );
    expect(output).toContain("rect#before created");
    expect(output).not.toContain("unknown instruction");
  });

  it("answers help locally", () => {
    expect(run("help")).toContain("create <kind> <id>");
  });

  it("stops a session at exit", () => {
    const output = run(
      "init; create rect before 0 0 1 1; exit; create rect after 0 0 1 1; tree",
    );
    expect(output).toContain("rect#before created");
    expect(output).not.toContain("rect#after created");
  });

  it("fails an unknown instruction", () => {
    const result = new Session().run("frobnicate");
    expect(result.ok).toBe(false);
    expect(result.output).toContain("unknown instruction");
  });

  it("restricts a container edit to its transform", () => {
    expect(
      run(
        "init; create g g1; create rect r 0 0 1 1 in g1; move g1 0 100 restrict",
      ),
    ).toContain("g#g1 moved by (0, 100)");
  });

  it("explicitly transforms a container", () => {
    expect(
      run(
        "init; create g g1; create rect r 0 0 1 1 in g1; move g1 0 100 transform; show g1",
      ),
    ).toContain("transform=translate(0 100)");
  });

  it("premultiplies moves before an existing transform", () => {
    const output = run(
      'init; create g gR; create rect a 0 0 10 10 in gR; set gR transform "rotate(90)"; move gR 10 0; show gR',
    );
    expect(output).toContain("g#gR moved by (10, 0)");
    expect(output).toContain("translate(10 0) rotate(90)");
  });

  it("leaves descendants alone inside a transformed boundary", () => {
    const output = run(
      'init; create g gR; create rect a 0 0 10 10 in gR; set gR transform "rotate(90)"; move gR 10 0 params cascade; show a',
    );
    expect(output).toContain("x=0 y=0 w=10 h=10");
  });

  it("scales a container through its transform", () => {
    expect(
      run(
        "init; create g g1; create rect r 0 0 1 1 in g1; scale g1 2 transform; show g1",
      ),
    ).toContain("transform=scale(2 2)");
  });

  it("prints set results without an extra route label", () => {
    expect(
      run(
        "init; create rect r 0 0 1 1; set r fill red; set r class \"layer one\"",
      ),
    ).toContain(
      'rect#r updated: fill=red\nrect#r updated: class="layer one"',
    );
  });

  it("prints text updates as text", () => {
    expect(
      run('init; create text t 0 0 "old"; set t text "Hello World"'),
    ).toContain('text#t updated: text="Hello World"');
  });

  it("puts text content after paint attributes", () => {
    expect(
      run(
        'init; create text t 20 40 "hello"; set t fill red; tree',
      ),
    ).toContain("(20,40) fill=red text=\"hello\"");
  });

  it("treats a hash word as an SVG id, not a handle", () => {
    expect(
      run('init; create text t1 5 6 "hello"; tree #2'),
    ).toContain("error: no such shape: #2");
  });

  it("accepts svg as the root alias", () => {
    expect(run("init; create rect a 0 0 1 1 in svg; tree")).toContain(
      "rect#a",
    );
  });

  it("refuses the reserved id in group", () => {
    expect(run("init; create rect a 0 0 1 1; group svg a")).toContain(
      'error: id "svg" is reserved for the root',
    );
  });

  it("loads an unnamed shape after assigned ids", () => {
    const output = run(`read ${fixture("load.svg")}; tree`);
    expect(output).toContain(
      "rect#rect1        x=1 y=2 w=30 h=40 fill=#3366ff",
    );
  });

  it("rejects an invalid viewBox", () => {
    expect(
      run('init; set svg viewBox "0 0 -1 10"'),
    ).toContain("as a viewBox");
  });

  it("sets text anchor and font size", () => {
    expect(
      run(
        'init; create text t 20 40 "hello"; set t text-anchor middle; set t font-size 12pt; show t',
      ),
    ).toContain("text-anchor=middle font-size=12pt");
  });

  it("preserves root and text SVG attributes on save", () => {
    const directory = mkdtempSync(join(tmpdir(), "svg-editor-ts-attrs-"));
    const path = join(directory, "attributes.svg");
    const output = run(
      `init; set svg xmlns "urn:example:svg"; set svg viewBox "0 0 100 50"; create text t 1 2 "hi"; set t text-anchor end; set t font-size 8px; save ${path}; read ${path}; show svg`,
    );
    expect(output).toContain(
      'svg xmlns="urn:example:svg" (800 x 600 user units) viewBox="0 0 100 50"',
    );
  });

  it("does not save a refused negative width", () => {
    const directory = mkdtempSync(join(tmpdir(), "svg-editor-ts-negative-"));
    const path = join(directory, "negative.svg");
    const output = run(
      `init; create rect a 0 0 10 10; set a width -7; save ${path}; read ${path}; show a`,
    );
    expect(output).toContain("w=10 h=10");
    expect(output).not.toContain("w=-7");
  });

  it("checks out the current head without movement", () => {
    expect(
      run("init; create rect r 0 0 1 1; checkout 2; checkout 2"),
    ).toContain("checked out 2 (no effect)");
  });

  it("checks out an unknown commit", () => {
    expect(
      run("init; create rect r 0 0 1 1; checkout 999"),
    ).toContain("error: no such commit: 999");
  });

  it("shows history after a context checkpoint", () => {
    expect(
      run("init; create rect r 0 0 1 1; canvas 800 600; history"),
    ).toContain("3 +baseline (HEAD)");
  });

  it("preserves the HEAD marker after undo", () => {
    const output = run(
      "init; create rect r 0 0 1 1; move r 5 7; undo; history",
    );
    expect(output).toContain("2 +rect#r created (HEAD)");
    expect(output).not.toContain(
      "3 +rect#r moved by (5, 7) (HEAD)",
    );
  });
});
