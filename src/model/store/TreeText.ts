import { PlainTextNode, type Node } from "../node/index.js";
import type { Vid } from "./hiveState.js";

export interface TreeTextView {
  node(id: Vid): Node | undefined;
  children(id: Vid): readonly Vid[];
}

export class TreeText {
  public content(view: TreeTextView, id: Vid): string {
    let content = "";
    const pending = [...view.children(id)].reverse();
    while (pending.length > 0) {
      const child = pending.pop();
      if (child === undefined) {
        continue;
      }
      const node = view.node(child);
      if (node instanceof PlainTextNode) {
        content += node.content;
      } else {
        pending.push(...[...view.children(child)].reverse());
      }
    }
    return content;
  }

  public direct(view: TreeTextView, id: Vid): string {
    return view
      .children(id)
      .map((child) => view.node(child))
      .filter((node): node is PlainTextNode => node instanceof PlainTextNode)
      .map((node) => node.content)
      .join("");
  }
}

