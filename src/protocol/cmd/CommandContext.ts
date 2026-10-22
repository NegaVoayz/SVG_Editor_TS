import type { Outcome } from "../Outcome.js";
import type { AddTo, Back, Delete, Front, GroupNodes, Move, ScaleBy, Ungroup } from "./ChangeCommands.js";
import type { CreateIntent } from "./Create.js";
import type { AttributeCommand } from "../attr/AttributeCommand.js";
import type { Checkout, Init, Read, Save, SetCanvas } from "./ContextCommands.js";
import type { ShowHistory, ShowTree } from "./ContextCommands.js";
import type { Show } from "./ContextCommands.js";

export interface CommandContext {
  create(command: CreateIntent): Outcome;
  delete(command: Delete): Outcome;
  move(command: Move): Outcome;
  scale(command: ScaleBy): Outcome;
  group(command: GroupNodes): Outcome;
  ungroup(command: Ungroup): Outcome;
  addTo(command: AddTo): Outcome;
  front(command: Front): Outcome;
  back(command: Back): Outcome;
  setAttribute(command: AttributeCommand): Outcome;
  undo(): Outcome;
  redo(): Outcome;
  checkout(command: Checkout): Outcome;
  setCanvas(command: SetCanvas): Outcome;
  init(command: Init): Outcome;
  read(command: Read): Outcome;
  save(command: Save): Outcome;
  showTree(command: ShowTree): Outcome;
  show(command: Show): Outcome;
  showHistory(command: ShowHistory): Outcome;
}

