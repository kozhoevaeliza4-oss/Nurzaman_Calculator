// Swappable storage backend. LocalDiskStorage (default, for dev/small
// single-site deployments) implements this; production should provide an
// S3-compatible implementation instead — nothing above this interface
// needs to change to do that.
export interface StorageAdapter {
  save(key: string, buffer: Buffer, mimeType: string): Promise<void>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

export const STORAGE_ADAPTER = Symbol('STORAGE_ADAPTER');
