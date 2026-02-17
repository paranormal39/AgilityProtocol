/**
 * Agility SDK - Prover Module
 * 
 * Provides functions for identity management, consent grants, and proof generation.
 */

import { LocalProver } from '../../prover/LocalProver.js';
import type { ProofRequest } from '../../schemas/ProofRequest.js';
import type { ConsentGrant } from '../../schemas/ConsentGrant.js';
import type { ProofResponse } from '../../schemas/ProofResponse.js';
import type { VerifiableCredential } from '../../credentials/VerifiableCredential.js';
import type { JsonPersistence } from '../../persistence/JsonPersistence.js';
import type { Logger } from '../../utils/Logger.js';
import type { SignerProvider } from '../../signers/SignerProvider.js';
import { PROTOCOL_VERSION } from '../../constants/protocol.js';

export interface ProverConfig {
  persistence: JsonPersistence;
  logger?: Logger;
}

export interface CreateConsentGrantOptions {
  request: ProofRequest;
  permissions?: string[];
}

export interface GenerateProofOptions {
  request: ProofRequest;
  grant: ConsentGrant;
  deckPermissions?: string[];
}

export interface GenerateProofFromCredentialOptions {
  request: ProofRequest;
  grant: ConsentGrant;
  credential: VerifiableCredential;
}

export class Prover {
  private localProver: LocalProver;
  private logger?: Logger;
  private initialized: boolean = false;

  constructor(config: ProverConfig) {
    this.localProver = new LocalProver(config.persistence, config.logger);
    this.logger = config.logger;
  }

  async initialize(): Promise<void> {
    await this.localProver.initialize();
    this.initialized = true;
    this.logger?.debug('Prover initialized', { rootId: this.getRootId() });
  }

  getRootId(): string {
    return this.localProver.getRootId();
  }

  derivePairwiseId(audience: string): string {
    return this.localProver.getPairwiseId(audience);
  }

  createConsentGrant(options: CreateConsentGrantOptions): ConsentGrant {
    this.ensureInitialized();
    return this.localProver.createConsentGrant(options.request, options.permissions);
  }

  async createConsentGrantWithSigner(
    request: ProofRequest,
    signerProvider: SignerProvider,
    permissions?: string[]
  ): Promise<ConsentGrant> {
    this.ensureInitialized();
    return this.localProver.createConsentGrantWithSigner(request, signerProvider, permissions);
  }

  generateProof(options: GenerateProofOptions): ProofResponse {
    this.ensureInitialized();
    return this.localProver.generateProof(
      options.request,
      options.grant,
      options.deckPermissions
    );
  }

  generateProofFromCredential(options: GenerateProofFromCredentialOptions): ProofResponse {
    this.ensureInitialized();
    return this.localProver.generateProofFromCredential(
      options.request,
      options.credential,
      options.grant
    );
  }

  getLocalSigner() {
    this.ensureInitialized();
    return this.localProver.getLocalSigner();
  }

  getLocalSignerForAudience(audience: string) {
    this.ensureInitialized();
    return this.localProver.getLocalSignerForAudience(audience);
  }

  getProtocolVersion(): string {
    return PROTOCOL_VERSION;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Prover not initialized. Call initialize() first.');
    }
  }
}

export async function initProver(config: ProverConfig): Promise<Prover> {
  const prover = new Prover(config);
  await prover.initialize();
  return prover;
}

export function derivePairwiseId(prover: Prover, audience: string): string {
  return prover.derivePairwiseId(audience);
}

export function createConsentGrant(
  prover: Prover,
  options: CreateConsentGrantOptions
): ConsentGrant {
  return prover.createConsentGrant(options);
}

export function generateProof(
  prover: Prover,
  options: GenerateProofOptions
): ProofResponse {
  return prover.generateProof(options);
}

export function generateProofFromCredential(
  prover: Prover,
  options: GenerateProofFromCredentialOptions
): ProofResponse {
  return prover.generateProofFromCredential(options);
}

export { PROTOCOL_VERSION };
