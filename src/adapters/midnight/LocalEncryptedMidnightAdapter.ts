/**
 * LocalEncryptedMidnightAdapter - Local encryption fallback for Midnight storage
 *
 * Uses AES-256-GCM for encryption when Midnight SDK is not available.
 * Stores encrypted credentials in local persistence.
 */

import * as crypto from 'node:crypto';
import type { IMidnightStorageAdapter, MidnightStorageConfig, MidnightStoreRecord } from './IMidnightAdapter.js';
import type { JsonPersistence } from '../../persistence/JsonPersistence.js';
import type { Logger } from '../../utils/Logger.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export class LocalEncryptedMidnightAdapter implements IMidnightStorageAdapter {
  private persistence: JsonPersistence;
  private logger?: Logger;
  private config: MidnightStorageConfig | null = null;
  private encryptionKey: Buffer | null = null;
  private initialized = false;

  constructor(persistence: JsonPersistence, logger?: Logger) {
    this.persistence = persistence;
    this.logger = logger;
  }

  async init(config: MidnightStorageConfig): Promise<void> {
    this.config = config;

    if (config.encryptionKey) {
      this.encryptionKey = this.deriveKey(config.encryptionKey);
    } else {
      const existingKey = this.persistence.getMidnightKey();
      if (existingKey) {
        this.encryptionKey = Buffer.from(existingKey, 'hex');
      } else {
        this.encryptionKey = crypto.randomBytes(KEY_LENGTH);
        this.persistence.saveMidnightKey(this.encryptionKey.toString('hex'));
      }
    }

    this.initialized = true;
    this.logger?.info('LocalEncryptedMidnightAdapter initialized', {
      mode: 'local',
      network: config.network || 'local',
    });
  }

  isAvailable(): boolean {
    return this.initialized && this.encryptionKey !== null;
  }

  getMode(): 'local' | 'sdk' {
    return 'local';
  }

  private deriveKey(passphrase: string): Buffer {
    return crypto.pbkdf2Sync(passphrase, 'agility-midnight-salt', 100000, KEY_LENGTH, 'sha256');
  }

  async encrypt(plaintext: string | Buffer, _context?: Record<string, unknown>): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('LocalEncryptedMidnightAdapter not initialized');
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    const plaintextBuffer = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf8') : plaintext;
    const encrypted = Buffer.concat([cipher.update(plaintextBuffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const combined = Buffer.concat([iv, authTag, encrypted]);
    return combined.toString('base64');
  }

  async decrypt(ciphertext: string, _context?: Record<string, unknown>): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('LocalEncryptedMidnightAdapter not initialized');
    }

    const combined = Buffer.from(ciphertext, 'base64');

    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Invalid ciphertext: too short');
    }

    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  }

  async storeCredential(subjectId: string, vcJson: string): Promise<{ ref: string }> {
    if (!this.isAvailable()) {
      throw new Error('LocalEncryptedMidnightAdapter not initialized');
    }

    const ref = `midnight_cred_${crypto.randomBytes(16).toString('hex')}`;
    const ciphertext = await this.encrypt(vcJson);

    const record: MidnightStoreRecord = {
      ref,
      subjectId,
      ciphertext,
      createdAt: new Date().toISOString(),
    };

    this.persistence.saveMidnightCredential(ref, record);

    this.logger?.info('Stored credential in Midnight local storage', {
      ref,
      subjectId,
    });

    return { ref };
  }

  async loadCredential(ref: string): Promise<{ vcJson: string }> {
    if (!this.isAvailable()) {
      throw new Error('LocalEncryptedMidnightAdapter not initialized');
    }

    const record = this.persistence.getMidnightCredential(ref);
    if (!record) {
      throw new Error(`Credential not found: ${ref}`);
    }

    const vcJson = await this.decrypt(record.ciphertext);

    this.logger?.debug('Loaded credential from Midnight local storage', { ref });

    return { vcJson };
  }

  async listCredentialRefs(subjectId: string): Promise<string[]> {
    if (!this.isAvailable()) {
      throw new Error('LocalEncryptedMidnightAdapter not initialized');
    }

    const refs = this.persistence.listMidnightCredentialRefs(subjectId);

    this.logger?.debug('Listed credential refs', { subjectId, count: refs.length });

    return refs;
  }

  async deleteCredential(ref: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('LocalEncryptedMidnightAdapter not initialized');
    }

    this.persistence.deleteMidnightCredential(ref);

    this.logger?.info('Deleted credential from Midnight local storage', { ref });
  }
}
