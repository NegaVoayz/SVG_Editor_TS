import type { Outcome } from "../protocol/Outcome.js";
import { CheckedOut, EditEvent } from "../protocol/event/EditEvent.js";
import type { Refusal } from "../protocol/refusal/Refusal.js";
import type { View } from "../protocol/view/View.js";
import { EventRenderer } from "./EventRenderer.js";
import { HistoryRenderer } from "./HistoryRenderer.js";
import { RefusalRenderer } from "./RefusalRenderer.js";
import { TreeRenderer } from "./TreeRenderer.js";

export class Rendering {
  private readonly trees = new TreeRenderer();
  private readonly events = new EventRenderer();
  private readonly refusals = new RefusalRenderer();
  private readonly histories = new HistoryRenderer(this.events);

  public view(view: View): string {
    if ("rows" in view) {
      return this.trees.render(view);
    }
    if ("shape" in view) {
      return this.trees.renderNode(view);
    }
    return this.histories.render(view);
  }

  public event(event: EditEvent): string {
    if (event instanceof CheckedOut) {
      return this.events.render(event);
    }
    return this.events.render(event);
  }

  public refusal(refusal: Refusal): string {
    return this.refusals.render(refusal);
  }

  public outcome(outcome: Outcome): string {
    if (!outcome.ok()) {
      return this.refusal(outcome.refusal());
    }
    return outcome.result instanceof EditEvent
      ? this.event(outcome.event())
      : this.view(outcome.view());
  }
}

