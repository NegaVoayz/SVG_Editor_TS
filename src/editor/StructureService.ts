import type { Document } from "../model/document/Document.js";
import {
  ContainerNode,
  Group,
  isElementNode,
} from "../model/node/index.js";
import type { Vid } from "../model/store/hiveState.js";
import { IdentityAttr } from "../model/values/IdentityAttr.js";
import { reservedSvgId, validSvgId } from "../model/values/svgId.js";
import type { ShapeRegistry } from "../plugin/Registry.js";
import type { NodeRef } from "../protocol/NodeRef.js";
import type {
  AddTo,
  Back,
  Delete,
  Front,
  GroupNodes,
  Ungroup,
} from "../protocol/cmd/ChangeCommands.js";
import {
  AddedTo,
  AlreadyBack,
  AlreadyFront,
  Deleted,
  Grouped,
  MovedToBack,
  MovedToFront,
  Ungrouped,
} from "../protocol/event/EditEvent.js";
import { Kind } from "../protocol/Kind.js";
import { Outcome } from "../protocol/Outcome.js";
import {
  CannotAddToOwnDescendant,
  CannotGroupIntoOwnDescendant,
  CannotGroupTopLevelContainer,
  CannotUngroupCompositeShape,
  CannotUngroupNonContainer,
  CannotUngroupTopLevelContainer,
  DuplicateGroupMember,
  DuplicateId,
  EmptyGroup,
  InternalError,
  InvalidId,
  MissingContainer,
  MissingShape,
  NoDocument,
  NotContainer,
  ReservedId,
  RootCannotBeErased,
  RootHasNoSiblings,
} from "../protocol/refusal/Refusal.js";
import type { History } from "./history/History.js";
import type { NodeNaming } from "./naming.js";

export class StructureService {
  public constructor(
    private readonly document: Document,
    private readonly history: History,
    private readonly naming: NodeNaming,
    private readonly shapes: ShapeRegistry,
  ) {}

  public delete(command: Delete): Outcome {
    const id = command.node.resolve(this.document);
    if (id === undefined) {
      return this.missing(command.node);
    }
    if (id === this.document.root()) {
      return Outcome.refused(Kind.Change, new RootCannotBeErased());
    }
    const event = new Deleted(
      this.naming.node(id),
      this.naming.elementCountBelow(id),
    );
    const edit = this.document.transaction();
    try {
      edit.erase(id);
      edit.commit();
      this.history.record(event);
      return Outcome.happened(Kind.Change, event);
    } catch (error: unknown) {
      edit.rollback();
      return Outcome.refused(Kind.Change, new InternalError(String(error)));
    }
  }

  public addTo(command: AddTo): Outcome {
    const parent = command.parent.resolve(this.document);
    if (parent === undefined) {
      return Outcome.refused(Kind.Change, new MissingContainer(command.parent));
    }
    if (!(this.document.node(parent) instanceof ContainerNode)) {
      return Outcome.refused(Kind.Change, new NotContainer(command.parent));
    }
    const node = command.node.resolve(this.document);
    if (node === undefined) {
      return this.missing(command.node);
    }
    if (this.naming.inside(parent, node)) {
      return Outcome.refused(
        Kind.Change,
        new CannotAddToOwnDescendant(command.node),
      );
    }
    const event = new AddedTo(
      this.naming.node(node),
      this.naming.node(parent),
    );
    const edit = this.document.transaction();
    try {
      edit.attachLast(parent, node);
      edit.commit();
      this.history.record(event);
      return Outcome.happened(Kind.Change, event);
    } catch (error: unknown) {
      edit.rollback();
      return Outcome.refused(Kind.Change, new InternalError(String(error)));
    }
  }

  public front(command: Front): Outcome {
    const id = command.node.resolve(this.document);
    if (id === undefined) {
      return this.missing(command.node);
    }
    const parent = this.document.parent(id);
    if (parent === undefined) {
      return Outcome.refused(Kind.Change, new RootHasNoSiblings());
    }
    const siblings = this.document.children(parent);
    const name = this.naming.node(id);
    if (siblings.at(-1) === id) {
      return Outcome.happened(Kind.Change, new AlreadyFront(name));
    }
    const event = new MovedToFront(name, this.naming.node(parent));
    const edit = this.document.transaction();
    try {
      edit.attachLast(parent, id);
      edit.commit();
      this.history.record(event);
      return Outcome.happened(Kind.Change, event);
    } catch (error: unknown) {
      edit.rollback();
      return Outcome.refused(Kind.Change, new InternalError(String(error)));
    }
  }

