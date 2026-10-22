import * as refusal from "../protocol/refusal/Refusal.js";
import { quoteIfNeeded, quoted } from "./TreeRenderer.js";

export class RefusalRenderer {
  public render(value: refusal.Refusal): string {
    if (value instanceof refusal.NoDocument) {
      return "error: no document. use 'init' or 'read' first";
    }
    if (value instanceof refusal.MissingShape) {
      return `error: no such shape: ${value.node.display}`;
    }
    if (value instanceof refusal.MissingContainer) {
      return `error: no such container: ${value.node.display}`;
    }
    if (value instanceof refusal.NotContainer) {
      return `error: not a container: ${value.node.display}`;
    }
    if (value instanceof refusal.DuplicateId) {
      return `error: id already exists: ${quoteIfNeeded(value.id)}`;
    }
    if (value instanceof refusal.InvalidId) {
      return `error: invalid XML id: ${quoteIfNeeded(value.id)}`;
    }
    if (value instanceof refusal.ReservedId) {
      return `error: id ${quoted(value.id)} is reserved for the root`;
    }
    if (value instanceof refusal.DuplicateGroupMember) {
      return `error: duplicate node in group: ${value.node.display}`;
    }
    if (value instanceof refusal.UnknownAttribute) {
      return `error: unknown attribute: ${quoteIfNeeded(value.name)}`;
    }
    if (value instanceof refusal.NegativeDimension) {
      return `error: ${quoteIfNeeded(value.attribute)} must not be negative`;
    }
    if (value instanceof refusal.NonPositiveCanvas) {
      return `error: canvas ${quoteIfNeeded(value.attribute)} must be positive`;
    }
    if (value instanceof refusal.NonFiniteValue) {
      return `error: ${quoteIfNeeded(value.name)} must be a finite number`;
    }
    if (value instanceof refusal.OpacityOutOfRange) {
      return "error: opacity must be between 0 and 1";
    }
    if (value instanceof refusal.CannotUngroupNonContainer) {
      return `error: cannot ungroup a shape or text node: ${value.node.display}`;
    }
    if (value instanceof refusal.CannotUngroupCompositeShape) {
      return `error: cannot ungroup composite shape: ${value.node.display}`;
    }
    if (value instanceof refusal.CannotGroupIntoOwnDescendant) {
      return `error: cannot group a container into its own descendant: ${value.node.display}`;
    }
    if (value instanceof refusal.CannotAddToOwnDescendant) {
      return `error: cannot add a container to its own descendant: ${value.node.display}`;
    }
    if (value instanceof refusal.CannotGroupTopLevelContainer) {
      return `error: cannot group top-level container: ${quoteIfNeeded(value.name)}`;
    }
    if (value instanceof refusal.CannotUngroupTopLevelContainer) {
      return `error: cannot ungroup top-level container: ${quoteIfNeeded(value.name)}`;
    }
    if (value instanceof refusal.ScaleFactorNotPositive) {
      return "error: scale factor must be positive";
    }
    if (value instanceof refusal.TransformHasNoScope) {
      return "error: transform does not take cascade or restrict";
    }
    if (value instanceof refusal.EmptyContainer) {
      const noun = value.element === "g" ? "group" : `container: ${value.element}#${value.id}`;
      return `error: cannot move or scale an empty ${noun}`;
    }
    if (value instanceof refusal.RootCannotBeErased) {
      return "error: the root cannot be erased";
    }
    if (value instanceof refusal.RootHasNoSiblings) {
      return "error: the root is the whole document: it has no siblings to stand in front of or behind";
    }
    if (value instanceof refusal.EmptyGroup) {
      return "error: a group needs at least one node to hold";
    }
    if (value instanceof refusal.NothingToUndo) {
      return "error: there is nothing left to undo";
    }
    if (value instanceof refusal.UndoAfterIo) {
      return "error: undo not allowed after io command";
    }
    if (value instanceof refusal.NothingToRedo) {
      return "error: there is nothing left to redo";
    }
    if (value instanceof refusal.UnknownCommit) {
      return `error: no such commit: ${String(value.commit)}`;
    }
    if (value instanceof refusal.MissingSourcePath) {
      return "error: this document came from nowhere yet: save <path> says where to write it";
    }
    if (value instanceof refusal.CannotReadFile) {
      return `error: cannot read file: ${quoteIfNeeded(value.path)}`;
    }
    if (value instanceof refusal.CannotWriteFile) {
      return `error: cannot write file: ${quoteIfNeeded(value.path)}`;
    }
    if (value instanceof refusal.InvalidSvg) {
      return `error: cannot parse SVG: ${value.detail}`;
    }
    if (value instanceof refusal.IncompatibleLengths) {
      return `error: the offset ${value.offset} does not add up with ${value.value}`;
    }
    if (value instanceof refusal.InternalError) {
      return "error: internal error";
    }
    return `error: ${value.reason}`;
  }
}

