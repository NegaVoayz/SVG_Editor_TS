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

export abstract class EditEvent {
  public abstract readonly eventName: string;
}

export class Created extends EditEvent {
  public readonly eventName = "created";
  public constructor(
    public readonly node: NodeName,
    public readonly parent: NodeName,
    public readonly parentNamed: boolean,
  ) {
    super();
  }
}
export class CompositeCreated extends EditEvent {
  public readonly eventName = "composite-created";
  public constructor(
    public readonly node: NodeName,
    public readonly children: readonly NodeName[],
  ) {
    super();
  }
}
export class BoxFillPropagated extends EditEvent {
  public readonly eventName = "box-fill-propagated";
  public constructor(
    public readonly node: NodeName,
    public readonly child: NodeName,
    public readonly value: string,
  ) {
    super();
  }
}
export class BoxLabelSet extends EditEvent {
  public readonly eventName = "box-label-set";
  public constructor(
    public readonly node: NodeName,
    public readonly content: string,
    public readonly previousContent = "",
  ) {
    super();
  }
}
export class Deleted extends EditEvent {
  public readonly eventName = "deleted";
  public constructor(
    public readonly node: NodeName,
    public readonly descendants: number,
  ) {
    super();
  }
}
export class Moved extends EditEvent {
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
export class Scaled extends EditEvent {
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
export class AddedTo extends EditEvent {
  public readonly eventName = "added-to";
  public constructor(
    public readonly node: NodeName,
    public readonly parent: NodeName,
  ) {
    super();
  }
}
export class MovedToFront extends EditEvent {
  public readonly eventName = "front";
  public constructor(
    public readonly node: NodeName,
    public readonly parent: NodeName,
  ) {
    super();
  }
}
export class MovedToBack extends EditEvent {
  public readonly eventName = "back";
  public constructor(
    public readonly node: NodeName,
    public readonly parent: NodeName,
  ) {
    super();
  }
}
export class Grouped extends EditEvent {
  public readonly eventName = "grouped";
  public constructor(
    public readonly node: NodeName,
    public readonly parent: NodeName,
    public readonly members: number,
  ) {
    super();
  }
}
export class Ungrouped extends EditEvent {
  public readonly eventName = "ungrouped";
  public constructor(
    public readonly erased: NodeName,
    public readonly parent: NodeName,
    public readonly members: number,
  ) {
    super();
  }
}
export class AttributeSet extends EditEvent {
  public readonly eventName = "attribute-set";
  public constructor(
    public readonly node: NodeName,
    public readonly attribute: string,
    public readonly value: string,
  ) {
    super();
  }
}
export class ContentSet extends EditEvent {
  public readonly eventName = "content-set";
  public constructor(
    public readonly node: NodeName,
    public readonly content: string,
  ) {
    super();
  }
}
export class CanvasSet extends EditEvent {
  public readonly eventName = "canvas-set";
  public constructor(
    public readonly width: LengthPercentage | null,
    public readonly height: LengthPercentage | null,
  ) {
    super();
  }
}
export class NothingMoved extends EditEvent {
  public readonly eventName = "nothing-moved";
}
export class AlreadyFront extends EditEvent {
  public readonly eventName = "already-front";
  public constructor(public readonly node: NodeName) {
    super();
  }
}
export class AlreadyBack extends EditEvent {
  public readonly eventName = "already-back";
  public constructor(public readonly node: NodeName) {
    super();
  }
}
export class Initialized extends EditEvent {
  public readonly eventName = "initialized";
  public constructor(
    public readonly width: LengthPercentage | null,
    public readonly height: LengthPercentage | null,
  ) {
    super();
  }
}
export class Opened extends EditEvent {
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
export class Saved extends EditEvent {
  public readonly eventName = "saved";
  public constructor(
    public readonly path: string,
    public readonly elements: number,
  ) {
    super();
  }
}
export class Undone extends EditEvent {
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
export class Redone extends EditEvent {
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
export class CheckedOut extends EditEvent {
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