  public back(command: Back): Outcome {
    const id = command.node.resolve(this.document);
    if (id === undefined) {
      return this.missing(command.node);
    }
    const parent = this.document.parent(id);
    if (parent === undefined) {
      return Outcome.refused(Kind.Change, new RootHasNoSiblings());
    }
    const siblings = this.document.children(parent);
    const name = this.naming.node(id);
    if (siblings[0] === id) {
      return Outcome.happened(Kind.Change, new AlreadyBack(name));
    }
    const anchor = siblings[0];
    if (anchor === undefined) {
      return Outcome.refused(Kind.Change, new InternalError());
    }
    const event = new MovedToBack(name, this.naming.node(parent));
    const edit = this.document.transaction();
    try {
      edit.attachAt(parent, anchor, id);
      edit.commit();
      this.history.record(event);
      return Outcome.happened(Kind.Change, event);
    } catch (error: unknown) {
      edit.rollback();
      return Outcome.refused(Kind.Change, new InternalError(String(error)));
    }
  }

  public group(command: GroupNodes): Outcome {
    if (command.nodes.length === 0) {
      return Outcome.refused(Kind.Change, new EmptyGroup());
    }
    if (!validSvgId(command.id)) {
      return Outcome.refused(Kind.Change, new InvalidId(command.id));
    }
    if (reservedSvgId(command.id)) {
      return Outcome.refused(Kind.Change, new ReservedId(command.id));
    }
    if (this.document.find(command.id) !== undefined) {
      return Outcome.refused(Kind.Change, new DuplicateId(command.id));
    }
    const members: Vid[] = [];
    for (const reference of command.nodes) {
      const id = reference.resolve(this.document);
      if (id === undefined) {
        return this.missing(reference);
      }
      if (members.includes(id)) {
        return Outcome.refused(
          Kind.Change,
          new DuplicateGroupMember(reference),
        );
      }
      members.push(id);
    }
    const first = members[0];
    if (first === undefined) {
      return Outcome.refused(Kind.Change, new EmptyGroup());
    }
    const parent = this.document.parent(first);
    if (parent === undefined) {
      return Outcome.refused(
        Kind.Change,
        new CannotGroupTopLevelContainer(this.naming.topLevel()),
      );
    }
    for (const [index, member] of members.entries()) {
      if (this.naming.inside(parent, member)) {
        const reference = command.nodes[index];
        if (reference === undefined) {
          continue;
        }
        return Outcome.refused(
          Kind.Change,
          new CannotGroupIntoOwnDescendant(reference),
        );
      }
    }
    const taken = new Set(members);
    const siblings = this.document.children(parent);
    const start = siblings.indexOf(first);
    const anchor =
      siblings.slice(start + 1).find((id) => !taken.has(id)) ?? null;
    const edit = this.document.transaction();
    try {
      const made = edit.insertAt(
        parent,
        anchor,
        new Group(new IdentityAttr(command.id)),
      );
      for (const member of members) {
        edit.attachLast(made, member);
      }
      edit.commit();
      const event = new Grouped(
        this.naming.node(made),
        this.naming.node(parent),
        members.length,
      );
      this.history.record(event);
      return Outcome.happened(Kind.Change, event);
    } catch (error: unknown) {
      edit.rollback();
      return Outcome.refused(Kind.Change, new InternalError(String(error)));
    }
  }

  public ungroup(command: Ungroup): Outcome {
    const id = command.node.resolve(this.document);
    if (id === undefined) {
      return Outcome.refused(
        Kind.Change,
        new MissingContainer(command.node),
      );
    }
    if (id === this.document.root()) {
      return Outcome.refused(
        Kind.Change,
        new CannotUngroupTopLevelContainer(this.naming.topLevel()),
      );
    }
    const node = this.document.node(id);
    if (!(node instanceof ContainerNode)) {
      return Outcome.refused(
        Kind.Change,
        new CannotUngroupNonContainer(command.node),
      );
    }
    if (isElementNode(node)) {
      const provider = this.shapes.providerFor(node);
      if (provider !== undefined && !provider.ungroupable) {
        return Outcome.refused(
          Kind.Change,
          new CannotUngroupCompositeShape(command.node),
        );
      }
    }
    const parent = this.document.parent(id);
    if (parent === undefined) {
      return Outcome.refused(
        Kind.Change,
        new CannotUngroupTopLevelContainer(this.naming.topLevel()),
      );
    }
    if (parent === this.document.root()) {
      return Outcome.refused(
        Kind.Change,
        new CannotUngroupTopLevelContainer(this.naming.node(id).id),
      );
    }
    const members = this.document.children(id);
    const siblings = this.document.children(parent);
    const at = siblings.indexOf(id);
    const anchor = at >= 0 ? (siblings[at + 1] ?? null) : null;
    const erased = this.naming.node(id);
    const parentName = this.naming.node(parent);
    const edit = this.document.transaction();
    try {
      for (const member of members) {
        edit.attachAt(parent, anchor, member);
      }
      edit.erase(id);
      edit.commit();
      const event = new Ungrouped(erased, parentName, members.length);
      this.history.record(event);
      return Outcome.happened(Kind.Change, event);
    } catch (error: unknown) {
      edit.rollback();
      return Outcome.refused(Kind.Change, new InternalError(String(error)));
    }
  }

  private missing(reference: NodeRef): Outcome {
    return Outcome.refused(
      Kind.Change,
      this.document.hasDocument()
        ? new MissingShape(reference)
        : new NoDocument(),
    );
  }
}

