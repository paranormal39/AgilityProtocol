import { generateKeyPairSync } from 'crypto';
import type { VerifiableCredential, CredentialClaims } from './VerifiableCredential.js';
import { validateVerifiableCredential } from './VerifiableCredential.js';
import { canonicalJson, sha256Hex, generateUUID } from '../utils/canonical.js';
import type { JsonPersistence } from '../persistence/JsonPersistence.js';
import type { Logger } from '../utils/Logger.js';

export interface IssuerKeyPair {
  privateKey: string;
  publicKey: string;
  issuerId: string;
  createdAt: string;
}

export interface IssueCredentialOptions {
  subjectId: string;
  claims: CredentialClaims;
  expiresInSeconds?: number;
}

export class CredentialIssuer {
  private persistence: JsonPersistence;
  private logger?: Logger;
  private keyPair: IssuerKeyPair | null = null;

  constructor(persistence: JsonPersistence, logger?: Logger) {
    this.persistence = persistence;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    await this.persistence.initialize();
    await this.loadOrGenerateKeys();
  }

  private async loadOrGenerateKeys(): Promise<void> {
    const existing = this.persistence.getDefaultIssuerKey();

    if (existing) {
      this.keyPair = existing.data as IssuerKeyPair;
      this.logger?.debug('Loaded existing issuer key pair', {
        issuerId: this.keyPair.issuerId,
        createdAt: this.keyPair.createdAt,
      });
      return;
    }

    const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const issuerId = `did:agility:issuer:${sha256Hex(publicKey).slice(0, 32)}`;

    this.keyPair = {
      privateKey,
      publicKey,
      issuerId,
      createdAt: new Date().toISOString(),
    };

    this.persistence.saveIssuerKey('default', this.keyPair);

    this.logger?.info('Generated new issuer key pair', {
      issuerId: this.keyPair.issuerId,
    });
  }

  getIssuerId(): string {
    if (!this.keyPair) {
      throw new Error('CredentialIssuer not initialized. Call initialize() first.');
    }
    return this.keyPair.issuerId;
  }

  issueCredential(options: IssueCredentialOptions): VerifiableCredential {
    if (!this.keyPair) {
      throw new Error('CredentialIssuer not initialized. Call initialize() first.');
    }

    const now = new Date();
    const credentialId = generateUUID();

    const expiresAt = options.expiresInSeconds
      ? new Date(now.getTime() + options.expiresInSeconds * 1000).toISOString()
      : undefined;

    const credentialData = {
      id: credentialId,
      issuer: this.keyPair.issuerId,
      subject: options.subjectId,
      issuedAt: now.toISOString(),
      expiresAt,
      claims: options.claims,
      version: '0.1' as const,
    };

    const signature = this.signCredential(credentialData);

    const credential: VerifiableCredential = {
      ...credentialData,
      proof: {
        type: 'Ed25519Signature2020',
        created: now.toISOString(),
        verificationMethod: `${this.keyPair.issuerId}#key-1`,
        signature,
      },
    };

    const validated = validateVerifiableCredential(credential);
    this.persistence.saveCredential(validated.id, validated);

    this.logger?.debug('Issued credential', {
      id: validated.id,
      issuer: validated.issuer,
      subject: validated.subject,
      claims: Object.keys(validated.claims),
    });

    return validated;
  }

  private signCredential(credentialData: Omit<VerifiableCredential, 'proof'>): string {
    if (!this.keyPair) {
      throw new Error('CredentialIssuer not initialized');
    }

    const canonical = canonicalJson(credentialData);
    const dataHash = sha256Hex(canonical);
    const signatureData = `${this.keyPair.publicKey}:${dataHash}`;
    const signature = sha256Hex(signatureData);

    return `agility_vc_sig_${signature}`;
  }

  verifyCredentialSignature(credential: VerifiableCredential): boolean {
    if (!this.keyPair) {
      throw new Error('CredentialIssuer not initialized');
    }

    if (credential.issuer !== this.keyPair.issuerId) {
      return false;
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

    const expectedSignature = this.signCredential(credentialData);
    return credential.proof.signature === expectedSignature;
  }

  computeCredentialHash(credential: VerifiableCredential): string {
    const canonical = canonicalJson(credential);
    return sha256Hex(canonical);
  }

  getKeyInfo(): { issuerId: string; createdAt: string } | null {
    if (!this.keyPair) {
      return null;
    }
    return {
      issuerId: this.keyPair.issuerId,
      createdAt: this.keyPair.createdAt,
    };
  }

  isInitialized(): boolean {
    return this.keyPair !== null;
  }
}
