import { createHash, randomBytes, generateKeyPairSync } from 'crypto';
import type { ProofRequest } from '../schemas/ProofRequest.js';
import type { ConsentGrant, Signer } from '../schemas/ConsentGrant.js';
import type { ProofResponse, Prover } from '../schemas/ProofResponse.js';
import { validateProofRequest, validateConsentGrant, validateProofResponse } from '../schemas/index.js';
import { canonicalJson, sha256Hex, generateNonce, generateUUID } from '../utils/canonical.js';
import type { JsonPersistence } from '../persistence/JsonPersistence.js';
import type { Logger } from '../utils/Logger.js';
import type { SignerProvider, ConsentPayload, SignatureBundle } from '../signers/SignerProvider.js';
import { LocalSigner } from '../signers/LocalSigner.js';
import type { VerifiableCredential } from '../credentials/VerifiableCredential.js';
import { extractClaimPermissions } from '../credentials/VerifiableCredential.js';
import { PROTOCOL_VERSION } from '../constants/protocol.js';

export interface LocalKeyPair {
  rootPrivateKey: string;
  rootPublicKey: string;
  createdAt: string;
}

export interface PairwiseIdEntry {
  audience: string;
  pairwiseId: string;
  createdAt: string;
}

export class LocalProver {
  private persistence: JsonPersistence;
  private logger?: Logger;
  private keyPair: LocalKeyPair | null = null;
  private pairwiseCache: Map<string, string> = new Map();

  constructor(persistence: JsonPersistence, logger?: Logger) {
    this.persistence = persistence;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    await this.persistence.initialize();
    await this.loadOrGenerateKeys();
    await this.loadPairwiseIds();
  }

  private async loadOrGenerateKeys(): Promise<void> {
    const existing = this.persistence.getRootKeyPair();
    
    if (existing) {
      this.keyPair = existing as LocalKeyPair;
      this.logger?.debug('Loaded existing root key pair', {
        rootId: this.getRootId(),
        createdAt: this.keyPair.createdAt,
      });
      return;
    }

    const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    this.keyPair = {
      rootPrivateKey: privateKey,
      rootPublicKey: publicKey,
      createdAt: new Date().toISOString(),
    };

    this.persistence.saveRootKeyPair(this.keyPair);

    this.logger?.info('Generated new root key pair', {
      rootId: this.getRootId(),
    });
  }

  private async loadPairwiseIds(): Promise<void> {
    const entries = this.persistence.getAllPairwiseIds();
    for (const entry of entries) {
      const data = entry.data as PairwiseIdEntry;
      this.pairwiseCache.set(data.audience, data.pairwiseId);
    }
    this.logger?.debug('Loaded pairwise IDs', {
      count: this.pairwiseCache.size,
    });
  }

  getRootId(): string {
    if (!this.keyPair) {
      throw new Error('LocalProver not initialized. Call initialize() first.');
    }
    return sha256Hex(this.keyPair.rootPublicKey);
  }

  getPairwiseId(audience: string): string {
    if (!this.keyPair) {
      throw new Error('LocalProver not initialized. Call initialize() first.');
    }

    const cached = this.pairwiseCache.get(audience);
    if (cached) {
      return cached;
    }

    const rootId = this.getRootId();
    const pairwiseId = sha256Hex(`${rootId}:${audience}`);

    this.pairwiseCache.set(audience, pairwiseId);

    this.persistence.savePairwiseId(audience, {
      audience,
      pairwiseId,
      createdAt: new Date().toISOString(),
    });

    this.logger?.debug('Generated pairwise ID', {
      audience,
      pairwiseId: pairwiseId.slice(0, 16) + '...',
    });

    return pairwiseId;
  }

  createConsentGrant(request: ProofRequest, permissions?: string[]): ConsentGrant {
    if (!this.keyPair) {
      throw new Error('LocalProver not initialized. Call initialize() first.');
    }

    const validatedRequest = validateProofRequest(request);
    const grantPermissions = permissions ?? validatedRequest.requiredPermissions;
    const now = new Date();

    const pairwiseId = this.getPairwiseId(validatedRequest.audience);

    const signer: Signer = {
      type: 'did',
      id: `did:agility:${pairwiseId.slice(0, 32)}`,
    };

    const grantData = {
      grantId: generateUUID(),
      requestId: validatedRequest.requestId,
      audience: validatedRequest.audience,
      nonce: validatedRequest.nonce,
      permissions: grantPermissions,
      expiresAt: validatedRequest.expiresAt,
      issuedAt: now.toISOString(),
      signer,
      version: '0.1' as const,
      protocolVersion: PROTOCOL_VERSION,
    };

    const requestHash = this.computeRequestHash(validatedRequest);
    const signature = this.signGrant(grantData, requestHash);

    const grant: ConsentGrant = {
      ...grantData,
      signature,
    };

    const validated = validateConsentGrant(grant);
    this.persistence.saveConsentGrant(validated.grantId, validated);

    this.logger?.debug('Created ConsentGrant', {
      grantId: validated.grantId,
      requestId: validated.requestId,
      pairwiseId: pairwiseId.slice(0, 16) + '...',
      permissions: validated.permissions,
    });

    return validated;
  }

