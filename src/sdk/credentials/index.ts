/**
 * Agility SDK - Credentials Module
 * 
 * Provides functions for issuing and verifying Verifiable Credentials.
 */

import { CredentialIssuer, type IssueCredentialOptions } from '../../credentials/CredentialIssuer.js';
import { CredentialStore } from '../../credentials/CredentialStore.js';
import { MidnightCredentialStore } from '../../credentials/MidnightCredentialStore.js';
import {
  type VerifiableCredential,
  type CredentialClaims,
  validateVerifiableCredential,
  isValidVerifiableCredential,
  extractClaimPermissions,
} from '../../credentials/VerifiableCredential.js';
import type { JsonPersistence } from '../../persistence/JsonPersistence.js';
import type { Logger } from '../../utils/Logger.js';
import type { IMidnightStorageAdapter } from '../../adapters/midnight/IMidnightAdapter.js';
import { PROTOCOL_VERSION } from '../../constants/protocol.js';

export interface CredentialsConfig {
  persistence: JsonPersistence;
  logger?: Logger;
}

export interface MidnightCredentialsConfig {
  adapter: IMidnightStorageAdapter;
  logger?: Logger;
}

export class Credentials {
  private issuer: CredentialIssuer;
  private store: CredentialStore;
  private logger?: Logger;
  private initialized: boolean = false;

  constructor(config: CredentialsConfig) {
    this.issuer = new CredentialIssuer(config.persistence, config.logger);
    this.store = new CredentialStore(config.persistence);
    this.logger = config.logger;
  }

  async initialize(): Promise<void> {
    await this.issuer.initialize();
    this.initialized = true;
    this.logger?.debug('Credentials module initialized');
  }

  issueCredential(options: IssueCredentialOptions): VerifiableCredential {
    this.ensureInitialized();
    return this.issuer.issueCredential(options);
  }

  saveCredential(credential: VerifiableCredential): void {
    this.store.saveCredential(credential);
  }

  getCredential(credentialId: string): VerifiableCredential | undefined {
    return this.store.getCredential(credentialId);
  }

  getCredentialsBySubject(subjectId: string): VerifiableCredential[] {
    return this.store.getCredentialsBySubject(subjectId);
  }

  getAllCredentials(): VerifiableCredential[] {
    return this.store.getAllCredentials();
  }

  findCredentialWithClaims(subjectId: string, requiredClaims: string[]): VerifiableCredential | undefined {
    return this.store.findCredentialWithClaims(subjectId, requiredClaims);
  }

  extractPermissions(credential: VerifiableCredential): string[] {
    return extractClaimPermissions(credential.claims as CredentialClaims);
  }

  getIssuerId(): string {
    return this.issuer.getIssuerId();
  }

  getProtocolVersion(): string {
    return PROTOCOL_VERSION;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Credentials not initialized. Call initialize() first.');
    }
  }
}

export async function initCredentials(config: CredentialsConfig): Promise<Credentials> {
  const credentials = new Credentials(config);
  await credentials.initialize();
  return credentials;
}

export function issueCredential(
  credentials: Credentials,
  options: IssueCredentialOptions
): VerifiableCredential {
  return credentials.issueCredential(options);
}

export function createMidnightCredentialStore(
  config: MidnightCredentialsConfig
): MidnightCredentialStore {
  return new MidnightCredentialStore(config);
}

export {
  validateVerifiableCredential,
  isValidVerifiableCredential,
  extractClaimPermissions,
  PROTOCOL_VERSION,
};

export type { VerifiableCredential, IssueCredentialOptions };
