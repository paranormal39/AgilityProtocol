/**
 * StubLaceAdapter - CLI stub implementation for Lace wallet
 *
 * Provides deterministic mock responses for testing Lace integration
 * without requiring browser context.
 */

import * as crypto from 'node:crypto';
import type {
  ILaceAdapter,
  LaceConfig,
  LaceConnectionResult,
  LaceSignResult,
} from './ILaceAdapter.js';
import type { Logger } from '../../utils/Logger.js';

const DEFAULT_STUB_ADDRESSES = [
  'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp',
  'addr_test1qpu5vlrf4xkxs2qpwngf6cjhtw542ayty80v8dyr49rf5ewvxwdrt70qlcpeeagscasafhffqsxy36t90ldv06wqrk2qum8x5w',
];

export class StubLaceAdapter implements ILaceAdapter {
  private logger?: Logger;
  private config: LaceConfig | null = null;
  private connected = false;
  private stubAddresses: string[] = DEFAULT_STUB_ADDRESSES;

  constructor(logger?: Logger) {
    this.logger = logger;
  }

  async init(config: LaceConfig): Promise<void> {
    this.config = config;
    if (config.stubAddresses && config.stubAddresses.length > 0) {
      this.stubAddresses = config.stubAddresses;
    }
    this.logger?.info('StubLaceAdapter initialized', {
      mode: 'stub',
      network: config.network || 'preprod',
      addressCount: this.stubAddresses.length,
    });
  }

  isAvailable(): boolean {
    return true;
  }

  getMode(): 'stub' | 'browser' {
    return 'stub';
  }

  isConnected(): boolean {
    return this.connected;
  }

  async connect(): Promise<LaceConnectionResult> {
    this.connected = true;
    this.logger?.info('StubLaceAdapter connected (stub mode)');
    return {
      enabled: true,
      name: 'Lace (Stub)',
      apiVersion: '0.1.0',
    };
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.logger?.info('StubLaceAdapter disconnected');
  }

  async getNetwork(): Promise<string> {
    return this.config?.network || 'preprod';
  }

  async getAddresses(): Promise<string[]> {
    if (!this.connected) {
      this.logger?.debug('getAddresses called but not connected');
      return [];
    }
    return this.stubAddresses;
  }

  async getChangeAddress(): Promise<string> {
    if (!this.connected) {
      throw new Error('Lace wallet not connected');
    }
    return this.stubAddresses[0] || '';
  }

  async signData(payload: string): Promise<LaceSignResult> {
    if (!this.connected) {
      throw new Error('Lace wallet not connected');
    }

    const payloadHash = crypto.createHash('sha256').update(payload).digest('hex');
    const mockSignature = `stub_lace_sig_${payloadHash.slice(0, 32)}`;

    this.logger?.info('StubLaceAdapter signed data (mock)', {
      payloadLength: payload.length,
      signaturePrefix: mockSignature.slice(0, 20),
    });

    return {
      signature: mockSignature,
      key: this.stubAddresses[0],
    };
  }

  async getBalance(): Promise<{ lovelace: string; assets?: Record<string, string> }> {
    if (!this.connected) {
      throw new Error('Lace wallet not connected');
    }
    return {
      lovelace: '10000000000',
      assets: {
        'stub_policy_id.stub_asset': '1000',
      },
    };
  }
}
