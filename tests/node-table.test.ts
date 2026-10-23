import { describe, expect, it } from "vitest";

import {
  NODE_TYPES,
  SVG_SCHEMA,
  type NodeType,
} from "../src/index.js";

describe("node type table", () => {
  it("contains every concrete node exactly once", () => {
    const keys = Object.keys(NODE_TYPES).sort();
    expect(keys).toEqual(
      [
        "#text",
        "circle",
        "defs",
        "ellipse",
        "g",
        "line",
        "polygon",
        "rect",
        "svg",
        "switch",
        "symbol",
        "text",
        "textPath",
        "tspan",
      ].sort(),
    );
  });

  it("keeps each constructor aligned with its element name", () => {
    for (const kind of Object.keys(NODE_TYPES) as NodeType[]) {
      expect(NODE_TYPES[kind].prototype.elementName).toBe(kind);
    }
  });

  it("covers every element with one SVG schema record", () => {
    const elementKinds = (Object.keys(NODE_TYPES) as NodeType[])
      .filter((kind) => kind !== "#text")
      .sort();
    expect(Object.keys(SVG_SCHEMA).sort()).toEqual(elementKinds);
  });
});
