export class DocumentInfo {
  public constructor(
    public readonly sourcePath = "",
    public readonly ioBarrier = false,
  ) {}

  public withSourcePath(sourcePath: string): DocumentInfo {
    return new DocumentInfo(sourcePath, this.ioBarrier);
  }

  public withIoBarrier(ioBarrier: boolean): DocumentInfo {
    return new DocumentInfo(this.sourcePath, ioBarrier);
  }
}

