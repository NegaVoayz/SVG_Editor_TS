import type { EditEvent } from "../protocol/event/EditEvent.js";
import type { HistoryView } from "../protocol/view/View.js";
import type { EventRenderer } from "./EventRenderer.js";

export class HistoryRenderer {
  public constructor(private readonly events: EventRenderer) {}

  public render(view: HistoryView): string {
    const rows = [
      ...view.entries.map((entry) => ({
        position: entry.position,
        commit: entry.commit,
        event: entry.event,
        baseline: false,
      })),
      {
        position: 0,
        commit: view.baseline,
        event: null,
        baseline: true,
      },
    ].sort((left, right) => right.position - left.position);
    const width = Math.max(
      ...rows.map((row) => String(row.commit).length),
      1,
    );
    return rows
      .map((row) => {
        const head = row.commit === view.head ? " (HEAD)" : "";
        const text = row.baseline
          ? "baseline"
          : row.event === null
            ? "edit"
            : this.events.render(row.event);
        return `${String(row.commit).padStart(width, " ")} +${text}${head}`;
      })
      .join("\n");
  }

  public describe(event: EditEvent | null): string {
    return event === null ? "" : this.events.render(event);
  }
}

