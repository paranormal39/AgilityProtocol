/**
 * MidnightCredentialStore - Credential storage using Midnight encryption
 *
 * Provides encrypted credential storage via Midnight adapter.
 * Credentials are encrypted at rest and decrypted only when needed.
 */

import type { IMidnightStorageAdapter } from '../adapters/midnight/IMidnightAdapter.js';
import type { VerifiableCredential } from './VerifiableCredential.js';
import { validateVerifiableCredential } from './VerifiableCredential.js';
import type { Logger } from '../utils/Logger.js';

export interface MidnightCredentialStoreOptions {
  adapter: IMidnightStorageAdapter;
  logger?: Logger;
}

export class MidnightCredentialStore {
  private adapter: IMidnightStorageAdapter;
  private logger?: Logger;

  constructor(options: MidnightCredentialStoreOptions) {
    this.adapter = options.adapter;
    this.logger = options.logger;
  }

  /**
   * Store a credential encrypted in Midnight storage
   * @param credential - The credential to store
   * @returns Reference ID for retrieval
   */
  async storeCredential(credential: VerifiableCredential): Promise<string> {
    if (!this.adapter.isAvailable()) {
      throw new Error('Midnight adapter not available');
    }

    const vcJson = JSON.stringify(credential);
    const { ref } = await this.adapter.storeCredential(credential.subject, vcJson);

    this.logger?.info('Stored credential in Midnight storage', {
      credentialId: credential.id,
      subject: credential.subject,
      ref,
    });

    return ref;
  }

  /**
   * Load a credential from Midnight storage by reference
   * @param ref - Reference ID from storeCredential
   * @returns Decrypted and validated credential
   */
  async loadCredential(ref: string): Promise<VerifiableCredential> {
    if (!this.adapter.isAvailable()) {
      throw new Error('Midnight adapter not available');
    }

    const { vcJson } = await this.adapter.loadCredential(ref);
    const parsed = JSON.parse(vcJson);
    const credential = validateVerifiableCredential(parsed);

    this.logger?.debug('Loaded credential from Midnight storage', {
      ref,
      credentialId: credential.id,
    });

    return credential;
  }

  /**
   * List all credential references for a subject
   * @param subjectId - Subject identifier
   * @returns Array of reference IDs
   */
  async listCredentialRefs(subjectId: string): Promise<string[]> {
    if (!this.adapter.isAvailable()) {
      throw new Error('Midnight adapter not available');
    }

    return this.adapter.listCredentialRefs(subjectId);
  }

  /**
   * Delete a credential from Midnight storage
   * @param ref - Reference ID
   */
  async deleteCredential(ref: string): Promise<void> {
    if (!this.adapter.isAvailable()) {
      throw new Error('Midnight adapter not available');
    }

    await this.adapter.deleteCredential(ref);

    this.logger?.info('Deleted credential from Midnight storage', { ref });
  }

  /**
   * Check if Midnight storage is available
   */
  isAvailable(): boolean {
    return this.adapter.isAvailable();
  }

  /**
   * Get the storage mode (local or sdk)
   */
  getMode(): 'local' | 'sdk' {
    return this.adapter.getMode();
  }
}
