import type { EditMode } from "../NodeRef.js";
import type { LengthPercentage } from "../../model/values/LengthPercentage.js";
import type { HistoryEntry } from "./HistoryEntry.js";

export class NodeName {
  public constructor(
    public readonly element: string,
    public readonly id: string,
  ) {}

  public get text(): string {
    return `${this.element}#${this.id}`;
  }
}

export type EditEventName =
  | "created"
  | "composite-created"
  | "composite-attribute-set"
  | "composite-content-set"
  | "deleted"
  | "moved"
  | "scaled"
  | "added-to"
  | "front"
  | "back"
  | "grouped"
  | "ungrouped"
  | "attribute-set"
  | "content-set"
  | "canvas-set"
  | "nothing-moved"
  | "already-front"
  | "already-back"
  | "initialized"
  | "opened"
  | "saved"
  | "undone"
  | "redone"
  | "checked-out";

export abstract class EditEventBase {
  public abstract readonly eventName: EditEventName;
}

export class Created extends EditEventBase {
  public readonly eventName = "created";
  public constructor(
    public readonly node: NodeName,
    public readonly parent: NodeName,
    public readonly parentNamed: boolean,
  ) {
    super();
  }
}
export class CompositeCreated extends EditEventBase {
  public readonly eventName = "composite-created";
  public constructor(
    public readonly node: NodeName,
    public readonly children: readonly NodeName[],
  ) {
    super();
  }
}
export class CompositeAttributeSet extends EditEventBase {
  public readonly eventName = "composite-attribute-set";
  public constructor(
    public readonly node: NodeName,
    public readonly target: NodeName,
    public readonly attribute: string,
    public readonly value: string,
  ) {
    super();
  }
}
export class CompositeContentSet extends EditEventBase {
  public readonly eventName = "composite-content-set";
  public constructor(
    public readonly node: NodeName,
    public readonly attribute: string,
    public readonly content: string,
    public readonly previousContent = "",
  ) {
    super();
  }
}
export class Deleted extends EditEventBase {
  public readonly eventName = "deleted";
  public constructor(
    public readonly node: NodeName,
    public readonly descendants: number,
  ) {
    super();
  }
}
export class Moved extends EditEventBase {
  public readonly eventName = "moved";
  public constructor(
    public readonly node: NodeName,
    public readonly dx: LengthPercentage,
    public readonly dy: LengthPercentage,
    public readonly mode: EditMode,
    public readonly nodes = 1,
  ) {
    super();
  }
}
export class Scaled extends EditEventBase {
  public readonly eventName = "scaled";
  public constructor(
    public readonly node: NodeName,
    public readonly factor: number,
    public readonly mode: EditMode,
    public readonly nodes = 1,
  ) {
    super();
  }
}
export class AddedTo extends EditEventBase {
  public readonly eventName = "added-to";
  public constructor(
    public readonly node: NodeName,
    public readonly parent: NodeName,
  ) {
    super();
  }
}
export class MovedToFront extends EditEventBase {
  public readonly eventName = "front";
  public constructor(
    public readonly node: NodeName,
    public readonly parent: NodeName,
  ) {
    super();
  }
}
export class MovedToBack extends EditEventBase {
  public readonly eventName = "back";
  public constructor(
    public readonly node: NodeName,
    public readonly parent: NodeName,
  ) {
    super();
  }
}
export class Grouped extends EditEventBase {
  public readonly eventName = "grouped";
  public constructor(
    public readonly node: NodeName,
    public readonly parent: NodeName,
    public readonly members: number,
  ) {
    super();
  }
}
export class Ungrouped extends EditEventBase {
  public readonly eventName = "ungrouped";
  public constructor(
    public readonly erased: NodeName,
    public readonly parent: NodeName,
    public readonly members: number,
  ) {
    super();
  }
}
export class AttributeSet extends EditEventBase {
  public readonly eventName = "attribute-set";
  public constructor(
    public readonly node: NodeName,
    public readonly attribute: string,
    public readonly value: string,
  ) {
    super();
  }
}
export class ContentSet extends EditEventBase {
  public readonly eventName = "content-set";
  public constructor(
    public readonly node: NodeName,
    public readonly content: string,
  ) {
    super();
  }
}
export class CanvasSet extends EditEventBase {
  public readonly eventName = "canvas-set";
  public constructor(
    public readonly width: LengthPercentage | null,
    public readonly height: LengthPercentage | null,
  ) {
    super();
  }
}
export class NothingMoved extends EditEventBase {
  public readonly eventName = "nothing-moved";
}
export class AlreadyFront extends EditEventBase {
  public readonly eventName = "already-front";
  public constructor(public readonly node: NodeName) {
    super();
  }
}
export class AlreadyBack extends EditEventBase {
  public readonly eventName = "already-back";
  public constructor(public readonly node: NodeName) {
    super();
  }
}
export class Initialized extends EditEventBase {
  public readonly eventName = "initialized";
  public constructor(
    public readonly width: LengthPercentage | null,
    public readonly height: LengthPercentage | null,
  ) {
    super();
  }
}
export class Opened extends EditEventBase {
  public readonly eventName = "opened";
  public constructor(
    public readonly path: string,
    public readonly assignedIds: readonly AssignedIdName[],
    public readonly elements: number,
  ) {
    super();
  }
}

export class AssignedIdName {
  public constructor(
    public readonly id: string,
    public readonly element: string,
    public readonly originalId: string,
  ) {}
}
export class Saved extends EditEventBase {
  public readonly eventName = "saved";
  public constructor(
    public readonly path: string,
    public readonly elements: number,
  ) {
    super();
  }
}
export class Undone extends EditEventBase {
  public readonly eventName = "undone";
  public constructor(
    public readonly position: number,
    public readonly depth: number,
    public readonly original: EditEvent | null,
    public readonly checkout: number,
  ) {
    super();
  }
}
export class Redone extends EditEventBase {
  public readonly eventName = "redone";
  public constructor(
    public readonly position: number,
    public readonly depth: number,
    public readonly original: EditEvent | null,
    public readonly checkout: number,
  ) {
    super();
  }
}
export class CheckedOut extends EditEventBase {
  public readonly eventName = "checked-out";
  public constructor(
    public readonly position: number,
    public readonly depth: number,
    public readonly commit: number,
    public readonly noEffect: boolean,
    public readonly baseline: number,
    public readonly entries: readonly HistoryEntry[],
  ) {
    super();
  }
}

export type EditEvent =
  | Created
  | CompositeCreated
  | CompositeAttributeSet
  | CompositeContentSet
  | Deleted
  | Moved
  | Scaled
  | AddedTo
  | MovedToFront
  | MovedToBack
  | Grouped
  | Ungrouped
  | AttributeSet
  | ContentSet
  | CanvasSet
  | NothingMoved
  | AlreadyFront
  | AlreadyBack
  | Initialized
  | Opened
  | Saved
  | Undone
  | Redone
  | CheckedOut;

