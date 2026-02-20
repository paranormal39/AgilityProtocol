/**
 * XRPL Client Adapter
 * 
 * Provides dependency injection for XRPL transaction fetching.
 * Supports mock client for testing and real JSON-RPC client for production.
 */

import { Client } from 'xrpl';

/**
 * Normalized XRPL transaction format.
 */
export interface NormalizedXrplTx {
  Account: string;
  Memos?: Array<{
    Memo: {
      MemoType?: string;
      MemoData?: string;
    };
  }>;
  validated?: boolean;
  ledger_index?: number;
  hash?: string;
}

/**
 * XRPL Client interface for dependency injection.
 */
export interface IXrplClient {
  getTransaction(txHash: string): Promise<NormalizedXrplTx | null>;
}

/**
 * Mock XRPL Client for testing.
 */
export class MockXrplClient implements IXrplClient {
  private transactions: Map<string, NormalizedXrplTx> = new Map();

  addTransaction(txHash: string, tx: NormalizedXrplTx): void {
    this.transactions.set(txHash, tx);
  }

  async getTransaction(txHash: string): Promise<NormalizedXrplTx | null> {
    return this.transactions.get(txHash) || null;
  }

  clear(): void {
    this.transactions.clear();
  }

  /**
   * Create a mock transaction with memo.
   */
  static createMockTx(
    account: string,
    memoData: string,
    options?: { validated?: boolean; ledgerIndex?: number; memoAsHex?: boolean }
  ): NormalizedXrplTx {
    const memoDataEncoded = options?.memoAsHex
      ? memoData
      : Buffer.from(memoData, 'utf8').toString('hex');

    return {
      Account: account,
      Memos: [
        {
          Memo: {
            MemoData: memoDataEncoded,
          },
        },
      ],
      validated: options?.validated ?? true,
      ledger_index: options?.ledgerIndex ?? 12345,
    };
  }
}

/**
 * Default XRPL RPC endpoint.
 */
const DEFAULT_XRPL_RPC_URL = 'wss://s.altnet.rippletest.net:51233';

/**
 * Real XRPL JSON-RPC Client using xrpl library.
 */
export class XrplJsonRpcClient implements IXrplClient {
  private endpoint: string;
  private cache: Map<string, { tx: NormalizedXrplTx; expiresAt: number }> = new Map();
  private cacheTtlMs: number = 5 * 60 * 1000; // 5 minutes

  constructor(endpoint?: string) {
    this.endpoint = endpoint || process.env.XRPL_RPC_URL || DEFAULT_XRPL_RPC_URL;
  }

  async getTransaction(txHash: string): Promise<NormalizedXrplTx | null> {
    // Check cache first
    const cached = this.cache.get(txHash);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.tx;
    }

    const client = new Client(this.endpoint);
    try {
      await client.connect();
      const response = await client.request({
        command: 'tx',
        transaction: txHash,
      });

      const result = response.result as any;
      if (!result || !result.Account) {
        return null;
      }

      const normalizedTx: NormalizedXrplTx = {
        Account: result.Account,
        Memos: result.Memos,
        validated: result.validated,
        ledger_index: result.ledger_index,
        hash: result.hash,
      };

      // Cache the result
      this.cache.set(txHash, {
        tx: normalizedTx,
        expiresAt: Date.now() + this.cacheTtlMs,
      });

      return normalizedTx;
    } catch (error) {
      return null;
    } finally {
      await client.disconnect();
    }
  }

  /**
   * Clear the cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats.
   */
  getCacheStats(): { size: number; endpoint: string } {
    return {
      size: this.cache.size,
      endpoint: this.endpoint,
    };
  }
}

/**
 * Create an XRPL client based on environment.
 */
export function createXrplClient(options?: { mock?: boolean; endpoint?: string }): IXrplClient {
  if (options?.mock) {
    return new MockXrplClient();
  }
  return new XrplJsonRpcClient(options?.endpoint);
}
