import type { NodeRef } from "../NodeRef.js";

export abstract class Refusal {
  public abstract readonly reason: string;
}

export class NoDocument extends Refusal {
  public readonly reason = "no-document";
}
export class MissingShape extends Refusal {
  public readonly reason = "missing-shape";
  public constructor(public readonly node: NodeRef) {
    super();
  }
}
export class MissingContainer extends Refusal {
  public readonly reason = "missing-container";
  public constructor(public readonly node: NodeRef) {
    super();
  }
}
export class NotContainer extends Refusal {
  public readonly reason = "not-container";
  public constructor(public readonly node: NodeRef) {
    super();
  }
}
export class DuplicateId extends Refusal {
  public readonly reason = "duplicate-id";
  public constructor(public readonly id: string) {
    super();
  }
}
export class InvalidId extends Refusal {
  public readonly reason = "invalid-id";
  public constructor(public readonly id: string) {
    super();
  }
}
export class ReservedId extends Refusal {
  public readonly reason = "reserved-id";
  public constructor(public readonly id: string) {
    super();
  }
}
export class DuplicateGroupMember extends Refusal {
  public readonly reason = "duplicate-group-member";
  public constructor(public readonly node: NodeRef) {
    super();
  }
}
export class UnknownAttribute extends Refusal {
  public readonly reason = "unknown-attribute";
  public constructor(public readonly name: string) {
    super();
  }
}
export class NegativeDimension extends Refusal {
  public readonly reason = "negative-dimension";
  public constructor(public readonly attribute: string) {
    super();
  }
}
export class NonPositiveCanvas extends Refusal {
  public readonly reason = "non-positive-canvas";
  public constructor(public readonly attribute: string) {
    super();
  }
}
export class NonFiniteValue extends Refusal {
  public readonly reason = "non-finite-value";
  public constructor(public readonly name: string) {
    super();
  }
}
export class CannotUngroupNonContainer extends Refusal {
  public readonly reason = "cannot-ungroup-non-container";
  public constructor(public readonly node: NodeRef) {
    super();
  }
}
export class CannotGroupIntoOwnDescendant extends Refusal {
  public readonly reason = "cannot-group-into-own-descendant";
  public constructor(public readonly node: NodeRef) {
    super();
  }
}
export class CannotAddToOwnDescendant extends Refusal {
  public readonly reason = "cannot-add-to-own-descendant";
  public constructor(public readonly node: NodeRef) {
    super();
  }
}
export class CannotGroupTopLevelContainer extends Refusal {
  public readonly reason = "cannot-group-top-level-container";
  public constructor(public readonly name: string) {
    super();
  }
}
export class CannotUngroupTopLevelContainer extends Refusal {
  public readonly reason = "cannot-ungroup-top-level-container";
  public constructor(public readonly name: string) {
    super();
  }
}
export class ScaleFactorNotPositive extends Refusal {
  public readonly reason = "scale-factor-not-positive";
}
export class TransformHasNoScope extends Refusal {
  public readonly reason = "transform-has-no-scope";
}
export class EmptyContainer extends Refusal {
  public readonly reason = "empty-container";
  public constructor(
    public readonly element: string,
    public readonly id: string,
  ) {
    super();
  }
}
export class NoDirectParams extends Refusal {
  public readonly reason = "no-direct-params";
}
export class RootCannotBeErased extends Refusal {
  public readonly reason = "root-cannot-be-erased";
}
export class RootHasNoSiblings extends Refusal {
  public readonly reason = "root-has-no-siblings";
}
export class EmptyGroup extends Refusal {
  public readonly reason = "empty-group";
}
export class NothingToUndo extends Refusal {
  public readonly reason = "nothing-to-undo";
}
export class UndoAfterIo extends Refusal {
  public readonly reason = "undo-after-io";
}
export class NothingToRedo extends Refusal {
  public readonly reason = "nothing-to-redo";
}
export class UnknownCommit extends Refusal {
  public readonly reason = "unknown-commit";
  public constructor(public readonly commit: number) {
    super();
  }
}
export class NoRootElement extends Refusal {
  public readonly reason = "no-root-element";
}
export class RootIsNotContainer extends Refusal {
  public readonly reason = "root-is-not-container";
}
export class RootIsNotSvg extends Refusal {
  public readonly reason = "root-is-not-svg";
}
export class MissingSourcePath extends Refusal {
  public readonly reason = "missing-source-path";
}
export class CannotReadFile extends Refusal {
  public readonly reason = "cannot-read-file";
  public constructor(public readonly path: string) {
    super();
  }
}
export class CannotWriteFile extends Refusal {
  public readonly reason = "cannot-write-file";
  public constructor(public readonly path: string) {
    super();
  }
}
export class InvalidSvg extends Refusal {
  public readonly reason = "invalid-svg";
  public constructor(public readonly detail: string) {
    super();
  }
}
export class IncompatibleLengths extends Refusal {
  public readonly reason = "incompatible-lengths";
  public constructor(
    public readonly offset: string,
    public readonly value: string,
  ) {
    super();
  }
}
export class TextCannotMove extends Refusal {
  public readonly reason = "text-cannot-move";
}
export class TextCannotScale extends Refusal {
  public readonly reason = "text-cannot-scale";
}
export class InternalError extends Refusal {
  public readonly reason = "internal-error";
  public constructor(public readonly detail = "") {
    super();
  }
}

