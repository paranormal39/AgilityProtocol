import { createHash, randomBytes } from 'crypto';
import type { ProofRequest } from '../schemas/ProofRequest.js';
import type { ConsentGrant, Signer } from '../schemas/ConsentGrant.js';
import type { ProofResponse, Prover } from '../schemas/ProofResponse.js';
import type { Receipt } from '../schemas/Receipt.js';
import { validateProofRequest, validateConsentGrant, validateProofResponse } from '../schemas/index.js';
import { canonicalJson, sha256Hex, generateNonce, generateUUID } from '../utils/canonical.js';
import type { JsonPersistence } from '../persistence/JsonPersistence.js';
import type { Logger } from '../utils/Logger.js';
import type { VerifiableCredential } from '../credentials/VerifiableCredential.js';
import { validateVerifiableCredential, extractClaimPermissions } from '../credentials/VerifiableCredential.js';
import { PROTOCOL_VERSION, isProtocolVersionSupported, UnsupportedProtocolVersionError } from '../constants/protocol.js';
import {
  validateTimeRange,
  VerificationErrorCode,
  ENABLE_REPLAY_PROTECTION,
  MAX_PROOF_AGE_SECONDS,
  isoToSeconds,
  getNow,
} from '../security/config.js';
import { getReplayStore, generateReplayKey } from '../security/ReplayStore.js';

export interface CreateRequestOptions {
  audience: string;
  requiredPermissions: string[];
  ttlSeconds?: number;
}

export interface CreateGrantOptions {
  request: ProofRequest;
  permissions?: string[];
}

export interface CreateProofOptions {
  request: ProofRequest;
  grant: ConsentGrant;
  deckPermissions: string[];
}

export interface VerifyResult {
  valid: boolean;
  errors: string[];
  errorCodes?: VerificationErrorCode[];
  checks: {
    schemaValid: boolean;
    notExpired: boolean;
    timeRangeValid: boolean;
    notTooOld: boolean;
    notReplay: boolean;
    audienceMatch: boolean;
    nonceMatch: boolean;
    requestIdMatch: boolean;
    permissionsSatisfied: boolean;
    bindingValid: boolean;
    grantValid?: boolean;
    grantSignerValid?: boolean;
    credentialValid?: boolean;
    credentialSignatureValid?: boolean;
    credentialSubjectValid?: boolean;
    credentialClaimsValid?: boolean;
    receiptValid?: boolean;
  };
}

export class ProofProtocol {
  private persistence: JsonPersistence;
  private logger?: Logger;

  constructor(persistence: JsonPersistence, logger?: Logger) {
    this.persistence = persistence;
    this.logger = logger;
  }

  async createRequest(options: CreateRequestOptions): Promise<ProofRequest> {
    const now = new Date();
    const ttl = options.ttlSeconds ?? 300;
    const expiresAt = new Date(now.getTime() + ttl * 1000);

    const request: ProofRequest = {
      requestId: generateUUID(),
      requiredPermissions: options.requiredPermissions,
      nonce: generateNonce(16),
      audience: options.audience,
      expiresAt: expiresAt.toISOString(),
      issuedAt: now.toISOString(),
      version: '0.1',
      protocolVersion: PROTOCOL_VERSION,
    };

    const validated = validateProofRequest(request);
    this.persistence.saveProofRequest(validated.requestId, validated);
    
    this.logger?.debug('Created ProofRequest', {
      requestId: validated.requestId,
      audience: validated.audience,
      permissions: validated.requiredPermissions,
      expiresAt: validated.expiresAt,
    });

    return validated;
  }

  async createGrant(options: CreateGrantOptions): Promise<ConsentGrant> {
    const { request } = options;
    const permissions = options.permissions ?? request.requiredPermissions;
    const now = new Date();

    const signer = await this.getOrCreateLocalSigner();

    const grantData = {
      grantId: generateUUID(),
      requestId: request.requestId,
      audience: request.audience,
      nonce: request.nonce,
      permissions,
      expiresAt: request.expiresAt,
      issuedAt: now.toISOString(),
      signer,
      version: '0.1' as const,
      protocolVersion: PROTOCOL_VERSION,
    };

    const signature = this.signGrant(grantData, signer);

    const grant: ConsentGrant = {
      ...grantData,
      signature,
    };

    const validated = validateConsentGrant(grant);
    this.persistence.saveConsentGrant(validated.grantId, validated);

    this.logger?.debug('Created ConsentGrant', {
      grantId: validated.grantId,
      requestId: validated.requestId,
      permissions: validated.permissions,
    });

    return validated;
  }

