export interface StorageAdapter {
  save(key: string, value: unknown): Promise<void>;
  load<T = unknown>(key: string): Promise<T | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

export interface EncryptedStorageAdapter extends StorageAdapter {
  setEncryptionKey(key: string): void;
}
