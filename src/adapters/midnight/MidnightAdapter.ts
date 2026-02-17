import * as crypto from 'node:crypto';
import type { Grant } from '../../types/Grant.js';
import type { ProofRequest } from '../../types/ProofRequest.js';
import type {
  MidnightConnectionConfig,
  MidnightContractResult,
  MidnightGrantResult,
  MidnightProofResult,
  MidnightWalletState,
} from './MidnightTypes.js';
import type { Logger } from '../../utils/Logger.js';

export interface IMidnightAdapter {
  connect(address: string, config?: MidnightConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getState(): MidnightWalletState;
  createIdentityContract(identityId: string): Promise<MidnightContractResult>;
  createGrant(grant: Grant): Promise<MidnightGrantResult>;
  revokeGrant(grantId: string): Promise<MidnightGrantResult>;
  generateProof(request: ProofRequest): Promise<MidnightProofResult>;
  getLastProofId(): string | null;
  getLastContractRef(): string | null;
  getLastGrantRef(): string | null;
}

export class MidnightAdapter implements IMidnightAdapter {
  private state: MidnightWalletState = {
    connected: false,
    address: null,
    network: null,
  };
  private logger?: Logger;
  private lastProofId: string | null = null;
  private lastContractRef: string | null = null;
  private lastGrantRef: string | null = null;

  constructor(logger?: Logger) {
    this.logger = logger;
  }

  setLogger(logger: Logger): void {
    this.logger = logger;
  }

  async connect(
    address: string,
    config: MidnightConnectionConfig = { network: 'testnet' }
  ): Promise<void> {
    this.state = {
      connected: true,
      address,
      network: config.network,
    };

    this.logger?.debug('MidnightAdapter.connect', { address, network: config.network });
    this.logger?.info(`Midnight connected to ${config.network} (${address})`);
  }

  async disconnect(): Promise<void> {
    this.logger?.debug('MidnightAdapter.disconnect', { previousState: this.state });

    this.state = {
      connected: false,
      address: null,
      network: null,
    };

    this.logger?.info('Midnight disconnected');
  }

  isConnected(): boolean {
    return this.state.connected;
  }

  getState(): MidnightWalletState {
    return { ...this.state };
  }

  getLastProofId(): string | null {
    return this.lastProofId;
  }

  getLastContractRef(): string | null {
    return this.lastContractRef;
  }

  getLastGrantRef(): string | null {
    return this.lastGrantRef;
  }

  async createIdentityContract(identityId: string): Promise<MidnightContractResult> {
    if (!this.state.connected) {
      this.logger?.error('createIdentityContract failed: not connected');
      return {
        success: false,
        error: 'Not connected to Midnight wallet',
      };
    }

    this.logger?.debug('MidnightAdapter.createIdentityContract', { identityId });

    const contractRef = `MID_CONTRACT_${identityId.slice(0, 10)}`;
    this.lastContractRef = contractRef;

    const result: MidnightContractResult = {
      success: true,
      contractId: contractRef,
    };

    this.logger?.info(`Midnight created identity contract -> contractRef=${contractRef}`);
    this.logger?.debug('createIdentityContract result', result);

    return result;
  }

  async createGrant(grant: Grant): Promise<MidnightGrantResult> {
    if (!this.state.connected) {
      this.logger?.error('createGrant failed: not connected');
      return {
        success: false,
        error: 'Not connected to Midnight wallet',
      };
    }

    this.logger?.debug('MidnightAdapter.createGrant', { grantId: grant.id, deckId: grant.deckId, targetApp: grant.targetApp });

    const grantRef = `MID_GRANT_${grant.id.slice(0, 10)}`;
    this.lastGrantRef = grantRef;

    const result: MidnightGrantResult = {
      success: true,
      grantId: grantRef,
    };

    this.logger?.info(`Midnight created grant -> grantRef=${grantRef}`);
    this.logger?.debug('createGrant result', result);

    return result;
  }

  async revokeGrant(grantId: string): Promise<MidnightGrantResult> {
    if (!this.state.connected) {
      this.logger?.error('revokeGrant failed: not connected');
      return {
        success: false,
        error: 'Not connected to Midnight wallet',
      };
    }

    this.logger?.debug('MidnightAdapter.revokeGrant', { grantId });
    this.logger?.info(`Midnight revoked grant -> grantId=${grantId}`);

    return {
      success: true,
      grantId,
    };
  }

  async generateProof(request: ProofRequest): Promise<MidnightProofResult> {
    if (!this.state.connected) {
      this.logger?.error('generateProof failed: not connected');
      return {
        success: false,
        error: 'Not connected to Midnight wallet',
      };
    }

    this.logger?.debug('MidnightAdapter.generateProof', { 
      requestId: request.id, 
      requiredPermissions: request.requiredPermissions 
    });

    const stableHash = crypto.createHash('sha256')
      .update(request.id + request.requiredPermissions.join(','))
      .digest('hex')
      .slice(0, 10);

    const proofId = `MID_PROOF_${stableHash}`;
    this.lastProofId = proofId;

    const result: MidnightProofResult = {
      success: true,
      proof: JSON.stringify({
        verified: true,
        proofId,
        satisfied: request.requiredPermissions,
        timestamp: new Date().toISOString(),
      }),
      verified: true,
    };

    this.logger?.info(`Midnight generated proof -> proofId=${proofId}`);
    this.logger?.debug('generateProof result', result);

    return result;
  }
}