  async createProof(options: CreateProofOptions): Promise<ProofResponse> {
    const { request, grant, deckPermissions } = options;
    const now = new Date();

    const requestHash = this.computeRequestHash(request);

    const satisfiedPermissions = request.requiredPermissions.filter(
      (p) => deckPermissions.includes(p)
    );

    const prover: Prover = {
      type: 'local',
      id: 'agility-headless',
    };

    const mockProof = {
      type: 'mock_zk_proof',
      satisfiedPermissions,
      timestamp: now.toISOString(),
    };

    const proof: ProofResponse = {
      proofId: generateUUID(),
      requestId: request.requestId,
      audience: request.audience,
      nonce: request.nonce,
      satisfiedPermissions,
      verified: satisfiedPermissions.length === request.requiredPermissions.length,
      issuedAt: now.toISOString(),
      expiresAt: request.expiresAt,
      proof: mockProof,
      binding: {
        requestHash,
      },
      prover,
      version: '0.1',
      protocolVersion: PROTOCOL_VERSION,
    };

    const validated = validateProofResponse(proof);
    this.persistence.saveProof(validated.proofId, validated);

    this.logger?.debug('Created ProofResponse', {
      proofId: validated.proofId,
      requestId: validated.requestId,
      verified: validated.verified,
      satisfiedPermissions: validated.satisfiedPermissions,
      requestHash,
    });

    return validated;
  }

  createReceipt(proof: ProofResponse, txHash: string): Receipt {
    const receipt: Receipt = {
      txHash,
      requestId: proof.requestId,
      proofId: proof.proofId,
      requestHash: proof.binding.requestHash,
      timestamp: new Date().toISOString(),
      type: 'proof_generated',
    };

    this.persistence.saveReceipt(txHash, receipt);

    this.logger?.debug('Created Receipt', {
      txHash,
      requestId: receipt.requestId,
      proofId: receipt.proofId,
    });

    return receipt;
  }

