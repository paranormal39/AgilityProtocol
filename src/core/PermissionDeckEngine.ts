import * as crypto from 'node:crypto';
import type { PermissionDeck, PermissionDeckCreateParams } from '../types/PermissionDeck.js';
import type { ProofRequest } from '../types/ProofRequest.js';
import type { StateManager } from './StateManager.js';

export class PermissionDeckEngine {
  private stateManager: StateManager;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
  }

  async createDeck(params: PermissionDeckCreateParams): Promise<PermissionDeck> {
    this.validateDeckParams(params);

    const deck: PermissionDeck = {
      id: this.generateDeckId(),
      name: params.name,
      permissions: [...params.permissions],
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true,
    };

    const currentState = this.stateManager.getDeckState();
    await this.stateManager.updateDeckState({
      decks: [...currentState.decks, deck],
    });

    console.log(`[PermissionDeckEngine] Created deck: ${deck.name} (${deck.id})`);

    return deck;
  }

  async getDecks(): Promise<PermissionDeck[]> {
    const state = this.stateManager.getDeckState();
    return [...state.decks];
  }

  async getDeck(deckId: string): Promise<PermissionDeck | null> {
    const decks = await this.getDecks();
    return decks.find((d) => d.id === deckId) ?? null;
  }

  async getActiveDecks(): Promise<PermissionDeck[]> {
    const decks = await this.getDecks();
    return decks.filter((d) => d.active);
  }

  async updateDeck(
    deckId: string,
    updates: Partial<Pick<PermissionDeck, 'name' | 'permissions' | 'active'>>
  ): Promise<PermissionDeck> {
    const decks = await this.getDecks();
    const deckIndex = decks.findIndex((d) => d.id === deckId);

    if (deckIndex === -1) {
      throw new Error(`Deck not found: ${deckId}`);
    }

    const existingDeck = decks[deckIndex];
    if (!existingDeck) {
      throw new Error(`Deck not found: ${deckId}`);
    }

    const updatedDeck: PermissionDeck = {
      ...existingDeck,
      ...updates,
      updatedAt: new Date(),
    };

    decks[deckIndex] = updatedDeck;

    await this.stateManager.updateDeckState({ decks });

    console.log(`[PermissionDeckEngine] Updated deck: ${updatedDeck.name} (${updatedDeck.id})`);

    return updatedDeck;
  }

  async deleteDeck(deckId: string): Promise<void> {
    const decks = await this.getDecks();
    const filteredDecks = decks.filter((d) => d.id !== deckId);

    if (filteredDecks.length === decks.length) {
      throw new Error(`Deck not found: ${deckId}`);
    }

    await this.stateManager.updateDeckState({ decks: filteredDecks });

    console.log(`[PermissionDeckEngine] Deleted deck: ${deckId}`);
  }

  async findMatchingDeck(request: ProofRequest): Promise<PermissionDeck | null> {
    const activeDecks = await this.getActiveDecks();

    for (const deck of activeDecks) {
      if (this.deckMatchesRequest(deck, request)) {
        console.log(`[PermissionDeckEngine] Found matching deck: ${deck.name} for request ${request.id}`);
        return deck;
      }
    }

    console.log(`[PermissionDeckEngine] No matching deck found for request ${request.id}`);
    return null;
  }

  async findAllMatchingDecks(request: ProofRequest): Promise<PermissionDeck[]> {
    const activeDecks = await this.getActiveDecks();
    return activeDecks.filter((deck) => this.deckMatchesRequest(deck, request));
  }

  private deckMatchesRequest(deck: PermissionDeck, request: ProofRequest): boolean {
    return request.requiredPermissions.every((permission) =>
      deck.permissions.includes(permission)
    );
  }

  private validateDeckParams(params: PermissionDeckCreateParams): void {
    if (!params.name || params.name.trim().length === 0) {
      throw new Error('Deck name is required');
    }

    if (!params.permissions || params.permissions.length === 0) {
      throw new Error('At least one permission is required');
    }

    const invalidPermissions = params.permissions.filter(
      (p) => !p || p.trim().length === 0
    );

    if (invalidPermissions.length > 0) {
      throw new Error('All permissions must be non-empty strings');
    }
  }

  private generateDeckId(): string {
    return `deck_${crypto.randomUUID()}`;
  }
}
