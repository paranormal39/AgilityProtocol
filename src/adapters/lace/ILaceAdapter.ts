/**
 * ILaceAdapter - Interface for Lace wallet adapter
 *
 * Provides wallet connection, address retrieval, and signing capabilities.
 * Browser mode uses CIP-30 wallet API; CLI uses stub implementation.
 */

export interface LaceConfig {
  mode: 'stub' | 'browser';
  network?: 'preprod' | 'mainnet' | 'preview';
  stubAddresses?: string[];
}

export interface LaceConnectionResult {
  enabled: boolean;
  name?: string;
  icon?: string;
  apiVersion?: string;
}

export interface LaceSignResult {
  signature: string;
  key?: string;
}

export class LaceNotSupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LaceNotSupportedError';
  }
}

export class LaceNotConnectedError extends Error {
  constructor(message: string = 'Lace wallet not connected') {
    super(message);
    this.name = 'LaceNotConnectedError';
  }
}

export interface ILaceAdapter {
  /**
   * Initialize the adapter with configuration
   */
  init(config: LaceConfig): Promise<void>;

  /**
   * Check if Lace wallet is available (injected in browser or stub mode)
   */
  isAvailable(): boolean;

  /**
   * Get the current mode (stub or browser)
   */
  getMode(): 'stub' | 'browser';

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean;

  /**
   * Connect to the Lace wallet
   * @returns Connection result with enabled status
   */
  connect(): Promise<LaceConnectionResult>;

  /**
   * Disconnect from the wallet
   */
  disconnect(): Promise<void>;

  /**
   * Get the current network
   * @returns Network identifier (preprod, mainnet, preview)
   */
  getNetwork(): Promise<string>;

  /**
   * Get wallet addresses
   * @returns Array of address strings (bech32 format)
   */
  getAddresses(): Promise<string[]>;

  /**
   * Get the primary/change address
   */
  getChangeAddress(): Promise<string>;

  /**
   * Sign arbitrary data (CIP-30 signData)
   * @param payload - Data to sign (hex or string)
   * @returns Signature result
   * @throws LaceNotSupportedError if signing not available
   */
  signData(payload: string): Promise<LaceSignResult>;

  /**
   * Build a transaction (placeholder for future)
   * @throws LaceNotSupportedError - Not implemented
   */
  buildTx?(params: Record<string, unknown>): Promise<unknown>;

  /**
   * Get wallet balance (optional)
   */
  getBalance?(): Promise<{ lovelace: string; assets?: Record<string, string> }>;
}
