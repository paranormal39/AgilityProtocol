/**
 * Replay Store
 * 
 * Persistent storage for replay attack protection.
 * Stores proof keys with TTL to prevent proof reuse.
 */

import fs from 'fs';
import path from 'path';
import { getNow } from './config.js';

interface ReplayEntry {
  key: string;
  expiresAt: number;
  createdAt: number;
}

interface ReplayCache {
  entries: ReplayEntry[];
  lastCleanup: number;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const CACHE_FILE = path.join(DATA_DIR, 'replay-cache.json');

export class ReplayStore {
  private cache: Map<string, ReplayEntry>;
  private dirty: boolean = false;

  constructor() {
    this.cache = new Map();
    this.load();
  }

  /**
   * Check if a replay key exists and is not expired.
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    const now = getNow();
    if (entry.expiresAt < now) {
      this.cache.delete(key);
      this.dirty = true;
      return false;
    }

    return true;
  }

  /**
   * Add a replay key with TTL.
   * @param key - The replay key (format: ${prover.id}:${binding.requestHash})
   * @param ttlSeconds - Time to live in seconds
   */
  add(key: string, ttlSeconds: number): void {
    const now = getNow();
    const entry: ReplayEntry = {
      key,
      expiresAt: now + ttlSeconds,
      createdAt: now,
    };

    this.cache.set(key, entry);
    this.dirty = true;
    this.save();
  }

  /**
   * Remove expired entries from the cache.
   */
  cleanup(): void {
    const now = getNow();
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

  /**
   * Get the number of entries in the cache.
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clear all entries (for testing).
   */
  clear(): void {
    this.cache.clear();
    this.dirty = true;
    this.save();
  }

  /**
   * Load cache from persistent storage.
   */
  private load(): void {
    try {
      if (!fs.existsSync(CACHE_FILE)) {
        return;
      }

      const data = fs.readFileSync(CACHE_FILE, 'utf-8');
      const parsed: ReplayCache = JSON.parse(data);
      const now = getNow();

      // Load non-expired entries
      for (const entry of parsed.entries) {
        if (entry.expiresAt > now) {
          this.cache.set(entry.key, entry);
        }
      }
    } catch (error) {
      // Start fresh if load fails
    }
  }

  /**
   * Save cache to persistent storage.
   */
  private save(): void {
    if (!this.dirty) {
      return;
    }

    try {
      // Ensure data directory exists
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      const cacheData: ReplayCache = {
        entries: Array.from(this.cache.values()),
        lastCleanup: getNow(),
      };

      fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2), 'utf-8');
      this.dirty = false;
    } catch (error) {
      // Silently fail - replay protection will still work in-memory
    }
  }
}

// Singleton instance
let replayStoreInstance: ReplayStore | null = null;

export function getReplayStore(): ReplayStore {
  if (!replayStoreInstance) {
    replayStoreInstance = new ReplayStore();
  }
  return replayStoreInstance;
}

/**
 * Generate a replay key for a proof.
 * Format: ${prover.id}:${binding.requestHash}
 */
export function generateReplayKey(proverId: string, requestHash: string): string {
  return `${proverId}:${requestHash}`;
}

// Cleanup expired entries every 5 minutes
setInterval(() => {
  if (replayStoreInstance) {
    replayStoreInstance.cleanup();
  }
}, 5 * 60 * 1000);
