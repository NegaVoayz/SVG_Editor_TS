import type { Outcome } from "../protocol/Outcome.js";
import type { EditEvent } from "../protocol/event/EditEvent.js";
import type { Refusal } from "../protocol/refusal/Refusal.js";
import type { View } from "../protocol/view/View.js";
import { EventRenderer } from "./EventRenderer.js";
import { HistoryRenderer } from "./HistoryRenderer.js";
import { RefusalRenderer } from "./RefusalRenderer.js";
import { TreeRenderer } from "./TreeRenderer.js";
import type { ShapeRegistry } from "../plugin/Registry.js";

export class Rendering {
  private readonly trees: TreeRenderer;
  private readonly events = new EventRenderer();
  private readonly refusals = new RefusalRenderer();
  private readonly histories = new HistoryRenderer(this.events);

  public constructor(shapes: ShapeRegistry) {
    this.trees = new TreeRenderer(shapes);
  }

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
    return this.events.render(event);
  }

  public refusal(refusal: Refusal): string {
    return this.refusals.render(refusal);
  }

  public outcome(outcome: Outcome): string {
    if (!outcome.ok()) {
      return this.refusal(outcome.refusal());
    }
    if ("reason" in outcome.result) {
      return this.refusal(outcome.result);
    }
    return "eventName" in outcome.result
      ? this.event(outcome.result)
      : this.view(outcome.result);
  }
}

