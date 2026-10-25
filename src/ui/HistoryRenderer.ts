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
    const lines: string[] = [];
    rows.forEach((row, index) => {
      const previous = rows[index - 1];
      if (previous !== undefined) {
        const folded = previous.position - row.position - 1;
        if (folded > 0) {
          lines.push(
            `... ${String(folded)} ${folded === 1 ? "commit" : "commits"} folded ...`,
          );
        }
      }
      const head = row.commit === view.head ? " (HEAD)" : "";
      const text = row.baseline
        ? "baseline"
        : row.event === null
          ? "edit"
          : this.events.render(row.event);
      lines.push(
        `${String(row.commit).padStart(width, " ")} +${text}${head}`,
      );
    });
    return lines.join("\n");
  }

  public describe(event: EditEvent | null): string {
    return event === null ? "" : this.events.render(event);
  }
}

