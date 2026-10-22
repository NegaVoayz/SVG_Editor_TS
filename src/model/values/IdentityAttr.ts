export class IdentityAttr {
  public constructor(
    public readonly id: string,
    public readonly class_ = "",
  ) {}

  public withId(id: string): IdentityAttr {
    return new IdentityAttr(id, this.class_);
  }

  public withClass(class_: string): IdentityAttr {
    return new IdentityAttr(this.id, class_);
  }
}

