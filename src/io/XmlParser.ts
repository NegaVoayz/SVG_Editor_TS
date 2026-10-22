export type XmlChild = XmlElement | string;

export class XmlElement {
  public constructor(
    public readonly name: string,
    public readonly attributes: ReadonlyMap<string, string>,
    public readonly children: readonly XmlChild[],
  ) {}

  public get localName(): string {
    const colon = this.name.indexOf(":");
    return colon < 0 ? this.name : this.name.slice(colon + 1);
  }

  public attribute(name: string): string | undefined {
    return this.attributes.get(name);
  }
}

export class XmlParseError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "XmlParseError";
  }
}

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  quot: '"',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/giu, (_match, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? `&${entity};`;
  });
}

export class XmlParser {
  private index = 0;

  public constructor(private readonly source: string) {}

  public parse(): XmlElement {
    this.skipMisc();
    if (this.index >= this.source.length) {
      throw new XmlParseError("document has no root element");
    }
    const root = this.parseElement();
    this.skipMisc();
    if (this.index !== this.source.length) {
      throw new XmlParseError("content after the root element");
    }
    return root;
  }

  private parseElement(): XmlElement {
    this.expect("<");
    const name = this.readName();
    const attributes = new Map<string, string>();
    for (;;) {
      this.skipWhitespace();
      if (this.startsWith("/>")) {
        this.index += 2;
        return new XmlElement(name, attributes, []);
      }
      if (this.startsWith(">")) {
        this.index += 1;
        break;
      }
      const attribute = this.readName();
      this.skipWhitespace();
      this.expect("=");
      this.skipWhitespace();
      const quote = this.source[this.index];
      if (quote !== '"' && quote !== "'") {
        throw new XmlParseError(`attribute ${attribute} is not quoted`);
      }
      this.index += 1;
      const end = this.source.indexOf(quote, this.index);
      if (end < 0) {
        throw new XmlParseError(`attribute ${attribute} has no closing quote`);
      }
      const raw = this.source.slice(this.index, end);
      this.index = end + 1;
      if (attributes.has(attribute)) {
        throw new XmlParseError(`duplicate attribute ${attribute}`);
      }
      attributes.set(attribute, decodeEntities(raw));
    }

    const children: XmlChild[] = [];
    for (;;) {
      if (this.index >= this.source.length) {
        throw new XmlParseError(`element ${name} is not closed`);
      }
      if (this.startsWith("</")) {
        this.index += 2;
        const closing = this.readName();
        this.skipWhitespace();
        this.expect(">");
        if (closing !== name) {
          throw new XmlParseError(
            `element ${name} is closed by ${closing}`,
          );
        }
        return new XmlElement(name, attributes, children);
      }
      if (this.startsWith("<!--")) {
        this.skipComment();
        continue;
      }
      if (this.startsWith("<![CDATA[")) {
        const start = this.index + 9;
        const end = this.source.indexOf("]]>", start);
        if (end < 0) {
          throw new XmlParseError("unterminated CDATA section");
        }
        children.push(this.source.slice(start, end));
        this.index = end + 3;
        continue;
      }
      if (this.startsWith("<?")) {
        this.skipProcessingInstruction();
        continue;
      }
      if (this.startsWith("<")) {
        children.push(this.parseElement());
        continue;
      }
      const next = this.source.indexOf("<", this.index);
      const end = next < 0 ? this.source.length : next;
      children.push(decodeEntities(this.source.slice(this.index, end)));
      this.index = end;
    }
  }

  private skipMisc(): void {
    for (;;) {
      this.skipWhitespace();
      if (this.startsWith("<!--")) {
        this.skipComment();
      } else if (this.startsWith("<?")) {
        this.skipProcessingInstruction();
      } else {
        return;
      }
    }
  }

  private skipWhitespace(): void {
    while (
      this.index < this.source.length &&
      /\s/u.test(this.source[this.index] ?? "")
    ) {
      this.index += 1;
    }
  }

  private skipComment(): void {
    const end = this.source.indexOf("-->", this.index + 4);
    if (end < 0) {
      throw new XmlParseError("unterminated comment");
    }
    this.index = end + 3;
  }

  private skipProcessingInstruction(): void {
    const end = this.source.indexOf("?>", this.index + 2);
    if (end < 0) {
      throw new XmlParseError("unterminated processing instruction");
    }
    this.index = end + 2;
  }

  private readName(): string {
    const start = this.index;
    while (
      this.index < this.source.length &&
      /[A-Za-z0-9_.:-]/u.test(this.source[this.index] ?? "")
    ) {
      this.index += 1;
    }
    if (start === this.index) {
      throw new XmlParseError("expected an XML name");
    }
    return this.source.slice(start, this.index);
  }

  private expect(text: string): void {
    if (!this.startsWith(text)) {
      throw new XmlParseError(`expected ${text}`);
    }
    this.index += text.length;
  }

  private startsWith(text: string): boolean {
    return this.source.startsWith(text, this.index);
  }
}

