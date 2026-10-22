import type { LengthPercentage } from "../../model/values/LengthPercentage.js";
import { Kind } from "../Kind.js";
import type { EditScope, EditTarget, NodeRef } from "../NodeRef.js";
import type { Outcome } from "../Outcome.js";
import { Command } from "./Command.js";
import type { CommandContext } from "./CommandContext.js";

export class Delete extends Command {
  public readonly kind = Kind.Change;
  public constructor(public readonly node: NodeRef) {
    super();
  }

  public execute(context: CommandContext): Outcome {
    return context.delete(this);
  }
}

export class Move extends Command {
  public readonly kind = Kind.Change;
  public constructor(
    public readonly node: NodeRef,
    public readonly dx: LengthPercentage,
    public readonly dy: LengthPercentage,
    public readonly target: EditTarget,
    public readonly scope: EditScope,
  ) {
    super();
  }

  public execute(context: CommandContext): Outcome {
    return context.move(this);
  }
}

export class ScaleBy extends Command {
  public readonly kind = Kind.Change;
  public constructor(
    public readonly node: NodeRef,
    public readonly factor: number,
    public readonly target: EditTarget,
    public readonly scope: EditScope,
  ) {
    super();
  }

  public execute(context: CommandContext): Outcome {
    return context.scale(this);
  }
}

export class GroupNodes extends Command {
  public readonly kind = Kind.Change;
  public constructor(
    public readonly id: string,
    public readonly nodes: readonly NodeRef[],
  ) {
    super();
  }

  public execute(context: CommandContext): Outcome {
    return context.group(this);
  }
}

export class Ungroup extends Command {
  public readonly kind = Kind.Change;
  public constructor(public readonly node: NodeRef) {
    super();
  }

  public execute(context: CommandContext): Outcome {
    return context.ungroup(this);
  }
}

export class AddTo extends Command {
  public readonly kind = Kind.Change;
  public constructor(
    public readonly parent: NodeRef,
    public readonly node: NodeRef,
  ) {
    super();
  }

  public execute(context: CommandContext): Outcome {
    return context.addTo(this);
  }
}

export class Front extends Command {
  public readonly kind = Kind.Change;
  public constructor(public readonly node: NodeRef) {
    super();
  }

  public execute(context: CommandContext): Outcome {
    return context.front(this);
  }
}

export class Back extends Command {
  public readonly kind = Kind.Change;
  public constructor(public readonly node: NodeRef) {
    super();
  }

  public execute(context: CommandContext): Outcome {
    return context.back(this);
  }
}

