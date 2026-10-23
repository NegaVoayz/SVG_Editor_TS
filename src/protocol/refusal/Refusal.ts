import type { NodeRef } from "../NodeRef.js";

export type RefusalReason =
  | "no-document"
  | "missing-shape"
  | "missing-container"
  | "not-container"
  | "duplicate-id"
  | "invalid-id"
  | "reserved-id"
  | "duplicate-group-member"
  | "unknown-attribute"
  | "negative-dimension"
  | "non-positive-canvas"
  | "non-finite-value"
  | "opacity-out-of-range"
  | "cannot-ungroup-non-container"
  | "cannot-ungroup-composite-shape"
  | "cannot-group-into-own-descendant"
  | "cannot-add-to-own-descendant"
  | "cannot-group-top-level-container"
  | "cannot-ungroup-top-level-container"
  | "scale-factor-not-positive"
  | "transform-has-no-scope"
  | "empty-container"
  | "no-direct-params"
  | "root-cannot-be-erased"
  | "root-has-no-siblings"
  | "empty-group"
  | "nothing-to-undo"
  | "undo-after-io"
  | "nothing-to-redo"
  | "unknown-commit"
  | "no-root-element"
  | "root-is-not-container"
  | "root-is-not-svg"
  | "missing-source-path"
  | "cannot-read-file"
  | "cannot-write-file"
  | "invalid-svg"
  | "incompatible-lengths"
  | "text-cannot-move"
  | "text-cannot-scale"
  | "internal-error";

export abstract class RefusalBase {
  public abstract readonly reason: RefusalReason;
}

