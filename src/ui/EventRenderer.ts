import { numberText } from "../model/values/index.js";
import { EditMode } from "../protocol/NodeRef.js";
import {
  AddedTo,
  AlreadyBack,
  AlreadyFront,
  AttributeSet,
  BoxFillPropagated,
  BoxLabelSet,
  CanvasSet,
  CheckedOut,
  ContentSet,
  CompositeCreated,
  Created,
  Deleted,
  Grouped,
  Initialized,
  Moved,
  MovedToBack,
  MovedToFront,
  NothingMoved,
  Opened,
  Redone,
  Saved,
  Scaled,
  Undone,
  Ungrouped,
  type EditEvent,
  type NodeName,
} from "../protocol/event/EditEvent.js";
import { HistoryRenderer } from "./HistoryRenderer.js";
import { canvasSize } from "../protocol/view/CanvasText.js";
import { quoteIfNeeded, quoted } from "./TreeRenderer.js";

function label(name: NodeName): string {
  return name.id === ""
    ? name.element
    : `${name.element}#${quoteIfNeeded(name.id)}`;
}

function elementCount(count: number): string {
  return `${String(count)} ${count === 1 ? "element" : "elements"}`;
}

export class EventRenderer {
  private historyRenderer: HistoryRenderer | null = null;

  public render(event: EditEvent): string {
    if (event instanceof Created) {
      return `${label(event.node)} created${event.parentNamed ? ` in ${label(event.parent)}` : ""}`;
    }
    if (event instanceof CompositeCreated) {
      return `${label(event.node)} created (${[label(event.node), ...event.children.map(label)].join(" + ")})`;
    }
    if (event instanceof BoxFillPropagated) {
      return `${label(event.node)} fill propagated to ${event.child.id}`;
    }
    if (event instanceof BoxLabelSet) {
      return `${label(event.node)} label updated: ${quoted(event.content)}`;
    }
    if (event instanceof Deleted) {
      return `${label(event.node)} deleted${event.descendants === 0 ? "" : ` (${elementCount(event.descendants)})`}`;
    }
    if (event instanceof Moved) {
      return `${label(event.node)} moved by (${event.dx.toDisplayText()}, ${event.dy.toDisplayText()})${event.mode === EditMode.Cascade ? ` (${elementCount(event.nodes)})` : ""}`;
    }
    if (event instanceof Scaled) {
      return `${label(event.node)} scaled by ${numberText(event.factor)}${event.mode === EditMode.Cascade ? ` (${elementCount(event.nodes)})` : ""}`;
    }
    if (event instanceof AddedTo) {
      return `${label(event.node)} moved to the end of ${label(event.parent)}`;
    }
    if (event instanceof MovedToFront) {
      return `${label(event.node)} moved to the front of ${label(event.parent)}`;
    }
    if (event instanceof MovedToBack) {
      return `${label(event.node)} moved to the back of ${label(event.parent)}`;
    }
    if (event instanceof Grouped) {
      return `${label(event.node)} created (${elementCount(event.members)})`;
    }
    if (event instanceof Ungrouped) {
      return `${label(event.erased)} ungrouped into ${label(event.parent)} (${elementCount(event.members)})`;
    }
    if (event instanceof AttributeSet) {
      return `${label(event.node)} updated: ${quoteIfNeeded(event.attribute)}=${quoteIfNeeded(event.value)}`;
    }
    if (event instanceof ContentSet) {
      return `${label(event.node)} updated: text=${quoted(event.content)}`;
    }
    if (event instanceof CanvasSet) {
      return `the canvas is now ${event.width?.toDisplayText() ?? "unset"} x ${event.height?.toDisplayText() ?? "unset"}, and the history starts from here`;
    }
    if (event instanceof NothingMoved) {
      return "the offset is zero, nothing moved";
    }
    if (event instanceof AlreadyFront) {
      return `${label(event.node)} is already in front`;
    }
    if (event instanceof AlreadyBack) {
      return `${label(event.node)} is already at the back`;
    }
    if (event instanceof Initialized) {
      return `canvas ${canvasSize(event.width, event.height)} created`;
    }
    if (event instanceof Opened) {
      let output = `read ${quoteIfNeeded(event.path)} (${elementCount(event.elements)})`;
      for (const assigned of event.assignedIds) {
        output +=
          assigned.originalId === ""
            ? `\nwarning: assigned id ${quoteIfNeeded(assigned.id)} to unnamed <${assigned.element}>`
            : `\nwarning: id ${quoted(assigned.originalId)} is reserved for the root, renamed <${assigned.element}> to ${quoteIfNeeded(assigned.id)}`;
      }
      return output;
    }
    if (event instanceof Saved) {
      return `saved to ${quoteIfNeeded(event.path)} (${elementCount(event.elements)})`;
    }
    if (event instanceof Undone) {
      if (event.original instanceof BoxLabelSet) {
        return `undo: ${label(event.original.node)} label restored: ${quoted(event.original.previousContent)} (HEAD ${String(event.checkout)})`;
      }
      const original =
        event.original === null
          ? "undone"
          : this.describeOriginal("undo", event.original);
      return `${original} (HEAD ${String(event.checkout)})`;
    }
    if (event instanceof Redone) {
      const original =
        event.original === null
          ? "redone"
          : this.describeOriginal("redo", event.original);
      return `${original} (HEAD ${String(event.checkout)})`;
    }
    if (event instanceof CheckedOut) {
      const message = `checked out ${String(event.commit)}${event.noEffect ? " (no effect)" : ""}`;
      this.historyRenderer ??= new HistoryRenderer(this);
      const timeline = this.historyRenderer.render({
        baseline: event.baseline,
        head: event.commit,
        position: event.position,
        depth: event.depth,
        entries: event.entries,
      });
      return `${message}\n${timeline}`;
    }
    return event.eventName;
  }

  private describeOriginal(prefix: string, event: EditEvent): string {
    return `${prefix}: ${this.render(event)}`;
  }
}

