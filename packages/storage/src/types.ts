import type { Asset } from "@hospitality-channels/content-model";

export interface AssetStorage {
  upload(
    file: Buffer | NodeJS.ReadableStream,
    options: { filename: string; type: Asset["type"]; tags?: string[] }
  ): Promise<{ path: string; id: string }>;

  getPath(id: string): Promise<string | null>;

  listByType(type: Asset["type"]): Promise<Array<{ id: string; path: string; tags?: string[] }>>;

  delete(id: string): Promise<void>;
}
