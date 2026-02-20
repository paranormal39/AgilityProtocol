/**
 * Pairwise DID Module
 * 
 * Provides deterministic pairwise DID derivation for privacy and anti-correlation.
 * Each audience gets a unique DID derived from the master DID.
 */

import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

const DID_MAP_FILE = path.join(process.cwd(), 'data', 'did-map.json');

/**
 * DID mapping entry for UX.
 */
interface DidMapEntry {
  masterDid: string;
  audience: string;
  pairwiseDid: string;
  createdAt: string;
}

/**
 * DID map data structure.
 */
interface DidMapData {
  entries: DidMapEntry[];
  lastUpdated: string;
}

/**
 * Derive a pairwise DID from a master DID and audience.
 * 
 * The derivation is deterministic: same inputs always produce same output.
 * Format: did:agility:pairwise:<hex-hash>
 * 
 * @param masterDid - The user's master DID
 * @param audience - The audience identifier (e.g., app DID or domain)
 * @returns Pairwise DID string
 */
export function derivePairwiseDid(masterDid: string, audience: string): string {
  const input = `${masterDid}|${audience}`;
  const hash = createHash('sha256').update(input).digest('hex');
  // Use first 32 chars (128 bits) for reasonable length
  return `did:agility:pairwise:${hash.slice(0, 32)}`;
}

/**
 * Check if a DID is a pairwise DID.
 */
export function isPairwiseDid(did: string): boolean {
  return did.startsWith('did:agility:pairwise:');
}

/**
 * Extract the hash portion from a pairwise DID.
 */
export function extractPairwiseHash(pairwiseDid: string): string | null {
  if (!isPairwiseDid(pairwiseDid)) {
    return null;
  }
  return pairwiseDid.replace('did:agility:pairwise:', '');
}

/**
 * Pairwise DID manager for storing and retrieving mappings.
 */
export class PairwiseDidManager {
  private entries: Map<string, DidMapEntry> = new Map();
  private filePath: string;
  private dirty: boolean = false;

  constructor(filePath: string = DID_MAP_FILE) {
    this.filePath = filePath;
    this.load();
  }

  /**
   * Load mappings from file.
   */
  private load(): void {
    try {
      if (!fs.existsSync(this.filePath)) {
        return;
      }

      const data = fs.readFileSync(this.filePath, 'utf-8');
      const parsed: DidMapData = JSON.parse(data);

      for (const entry of parsed.entries) {
        const key = this.makeKey(entry.masterDid, entry.audience);
        this.entries.set(key, entry);
      }
    } catch (error) {
      // Start fresh if load fails
    }
  }

  /**
   * Save mappings to file.
   */
  private save(): void {
    if (!this.dirty) {
      return;
    }

    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data: DidMapData = {
        entries: Array.from(this.entries.values()),
        lastUpdated: new Date().toISOString(),
      };

      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
      this.dirty = false;
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Create a key for the map.
   */
  private makeKey(masterDid: string, audience: string): string {
    return `${masterDid}|${audience}`;
  }

  /**
   * Get or create a pairwise DID for the given master DID and audience.
   */
  getOrCreate(masterDid: string, audience: string): string {
    const key = this.makeKey(masterDid, audience);
    
    let entry = this.entries.get(key);
    if (entry) {
      return entry.pairwiseDid;
    }

    const pairwiseDid = derivePairwiseDid(masterDid, audience);
    entry = {
      masterDid,
      audience,
      pairwiseDid,
      createdAt: new Date().toISOString(),
    };

    this.entries.set(key, entry);
    this.dirty = true;
    this.save();

    return pairwiseDid;
  }

  /**
   * Get pairwise DID if it exists.
   */
  get(masterDid: string, audience: string): string | undefined {
    const key = this.makeKey(masterDid, audience);
    return this.entries.get(key)?.pairwiseDid;
  }

  /**
   * List all pairwise DIDs for a master DID.
   */
  listByMaster(masterDid: string): DidMapEntry[] {
    return Array.from(this.entries.values()).filter(
      entry => entry.masterDid === masterDid
    );
  }

  /**
   * Find the master DID for a pairwise DID.
   */
  findMaster(pairwiseDid: string): { masterDid: string; audience: string } | undefined {
    for (const entry of this.entries.values()) {
      if (entry.pairwiseDid === pairwiseDid) {
        return { masterDid: entry.masterDid, audience: entry.audience };
      }
    }
    return undefined;
  }

  /**
   * Get the number of mappings.
   */
  size(): number {
    return this.entries.size;
  }

  /**
   * Clear all mappings.
   */
  clear(): void {
    this.entries.clear();
    this.dirty = true;
    this.save();
  }
}

// Singleton instance
let managerInstance: PairwiseDidManager | null = null;

export function getPairwiseDidManager(filePath?: string): PairwiseDidManager {
  if (!managerInstance) {
    managerInstance = new PairwiseDidManager(filePath);
  }
  return managerInstance;
}

export function resetPairwiseDidManager(): void {
  managerInstance = null;
}
