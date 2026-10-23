import {
  ContainerNode,
  isElementNode,
  TextNode,
  type Node,
} from "../node/index.js";
import type { IdentityAttr } from "../values/IdentityAttr.js";
import type { HiveTransaction } from "./HiveTransaction.js";
import type { Vid } from "./hiveState.js";

export class NodeLinks {
  public constructor(
    public readonly parent: Vid | null = null,
    public readonly previous: Vid | null = null,
    public readonly next: Vid | null = null,
    public readonly firstChild: Vid | null = null,
    public readonly lastChild: Vid | null = null,
  ) {}

  public withParent(parent: Vid | null): NodeLinks {
    return new NodeLinks(
      parent,
      this.previous,
      this.next,
      this.firstChild,
      this.lastChild,
    );
  }

  public withSiblings(
    previous: Vid | null,
    next: Vid | null,
  ): NodeLinks {
    return new NodeLinks(
      this.parent,
      previous,
      next,
      this.firstChild,
      this.lastChild,
    );
  }

  public withChildren(
    firstChild: Vid | null,
    lastChild: Vid | null,
  ): NodeLinks {
    return new NodeLinks(
      this.parent,
      this.previous,
      this.next,
      firstChild,
      lastChild,
    );
  }
}

export class TreeRecord {
  public constructor(
    public readonly node: Node,
    public readonly links: NodeLinks,
  ) {}

  public withNode(node: Node): TreeRecord {
    return new TreeRecord(node, this.links);
  }

  public withLinks(links: NodeLinks): TreeRecord {
    return new TreeRecord(this.node, links);
  }
}

export type TreeEdit = HiveTransaction<TreeRecord>;

function isParentCapable(node: Node): boolean {
  return node instanceof ContainerNode || node instanceof TextNode;
}

export class TreeStructure {
  public insertAt(
    edit: TreeEdit,
    parent: Vid,
    before: Vid | null,
    node: Node,
  ): Vid {
    this.requireParent(edit, parent);
    this.requireSibling(edit, parent, before);
    const parentRecord = this.requireStaged(edit, parent);
    const previous =
      before === null
        ? parentRecord.links.lastChild
        : this.requireStaged(edit, before).links.previous;
    const id = edit.emplace(
      new TreeRecord(node, new NodeLinks(parent, previous, before)),
    );
    if (previous !== null) {
      this.replaceLinks(edit, previous, (links) =>
        links.withSiblings(links.previous, id),
      );
    } else {
      this.replaceLinks(edit, parent, (links) =>
        links.withChildren(id, links.lastChild),
      );
    }
    if (before === null) {
      this.replaceLinks(edit, parent, (links) =>
        links.withChildren(links.firstChild, id),
      );
    } else {
      this.replaceLinks(edit, before, (links) =>
        links.withSiblings(id, links.next),
      );
    }
    return id;
  }

  public attachAt(
    edit: TreeEdit,
    root: Vid,
    parent: Vid,
    before: Vid | null,
    node: Vid,
  ): void {
    this.requireParent(edit, parent);
    this.requireSibling(edit, parent, before);
    if (node === root || node === parent) {
      throw new Error("TreeStore: the node cannot be moved there");
    }
    if (this.isDescendant(edit, parent, node)) {
      throw new Error("TreeStore: a node cannot move inside itself");
    }
    if (before === node) {
      throw new Error("TreeStore: a node cannot be placed before itself");
    }
    if (edit.find(node) === undefined) {
      throw new RangeError("TreeStore: no live node at this id");
    }

    this.detach(edit, node);
    const parentRecord = this.requireStaged(edit, parent);
    const previous =
      before === null
        ? parentRecord.links.lastChild
        : this.requireStaged(edit, before).links.previous;
    this.replaceLinks(edit, node, (links) =>
      links.withParent(parent).withSiblings(previous, before),
    );

    if (previous !== null) {
      this.replaceLinks(edit, previous, (links) =>
        links.withSiblings(links.previous, node),
      );
    } else {
      this.replaceLinks(edit, parent, (links) =>
        links.withChildren(node, links.lastChild),
      );
    }
    if (before !== null) {
      this.replaceLinks(edit, before, (links) =>
        links.withSiblings(node, links.next),
      );
    } else {
      this.replaceLinks(edit, parent, (links) =>
        links.withChildren(links.firstChild, node),
      );
    }
  }

