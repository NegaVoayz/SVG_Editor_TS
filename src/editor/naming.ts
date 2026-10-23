import type { Document } from "../model/document/Document.js";
import {
  isElementNode,
} from "../model/node/index.js";
import type { Node } from "../model/node/index.js";
import type { Vid } from "../model/store/hiveState.js";
import { NodeName } from "../protocol/event/EditEvent.js";

export class NodeNaming {
  public constructor(private readonly document: Document) {}

  public node(id: Vid): NodeName {
    const node = this.document.node(id);
    if (node !== undefined && isElementNode(node)) {
      return this.name(node);
    }
    return new NodeName("#text", `#${String(id)}`);
  }

  public name(node: Node): NodeName {
    return isElementNode(node)
      ? new NodeName(
          node.elementName === "g" && node.dataKind !== null
            ? node.dataKind
            : node.elementName,
          node.id,
        )
      : new NodeName("#text", "");
  }

  public topLevel(): string {
    const root = this.document.node(this.document.root());
    return root !== undefined && isElementNode(root) && root.id !== ""
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
      const node = this.document.node(child);
      if (node !== undefined && isElementNode(node)) {
        count += 1;
      }
      pending.push(...this.document.children(child));
    }
    return count;
  }
}