  async createConsentGrantWithSigner(
    request: ProofRequest,
    signerProvider: SignerProvider,
    permissions?: string[]
  ): Promise<ConsentGrant> {
    if (!this.keyPair) {
      throw new Error('LocalProver not initialized. Call initialize() first.');
    }

    const validatedRequest = validateProofRequest(request);
    const grantPermissions = permissions ?? validatedRequest.requiredPermissions;
    const now = new Date();
    const requestHash = this.computeRequestHash(validatedRequest);

    const consentPayload: ConsentPayload = {
      version: '0.1',
      requestId: validatedRequest.requestId,
      audience: validatedRequest.audience,
      nonce: validatedRequest.nonce,
      expiresAt: validatedRequest.expiresAt,
      issuedAt: now.toISOString(),
      permissions: grantPermissions,
      requestHash,
    };

    const signatureBundle = await signerProvider.signConsent(consentPayload);

    const grant: ConsentGrant = {
      grantId: generateUUID(),
      requestId: validatedRequest.requestId,
      audience: validatedRequest.audience,
      nonce: validatedRequest.nonce,
      permissions: grantPermissions,
      expiresAt: validatedRequest.expiresAt,
      issuedAt: consentPayload.issuedAt,
      signer: signatureBundle.signer,
      signature: signatureBundle.signature,
      version: '0.1',
      protocolVersion: PROTOCOL_VERSION,
      consent: consentPayload,
      signatureMeta: signatureBundle.meta,
    };

    const validated = validateConsentGrant(grant);
    this.persistence.saveConsentGrant(validated.grantId, validated);

    this.logger?.debug('Created ConsentGrant with signer', {
      grantId: validated.grantId,
      requestId: validated.requestId,
      signerType: signerProvider.getType(),
      signerId: signatureBundle.signer.id,
      permissions: validated.permissions,
    });

    return validated;
  }

  getLocalSigner(): LocalSigner {
    if (!this.keyPair) {
      throw new Error('LocalProver not initialized. Call initialize() first.');
    }
    const pairwiseId = this.getPairwiseId('default');
    return new LocalSigner({
      rootPublicKey: this.keyPair.rootPublicKey,
      pairwiseId,
    });
  }

  getLocalSignerForAudience(audience: string): LocalSigner {
    if (!this.keyPair) {
      throw new Error('LocalProver not initialized. Call initialize() first.');
    }
    const pairwiseId = this.getPairwiseId(audience);
    return new LocalSigner({
      rootPublicKey: this.keyPair.rootPublicKey,
      pairwiseId,
    });
  }

