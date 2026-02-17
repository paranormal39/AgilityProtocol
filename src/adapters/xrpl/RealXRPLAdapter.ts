import { Client, Wallet, AccountSet, convertStringToHex, TxResponse } from 'xrpl';
import type {
  XRPLConnectionConfig,
  XRPLAnchorResult,
  XRPLReceiptResult,
  XRPLWalletState,
} from './XRPLTypes.js';
import type { Logger } from '../../utils/Logger.js';
import type { IXRPLAdapter } from './XRPLAdapter.js';

export interface RealXRPLConfig {
  endpoint: string;
  seed: string;
}

export class RealXRPLAdapter implements IXRPLAdapter {
  private client: Client | null = null;
  private wallet: Wallet | null = null;
  private state: XRPLWalletState = {
    connected: false,
    address: null,
    network: null,
  };
  private logger?: Logger;
  private lastTxId: string | null = null;
  private lastReceiptId: string | null = null;
  private config: RealXRPLConfig;

  constructor(config: RealXRPLConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger;
  }

  setLogger(logger: Logger): void {
    this.logger = logger;
  }

  async connect(
    _address: string,
    config: XRPLConnectionConfig = { network: 'testnet' }
  ): Promise<void> {
    this.logger?.debug('RealXRPLAdapter.connect', { 
      endpoint: this.config.endpoint, 
      network: config.network 
    });

    try {
      this.client = new Client(this.config.endpoint);
      await this.client.connect();

      this.wallet = Wallet.fromSeed(this.config.seed);

      this.state = {
        connected: true,
        address: this.wallet.address,
        network: config.network,
      };

      this.logger?.info(`XRPL connected to ${config.network} (${this.wallet.address})`);
    } catch (error) {
      this.logger?.error('XRPL connection failed', { error: String(error) });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.logger?.debug('RealXRPLAdapter.disconnect');

    if (this.client?.isConnected()) {
      await this.client.disconnect();
    }

    this.state = {
      connected: false,
      address: null,
      network: null,
    };
    this.client = null;
    this.wallet = null;

    this.logger?.info('XRPL disconnected');
  }

  isConnected(): boolean {
    return this.state.connected && this.client?.isConnected() === true;
  }

  getState(): XRPLWalletState {
    return { ...this.state };
  }

  getLastTxId(): string | null {
    return this.lastTxId;
  }

  getLastReceiptId(): string | null {
    return this.lastReceiptId;
  }

  async anchorHash(hash: string): Promise<XRPLAnchorResult> {
    if (!this.client || !this.wallet || !this.isConnected()) {
      this.logger?.error('anchorHash failed: not connected');
      return {
        success: false,
        error: 'Not connected to XRPL',
      };
    }

    this.logger?.debug('RealXRPLAdapter.anchorHash', { hash });

    try {
      const tx: AccountSet = {
        TransactionType: 'AccountSet',
        Account: this.wallet.address,
        Memos: [
          {
            Memo: {
              MemoType: convertStringToHex('agility/anchor'),
              MemoData: convertStringToHex(hash),
            },
          },
        ],
      };

      const prepared = await this.client.autofill(tx);
      delete prepared.LastLedgerSequence;
      const signed = this.wallet.sign(prepared);
      
      this.logger?.debug('Submitting anchor transaction...', { txBlob: signed.hash });
      const submitted = await this.client.submit(signed.tx_blob);
      
      if (submitted.result.engine_result !== 'tesSUCCESS') {
        throw new Error(`Transaction failed: ${submitted.result.engine_result} - ${submitted.result.engine_result_message}`);
      }

      const txHash = signed.hash;
      this.lastTxId = txHash;

      this.logger?.info(`XRPL anchored hash -> txId=${txHash}`);
      this.logger?.debug('anchorHash submitted', { txHash, result: submitted.result.engine_result });

      return {
        success: true,
        txHash,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger?.error('anchorHash transaction failed', { error: errorMsg });
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  async submitReceipt(receipt: unknown): Promise<XRPLReceiptResult> {
    if (!this.client || !this.wallet || !this.isConnected()) {
      this.logger?.error('submitReceipt failed: not connected');
      return {
        success: false,
        error: 'Not connected to XRPL',
      };
    }

    this.logger?.debug('RealXRPLAdapter.submitReceipt', { receipt });

    try {
      const receiptJson = JSON.stringify(receipt);

      const tx: AccountSet = {
        TransactionType: 'AccountSet',
        Account: this.wallet.address,
        Memos: [
          {
            Memo: {
              MemoType: convertStringToHex('agility/receipt'),
              MemoData: convertStringToHex(receiptJson),
            },
          },
        ],
      };

      const prepared = await this.client.autofill(tx);
      delete prepared.LastLedgerSequence;
      const signed = this.wallet.sign(prepared);
      
      this.logger?.debug('Submitting receipt transaction...', { txBlob: signed.hash });
      const submitted = await this.client.submit(signed.tx_blob);
      
      if (submitted.result.engine_result !== 'tesSUCCESS') {
        throw new Error(`Transaction failed: ${submitted.result.engine_result} - ${submitted.result.engine_result_message}`);
      }

      const txHash = signed.hash;
      this.lastReceiptId = txHash;

      this.logger?.info(`XRPL submitted receipt -> txId=${txHash}`);
      this.logger?.debug('submitReceipt submitted', { txHash, result: submitted.result.engine_result });

      return {
        success: true,
        txHash,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger?.error('submitReceipt transaction failed', { error: errorMsg });
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  async fetchTransaction(txHash: string): Promise<TxResponse | null> {
    if (!this.client || !this.isConnected()) {
      return null;
    }

    try {
      const result = await this.client.request({
        command: 'tx',
        transaction: txHash,
      });
      return result as TxResponse;
    } catch {
      return null;
    }
  }
}
