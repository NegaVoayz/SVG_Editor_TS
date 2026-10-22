import type { LengthPercentage } from "../../model/values/LengthPercentage.js";
import { Kind } from "../Kind.js";
import type { NodeRef } from "../NodeRef.js";
import { RootRef } from "../NodeRef.js";
import type { Outcome } from "../Outcome.js";
import { Command } from "./Command.js";
import type { CommandContext } from "./CommandContext.js";

export class Undo extends Command {
  public readonly kind = Kind.Change;
  public execute(context: CommandContext): Outcome {
    return context.undo();
  }
}

export class Redo extends Command {
  public readonly kind = Kind.Change;
  public execute(context: CommandContext): Outcome {
    return context.redo();
  }
}

export class Checkout extends Command {
  public readonly kind = Kind.Change;
  public constructor(
    public readonly commit: number,
    public readonly limit: number | null = null,
  ) {
    super();
  }

  public execute(context: CommandContext): Outcome {
    return context.checkout(this);
  }
}

export class SetCanvas extends Command {
  public readonly kind = Kind.Change;
  public constructor(
    public readonly width: LengthPercentage | null,
    public readonly height: LengthPercentage | null,
  ) {
    super();
  }

  public execute(context: CommandContext): Outcome {
    return context.setCanvas(this);
  }
}

export class Init extends Command {
  public readonly kind = Kind.Context;
  public constructor(
    public readonly width: LengthPercentage | null = null,
    public readonly height: LengthPercentage | null = null,
  ) {
    super();
  }

  public execute(context: CommandContext): Outcome {
    return context.init(this);
  }
}

export class Read extends Command {
  public readonly kind = Kind.Context;
  public constructor(public readonly path: string) {
    super();
  }

  public execute(context: CommandContext): Outcome {
    return context.read(this);
  }
}

export class Save extends Command {
  public readonly kind = Kind.Context;
  public constructor(public readonly path: string | null = null) {
    super();
  }

  public execute(context: CommandContext): Outcome {
    return context.save(this);
  }
}

export class ShowTree extends Command {
  public readonly kind = Kind.View;
  public constructor(public readonly node: NodeRef = new RootRef()) {
    super();
  }

  public execute(context: CommandContext): Outcome {
    return context.showTree(this);
  }
}

export class Show extends Command {
  public readonly kind = Kind.View;
  public constructor(public readonly node: NodeRef) {
    super();
  }

  public execute(context: CommandContext): Outcome {
    return context.show(this);
  }
}

export class ShowHistory extends Command {
  public readonly kind = Kind.View;
  public constructor(public readonly limit: number | null = null) {
    super();
  }

  public execute(context: CommandContext): Outcome {
    return context.showHistory(this);
  }
}

