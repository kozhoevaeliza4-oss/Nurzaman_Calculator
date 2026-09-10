import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { StorageAdapter } from './storage.interface';

@Injectable()
export class LocalDiskStorage implements StorageAdapter {
  private readonly root = process.env.DOCUMENTS_STORAGE_PATH || path.join(process.cwd(), 'storage', 'documents');

  async save(key: string, buffer: Buffer): Promise<void> {
    const filePath = this.resolve(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
  }

  read(key: string): Promise<Buffer> {
    return fs.readFile(this.resolve(key));
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.resolve(key), { force: true });
  }

  private resolve(key: string): string {
    // Guard against a key that escapes the storage root.
    const safeKey = path.normalize(key).replace(/^(\.\.[/\\])+/, '');
    return path.join(this.root, safeKey);
  }
}
