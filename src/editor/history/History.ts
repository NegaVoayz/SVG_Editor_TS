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
        entries.push(new HistoryEntry(commit, event, position + 1));
      }
    }
    const cap = Math.max(0, limit ?? this.defaultLimit);
    const head = this.document.position();
    // HEAD plus up to `cap` neighbours are selected; the branch ends remain anchors.
    const selected = new Array<boolean>(depth + 1).fill(cap >= depth);
    if (cap < depth && cap !== 0) {
      selected[head] = true;
      const aboveTarget = Math.floor(cap / 2);
      let above = Math.min(aboveTarget, depth - head);
      let below = Math.min(cap - above, head);
      let remaining = cap - above - below;
      const extraBelow = Math.min(remaining, head - below);
      below += extraBelow;
      remaining -= extraBelow;
      const extraAbove = Math.min(remaining, depth - head - above);
      above += extraAbove;
      for (let offset = 1; offset <= above; offset += 1) {
        selected[head + offset] = true;
      }
      for (let offset = 1; offset <= below; offset += 1) {
        selected[head - offset] = true;
      }
    }
    if (cap < depth) {
      selected[0] = true;
      selected[head] = true;
      selected[depth] = true;
    }
    return {
      baseline: this.document.baselineCommit(),
      head: this.document.commitId(),
      position: this.document.position(),
      depth,
      entries: entries.filter(
        (entry) => selected[entry.position] === true,
      ),
    };
  }
}

