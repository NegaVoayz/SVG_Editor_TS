import type { Document } from "../document/Document.js";
import { PlainTextNode } from "../node/PlainTextNode.js";
import type { Element, Node } from "../node/index.js";
import type { Vid } from "../store/hiveState.js";
import type { Transform } from "../values/Transform.js";

export class QueryRow {
  public constructor(
    public readonly depth: number,
    public readonly last: boolean,
    public readonly nodeId: Vid,
    public readonly node: Node,
    public readonly text: string,
    public readonly transform: Transform,
  ) {}
}

export class ShownNode {
  public constructor(
    public readonly nodeId: Vid,
    public readonly node: Node,
    public readonly text: string,
    public readonly transform: Transform,
    public readonly parentId: Vid | null,
    public readonly parentNode: Element | null,
  ) {}
}

export class TreeQuery {
  public constructor(private readonly document: Document) {}

  public subtree(start?: Vid): readonly QueryRow[] {
    if (!this.document.hasDocument()) {
      return [];
    }
    const root = start ?? this.document.root();
    if (!this.document.hasNode(root)) {
      return [];
    }
    const rows: QueryRow[] = [];
    this.walk(root, 0, true, rows);
    return rows;
  }

  public show(id: Vid): ShownNode | undefined {
    const node = this.document.node(id);
    if (node === undefined) {
      return undefined;
    }
    const parentId = this.document.parent(id) ?? null;
    const parentNode = parentId === null
      ? null
      : (() => {
          const parent = this.document.node(parentId);
          return parent !== undefined && "identity" in parent
            ? parent
            : null;
        })();
    return new ShownNode(
      id,
      node,
      this.document.directText(id),
      this.document.transform(id),
      parentId,
      parentNode,
    );
  }

  private walk(
    id: Vid,
    depth: number,
    last: boolean,
    rows: QueryRow[],
  ): void {
    const node = this.document.node(id);
    if (node === undefined) {
      return;
    }
    if (node instanceof PlainTextNode) {
      return;
    }
    rows.push(
      new QueryRow(
        depth,
        last,
        id,
        node,
        this.document.directText(id),
        this.document.transform(id),
      ),
    );
    const children = this.document.children(id);
    children.forEach((child, index) => {
      this.walk(child, depth + 1, index === children.length - 1, rows);
    });
  }
}

