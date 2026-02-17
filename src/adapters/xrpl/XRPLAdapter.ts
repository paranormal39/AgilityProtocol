import type {
  XRPLConnectionConfig,
  XRPLAnchorResult,
  XRPLReceiptResult,
  XRPLWalletState,
} from './XRPLTypes.js';
import type { Logger } from '../../utils/Logger.js';

export interface IXRPLAdapter {
  connect(address: string, config?: XRPLConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getState(): XRPLWalletState;
  anchorHash(hash: string): Promise<XRPLAnchorResult>;
  submitReceipt(receipt: unknown): Promise<XRPLReceiptResult>;
  getLastTxId(): string | null;
  getLastReceiptId(): string | null;
}

export class XRPLAdapter implements IXRPLAdapter {
  private state: XRPLWalletState = {
    connected: false,
    address: null,
    network: null,
  };
  private logger?: Logger;
  private lastTxId: string | null = null;
  private lastReceiptId: string | null = null;

  constructor(logger?: Logger) {
    this.logger = logger;
  }

  setLogger(logger: Logger): void {
    this.logger = logger;
  }

  async connect(
    address: string,
    config: XRPLConnectionConfig = { network: 'testnet' }
  ): Promise<void> {
    this.state = {
      connected: true,
      address,
      network: config.network,
    };

    this.logger?.debug('XRPLAdapter.connect', { address, network: config.network });
    this.logger?.info(`XRPL connected to ${config.network} (${address})`);
  }

  async disconnect(): Promise<void> {
    this.logger?.debug('XRPLAdapter.disconnect', { previousState: this.state });
    
    this.state = {
      connected: false,
      address: null,
      network: null,
    };

    this.logger?.info('XRPL disconnected');
  }

  isConnected(): boolean {
    return this.state.connected;
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
    if (!this.state.connected) {
      this.logger?.error('anchorHash failed: not connected');
      return {
        success: false,
        error: 'Not connected to XRPL wallet',
      };
    }

    this.logger?.debug('XRPLAdapter.anchorHash', { hash });

    const txId = `XRPL_TX_${hash.substring(0, 10)}`;
    this.lastTxId = txId;

    const result: XRPLAnchorResult = {
      success: true,
      txHash: txId,
      ledgerIndex: 80000001,
    };

    this.logger?.info(`XRPL anchored hash -> txId=${txId}`);
    this.logger?.debug('anchorHash result', result);

    return result;
  }

  async submitReceipt(receipt: unknown): Promise<XRPLReceiptResult> {
    if (!this.state.connected) {
      this.logger?.error('submitReceipt failed: not connected');
      return {
        success: false,
        error: 'Not connected to XRPL wallet',
      };
    }

    this.logger?.debug('XRPLAdapter.submitReceipt', { receipt });

    const receiptStr = typeof receipt === 'object' ? JSON.stringify(receipt) : String(receipt);
    const receiptId = `XRPL_RCPT_${receiptStr.substring(0, 10).replace(/[^a-zA-Z0-9]/g, '')}`;
    this.lastReceiptId = receiptId;

    const result: XRPLReceiptResult = {
      success: true,
      txHash: receiptId,
    };

    this.logger?.info(`XRPL submitted receipt -> receiptId=${receiptId}`);
    this.logger?.debug('submitReceipt result', result);

    return result;
  }
}
