/**
 * IMidnightStorageAdapter - Interface for Midnight privacy storage adapter
 *
 * Provides encrypted credential storage with optional Midnight SDK integration.
 * Falls back to local encryption when SDK is not available.
 */

export interface MidnightStorageConfig {
  mode: 'local' | 'sdk';
  network?: 'testnet' | 'preprod' | 'mainnet';
  endpoint?: string;
  encryptionKey?: string;
}

export interface MidnightStoreRecord {
  ref: string;
  subjectId: string;
  ciphertext: string;
  createdAt: string;
}

export interface IMidnightStorageAdapter {
  /**
   * Initialize the adapter with configuration
   */
  init(config: MidnightStorageConfig): Promise<void>;

  /**
   * Check if the adapter is available and initialized
   */
  isAvailable(): boolean;

  /**
   * Get the current mode (local or sdk)
   */
  getMode(): 'local' | 'sdk';

  /**
   * Encrypt plaintext data
   * @param plaintext - Data to encrypt (string or Buffer)
   * @param context - Optional context for key derivation
   * @returns Ciphertext as base64 string
   */
  encrypt(plaintext: string | Buffer, context?: Record<string, unknown>): Promise<string>;

  /**
   * Decrypt ciphertext data
   * @param ciphertext - Base64 encoded ciphertext
   * @param context - Optional context for key derivation
   * @returns Decrypted plaintext
   */
  decrypt(ciphertext: string, context?: Record<string, unknown>): Promise<string>;

  /**
   * Store a Verifiable Credential encrypted in Midnight storage
   * @param subjectId - Subject identifier for the credential
   * @param vcJson - JSON string of the Verifiable Credential
   * @returns Reference ID for retrieval
   */
  storeCredential(subjectId: string, vcJson: string): Promise<{ ref: string }>;

  /**
   * Load a Verifiable Credential from Midnight storage
   * @param ref - Reference ID from storeCredential
   * @returns Decrypted VC JSON string
   */
  loadCredential(ref: string): Promise<{ vcJson: string }>;

  /**
   * List all credential references for a subject
   * @param subjectId - Subject identifier
   * @returns Array of reference IDs
   */
  listCredentialRefs(subjectId: string): Promise<string[]>;

  /**
   * Delete a credential from storage
   * @param ref - Reference ID
   */
  deleteCredential(ref: string): Promise<void>;
}
