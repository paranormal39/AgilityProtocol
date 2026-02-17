import * as crypto from 'node:crypto';
import type { Grant, GrantCreateParams } from '../types/Grant.js';
import type { StateManager } from './StateManager.js';
import type { PermissionDeckEngine } from './PermissionDeckEngine.js';
import type { IMidnightAdapter } from '../adapters/midnight/MidnightAdapter.js';

export class GrantManager {
  private stateManager: StateManager;
  private deckEngine: PermissionDeckEngine;
  private midnightAdapter: IMidnightAdapter;

  constructor(
    stateManager: StateManager,
    deckEngine: PermissionDeckEngine,
    midnightAdapter: IMidnightAdapter
  ) {
    this.stateManager = stateManager;
    this.deckEngine = deckEngine;
    this.midnightAdapter = midnightAdapter;
  }

  async grantPermission(params: GrantCreateParams): Promise<Grant> {
    const deck = await this.deckEngine.getDeck(params.deckId);
    if (!deck) {
      throw new Error(`Deck not found: ${params.deckId}`);
    }

    if (!deck.active) {
      throw new Error(`Deck is not active: ${params.deckId}`);
    }

    const grant: Grant = {
      id: this.generateGrantId(),
      deckId: params.deckId,
      targetApp: params.targetApp,
      permissions: [...deck.permissions],
      createdAt: new Date(),
      expiresAt: params.expiresAt,
      revoked: false,
    };

    if (this.midnightAdapter.isConnected()) {
      const result = await this.midnightAdapter.createGrant(grant);
      if (result.success) {
        grant.midnightGrantId = result.grantId;
      } else {
        console.warn(`[GrantManager] Failed to sync grant to Midnight: ${result.error}`);
      }
    }

    const currentState = this.stateManager.getGrantState();
    await this.stateManager.updateGrantState({
      grants: [...currentState.grants, grant],
    });

    console.log(`[GrantManager] Created grant: ${grant.id} for app: ${params.targetApp}`);

    return grant;
  }

  async revokeGrant(grantId: string): Promise<void> {
    const grants = await this.getAllGrants();
    const grantIndex = grants.findIndex((g) => g.id === grantId);

    if (grantIndex === -1) {
      throw new Error(`Grant not found: ${grantId}`);
    }

    const grant = grants[grantIndex];
    if (!grant) {
      throw new Error(`Grant not found: ${grantId}`);
    }

    if (grant.revoked) {
      console.log(`[GrantManager] Grant already revoked: ${grantId}`);
      return;
    }

    if (this.midnightAdapter.isConnected() && grant.midnightGrantId) {
      const result = await this.midnightAdapter.revokeGrant(grant.midnightGrantId);
      if (!result.success) {
        console.warn(`[GrantManager] Failed to revoke grant on Midnight: ${result.error}`);
      }
    }

    const revokedGrant: Grant = {
      ...grant,
      revoked: true,
      revokedAt: new Date(),
    };

    grants[grantIndex] = revokedGrant;

    await this.stateManager.updateGrantState({ grants });

    console.log(`[GrantManager] Revoked grant: ${grantId}`);
  }

  async getActiveGrants(): Promise<Grant[]> {
    const grants = await this.getAllGrants();
    const now = new Date();

    return grants.filter((grant) => {
      if (grant.revoked) return false;
      if (grant.expiresAt && new Date(grant.expiresAt) < now) return false;
      return true;
    });
  }

  async getAllGrants(): Promise<Grant[]> {
    const state = this.stateManager.getGrantState();
    return [...state.grants];
  }

  async getGrant(grantId: string): Promise<Grant | null> {
    const grants = await this.getAllGrants();
    return grants.find((g) => g.id === grantId) ?? null;
  }

  async getGrantsForApp(targetApp: string): Promise<Grant[]> {
    const activeGrants = await this.getActiveGrants();
    return activeGrants.filter((g) => g.targetApp === targetApp);
  }

  async getGrantsForDeck(deckId: string): Promise<Grant[]> {
    const grants = await this.getAllGrants();
    return grants.filter((g) => g.deckId === deckId);
  }

  async hasActiveGrantForApp(targetApp: string, requiredPermissions: string[]): Promise<boolean> {
    const grants = await this.getGrantsForApp(targetApp);

    return grants.some((grant) =>
      requiredPermissions.every((permission) => grant.permissions.includes(permission))
    );
  }

  async revokeAllGrantsForApp(targetApp: string): Promise<void> {
    const grants = await this.getGrantsForApp(targetApp);

    for (const grant of grants) {
      await this.revokeGrant(grant.id);
    }

    console.log(`[GrantManager] Revoked all grants for app: ${targetApp}`);
  }

  private generateGrantId(): string {
    return `grant_${crypto.randomUUID()}`;
  }
}
