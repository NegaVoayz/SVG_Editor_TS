import { isElementNode, type Node } from "../node/index.js";
import type { Vid } from "./hiveState.js";

export interface TreeReadView {
  node(id: Vid): Node | undefined;
  children(id: Vid): readonly Vid[];
}

export class TreeIndex {
  public find(
    view: TreeReadView,
    root: Vid,
    svgId: string,
  ): Vid | undefined {
    if (svgId === "") {
      return undefined;
    }
    const pending = [root];
    while (pending.length > 0) {
      const id = pending.pop();
      if (id === undefined) {
        continue;
      }
      const node = view.node(id);
      if (node !== undefined && isElementNode(node) && node.id === svgId) {
        return id;
      }
      pending.push(...view.children(id));
    }
    return undefined;
  }

  public elementCount(view: TreeReadView, root: Vid): number {
    let count = 0;
    const pending = [...view.children(root)];
    while (pending.length > 0) {
      const id = pending.pop();
      if (id === undefined) {
        continue;
      }
      const node = view.node(id);
      if (node !== undefined && isElementNode(node)) {
        count += 1;
      }
      pending.push(...view.children(id));
    }
    return count;
  }
}

