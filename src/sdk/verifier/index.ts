/**
 * Agility SDK - Verifier Module
 * 
 * Provides functions for creating proof requests and verifying proofs.
 */

import { ProofProtocol, type CreateRequestOptions, type VerifyResult } from '../../protocol/ProofProtocol.js';
import type { ProofRequest } from '../../schemas/ProofRequest.js';
import type { ProofResponse } from '../../schemas/ProofResponse.js';
import type { ConsentGrant } from '../../schemas/ConsentGrant.js';
import type { Receipt } from '../../schemas/Receipt.js';
import type { VerifiableCredential } from '../../credentials/VerifiableCredential.js';
import type { JsonPersistence } from '../../persistence/JsonPersistence.js';
import type { Logger } from '../../utils/Logger.js';
import { generateNonce as _generateNonce } from '../../utils/canonical.js';
import { PROTOCOL_VERSION, isProtocolVersionSupported, UnsupportedProtocolVersionError } from '../../constants/protocol.js';

export interface VerifierConfig {
  persistence: JsonPersistence;
  logger?: Logger;
}

export interface CreateProofRequestOptions {
  audience: string;
  requiredPermissions: string[];
  ttlSeconds?: number;
}

export interface VerifyProofOptions {
  request: ProofRequest;
  proof: ProofResponse;
  grant?: ConsentGrant;
  credential?: VerifiableCredential;
}

export class Verifier {
  private protocol: ProofProtocol;
  private logger?: Logger;

  constructor(config: VerifierConfig) {
    this.protocol = new ProofProtocol(config.persistence, config.logger);
    this.logger = config.logger;
  }

  async createProofRequest(options: CreateProofRequestOptions): Promise<ProofRequest> {
    this.logger?.debug('Creating ProofRequest', { audience: options.audience });
    return this.protocol.createRequest(options);
  }

  verifyProof(options: VerifyProofOptions): VerifyResult {
    const { request, proof, grant, credential } = options;

    if (proof.protocolVersion && !isProtocolVersionSupported(proof.protocolVersion)) {
      throw new UnsupportedProtocolVersionError(proof.protocolVersion);
    }

    this.logger?.debug('Verifying proof', { proofId: proof.proofId, requestId: request.requestId });

    if (credential) {
      return this.protocol.verifyCredentialProof(request, proof, credential, grant);
    }

    return this.protocol.verify(request, proof, grant);
  }

  verifyCredentialProof(
    request: ProofRequest,
    proof: ProofResponse,
    credential: VerifiableCredential,
    grant?: ConsentGrant
  ): VerifyResult {
    if (proof.protocolVersion && !isProtocolVersionSupported(proof.protocolVersion)) {
      throw new UnsupportedProtocolVersionError(proof.protocolVersion);
    }

    return this.protocol.verifyCredentialProof(request, proof, credential, grant);
  }

  createNonce(length: number = 16): string {
    return _generateNonce(length);
  }

  getProtocolVersion(): string {
    return PROTOCOL_VERSION;
  }
}

export function createVerifier(config: VerifierConfig): Verifier {
  return new Verifier(config);
}

export function createProofRequest(
  protocol: ProofProtocol,
  options: CreateProofRequestOptions
): Promise<ProofRequest> {
  return protocol.createRequest(options);
}

export function verifyProof(
  protocol: ProofProtocol,
  request: ProofRequest,
  proof: ProofResponse,
  grant?: ConsentGrant
): VerifyResult {
  if (proof.protocolVersion && !isProtocolVersionSupported(proof.protocolVersion)) {
    throw new UnsupportedProtocolVersionError(proof.protocolVersion);
  }
  return protocol.verify(request, proof, grant);
}

export function verifyCredentialProof(
  protocol: ProofProtocol,
  request: ProofRequest,
  proof: ProofResponse,
  credential: VerifiableCredential,
  grant?: ConsentGrant
): VerifyResult {
  if (proof.protocolVersion && !isProtocolVersionSupported(proof.protocolVersion)) {
    throw new UnsupportedProtocolVersionError(proof.protocolVersion);
  }
  return protocol.verifyCredentialProof(request, proof, credential, grant);
}

export function createNonce(length: number = 16): string {
  return _generateNonce(length);
}

export { PROTOCOL_VERSION };
