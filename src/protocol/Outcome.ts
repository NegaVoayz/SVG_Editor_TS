import type { EditEvent } from "./event/EditEvent.js";
import type { Kind } from "./Kind.js";
import type { Refusal } from "./refusal/Refusal.js";
import type { View } from "./view/View.js";

export class Outcome {
  private constructor(
    public readonly kind: Kind,
    public readonly result: View | EditEvent | Refusal,
  ) {}

  public static viewed(kind: Kind, view: View): Outcome {
    return new Outcome(kind, view);
  }

  public static happened(kind: Kind, event: EditEvent): Outcome {
    return new Outcome(kind, event);
  }

  public static refused(kind: Kind, refusal: Refusal): Outcome {
    return new Outcome(kind, refusal);
  }

  public ok(): boolean {
    return !("reason" in this.result);
  }

  public view(): View {
    return this.result as View;
  }

  public event(): EditEvent {
    return this.result as EditEvent;
  }

  public refusal(): Refusal {
    return this.result as Refusal;
  }
}

