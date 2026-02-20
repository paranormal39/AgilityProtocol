/**
 * Deck Store
 * 
 * Persists user deck instances to a local JSON file.
 */

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { DeckInstance, DeckStoreData, SourceRef } from './types.js';
import { getDeckRegistry } from './DeckRegistry.js';

const DEFAULT_STORE_FILE = path.join(process.cwd(), 'data', 'decks.json');

export class DeckStore {
  private instances: Map<string, DeckInstance> = new Map();
  private filePath: string;
  private dirty: boolean = false;

  constructor(filePath: string = DEFAULT_STORE_FILE) {
    this.filePath = filePath;
    this.load();
  }

  /**
   * Load instances from file.
   */
  private load(): void {
    try {
      if (!fs.existsSync(this.filePath)) {
        return;
      }

      const data = fs.readFileSync(this.filePath, 'utf-8');
      const parsed: DeckStoreData = JSON.parse(data);

      for (const instance of parsed.instances) {
        this.instances.set(instance.instanceId, instance);
      }
    } catch (error) {
      // Start fresh if load fails
    }
  }

  /**
   * Save instances to file.
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

      const data: DeckStoreData = {
        instances: Array.from(this.instances.values()),
        lastUpdated: new Date().toISOString(),
      };

      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
      this.dirty = false;
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Create a new deck instance.
   */
  create(options: {
    deckId: string;
    ownerDid: string;
    name?: string;
    sources?: Record<string, SourceRef>;
  }): DeckInstance {
    const registry = getDeckRegistry();
    const deck = registry.get(options.deckId);

    if (!deck) {
      throw new Error(`Deck not found: ${options.deckId}`);
    }

    const instance: DeckInstance = {
      instanceId: randomUUID(),
      deckId: options.deckId,
      ownerDid: options.ownerDid,
      createdAt: new Date().toISOString(),
      sources: options.sources || {},
      name: options.name,
    };

    this.instances.set(instance.instanceId, instance);
    this.dirty = true;
    this.save();

    return instance;
  }

  /**
   * Get a deck instance by ID.
   */
  get(instanceId: string): DeckInstance | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * List all deck instances.
   */
  list(): DeckInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * List deck instances by owner.
   */
  listByOwner(ownerDid: string): DeckInstance[] {
    return Array.from(this.instances.values()).filter(
      instance => instance.ownerDid === ownerDid
    );
  }

  /**
   * List deck instances by deck ID.
   */
  listByDeck(deckId: string): DeckInstance[] {
    return Array.from(this.instances.values()).filter(
      instance => instance.deckId === deckId
    );
  }

  /**
   * Update a deck instance's sources.
   */
  updateSources(instanceId: string, sources: Record<string, SourceRef>): DeckInstance | undefined {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return undefined;
    }

    instance.sources = { ...instance.sources, ...sources };
    this.dirty = true;
    this.save();

    return instance;
  }

  /**
   * Delete a deck instance.
   */
  delete(instanceId: string): boolean {
    const deleted = this.instances.delete(instanceId);
    if (deleted) {
      this.dirty = true;
      this.save();
    }
    return deleted;
  }

  /**
   * Get the number of instances.
   */
  size(): number {
    return this.instances.size;
  }

  /**
   * Clear all instances.
   */
  clear(): void {
    this.instances.clear();
    this.dirty = true;
    this.save();
  }
}

// Singleton instance
let storeInstance: DeckStore | null = null;

export function getDeckStore(filePath?: string): DeckStore {
  if (!storeInstance) {
    storeInstance = new DeckStore(filePath);
  }
  return storeInstance;
}

export function resetDeckStore(): void {
  storeInstance = null;
}