  verify(request: ProofRequest, proof: ProofResponse, grant?: ConsentGrant): VerifyResult {
    const errors: string[] = [];
    const errorCodes: VerificationErrorCode[] = [];
    const checks: VerifyResult['checks'] = {
      schemaValid: true,
      notExpired: true,
      timeRangeValid: true,
      notTooOld: true,
      notReplay: true,
      audienceMatch: true,
      nonceMatch: true,
      requestIdMatch: true,
      permissionsSatisfied: true,
      bindingValid: true,
    };

    try {
      validateProofRequest(request);
    } catch (e) {
      checks.schemaValid = false;
      errors.push(`Invalid ProofRequest schema: ${e instanceof Error ? e.message : String(e)}`);
    }

    try {
      validateProofResponse(proof);
    } catch (e) {
      checks.schemaValid = false;
      errors.push(`Invalid ProofResponse schema: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Time validation for request
    const requestTimeResult = validateTimeRange(request.issuedAt, request.expiresAt);
    if (!requestTimeResult.valid) {
      checks.timeRangeValid = false;
      if (requestTimeResult.errorCode) {
        errorCodes.push(requestTimeResult.errorCode);
        if (requestTimeResult.errorCode === VerificationErrorCode.EXPIRED) {
          checks.notExpired = false;
        }
        if (requestTimeResult.errorCode === VerificationErrorCode.PROOF_TOO_OLD) {
          checks.notTooOld = false;
        }
      }
      errors.push(requestTimeResult.errorMessage || 'Invalid request time range');
    }

    // Time validation for proof
    const proofTimeResult = validateTimeRange(proof.issuedAt, proof.expiresAt);
    if (!proofTimeResult.valid) {
      checks.timeRangeValid = false;
      if (proofTimeResult.errorCode) {
        errorCodes.push(proofTimeResult.errorCode);
        if (proofTimeResult.errorCode === VerificationErrorCode.EXPIRED) {
          checks.notExpired = false;
        }
        if (proofTimeResult.errorCode === VerificationErrorCode.PROOF_TOO_OLD) {
          checks.notTooOld = false;
        }
      }
      errors.push(proofTimeResult.errorMessage || 'Invalid proof time range');
    }

    // Time validation for grant (if provided)
    if (grant) {
      const grantTimeResult = validateTimeRange(grant.issuedAt, grant.expiresAt);
      if (!grantTimeResult.valid) {
        checks.timeRangeValid = false;
        if (grantTimeResult.errorCode) {
          errorCodes.push(grantTimeResult.errorCode);
        }
        errors.push(grantTimeResult.errorMessage || 'Invalid grant time range');
      }
    }

    // Legacy expiry check (kept for backwards compatibility)
    const now = new Date();
    const expiresAt = new Date(request.expiresAt);
    if (now > expiresAt) {
      checks.notExpired = false;
      if (!errorCodes.includes(VerificationErrorCode.EXPIRED)) {
        errorCodes.push(VerificationErrorCode.EXPIRED);
        errors.push(`Request expired at ${request.expiresAt}`);
      }
    }

    if (proof.audience !== request.audience) {
      checks.audienceMatch = false;
      errors.push(`Audience mismatch: proof=${proof.audience}, request=${request.audience}`);
    }

    if (proof.nonce !== request.nonce) {
      checks.nonceMatch = false;
      errors.push(`Nonce mismatch: proof=${proof.nonce}, request=${request.nonce}`);
    }

    if (proof.requestId !== request.requestId) {
      checks.requestIdMatch = false;
      errors.push(`RequestId mismatch: proof=${proof.requestId}, request=${request.requestId}`);
    }

    const missingPermissions = request.requiredPermissions.filter(
      (p) => !proof.satisfiedPermissions.includes(p)
    );
    if (missingPermissions.length > 0) {
      checks.permissionsSatisfied = false;
      errors.push(`Missing permissions: ${missingPermissions.join(', ')}`);
    }

    const expectedHash = this.computeRequestHash(request);
    if (proof.binding.requestHash !== expectedHash) {
      checks.bindingValid = false;
      errors.push(`Binding hash mismatch: proof=${proof.binding.requestHash}, computed=${expectedHash}`);
    }

    if (grant) {
      checks.grantValid = true;
      checks.grantSignerValid = true;

      try {
        validateConsentGrant(grant);
      } catch (e) {
        checks.grantValid = false;
        errors.push(`Invalid ConsentGrant schema: ${e instanceof Error ? e.message : String(e)}`);
      }

      if (grant.requestId !== request.requestId) {
        checks.grantValid = false;
        errors.push(`Grant requestId mismatch: grant=${grant.requestId}, request=${request.requestId}`);
      }
      if (grant.nonce !== request.nonce) {
        checks.grantValid = false;
        errors.push(`Grant nonce mismatch`);
      }
      if (grant.audience !== request.audience) {
        checks.grantValid = false;
        errors.push(`Grant audience mismatch`);
      }

      const grantMissingPerms = request.requiredPermissions.filter(
        (p) => !grant.permissions.includes(p)
      );
      if (grantMissingPerms.length > 0) {
        checks.grantValid = false;
        errors.push(`Grant missing permissions: ${grantMissingPerms.join(', ')}`);
      }

      if (grant.consent) {
        if (grant.consent.requestHash !== expectedHash) {
          checks.grantValid = false;
          errors.push(`Grant consent.requestHash mismatch`);
        }
      }

      if (grant.signer.type === 'xrpl') {
        if (!grant.signature || grant.signature.length < 10) {
          checks.grantSignerValid = false;
          errors.push(`Xaman grant signature missing or invalid`);
        }
        if (!grant.signatureMeta) {
          this.logger?.debug('Xaman grant missing signatureMeta - offline verification limited');
        }
      } else if (grant.signer.type === 'did') {
        if (!grant.signature.startsWith('agility_sig_') && !grant.signature.startsWith('mock_sig_')) {
          checks.grantSignerValid = false;
          errors.push(`Local grant signature format invalid`);
        }
      }
    }

    // Replay protection check (after all structural validation, before returning success)
    if (ENABLE_REPLAY_PROTECTION && checks.schemaValid && checks.bindingValid) {
      const replayKey = generateReplayKey(proof.prover.id, proof.binding.requestHash);
      const replayStore = getReplayStore();

      if (replayStore.has(replayKey)) {
        checks.notReplay = false;
        errorCodes.push(VerificationErrorCode.REPLAY_DETECTED);
        errors.push('Proof has already been used (replay detected)');

        this.logger?.debug('Replay attack detected', {
          requestId: request.requestId,
          proofId: proof.proofId,
          proverId: proof.prover.id,
        });
      } else if (errors.length === 0) {
        // Only add to replay store if verification passes
        const ttlSeconds = Math.max(
          300,
          Math.floor((new Date(request.expiresAt).getTime() - Date.now()) / 1000)
        );
        replayStore.add(replayKey, ttlSeconds);
      }
    }

    this.logger?.debug('Verification result', {
      valid: errors.length === 0,
      checks,
      errorCount: errors.length,
    });

    return {
      valid: errors.length === 0,
      errors,
      errorCodes: errorCodes.length > 0 ? errorCodes : undefined,
      checks,
    };
  }

  computeRequestHash(request: ProofRequest): string {
    const canonical = canonicalJson(request);
    return sha256Hex(canonical);
  }

  private async getOrCreateLocalSigner(): Promise<Signer> {
    const existing = this.persistence.getDefaultLocalKey();
    if (existing) {
      const data = existing.data as { signer: Signer };
      return data.signer;
    }

    const keyId = `did:key:${generateNonce(16)}`;
    const signer: Signer = {
      type: 'did',
      id: keyId,
    };

    this.persistence.saveLocalKey('default', {
      signer,
      createdAt: new Date().toISOString(),
    });

    this.logger?.debug('Created local signer', { keyId });

    return signer;
  }

  private signGrant(grantData: Omit<ConsentGrant, 'signature'>, signer: Signer): string {
    const dataToSign = canonicalJson({
      grantId: grantData.grantId,
      requestId: grantData.requestId,
      audience: grantData.audience,
      nonce: grantData.nonce,
      permissions: grantData.permissions,
      expiresAt: grantData.expiresAt,
      issuedAt: grantData.issuedAt,
      signer: grantData.signer,
    });

    const mockSignature = sha256Hex(`${signer.id}:${dataToSign}`);
    return `mock_sig_${mockSignature.slice(0, 32)}`;
  }

  verifyCredentialProof(
    request: ProofRequest,
    proof: ProofResponse,
    credential: VerifiableCredential,
    grant?: ConsentGrant
  ): VerifyResult {
    const baseResult = this.verify(request, proof, grant);
    const errors = [...baseResult.errors];
    const checks: VerifyResult['checks'] = { ...baseResult.checks };

    checks.credentialValid = true;
    checks.credentialSignatureValid = true;
    checks.credentialSubjectValid = true;
    checks.credentialClaimsValid = true;

    try {
      validateVerifiableCredential(credential);
    } catch (e) {
      checks.credentialValid = false;
      errors.push(`Invalid credential schema: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (credential.expiresAt) {
      const now = new Date();
      const expiresAt = new Date(credential.expiresAt);
      if (now > expiresAt) {
        checks.credentialValid = false;
        errors.push(`Credential expired at ${credential.expiresAt}`);
      }
    }

    if (proof.binding.credentialId && proof.binding.credentialId !== credential.id) {
      checks.credentialValid = false;
      errors.push(`Proof credentialId mismatch: proof=${proof.binding.credentialId}, credential=${credential.id}`);
    }

    if (proof.binding.credentialHash) {
      const expectedHash = sha256Hex(canonicalJson(credential));
      if (proof.binding.credentialHash !== expectedHash) {
        checks.credentialValid = false;
        errors.push(`Credential hash mismatch`);
      }
    }

    if (!credential.proof.signature.startsWith('agility_vc_sig_')) {
      checks.credentialSignatureValid = false;
      errors.push(`Invalid credential signature format`);
    }

    const credentialData = {
      id: credential.id,
      issuer: credential.issuer,
      subject: credential.subject,
      issuedAt: credential.issuedAt,
      expiresAt: credential.expiresAt,
      claims: credential.claims,
      version: credential.version,
    };
    const canonical = canonicalJson(credentialData);
    const dataHash = sha256Hex(canonical);

    const credentialPermissions = extractClaimPermissions(
      credential.claims as Record<string, boolean | string | number | null>
    );
    const missingClaims = request.requiredPermissions.filter(
      (p) => !credentialPermissions.includes(p)
    );
    if (missingClaims.length > 0) {
      checks.credentialClaimsValid = false;
      errors.push(`Credential missing required claims: ${missingClaims.join(', ')}`);
    }

    this.logger?.debug('Credential proof verification result', {
      valid: errors.length === 0,
      checks,
      errorCount: errors.length,
      credentialId: credential.id,
    });

    return {
      valid: errors.length === 0,
      errors,
      checks,
    };
  }

  computeCredentialHash(credential: VerifiableCredential): string {
    const canonical = canonicalJson(credential);
    return sha256Hex(canonical);
  }
}