  public update(edit: TreeEdit, id: Vid, payload: Node): void {
    const stored = this.requireStaged(edit, id);
    if (isParentCapable(stored.node) !== isParentCapable(payload)) {
      throw new Error(
        "TreeStore: an update cannot change whether a node holds children",
      );
    }
    edit.replace(id, stored.withNode(payload));
  }

  public eraseSubtree(edit: TreeEdit, root: Vid, node: Vid): void {
    if (node === root) {
      throw new Error("TreeStore: the root cannot be erased");
    }
    this.requireStaged(edit, node);
    this.detach(edit, node);
    const doomed: Vid[] = [];
    const pending = [node];
    while (pending.length > 0) {
      const id = pending.pop();
      if (id === undefined) {
        continue;
      }
      const current = this.requireStaged(edit, id);
      doomed.push(id);
      let child = current.links.firstChild;
      while (child !== null) {
        pending.push(child);
        child = this.requireStaged(edit, child).links.next;
      }
    }
    for (const id of doomed) {
      edit.erase(id);
    }
  }

  public renameNode(
    edit: TreeEdit,
    id: Vid,
    identity: IdentityAttr,
  ): void {
    const node = this.requireStaged(edit, id).node;
    if (!isElementNode(node)) {
      throw new Error("TreeStore: character data has no identity");
    }
    const replacement = node.withAttributes(
      identity,
      node.paint,
      node.transformAttr,
    );
    this.update(edit, id, replacement);
  }

  private detach(edit: TreeEdit, node: Vid): void {
    const links = this.requireStaged(edit, node).links;
    const parent = links.parent;
    if (parent === null) {
      throw new Error("TreeStore: this node is not linked under anything");
    }
    if (links.previous !== null) {
      this.replaceLinks(edit, links.previous, (current) =>
        current.withSiblings(current.previous, links.next),
      );
    } else {
      this.replaceLinks(edit, parent, (current) =>
        current.withChildren(links.next, current.lastChild),
      );
    }
    if (links.next !== null) {
      this.replaceLinks(edit, links.next, (current) =>
        current.withSiblings(links.previous, current.next),
      );
    } else {
      this.replaceLinks(edit, parent, (current) =>
        current.withChildren(current.firstChild, links.previous),
      );
    }
    this.replaceLinks(edit, node, (current) =>
      current.withParent(null).withSiblings(null, null),
    );
  }

  private isDescendant(
    edit: TreeEdit,
    candidate: Vid,
    ancestor: Vid,
  ): boolean {
    let current: Vid | null = candidate;
    while (current !== null) {
      if (current === ancestor) {
        return true;
      }
      current = edit.find(current)?.links.parent ?? null;
    }
    return false;
  }

  private requireParent(edit: TreeEdit, parent: Vid): void {
    const node = this.requireStaged(edit, parent).node;
    if (!isParentCapable(node)) {
      throw new Error("TreeStore: not a container");
    }
  }

  private requireSibling(
    edit: TreeEdit,
    parent: Vid,
    before: Vid | null,
  ): void {
    if (
      before !== null &&
      this.requireStaged(edit, before).links.parent !== parent
    ) {
      throw new Error("TreeStore: the insertion anchor is not a child");
    }
  }

  private requireStaged(edit: TreeEdit, id: Vid): TreeRecord {
    const record = edit.find(id);
    if (record === undefined) {
      throw new RangeError("TreeStore: no live node at this id");
    }
    return record;
  }

  private replaceLinks(
    edit: TreeEdit,
    id: Vid,
    patch: (links: NodeLinks) => NodeLinks,
  ): void {
    const record = this.requireStaged(edit, id);
    edit.replace(id, record.withLinks(patch(record.links)));
  }
}