  generateProof(request: ProofRequest, grant: ConsentGrant, deckPermissions?: string[]): ProofResponse {
    if (!this.keyPair) {
      throw new Error('LocalProver not initialized. Call initialize() first.');
    }

    const validatedRequest = validateProofRequest(request);
    const validatedGrant = validateConsentGrant(grant);

    if (validatedGrant.requestId !== validatedRequest.requestId) {
      throw new Error('Grant requestId does not match request');
    }
    if (validatedGrant.nonce !== validatedRequest.nonce) {
      throw new Error('Grant nonce does not match request');
    }
    if (validatedGrant.audience !== validatedRequest.audience) {
      throw new Error('Grant audience does not match request');
    }

    const now = new Date();
    const requestHash = this.computeRequestHash(validatedRequest);

    const availablePermissions = deckPermissions ?? validatedGrant.permissions;
    const satisfiedPermissions = validatedRequest.requiredPermissions.filter(
      (p) => availablePermissions.includes(p)
    );

    const pairwiseId = this.getPairwiseId(validatedRequest.audience);

    const prover: Prover = {
      type: 'local',
      id: `did:agility:${pairwiseId.slice(0, 32)}`,
    };

    const mockProof = {
      type: 'mock_zk_proof',
      satisfiedPermissions,
      timestamp: now.toISOString(),
      proverId: prover.id,
    };

    const proof: ProofResponse = {
      proofId: generateUUID(),
      requestId: validatedRequest.requestId,
      audience: validatedRequest.audience,
      nonce: validatedRequest.nonce,
      satisfiedPermissions,
      verified: satisfiedPermissions.length === validatedRequest.requiredPermissions.length,
      issuedAt: now.toISOString(),
      expiresAt: validatedRequest.expiresAt,
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

    this.logger?.debug('Generated ProofResponse', {
      proofId: validated.proofId,
      requestId: validated.requestId,
      verified: validated.verified,
      satisfiedPermissions: validated.satisfiedPermissions,
      requestHash,
    });

    return validated;
  }

  computeRequestHash(request: ProofRequest): string {
    const canonical = canonicalJson(request);
    return sha256Hex(canonical);
  }

  private signGrant(grantData: Omit<ConsentGrant, 'signature'>, requestHash: string): string {
    if (!this.keyPair) {
      throw new Error('LocalProver not initialized');
    }

    const dataToSign = canonicalJson({
      grantId: grantData.grantId,
      requestId: grantData.requestId,
      audience: grantData.audience,
      nonce: grantData.nonce,
      permissions: grantData.permissions,
      expiresAt: grantData.expiresAt,
      issuedAt: grantData.issuedAt,
      signer: grantData.signer,
      requestHash,
    });

    const signatureHash = sha256Hex(`${this.keyPair.rootPublicKey}:${dataToSign}`);
    return `agility_sig_${signatureHash.slice(0, 48)}`;
  }

  getKeyInfo(): { rootId: string; createdAt: string } | null {
    if (!this.keyPair) {
      return null;
    }
    return {
      rootId: this.getRootId(),
      createdAt: this.keyPair.createdAt,
    };
  }

  isInitialized(): boolean {
    return this.keyPair !== null;
  }

  generateProofFromCredential(
    request: ProofRequest,
    credential: VerifiableCredential,
    grant: ConsentGrant
  ): ProofResponse {
    if (!this.keyPair) {
      throw new Error('LocalProver not initialized. Call initialize() first.');
    }

    const validatedRequest = validateProofRequest(request);
    const validatedGrant = validateConsentGrant(grant);

    if (validatedGrant.requestId !== validatedRequest.requestId) {
      throw new Error('Grant requestId does not match request');
    }
    if (validatedGrant.nonce !== validatedRequest.nonce) {
      throw new Error('Grant nonce does not match request');
    }
    if (validatedGrant.audience !== validatedRequest.audience) {
      throw new Error('Grant audience does not match request');
    }

    const rootId = this.getRootId();
    if (credential.subject !== rootId && !credential.subject.includes(rootId.slice(0, 32))) {
      throw new Error('Credential subject does not match prover rootId');
    }

    const credentialPermissions = extractClaimPermissions(credential.claims as Record<string, boolean | string | number | null>);
    const satisfiedPermissions = validatedRequest.requiredPermissions.filter(
      (p) => credentialPermissions.includes(p)
    );

    if (satisfiedPermissions.length !== validatedRequest.requiredPermissions.length) {
      const missing = validatedRequest.requiredPermissions.filter((p) => !satisfiedPermissions.includes(p));
      throw new Error(`Credential missing required claims: ${missing.join(', ')}`);
    }

    const now = new Date();
    const requestHash = this.computeRequestHash(validatedRequest);
    const credentialHash = sha256Hex(canonicalJson(credential));

    const pairwiseId = this.getPairwiseId(validatedRequest.audience);

    const prover: Prover = {
      type: 'local',
      id: `did:agility:${pairwiseId.slice(0, 32)}`,
    };

    const credentialProof = {
      type: 'credential_proof',
      credentialId: credential.id,
      credentialHash,
      credentialIssuer: credential.issuer,
      satisfiedPermissions,
      timestamp: now.toISOString(),
      proverId: prover.id,
    };

    const proof: ProofResponse = {
      proofId: generateUUID(),
      requestId: validatedRequest.requestId,
      audience: validatedRequest.audience,
      nonce: validatedRequest.nonce,
      satisfiedPermissions,
      verified: true,
      issuedAt: now.toISOString(),
      expiresAt: validatedRequest.expiresAt,
      proof: credentialProof,
      binding: {
        requestHash,
        credentialId: credential.id,
        credentialHash,
      },
      prover,
      version: '0.1',
      protocolVersion: PROTOCOL_VERSION,
    };

    const validated = validateProofResponse(proof);
    this.persistence.saveProof(validated.proofId, validated);

    this.logger?.debug('Generated credential-based ProofResponse', {
      proofId: validated.proofId,
      requestId: validated.requestId,
      credentialId: credential.id,
      verified: validated.verified,
      satisfiedPermissions: validated.satisfiedPermissions,
    });

    return validated;
  }
}
