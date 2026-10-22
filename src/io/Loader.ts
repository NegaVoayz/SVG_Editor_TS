import type { TreeStore } from "../model/store/TreeStore.js";
import type { AssignedId, ParsedNode, ParsedSvg } from "./SvgReader.js";

export interface LoadResult {
  readonly assignedIds: readonly AssignedId[];
  readonly commitId: number;
}

export class SvgLoader {
  public load(store: TreeStore, parsed: ParsedSvg): LoadResult {
    store.resetEmpty();
    const edit = store.beginLoad();
    try {
      const root = store.createRoot(edit, parsed.root.node);
      for (const child of parsed.root.children) {
        this.append(store, edit, root, child);
      }
      store.commit(edit);
      store.clearHistory();
      return {
        assignedIds: parsed.assignedIds,
        commitId: store.commitId(),
      };
    } catch (error: unknown) {
      store.rollback(edit);
      throw error;
    }
  }

  private append(
    store: TreeStore,
    edit: ReturnType<TreeStore["beginLoad"]>,
    parent: number,
    parsed: ParsedNode,
  ): void {
    const id = store.appendChild(edit, parent, parsed.node);
    for (const child of parsed.children) {
      this.append(store, edit, id, child);
    }
  }
}
