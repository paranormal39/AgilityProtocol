import type { ProofRequest, ProofResult, ProofResponse } from '../types/ProofRequest.js';
import type { PermissionDeckEngine } from './PermissionDeckEngine.js';
import type { GrantManager } from './GrantManager.js';
import type { IMidnightAdapter } from '../adapters/midnight/MidnightAdapter.js';
import type { IXRPLAdapter } from '../adapters/xrpl/XRPLAdapter.js';

export class ProofEngine {
  private deckEngine: PermissionDeckEngine;
  private grantManager: GrantManager;
  private midnightAdapter: IMidnightAdapter;
  private xrplAdapter: IXRPLAdapter;

  constructor(
    deckEngine: PermissionDeckEngine,
    grantManager: GrantManager,
    midnightAdapter: IMidnightAdapter,
    xrplAdapter: IXRPLAdapter
  ) {
    this.deckEngine = deckEngine;
    this.grantManager = grantManager;
    this.midnightAdapter = midnightAdapter;
    this.xrplAdapter = xrplAdapter;
  }

  async handleProofRequest(request: ProofRequest): Promise<ProofResult> {
    console.log(`[ProofEngine] Handling proof request: ${request.id}`);
    console.log(`[ProofEngine] Required permissions: ${request.requiredPermissions.join(', ')}`);

    if (this.isRequestExpired(request)) {
      return {
        success: false,
        error: 'Proof request has expired',
      };
    }

    const hasGrant = await this.grantManager.hasActiveGrantForApp(
      request.requesterApp,
      request.requiredPermissions
    );

    if (!hasGrant) {
      console.log(`[ProofEngine] No active grant found for app: ${request.requesterApp}`);
      return {
        success: false,
        error: `No active grant found for app: ${request.requesterApp}. User must grant permission first.`,
      };
    }

    const matchingDeck = await this.deckEngine.findMatchingDeck(request);
    if (!matchingDeck) {
      return {
        success: false,
        error: 'No matching permission deck found for the requested permissions',
      };
    }

    if (!this.midnightAdapter.isConnected()) {
      return {
        success: false,
        error: 'Midnight adapter not connected. Cannot generate proof.',
      };
    }

    const proofResult = await this.midnightAdapter.generateProof(request);

    if (!proofResult.success || !proofResult.proof) {
      return {
        success: false,
        error: proofResult.error ?? 'Failed to generate proof',
      };
    }

    const grants = await this.grantManager.getGrantsForApp(request.requesterApp);
    const matchingGrant = grants.find((g) =>
      request.requiredPermissions.every((p) => g.permissions.includes(p))
    );

    const response: ProofResponse = {
      requestId: request.id,
      proof: proofResult.proof,
      verified: proofResult.verified ?? false,
      grantId: matchingGrant?.id,
      timestamp: new Date(),
    };

    if (this.xrplAdapter.isConnected()) {
      const receiptResult = await this.xrplAdapter.submitReceipt({
        type: 'proof_generated',
        requestId: request.id,
        timestamp: response.timestamp,
      });

      if (!receiptResult.success) {
        console.warn(`[ProofEngine] Failed to submit settlement receipt: ${receiptResult.error}`);
      } else {
        console.log(`[ProofEngine] Settlement receipt submitted: ${receiptResult.txHash}`);
      }
    }

    console.log(`[ProofEngine] Proof generated successfully for request: ${request.id}`);

    return {
      success: true,
      response,
    };
  }

  async validateProofRequest(request: ProofRequest): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!request.id) {
      errors.push('Request ID is required');
    }

    if (!request.requesterId) {
      errors.push('Requester ID is required');
    }

    if (!request.requesterApp) {
      errors.push('Requester app is required');
    }

    if (!request.requiredPermissions || request.requiredPermissions.length === 0) {
      errors.push('At least one required permission must be specified');
    }

    if (this.isRequestExpired(request)) {
      errors.push('Request has expired');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async canFulfillRequest(request: ProofRequest): Promise<boolean> {
    const matchingDeck = await this.deckEngine.findMatchingDeck(request);
    return matchingDeck !== null;
  }

  private isRequestExpired(request: ProofRequest): boolean {
    if (!request.expiresAt) return false;
    return new Date(request.expiresAt) < new Date();
  }
}
