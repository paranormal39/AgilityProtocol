/**
 * Deck Registry
 * 
 * Holds well-known deck definitions loaded from a local JSON file.
 */

import fs from 'fs';
import path from 'path';
import type { DeckDefinition, DeckRegistryEntry } from './types.js';

const REGISTRY_FILE = path.join(process.cwd(), 'decks', 'registry.json');

interface RegistryData {
  decks: DeckRegistryEntry[];
  version: string;
}

export class DeckRegistry {
  private decks: Map<string, DeckDefinition> = new Map();
  private loaded: boolean = false;

  constructor() {
    this.load();
  }

  /**
   * Load registry from file.
   */
  private load(): void {
    try {
      if (!fs.existsSync(REGISTRY_FILE)) {
        this.loadDefaults();
        return;
      }

      const data = fs.readFileSync(REGISTRY_FILE, 'utf-8');
      const parsed: RegistryData = JSON.parse(data);

      for (const entry of parsed.decks) {
        this.decks.set(entry.deck.deckId, entry.deck);
      }

      this.loaded = true;
    } catch (error) {
      this.loadDefaults();
    }
  }

  /**
   * Load default deck definitions.
   */
  private loadDefaults(): void {
    const defaultDecks: DeckDefinition[] = [
      {
        deckId: 'agility:kyc:v1',
        name: 'KYC Verification Deck',
        version: '1.0.0',
        issuer: 'did:agility:registry',
        description: 'Standard KYC verification permissions',
        permissions: [
          {
            id: 'agility:kyc:age_over_18',
            description: 'User is over 18 years old',
            evidenceType: 'zk',
            privacyLevel: 'boolean-only',
          },
          {
            id: 'agility:kyc:age_over_21',
            description: 'User is over 21 years old',
            evidenceType: 'zk',
            privacyLevel: 'boolean-only',
          },
          {
            id: 'agility:kyc:country_verified',
            description: 'User country has been verified',
            evidenceType: 'vc',
            privacyLevel: 'fields',
          },
          {
            id: 'agility:kyc:identity_verified',
            description: 'User identity has been verified',
            evidenceType: 'vc',
            privacyLevel: 'boolean-only',
          },
        ],
      },
      {
        deckId: 'agility:defi:v1',
        name: 'DeFi Access Deck',
        version: '1.0.0',
        issuer: 'did:agility:registry',
        description: 'DeFi platform access permissions',
        permissions: [
          {
            id: 'agility:defi:accredited_investor',
            description: 'User is an accredited investor',
            evidenceType: 'vc',
            privacyLevel: 'boolean-only',
          },
          {
            id: 'agility:defi:not_sanctioned',
            description: 'User is not on sanctions list',
            evidenceType: 'attestation',
            privacyLevel: 'boolean-only',
          },
          {
            id: 'agility:defi:wallet_age',
            description: 'Wallet age meets minimum requirement',
            evidenceType: 'onchain',
            privacyLevel: 'range',
          },
        ],
      },
      {
        deckId: 'agility:social:v1',
        name: 'Social Verification Deck',
        version: '1.0.0',
        issuer: 'did:agility:registry',
        description: 'Social identity verification permissions',
        permissions: [
          {
            id: 'agility:social:email_verified',
            description: 'User email has been verified',
            evidenceType: 'attestation',
            privacyLevel: 'boolean-only',
          },
          {
            id: 'agility:social:phone_verified',
            description: 'User phone has been verified',
            evidenceType: 'attestation',
            privacyLevel: 'boolean-only',
          },
          {
            id: 'agility:social:twitter_verified',
            description: 'User Twitter account verified',
            evidenceType: 'attestation',
            privacyLevel: 'boolean-only',
          },
        ],
      },
    ];

    for (const deck of defaultDecks) {
      this.decks.set(deck.deckId, deck);
    }

    this.loaded = true;
  }

  /**
   * Get a deck definition by ID.
   */
  get(deckId: string): DeckDefinition | undefined {
    return this.decks.get(deckId);
  }

  /**
   * List all deck definitions.
   */
  list(): DeckDefinition[] {
    return Array.from(this.decks.values());
  }

  /**
   * Check if a deck exists.
   */
  has(deckId: string): boolean {
    return this.decks.has(deckId);
  }

  /**
   * Get the number of registered decks.
   */
  size(): number {
    return this.decks.size;
  }

  /**
   * Save registry to file.
   */
  save(): void {
    const dir = path.dirname(REGISTRY_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const data: RegistryData = {
      version: '1.0.0',
      decks: Array.from(this.decks.values()).map(deck => ({
        deck,
        addedAt: new Date().toISOString(),
      })),
    };

    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }
}

// Singleton instance
let registryInstance: DeckRegistry | null = null;

export function getDeckRegistry(): DeckRegistry {
  if (!registryInstance) {
    registryInstance = new DeckRegistry();
  }
  return registryInstance;
}

export function resetDeckRegistry(): void {
  registryInstance = null;
}
