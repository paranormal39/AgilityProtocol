import type { StorageAdapter } from '../storage/StorageAdapter.js';
import type { IdentityState } from '../types/Identity.js';
import type { PermissionDeckState } from '../types/PermissionDeck.js';
import type { GrantState } from '../types/Grant.js';

export interface AgilityState {
  identity: IdentityState;
  decks: PermissionDeckState;
  grants: GrantState;
  initialized: boolean;
  version: string;
}

const STORAGE_KEY = 'agility_state';
const STATE_VERSION = '1.0.0';

export class StateManager {
  private storage: StorageAdapter;
  private state: AgilityState;

  constructor(storage: StorageAdapter) {
    this.storage = storage;
    this.state = this.getDefaultState();
  }

  private getDefaultState(): AgilityState {
    return {
      identity: {
        identity: null,
        initialized: false,
      },
      decks: {
        decks: [],
      },
      grants: {
        grants: [],
      },
      initialized: false,
      version: STATE_VERSION,
    };
  }

  async initialize(): Promise<void> {
    const savedState = await this.storage.load<AgilityState>(STORAGE_KEY);

    if (savedState) {
      this.state = {
        ...this.getDefaultState(),
        ...savedState,
        initialized: true,
      };
    } else {
      this.state = {
        ...this.getDefaultState(),
        initialized: true,
      };
    }

    await this.persist();
  }

  async persist(): Promise<void> {
    await this.storage.save(STORAGE_KEY, this.state);
  }

  getState(): AgilityState {
    return { ...this.state };
  }

  getIdentityState(): IdentityState {
    return { ...this.state.identity };
  }

  getDeckState(): PermissionDeckState {
    return { ...this.state.decks };
  }

  getGrantState(): GrantState {
    return { ...this.state.grants };
  }

  async updateIdentityState(identityState: Partial<IdentityState>): Promise<void> {
    this.state.identity = {
      ...this.state.identity,
      ...identityState,
    };
    await this.persist();
  }

  async updateDeckState(deckState: Partial<PermissionDeckState>): Promise<void> {
    this.state.decks = {
      ...this.state.decks,
      ...deckState,
    };
    await this.persist();
  }

  async updateGrantState(grantState: Partial<GrantState>): Promise<void> {
    this.state.grants = {
      ...this.state.grants,
      ...grantState,
    };
    await this.persist();
  }

  async reset(): Promise<void> {
    this.state = this.getDefaultState();
    await this.storage.delete(STORAGE_KEY);
  }

  isInitialized(): boolean {
    return this.state.initialized;
  }
}
