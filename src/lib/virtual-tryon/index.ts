import type { TryOnProvider } from "./types";
import { kolorsProvider } from "./kolors";

const providers: Record<string, TryOnProvider> = {
  kolors: kolorsProvider,
};

const providerKey = process.env.TRYON_PROVIDER ?? "kolors";

export const tryOnProvider: TryOnProvider = providers[providerKey] ?? kolorsProvider;
export type { TryOnRequest, TryOnResult, TryOnProvider } from "./types";
