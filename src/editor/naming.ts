import type { Document } from "../model/document/Document.js";
import { ElementNode, Group } from "../model/node/index.js";
import type { Node } from "../model/node/index.js";
import type { Vid } from "../model/store/hiveState.js";
import { NodeName } from "../protocol/event/EditEvent.js";

export class NodeNaming {
  public constructor(private readonly document: Document) {}

  public node(id: Vid): NodeName {
    const node = this.document.node(id);
    if (node instanceof ElementNode) {
      return this.name(node);
    }
    return new NodeName("#text", `#${String(id)}`);
  }

  public name(node: Node): NodeName {
    return node instanceof ElementNode
      ? new NodeName(
          node instanceof Group && node.dataKind !== null
            ? node.dataKind
            : node.elementName,
          node.id,
        )
      : new NodeName("#text", "");
  }

  public topLevel(): string {
    const root = this.document.node(this.document.root());
    return root instanceof ElementNode && root.id !== ""
      ? root.id
      : "/";
  }

  public inside(candidate: Vid, ancestor: Vid): boolean {
    let current: Vid | undefined = candidate;
    while (current !== undefined) {
      if (current === ancestor) {
        return true;
      }
      current = this.document.parent(current);
    }
    return false;
  }

  public elementCountBelow(id: Vid): number {
    let count = 0;
    const pending = [...this.document.children(id)];
    while (pending.length > 0) {
      const child = pending.pop();
      if (child === undefined) {
        continue;
      }
      if (this.document.node(child) instanceof ElementNode) {
        count += 1;
      }
      pending.push(...this.document.children(child));
    }
    return count;
  }
}

