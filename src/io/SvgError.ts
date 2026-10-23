export class SvgReadError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SvgReadError";
  }
}

export function failSvg(message: string): never {
  throw new SvgReadError(message);
}

