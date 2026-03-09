import { access, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createLogger } from "@hospitality-channels/common";
import type { Asset } from "@hospitality-channels/content-model";
import type { AssetStorage } from "./types.js";

const logger = createLogger("storage:local-fs");

export interface LocalFsStorageOptions {
  basePath: string;
}

export class LocalFsStorage implements AssetStorage {
  private basePath: string;

  constructor(options: LocalFsStorageOptions) {
    this.basePath = path.resolve(options.basePath);
  }

  private async ensureDir(dir: string): Promise<void> {
    await mkdir(dir, { recursive: true });
  }

  private getTypeDir(type: Asset["type"]): string {
    return path.join(this.basePath, type);
  }

  private generateId(filename: string): string {
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    return `${base}-${timestamp}-${random}${ext}`.replace(/[^a-zA-Z0-9.-]/g, "_");
  }

  async upload(
    file: Buffer | NodeJS.ReadableStream,
    options: { filename: string; type: Asset["type"]; tags?: string[] }
  ): Promise<{ path: string; id: string }> {
    const id = this.generateId(options.filename);
    const typeDir = this.getTypeDir(options.type);
    await this.ensureDir(typeDir);

    const filePath = path.join(typeDir, id);

    if (Buffer.isBuffer(file)) {
      await writeFile(filePath, file);
    } else {
      const chunks: Buffer[] = [];
      for await (const chunk of file) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      await writeFile(filePath, Buffer.concat(chunks));
    }

    logger.info("Uploaded asset", { id, type: options.type, path: filePath });

    return { path: filePath, id };
  }

  async getPath(id: string): Promise<string | null> {
    const types: Asset["type"][] = ["photo", "logo", "background", "video", "other"];
    for (const type of types) {
      const candidate = path.join(this.getTypeDir(type), id);
      try {
        await access(candidate);
        return candidate;
      } catch {
        // File doesn't exist, try next type
      }
    }
    const relativePath = path.join(this.basePath, id);
    try {
      await access(relativePath);
      return path.resolve(this.basePath, id);
    } catch {
      return null;
    }
  }

  async listByType(type: Asset["type"]): Promise<Array<{ id: string; path: string; tags?: string[] }>> {
    const typeDir = this.getTypeDir(type);
    try {
      await this.ensureDir(typeDir);
      const entries = await readdir(typeDir, { withFileTypes: true });
      return entries
        .filter((e) => e.isFile())
        .map((e) => ({
          id: e.name,
          path: path.join(typeDir, e.name),
        }));
    } catch (err) {
      logger.warn("List by type failed", { type, error: String(err) });
      return [];
    }
  }

  async delete(id: string): Promise<void> {
    const filePath = await this.getPath(id);
    if (filePath) {
      await rm(filePath, { force: true });
      logger.info("Deleted asset", { id, path: filePath });
    }
  }
}
