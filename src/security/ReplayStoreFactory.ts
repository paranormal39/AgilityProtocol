/**
 * Replay Store Factory
 * 
 * Creates replay stores based on configuration.
 * Supports file-backed and in-memory stores.
 */

import fs from 'fs';
import path from 'path';
import { TimestampAdapter } from './TimestampAdapter.js';
import { InMemoryReplayStore, type IReplayStore } from './InMemoryReplayStore.js';

interface ReplayEntry {
  key: string;
  expiresAt: number;
  createdAt: number;
}

interface ReplayCache {
  entries: ReplayEntry[];
  lastCleanup: number;
}

export interface ReplayStoreConfig {
  type: 'file' | 'memory';
  path?: string;
}

/**
 * File-backed replay store implementation.
 */
export class FileReplayStore implements IReplayStore {
  private cache: Map<string, ReplayEntry>;
  private dirty: boolean = false;
  private filePath: string;
  private dataDir: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.dataDir = path.dirname(filePath);
    this.cache = new Map();
    this.load();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    const now = TimestampAdapter.nowEpochSeconds();
    if (entry.expiresAt < now) {
      this.cache.delete(key);
      this.dirty = true;
      return false;
    }

    return true;
  }

  add(key: string, ttlSeconds: number): void {
    const now = TimestampAdapter.nowEpochSeconds();
    const entry: ReplayEntry = {
      key,
      expiresAt: now + ttlSeconds,
      createdAt: now,
    };

    this.cache.set(key, entry);
    this.dirty = true;
    this.save();
  }

  cleanup(): void {
    const now = TimestampAdapter.nowEpochSeconds();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.dirty = true;
      this.save();
    }
  }

  size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
    this.dirty = true;
    this.save();
  }

  private load(): void {
    try {
      if (!fs.existsSync(this.filePath)) {
        return;
      }

      const data = fs.readFileSync(this.filePath, 'utf-8');
      const parsed: ReplayCache = JSON.parse(data);
      const now = TimestampAdapter.nowEpochSeconds();

      for (const entry of parsed.entries) {
        if (entry.expiresAt > now) {
          this.cache.set(entry.key, entry);
        }
      }
    } catch (error) {
      // Start fresh if load fails
    }
  }

  private save(): void {
    if (!this.dirty) {
      return;
    }

    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      const cacheData: ReplayCache = {
        entries: Array.from(this.cache.values()),
        lastCleanup: TimestampAdapter.nowEpochSeconds(),
      };

      fs.writeFileSync(this.filePath, JSON.stringify(cacheData, null, 2), 'utf-8');
      this.dirty = false;
    } catch (error) {
      // Silently fail
    }
  }
}

// Default paths
const DEFAULT_DATA_DIR = path.join(process.cwd(), 'data');
const DEFAULT_CACHE_FILE = path.join(DEFAULT_DATA_DIR, 'replay-cache.json');

// Singleton instances
let fileStoreInstance: FileReplayStore | null = null;
let memoryStoreInstance: InMemoryReplayStore | null = null;
let activeStore: IReplayStore | null = null;

/**
 * Create a replay store based on configuration.
 */
export function createReplayStore(config: ReplayStoreConfig): IReplayStore {
  if (config.type === 'memory') {
    return new InMemoryReplayStore();
  }
  
  const filePath = config.path || DEFAULT_CACHE_FILE;
  return new FileReplayStore(filePath);
}

/**
 * Get the global replay store instance.
 * Defaults to file-backed store.
 */
export function getReplayStore(config?: ReplayStoreConfig): IReplayStore {
  if (config) {
    activeStore = createReplayStore(config);
    return activeStore;
  }

  if (activeStore) {
    return activeStore;
  }

  // Default to file store
  if (!fileStoreInstance) {
    fileStoreInstance = new FileReplayStore(DEFAULT_CACHE_FILE);
  }
  activeStore = fileStoreInstance;
  return activeStore;
}

/**
 * Reset the global replay store (for testing).
 */
export function resetReplayStore(): void {
  activeStore = null;
  fileStoreInstance = null;
  memoryStoreInstance = null;
}

/**
 * Generate a replay key for a proof.
 * Format: ${prover.id}:${binding.requestHash}
 */
export function generateReplayKey(proverId: string, requestHash: string): string {
  return `${proverId}:${requestHash}`;
}
