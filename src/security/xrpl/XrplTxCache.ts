/**
 * XRPL Transaction Cache
 * 
 * Simple in-memory cache for XRPL transactions to improve demo performance.
 */

import type { NormalizedXrplTx } from './XrplClient.js';

interface CacheEntry {
  tx: NormalizedXrplTx;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class XrplTxCache {
  private cache: Map<string, CacheEntry> = new Map();
  private ttlMs: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  /**
   * Get a transaction from cache.
   */
  get(txHash: string): NormalizedXrplTx | null {
    const entry = this.cache.get(txHash);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      this.cache.delete(txHash);
      return null;
    }

    return entry.tx;
  }

  /**
   * Set a transaction in cache.
   */
  set(txHash: string, tx: NormalizedXrplTx): void {
    this.cache.set(txHash, {
      tx,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  /**
   * Check if a transaction is in cache.
   */
  has(txHash: string): boolean {
    return this.get(txHash) !== null;
  }

  /**
   * Clear the cache.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size.
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Remove expired entries.
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }
}

// Singleton instance
let cacheInstance: XrplTxCache | null = null;

export function getXrplTxCache(): XrplTxCache {
  if (!cacheInstance) {
    cacheInstance = new XrplTxCache();
  }
  return cacheInstance;
}

export function resetXrplTxCache(): void {
  cacheInstance = null;
}
