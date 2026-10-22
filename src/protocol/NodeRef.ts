import type { Document } from "../model/document/Document.js";
import type { Vid } from "../model/store/hiveState.js";

export abstract class NodeRef {
  public abstract readonly display: string;

  public abstract resolve(document: Document): Vid | undefined;
}

export class RootRef extends NodeRef {
  public readonly display = "svg";

  public resolve(document: Document): Vid | undefined {
    return document.hasDocument() ? document.root() : undefined;
  }
}

export class SvgIdRef extends NodeRef {
  public constructor(public readonly name: string) {
    super();
  }

  public get display(): string {
    return this.name;
  }

  public resolve(document: Document): Vid | undefined {
    return this.name === "/" || this.name === "svg"
      ? document.root()
      : document.find(this.name);
  }
}

export class HandleRef extends NodeRef {
  public constructor(public readonly handle: Vid) {
    super();
  }

  public get display(): string {
    return `#${String(this.handle)}`;
  }

  public resolve(document: Document): Vid | undefined {
    return document.hasNode(this.handle) ? this.handle : undefined;
  }
}

export class EditSelectors {
  public constructor(
    public readonly target: EditTarget = EditTarget.Default,
    public readonly scope: EditScope = EditScope.Default,
  ) {}
}

export enum EditTarget {
  Default = "default",
  Params = "params",
  Transform = "transform",
}

export enum EditScope {
  Default = "default",
  Cascade = "cascade",
  Restrict = "restrict",
}

export enum EditMode {
  Params = "params",
  Transform = "transform",
  Cascade = "cascade",
  ContainerTransform = "container-transform",
}

