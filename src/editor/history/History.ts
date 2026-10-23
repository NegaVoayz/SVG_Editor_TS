import type { Document } from "../../model/document/Document.js";
import type { Checkout } from "../../protocol/cmd/ContextCommands.js";
import {
  CheckedOut,
  Redone,
  Undone,
  type EditEvent,
} from "../../protocol/event/EditEvent.js";
import { HistoryEntry } from "../../protocol/event/HistoryEntry.js";
import { Kind } from "../../protocol/Kind.js";
import { Outcome } from "../../protocol/Outcome.js";
import {
  NothingToRedo,
  NothingToUndo,
  UndoAfterIo,
  UnknownCommit,
} from "../../protocol/refusal/Refusal.js";
import type { HistoryView } from "../../protocol/view/View.js";

export class History {
  private readonly events = new Map<number, EditEvent>();

  public constructor(
    private readonly document: Document,
    private readonly defaultLimit = 20,
  ) {}

  public record(event: EditEvent): void {
    this.events.set(this.document.commitId(), event);
  }

  public clear(): void {
    this.events.clear();
  }

  public undo(): Outcome {
    if (!this.document.canUndo()) {
      return Outcome.refused(
        Kind.Change,
        this.document.undoBarredByIo()
          ? new UndoAfterIo()
          : new NothingToUndo(),
      );
    }
    const leaving = this.document.commitId();
    this.document.undo();
    return Outcome.happened(
      Kind.Change,
      new Undone(
        this.document.position(),
        this.document.depth(),
        this.events.get(leaving) ?? null,
        this.document.commitId(),
      ),
    );
  }

  public redo(): Outcome {
    if (!this.document.canRedo()) {
      return Outcome.refused(Kind.Change, new NothingToRedo());
    }
    this.document.redo();
    const entered = this.document.commitAt(this.document.position() - 1);
    return Outcome.happened(
      Kind.Change,
      new Redone(
        this.document.position(),
        this.document.depth(),
        entered === undefined ? null : (this.events.get(entered) ?? null),
        this.document.commitId(),
      ),
    );
  }

  public checkout(command: Checkout): Outcome {
    const moved = this.document.checkout(command.commit);
    if (moved === undefined) {
      return Outcome.refused(
        Kind.Change,
        new UnknownCommit(command.commit),
      );
    }
    return Outcome.happened(
      Kind.Change,
      new CheckedOut(
        moved.position,
        this.document.depth(),
        command.commit,
        moved.noEffect,
        this.view(command.limit).baseline,
        this.view(command.limit).entries,
      ),
    );
  }

  public view(limit: number | null = null): HistoryView {
    const depth = this.document.depth();
    const entries: HistoryEntry[] = [];
    for (let position = 0; position < depth; position += 1) {
      const commit = this.document.commitAt(position);
      const event = commit === undefined ? undefined : this.events.get(commit);
      if (commit !== undefined && event !== undefined) {
        entries.push(new HistoryEntry(commit, event, position));
      }
    }
    const cap = Math.max(0, limit ?? this.defaultLimit);
    const selected =
      entries.length <= cap
        ? entries
        : entries.slice(Math.max(0, entries.length - cap));
    return {
      baseline: this.document.baselineCommit(),
      head: this.document.commitId(),
      position: this.document.position(),
      depth,
      entries: selected,
    };
  }
}

