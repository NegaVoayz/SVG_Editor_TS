import { numberText } from "../model/values/index.js";
import type { EditEvent } from "../protocol/event/EditEvent.js";
import type { NodeName } from "../protocol/event/EditEvent.js";
import { EditMode } from "../protocol/NodeRef.js";
import { canvasSize } from "../protocol/view/CanvasText.js";
import { HistoryRenderer } from "./HistoryRenderer.js";
import { quoteIfNeeded, quoted } from "./TreeRenderer.js";

function label(name: NodeName): string {
  return name.id === ""
    ? name.element
    : `${name.element}#${quoteIfNeeded(name.id)}`;
}

function elementCount(count: number): string {
  return `${String(count)} ${count === 1 ? "element" : "elements"}`;
}

function assertNever(value: never): never {
  throw new Error(`unhandled event: ${String(value)}`);
}

export class EventRenderer {
  private historyRenderer: HistoryRenderer | null = null;

  public render(event: EditEvent): string {
    switch (event.eventName) {
      case "created":
        return `${label(event.node)} created${event.parentNamed ? ` in ${label(event.parent)}` : ""}`;
      case "composite-created":
        return `${label(event.node)} created (${[label(event.node), ...event.children.map(label)].join(" + ")})`;
      case "composite-attribute-set":
        return `${label(event.node)} ${event.attribute} propagated to ${event.target.id}`;
      case "composite-content-set":
        return `${label(event.node)} ${event.attribute} updated: ${quoted(event.content)}`;
      case "deleted":
        return `${label(event.node)} deleted${event.descendants === 0 ? "" : ` (${elementCount(event.descendants)})`}`;
      case "moved":
        return `${label(event.node)} moved by (${event.dx.toDisplayText()}, ${event.dy.toDisplayText()})${event.mode === EditMode.Cascade ? ` (${elementCount(event.nodes)})` : ""}`;
      case "scaled":
        return `${label(event.node)} scaled by ${numberText(event.factor)}${event.mode === EditMode.Cascade ? ` (${elementCount(event.nodes)})` : ""}`;
      case "added-to":
        return `${label(event.node)} moved to the end of ${label(event.parent)}`;
      case "front":
        return `${label(event.node)} moved to the front of ${label(event.parent)}`;
      case "back":
        return `${label(event.node)} moved to the back of ${label(event.parent)}`;
      case "grouped":
        return `${label(event.node)} created (${elementCount(event.members)})`;
      case "ungrouped":
        return `${label(event.erased)} ungrouped into ${label(event.parent)} (${elementCount(event.members)})`;
      case "attribute-set":
        return `${label(event.node)} updated: ${quoteIfNeeded(event.attribute)}=${quoteIfNeeded(event.value)}`;
      case "content-set":
        return `${label(event.node)} updated: text=${quoted(event.content)}`;
      case "canvas-set":
        return `the canvas is now ${event.width?.toDisplayText() ?? "unset"} x ${event.height?.toDisplayText() ?? "unset"}, and the history starts from here`;
      case "nothing-moved":
        return "the offset is zero, nothing moved";
      case "already-front":
        return `${label(event.node)} is already in front`;
      case "already-back":
        return `${label(event.node)} is already at the back`;
      case "initialized":
        return `canvas ${canvasSize(event.width, event.height)} created`;
      case "opened":
        return this.renderOpened(event);
      case "saved":
        return `saved to ${quoteIfNeeded(event.path)} (${elementCount(event.elements)})`;
      case "undone":
        if (event.original?.eventName === "composite-content-set") {
          return `undo: ${label(event.original.node)} ${event.original.attribute} restored: ${quoted(event.original.previousContent)} (HEAD ${String(event.checkout)})`;
        }
        return `${event.original === null ? "undone" : `undo: ${this.render(event.original)}`} (HEAD ${String(event.checkout)})`;
      case "redone":
        return `${event.original === null ? "redone" : `redo: ${this.render(event.original)}`} (HEAD ${String(event.checkout)})`;
      case "checked-out": {
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
    }
    return assertNever(event);
  }

  private renderOpened(
    event: Extract<EditEvent, { eventName: "opened" }>,
  ): string {
    let output = `read ${quoteIfNeeded(event.path)} (${elementCount(event.elements)})`;
    for (const assigned of event.assignedIds) {
      output +=
        assigned.originalId === ""
          ? `\nwarning: assigned id ${quoteIfNeeded(assigned.id)} to unnamed <${assigned.element}>`
          : `\nwarning: id ${quoted(assigned.originalId)} is reserved for the root, renamed <${assigned.element}> to ${quoteIfNeeded(assigned.id)}`;
    }
    return output;
  }
}

