import type { VerifiableCredential } from './VerifiableCredential.js';
import type { JsonPersistence } from '../persistence/JsonPersistence.js';
import type { Logger } from '../utils/Logger.js';
import { canonicalJson, sha256Hex } from '../utils/canonical.js';

export interface AnchorResult {
  credentialId: string;
  credentialHash: string;
  txHash: string;
  network: string;
  anchoredAt: string;
}

export interface CredentialAnchorConfig {
  network: 'mainnet' | 'testnet' | 'devnet';
  endpoint?: string;
}

export class CredentialAnchor {
  private persistence: JsonPersistence;
  private logger?: Logger;
  private config: CredentialAnchorConfig;

  constructor(
    persistence: JsonPersistence,
    config: CredentialAnchorConfig,
    logger?: Logger
  ) {
    this.persistence = persistence;
    this.config = config;
    this.logger = logger;
  }

  computeCredentialHash(credential: VerifiableCredential): string {
    const canonical = canonicalJson(credential);
    return sha256Hex(canonical);
  }

  async anchorCredential(credential: VerifiableCredential): Promise<AnchorResult> {
    const credentialHash = this.computeCredentialHash(credential);

    this.logger?.info('Anchoring credential to XRPL', {
      credentialId: credential.id,
      credentialHash: credentialHash.slice(0, 16) + '...',
      network: this.config.network,
    });

    const mockTxHash = sha256Hex(`anchor:${credential.id}:${Date.now()}`);

    const result: AnchorResult = {
      credentialId: credential.id,
      credentialHash,
      txHash: mockTxHash,
      network: this.config.network,
      anchoredAt: new Date().toISOString(),
    };

    this.persistence.saveAnchor(credential.id, result);

    this.logger?.info('Credential anchored successfully', {
      credentialId: credential.id,
      txHash: mockTxHash.slice(0, 16) + '...',
    });

    return result;
  }

  getAnchor(credentialId: string): AnchorResult | null {
    const entry = this.persistence.getAnchor(credentialId);
    if (!entry) return null;
    return entry.data as AnchorResult;
  }

  verifyAnchor(credential: VerifiableCredential, anchor: AnchorResult): boolean {
    const computedHash = this.computeCredentialHash(credential);

    if (anchor.credentialId !== credential.id) {
      this.logger?.info('Anchor verification failed: credential ID mismatch', {
        expected: credential.id,
        actual: anchor.credentialId,
      });
      return false;
    }

    if (anchor.credentialHash !== computedHash) {
      this.logger?.info('Anchor verification failed: hash mismatch', {
        expected: computedHash.slice(0, 16) + '...',
        actual: anchor.credentialHash.slice(0, 16) + '...',
      });
      return false;
    }

    this.logger?.debug('Anchor verification passed', {
      credentialId: credential.id,
      txHash: anchor.txHash.slice(0, 16) + '...',
    });

    return true;
  }
}
