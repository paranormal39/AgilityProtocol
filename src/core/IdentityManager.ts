import * as crypto from 'node:crypto';
import type { Identity, IdentityCreateParams } from '../types/Identity.js';
import type { StateManager } from './StateManager.js';
import type { IXRPLAdapter } from '../adapters/xrpl/XRPLAdapter.js';
import type { IMidnightAdapter } from '../adapters/midnight/MidnightAdapter.js';

export class IdentityManager {
  private stateManager: StateManager;
  private xrplAdapter: IXRPLAdapter;
  private midnightAdapter: IMidnightAdapter;

  constructor(
    stateManager: StateManager,
    xrplAdapter: IXRPLAdapter,
    midnightAdapter: IMidnightAdapter
  ) {
    this.stateManager = stateManager;
    this.xrplAdapter = xrplAdapter;
    this.midnightAdapter = midnightAdapter;
  }

  async createIdentity(params: IdentityCreateParams): Promise<Identity> {
    const existingIdentity = await this.getIdentity();
    if (existingIdentity) {
      throw new Error('Identity already exists. Use getIdentity() to retrieve it.');
    }

    const identityId = this.generateIdentityId();
    const identityHash = this.generateIdentityHash(params.xrplAddress, params.midnightAddress);

    const identity: Identity = {
      id: identityId,
      xrplAddress: params.xrplAddress,
      midnightAddress: params.midnightAddress,
      identityHash,
      createdAt: new Date(),
      updatedAt: new Date(),
      anchored: false,
    };

    await this.stateManager.updateIdentityState({
      identity,
      initialized: true,
    });

    console.log(`[IdentityManager] Created identity: ${identityId}`);

    return identity;
  }

  async getIdentity(): Promise<Identity | null> {
    const state = this.stateManager.getIdentityState();
    return state.identity;
  }

  async anchorIdentity(): Promise<void> {
    const identity = await this.getIdentity();
    if (!identity) {
      throw new Error('No identity exists. Create one first using createIdentity().');
    }

    if (identity.anchored) {
      console.log('[IdentityManager] Identity already anchored');
      return;
    }

    if (!this.xrplAdapter.isConnected()) {
      await this.xrplAdapter.connect(identity.xrplAddress);
    }

    const anchorResult = await this.xrplAdapter.anchorHash(identity.identityHash);

    if (!anchorResult.success) {
      throw new Error(`Failed to anchor identity: ${anchorResult.error}`);
    }

    if (!this.midnightAdapter.isConnected()) {
      await this.midnightAdapter.connect(identity.midnightAddress);
    }

    const contractResult = await this.midnightAdapter.createIdentityContract(identity.id);

    if (!contractResult.success) {
      throw new Error(`Failed to create Midnight identity contract: ${contractResult.error}`);
    }

    const updatedIdentity: Identity = {
      ...identity,
      anchored: true,
      anchorTxHash: anchorResult.txHash,
      midnightContractId: contractResult.contractId,
      updatedAt: new Date(),
    };

    await this.stateManager.updateIdentityState({
      identity: updatedIdentity,
    });

    console.log(`[IdentityManager] Identity anchored. XRPL TX: ${anchorResult.txHash}`);
  }

  async updateIdentity(updates: Partial<Pick<Identity, 'xrplAddress' | 'midnightAddress'>>): Promise<Identity> {
    const identity = await this.getIdentity();
    if (!identity) {
      throw new Error('No identity exists. Create one first using createIdentity().');
    }

    const updatedIdentity: Identity = {
      ...identity,
      ...updates,
      updatedAt: new Date(),
    };

    if (updates.xrplAddress || updates.midnightAddress) {
      updatedIdentity.identityHash = this.generateIdentityHash(
        updatedIdentity.xrplAddress,
        updatedIdentity.midnightAddress
      );
      updatedIdentity.anchored = false;
      updatedIdentity.anchorTxHash = undefined;
    }

    await this.stateManager.updateIdentityState({
      identity: updatedIdentity,
    });

    return updatedIdentity;
  }

  private generateIdentityId(): string {
    return `agility_id_${crypto.randomUUID()}`;
  }

  private generateIdentityHash(xrplAddress: string, midnightAddress: string): string {
    const data = `${xrplAddress}:${midnightAddress}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
