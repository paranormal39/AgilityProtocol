/**
 * In-Memory Replay Store
 * 
 * Non-persistent replay store for serverless/read-only environments and testing.
 */

import { TimestampAdapter } from './TimestampAdapter.js';

interface ReplayEntry {
  key: string;
  expiresAt: number;
  createdAt: number;
}

export interface IReplayStore {
  has(key: string): boolean;
  add(key: string, ttlSeconds: number): void;
  cleanup(): void;
  size(): number;
  clear(): void;
}

export class InMemoryReplayStore implements IReplayStore {
  private cache: Map<string, ReplayEntry>;

  constructor() {
    this.cache = new Map();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    const now = TimestampAdapter.nowEpochSeconds();
    if (entry.expiresAt < now) {
      this.cache.delete(key);
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
  }

  cleanup(): void {
    const now = TimestampAdapter.nowEpochSeconds();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }
}
