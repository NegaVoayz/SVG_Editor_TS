import type { EditEvent } from "./EditEvent.js";

export class HistoryEntry {
  public constructor(
    public readonly commit: number,
    public readonly event: EditEvent,
    public readonly position: number,
  ) {}
}

