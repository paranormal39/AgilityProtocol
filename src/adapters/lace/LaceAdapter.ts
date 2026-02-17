/**
 * LaceAdapter - Browser implementation for Lace wallet (CIP-30)
 *
 * Connects to Lace wallet via browser injection.
 * Falls back to stub mode when not in browser context.
 */

import type {
  ILaceAdapter,
  LaceConfig,
  LaceConnectionResult,
  LaceSignResult,
} from './ILaceAdapter.js';
import { LaceNotSupportedError, LaceNotConnectedError } from './ILaceAdapter.js';
import type { Logger } from '../../utils/Logger.js';

interface CardanoLaceApi {
  enable: () => Promise<WalletApi>;
  isEnabled: () => Promise<boolean>;
  apiVersion: string;
  name: string;
  icon: string;
}

interface CardanoWindow {
  cardano?: {
    lace?: CardanoLaceApi;
  };
}

declare const window: CardanoWindow | undefined;

interface WalletApi {
  getNetworkId: () => Promise<number>;
  getUsedAddresses: () => Promise<string[]>;
  getUnusedAddresses: () => Promise<string[]>;
  getChangeAddress: () => Promise<string>;
  getBalance: () => Promise<string>;
  signData: (addr: string, payload: string) => Promise<{ signature: string; key: string }>;
  signTx: (tx: string, partialSign?: boolean) => Promise<string>;
  submitTx: (tx: string) => Promise<string>;
}

export class LaceAdapter implements ILaceAdapter {
  private logger?: Logger;
  private config: LaceConfig | null = null;
  private walletApi: WalletApi | null = null;
  private connected = false;

  constructor(logger?: Logger) {
    this.logger = logger;
  }

  async init(config: LaceConfig): Promise<void> {
    this.config = config;
    this.logger?.info('LaceAdapter initialized', {
      mode: config.mode,
      network: config.network || 'preprod',
    });
  }

  isAvailable(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return !!(window.cardano?.lace);
  }

  getMode(): 'stub' | 'browser' {
    return 'browser';
  }

  isConnected(): boolean {
    return this.connected && this.walletApi !== null;
  }

  async connect(): Promise<LaceConnectionResult> {
    if (typeof window === 'undefined' || !window.cardano?.lace) {
      throw new LaceNotSupportedError(
        'Lace wallet not available. This adapter requires browser context with Lace extension installed.'
      );
    }

    try {
      this.walletApi = await window.cardano.lace.enable();
      this.connected = true;

      this.logger?.info('LaceAdapter connected to Lace wallet');

      return {
        enabled: true,
        name: window.cardano.lace.name,
        icon: window.cardano.lace.icon,
        apiVersion: window.cardano.lace.apiVersion,
      };
    } catch (error) {
      this.logger?.error('Failed to connect to Lace wallet', { error });
      throw new LaceNotSupportedError(
        `Failed to connect to Lace wallet: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async disconnect(): Promise<void> {
    this.walletApi = null;
    this.connected = false;
    this.logger?.info('LaceAdapter disconnected');
  }

  async getNetwork(): Promise<string> {
    if (!this.walletApi) {
      throw new LaceNotConnectedError();
    }

    const networkId = await this.walletApi.getNetworkId();

    switch (networkId) {
      case 0:
        return 'testnet';
      case 1:
        return 'mainnet';
      default:
        return `unknown_${networkId}`;
    }
  }

  async getAddresses(): Promise<string[]> {
    if (!this.walletApi) {
      throw new LaceNotConnectedError();
    }

    const used = await this.walletApi.getUsedAddresses();
    const unused = await this.walletApi.getUnusedAddresses();

    return [...used, ...unused];
  }

  async getChangeAddress(): Promise<string> {
    if (!this.walletApi) {
      throw new LaceNotConnectedError();
    }

    return this.walletApi.getChangeAddress();
  }

  async signData(payload: string): Promise<LaceSignResult> {
    if (!this.walletApi) {
      throw new LaceNotConnectedError();
    }

    try {
      const address = await this.getChangeAddress();
      const payloadHex = Buffer.from(payload, 'utf8').toString('hex');
      const result = await this.walletApi.signData(address, payloadHex);

      this.logger?.info('LaceAdapter signed data');

      return {
        signature: result.signature,
        key: result.key,
      };
    } catch (error) {
      this.logger?.error('Failed to sign data with Lace', { error });
      throw new LaceNotSupportedError(
        `Signing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getBalance(): Promise<{ lovelace: string; assets?: Record<string, string> }> {
    if (!this.walletApi) {
      throw new LaceNotConnectedError();
    }

    const balanceCbor = await this.walletApi.getBalance();

    return {
      lovelace: balanceCbor,
    };
  }
}
