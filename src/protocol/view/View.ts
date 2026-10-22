import type { ElementNode, Node } from "../../model/node/index.js";
import type { Vid } from "../../model/store/hiveState.js";
import type { Transform } from "../../model/values/Transform.js";
import type { EditEvent } from "../event/EditEvent.js";
import type { HistoryEntry } from "../event/HistoryEntry.js";

export class ElementShape {
  public constructor(public readonly node: ElementNode) {}
}

export class CharacterView {
  public constructor(public readonly content: string) {}
}

export class TreeRow {
  public constructor(
    public readonly depth: number,
    public readonly last: boolean,
    public readonly nodeId: Vid,
    public readonly shape: Node,
    public readonly text: string,
    public readonly transform: Transform,
  ) {}
}

export class TreeView {
  public constructor(public readonly rows: readonly TreeRow[]) {}
}

export class NodeParent {
  public constructor(
    public readonly nodeId: Vid,
    public readonly shape: ElementNode,
  ) {}
}

export class NodeView {
  public constructor(
    public readonly nodeId: Vid,
    public readonly shape: Node,
    public readonly text: string,
    public readonly transform: Transform,
    public readonly parent: NodeParent | null,
  ) {}
}

export class HistoryView {
  public constructor(
    public readonly baseline: number,
    public readonly head: number,
    public readonly position: number,
    public readonly depth: number,
    public readonly entries: readonly HistoryEntry[],
  ) {}
}

export type View = TreeView | NodeView | HistoryView;
export type ProtocolResult = View | EditEvent;

