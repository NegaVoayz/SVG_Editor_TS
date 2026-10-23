import type { Refusal } from "../protocol/refusal/Refusal.js";
import { quoteIfNeeded, quoted } from "./TreeRenderer.js";

function assertNever(value: never): never {
  throw new Error(`unhandled refusal: ${String(value)}`);
}

export class RefusalRenderer {
  public render(value: Refusal): string {
    switch (value.reason) {
      case "no-document":
        return "error: no document. use 'init' or 'read' first";
      case "missing-shape":
        return `error: no such shape: ${value.node.display}`;
      case "missing-container":
        return `error: no such container: ${value.node.display}`;
      case "not-container":
        return `error: not a container: ${value.node.display}`;
      case "duplicate-id":
        return `error: id already exists: ${quoteIfNeeded(value.id)}`;
      case "invalid-id":
        return `error: invalid XML id: ${quoteIfNeeded(value.id)}`;
      case "reserved-id":
        return `error: id ${quoted(value.id)} is reserved for the root`;
      case "duplicate-group-member":
        return `error: duplicate node in group: ${value.node.display}`;
      case "unknown-attribute":
        return `error: unknown attribute: ${quoteIfNeeded(value.name)}`;
      case "negative-dimension":
        return `error: ${quoteIfNeeded(value.attribute)} must not be negative`;
      case "non-positive-canvas":
        return `error: canvas ${quoteIfNeeded(value.attribute)} must be positive`;
      case "non-finite-value":
        return `error: ${quoteIfNeeded(value.name)} must be a finite number`;
      case "opacity-out-of-range":
        return "error: opacity must be between 0 and 1";
      case "cannot-ungroup-non-container":
        return `error: cannot ungroup a shape or text node: ${value.node.display}`;
      case "cannot-ungroup-composite-shape":
        return `error: cannot ungroup composite shape: ${value.node.display}`;
      case "cannot-group-into-own-descendant":
        return `error: cannot group a container into its own descendant: ${value.node.display}`;
      case "cannot-add-to-own-descendant":
        return `error: cannot add a container to its own descendant: ${value.node.display}`;
      case "cannot-group-top-level-container":
        return `error: cannot group top-level container: ${quoteIfNeeded(value.name)}`;
      case "cannot-ungroup-top-level-container":
        return `error: cannot ungroup top-level container: ${quoteIfNeeded(value.name)}`;
      case "scale-factor-not-positive":
        return "error: scale factor must be positive";
      case "transform-has-no-scope":
        return "error: transform does not take cascade or restrict";
      case "empty-container": {
        const noun =
          value.element === "g"
            ? "group"
            : `container: ${value.element}#${value.id}`;
        return `error: cannot move or scale an empty ${noun}`;
      }
      case "no-direct-params":
        return "error: this node has no direct params";
      case "root-cannot-be-erased":
        return "error: the root cannot be erased";
      case "root-has-no-siblings":
        return "error: the root is the whole document: it has no siblings to stand in front of or behind";
      case "empty-group":
        return "error: a group needs at least one node to hold";
      case "nothing-to-undo":
        return "error: there is nothing left to undo";
      case "undo-after-io":
        return "error: undo not allowed after io command";
      case "nothing-to-redo":
        return "error: there is nothing left to redo";
      case "unknown-commit":
        return `error: no such commit: ${String(value.commit)}`;
      case "no-root-element":
        return "error: the document has no root element";
      case "root-is-not-container":
        return "error: the root is not a container";
      case "root-is-not-svg":
        return "error: the root is not an <svg> element, so it has no canvas";
      case "missing-source-path":
        return "error: this document came from nowhere yet: save <path> says where to write it";
      case "cannot-read-file":
        return `error: cannot read file: ${quoteIfNeeded(value.path)}`;
      case "cannot-write-file":
        return `error: cannot write file: ${quoteIfNeeded(value.path)}`;
      case "invalid-svg":
        return `error: cannot parse SVG: ${value.detail}`;
      case "incompatible-lengths":
        return `error: the offset ${value.offset} does not add up with ${value.value}`;
      case "text-cannot-move":
        return "error: a text node has no coordinates and no transform to move";
      case "text-cannot-scale":
        return "error: a text node has no coordinates and no transform to scale";
      case "internal-error":
        return "error: internal error";
    }
    return assertNever(value);
  }
}

