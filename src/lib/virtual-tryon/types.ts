export interface TryOnRequest {
  userImageUrl: string;
  garmentImageUrl: string;
  category?: "tops" | "bottoms" | "dresses" | "outerwear";
}

export interface TryOnResult {
  resultUrl: string;
  provider: string;
  processingMs?: number;
}

export interface TryOnProvider {
  run(req: TryOnRequest): Promise<TryOnResult>;
}