export class NoDocument extends RefusalBase {
  public readonly reason = "no-document";
}
export class MissingShape extends RefusalBase {
  public readonly reason = "missing-shape";
  public constructor(public readonly node: NodeRef) {
    super();
  }
}
export class MissingContainer extends RefusalBase {
  public readonly reason = "missing-container";
  public constructor(public readonly node: NodeRef) {
    super();
  }
}
export class NotContainer extends RefusalBase {
  public readonly reason = "not-container";
  public constructor(public readonly node: NodeRef) {
    super();
  }
}
export class DuplicateId extends RefusalBase {
  public readonly reason = "duplicate-id";
  public constructor(public readonly id: string) {
    super();
  }
}
export class InvalidId extends RefusalBase {
  public readonly reason = "invalid-id";
  public constructor(public readonly id: string) {
    super();
  }
}
export class ReservedId extends RefusalBase {
  public readonly reason = "reserved-id";
  public constructor(public readonly id: string) {
    super();
  }
}
export class DuplicateGroupMember extends RefusalBase {
  public readonly reason = "duplicate-group-member";
  public constructor(public readonly node: NodeRef) {
    super();
  }
}
export class UnknownAttribute extends RefusalBase {
  public readonly reason = "unknown-attribute";
  public constructor(public readonly name: string) {
    super();
  }
}
export class NegativeDimension extends RefusalBase {
  public readonly reason = "negative-dimension";
  public constructor(public readonly attribute: string) {
    super();
  }
}
export class NonPositiveCanvas extends RefusalBase {
  public readonly reason = "non-positive-canvas";
  public constructor(public readonly attribute: string) {
    super();
  }
}
export class NonFiniteValue extends RefusalBase {
  public readonly reason = "non-finite-value";
  public constructor(public readonly name: string) {
    super();
  }
}
export class OpacityOutOfRange extends RefusalBase {
  public readonly reason = "opacity-out-of-range";
}
export class CannotUngroupNonContainer extends RefusalBase {
  public readonly reason = "cannot-ungroup-non-container";
  public constructor(public readonly node: NodeRef) {
    super();
  }
}
export class CannotUngroupCompositeShape extends RefusalBase {
  public readonly reason = "cannot-ungroup-composite-shape";
  public constructor(public readonly node: NodeRef) {
    super();
  }
}
export class CannotGroupIntoOwnDescendant extends RefusalBase {
  public readonly reason = "cannot-group-into-own-descendant";
  public constructor(public readonly node: NodeRef) {
    super();
  }
}
export class CannotAddToOwnDescendant extends RefusalBase {
  public readonly reason = "cannot-add-to-own-descendant";
  public constructor(public readonly node: NodeRef) {
    super();
  }
}
export class CannotGroupTopLevelContainer extends RefusalBase {
  public readonly reason = "cannot-group-top-level-container";
  public constructor(public readonly name: string) {
    super();
  }
}
export class CannotUngroupTopLevelContainer extends RefusalBase {
  public readonly reason = "cannot-ungroup-top-level-container";
  public constructor(public readonly name: string) {
    super();
  }
}
export class ScaleFactorNotPositive extends RefusalBase {
  public readonly reason = "scale-factor-not-positive";
}
export class TransformHasNoScope extends RefusalBase {
  public readonly reason = "transform-has-no-scope";
}
export class EmptyContainer extends RefusalBase {
  public readonly reason = "empty-container";
  public constructor(
    public readonly element: string,
    public readonly id: string,
  ) {
    super();
  }
}
export class NoDirectParams extends RefusalBase {
  public readonly reason = "no-direct-params";
}
export class RootCannotBeErased extends RefusalBase {
  public readonly reason = "root-cannot-be-erased";
}
export class RootHasNoSiblings extends RefusalBase {
  public readonly reason = "root-has-no-siblings";
}
export class EmptyGroup extends RefusalBase {
  public readonly reason = "empty-group";
}
export class NothingToUndo extends RefusalBase {
  public readonly reason = "nothing-to-undo";
}
export class UndoAfterIo extends RefusalBase {
  public readonly reason = "undo-after-io";
}
export class NothingToRedo extends RefusalBase {
  public readonly reason = "nothing-to-redo";
}
export class UnknownCommit extends RefusalBase {
  public readonly reason = "unknown-commit";
  public constructor(public readonly commit: number) {
    super();
  }
}
export class NoRootElement extends RefusalBase {
  public readonly reason = "no-root-element";
}
export class RootIsNotContainer extends RefusalBase {
  public readonly reason = "root-is-not-container";
}
export class RootIsNotSvg extends RefusalBase {
  public readonly reason = "root-is-not-svg";
}
export class MissingSourcePath extends RefusalBase {
  public readonly reason = "missing-source-path";
}
export class CannotReadFile extends RefusalBase {
  public readonly reason = "cannot-read-file";
  public constructor(public readonly path: string) {
    super();
  }
}
export class CannotWriteFile extends RefusalBase {
  public readonly reason = "cannot-write-file";
  public constructor(public readonly path: string) {
    super();
  }
}
export class InvalidSvg extends RefusalBase {
  public readonly reason = "invalid-svg";
  public constructor(public readonly detail: string) {
    super();
  }
}
export class IncompatibleLengths extends RefusalBase {
  public readonly reason = "incompatible-lengths";
  public constructor(
    public readonly offset: string,
    public readonly value: string,
  ) {
    super();
  }
}
export class TextCannotMove extends RefusalBase {
  public readonly reason = "text-cannot-move";
}
export class TextCannotScale extends RefusalBase {
  public readonly reason = "text-cannot-scale";
}
export class InternalError extends RefusalBase {
  public readonly reason = "internal-error";
  public constructor(public readonly detail = "") {
    super();
  }
}

export type Refusal =
  | NoDocument
  | MissingShape
  | MissingContainer
  | NotContainer
  | DuplicateId
  | InvalidId
  | ReservedId
  | DuplicateGroupMember
  | UnknownAttribute
  | NegativeDimension
  | NonPositiveCanvas
  | NonFiniteValue
  | OpacityOutOfRange
  | CannotUngroupNonContainer
  | CannotUngroupCompositeShape
  | CannotGroupIntoOwnDescendant
  | CannotAddToOwnDescendant
  | CannotGroupTopLevelContainer
  | CannotUngroupTopLevelContainer
  | ScaleFactorNotPositive
  | TransformHasNoScope
  | EmptyContainer
  | NoDirectParams
  | RootCannotBeErased
  | RootHasNoSiblings
  | EmptyGroup
  | NothingToUndo
  | UndoAfterIo
  | NothingToRedo
  | UnknownCommit
  | NoRootElement
  | RootIsNotContainer
  | RootIsNotSvg
  | MissingSourcePath
  | CannotReadFile
  | CannotWriteFile
  | InvalidSvg
  | IncompatibleLengths
  | TextCannotMove
  | TextCannotScale
  | InternalError;

export function isRefusal(value: unknown): value is Refusal {
  return value instanceof RefusalBase;
}

