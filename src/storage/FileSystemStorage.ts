import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type { EncryptedStorageAdapter } from './StorageAdapter.js';

export interface FileSystemStorageConfig {
  basePath: string;
  encrypt?: boolean;
}

export class FileSystemStorage implements EncryptedStorageAdapter {
  private basePath: string;
  private encrypt: boolean;
  private encryptionKey: Buffer | null = null;
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16;
  private readonly authTagLength = 16;

  constructor(config: FileSystemStorageConfig) {
    this.basePath = config.basePath;
    this.encrypt = config.encrypt ?? false;
  }

  setEncryptionKey(key: string): void {
    this.encryptionKey = crypto.scryptSync(key, 'agility-salt', 32);
  }

  async save(key: string, value: unknown): Promise<void> {
    await this.ensureDirectory();
    const filePath = this.getFilePath(key);
    let data = JSON.stringify(value, null, 2);

    if (this.encrypt && this.encryptionKey) {
      data = this.encryptData(data);
    }

    await fs.writeFile(filePath, data, 'utf-8');
  }

  async load<T = unknown>(key: string): Promise<T | null> {
    const filePath = this.getFilePath(key);

    try {
      let data = await fs.readFile(filePath, 'utf-8');

      if (this.encrypt && this.encryptionKey) {
        data = this.decryptData(data);
      }

      return JSON.parse(data) as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);

    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      const files = await fs.readdir(this.basePath);
      await Promise.all(
        files.map((file: string) => fs.unlink(path.join(this.basePath, file)))
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  private getFilePath(key: string): string {
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.basePath, `${safeKey}.json`);
  }

  private async ensureDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  private encryptData(data: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not set');
    }

    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(data, 'utf-8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted,
    });
  }

  private decryptData(encryptedData: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not set');
    }

    const { iv, authTag, data } = JSON.parse(encryptedData) as {
      iv: string;
      authTag: string;
      data: string;
    };

    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.encryptionKey,
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(data, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');

    return decrypted;
  }
}
