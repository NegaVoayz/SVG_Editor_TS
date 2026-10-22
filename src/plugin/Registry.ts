import { BUILTIN_PROVIDERS } from "./BuiltinProviders.js";
import { ProviderParseError } from "./ShapeProvider.js";
import type { ShapeProvider } from "./ShapeProvider.js";

export class ShapeRegistry {
  private readonly providers = new Map<string, ShapeProvider>();

  public constructor(providers: readonly ShapeProvider[] = BUILTIN_PROVIDERS) {
    for (const provider of providers) {
      this.register(provider);
    }
  }

  public register(provider: ShapeProvider): void {
    if (this.providers.has(provider.kind)) {
      throw new ProviderParseError(
        `error: duplicate shape provider: ${provider.kind}`,
      );
    }
    this.providers.set(provider.kind, provider);
  }

  public provider(kind: string): ShapeProvider | undefined {
    return this.providers.get(kind);
  }

  public kinds(): readonly string[] {
    return [...this.providers.keys()];
  }
}

