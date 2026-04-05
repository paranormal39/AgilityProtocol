/**
 * Agility Payments - XRPL Payment Adapter
 * 
 * Payment adapter for XRP Ledger supporting payment creation,
 * submission, and on-chain verification.
 */

import { Client, Wallet, xrpToDrops, dropsToXrp } from 'xrpl';
import type {
  PaymentNetwork,
  PaymentStatus,
  PaymentRequest,
  PaymentVerificationResult,
  VerifyPaymentOptions,
  ChainConfig,
  NetworkStatus,
  PaymentTransaction,
  SubmitResult,
  TransactionDetails,
} from '../core/types.js';
import { PaymentAdapterBase } from '../core/ChainBridge.js';
import {
  XrplConfig,
  XRPL_ENDPOINTS,
  XrplPaymentTx,
  XrplTxResult,
  createAgilityMemo,
  parseAgilityMemo,
  encodeMemoData,
} from './types.js';

/**
 * XRPL Payment Adapter
 * 
 * Implements payment operations for XRP Ledger.
 */
export class XrplPaymentAdapter extends PaymentAdapterBase {
  readonly network: PaymentNetwork = 'xrpl';
  
  private client: Client | null = null;
  private xrplConfig: XrplConfig | null = null;

  /**
   * Connect to XRPL network
   */
  async connect(config?: ChainConfig): Promise<void> {
    if (this.connected && this.client?.isConnected()) {
      return;
    }

    const networkType = config?.networkType || 'testnet';
    const wsUrl = config?.wsUrl || XRPL_ENDPOINTS[networkType];

    this.xrplConfig = {
      networkType,
      wsUrl,
      timeout: 20000,
    };

    this.client = new Client(wsUrl);
    
    try {
      await this.client.connect();
      this.connected = true;
      this.config = config || { networkType };
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect to XRPL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Disconnect from XRPL network
   */
  async disconnect(): Promise<void> {
    if (this.client?.isConnected()) {
      await this.client.disconnect();
    }
    this.client = null;
    this.connected = false;
  }

  /**
   * Get current network status
   */
  async getNetworkStatus(): Promise<NetworkStatus> {
    if (!this.client?.isConnected()) {
      return {
        connected: false,
        network: 'xrpl',
        networkType: this.xrplConfig?.networkType || 'testnet',
      };
    }

    try {
      const serverInfo = await this.client.request({ command: 'server_info' });
      const ledgerIndex = serverInfo.result.info.validated_ledger?.seq;

      return {
        connected: true,
        network: 'xrpl',
        networkType: this.xrplConfig?.networkType || 'testnet',
        ledgerIndex,
      };
    } catch {
      return {
        connected: this.client.isConnected(),
        network: 'xrpl',
        networkType: this.xrplConfig?.networkType || 'testnet',
      };
    }
  }

  /**
   * Create a payment transaction (unsigned)
   */
  async createPayment(request: PaymentRequest): Promise<PaymentTransaction> {
    const errors = this.validatePaymentRequest(request);
    if (errors.length > 0) {
      throw new Error(`Invalid payment request: ${errors.join(', ')}`);
    }

    if (!this.client?.isConnected()) {
      throw new Error('XRPL client not connected');
    }

    // Convert amount to drops if XRP
    const amount = request.currency === 'XRP' 
      ? xrpToDrops(request.amount)
      : {
          currency: request.currency,
          value: request.amount,
          issuer: (request.metadata?.issuer as string) || '',
        };

    // Create payment transaction
    const paymentTx: XrplPaymentTx = {
      TransactionType: 'Payment',
      Account: '', // Will be filled by wallet
      Destination: request.destinationAddress,
      Amount: amount,
      Memos: [createAgilityMemo(request.paymentId, request.orderId)],
    };

    // Add destination tag if provided
    if (request.metadata?.destinationTag) {
      paymentTx.DestinationTag = request.metadata.destinationTag as number;
    }

    return {
      network: 'xrpl',
      unsignedTx: JSON.stringify(paymentTx),
      expiresAt: request.expiresAt,
      summary: {
        to: request.destinationAddress,
        amount: request.amount,
        currency: request.currency,
      },
    };
  }

  /**
   * Submit a signed transaction to XRPL
   */
  async submitPayment(signedTx: string): Promise<SubmitResult> {
    if (!this.client?.isConnected()) {
      return {
        success: false,
        error: 'XRPL client not connected',
      };
    }

    try {
      const result = await this.client.submitAndWait(signedTx);
      
      const txResult = result.result as XrplTxResult;
      const success = txResult.meta?.TransactionResult === 'tesSUCCESS';

      return {
        success,
        txHash: txResult.hash,
        error: success ? undefined : txResult.meta?.TransactionResult,
        meta: {
          ledgerIndex: txResult.ledger_index,
          validated: txResult.validated,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction submission failed',
      };
    }
  }

  /**
   * Get payment status from transaction hash
   */
  async getPaymentStatus(txHash: string): Promise<PaymentStatus> {
    if (!this.client?.isConnected()) {
      return 'pending';
    }

    try {
      const tx = await this.client.request({
        command: 'tx',
        transaction: txHash,
      });

      if (!tx.result.validated) {
        return 'confirming';
      }

      const result = (tx.result as any).meta?.TransactionResult;
      if (result === 'tesSUCCESS') {
        return 'confirmed';
      }

      return 'failed';
    } catch {
      return 'pending';
    }
  }

  /**
   * Verify a payment on-chain
   */
  async verifyPayment(options: VerifyPaymentOptions): Promise<PaymentVerificationResult> {
    const { request, proof, verifyOnChain = true } = options;

    // First, validate proof against request
    const validation = this.validatePaymentProof(request, proof);
    
    if (!validation.valid) {
      return {
        valid: false,
        confirmed: false,
        status: 'failed',
        errors: validation.errors,
        checks: validation.checks,
      };
    }

    // If on-chain verification is disabled, return basic validation
    if (!verifyOnChain) {
      return {
        valid: true,
        confirmed: false,
        status: 'pending',
        errors: [],
        checks: validation.checks,
      };
    }

    // Verify on-chain
    if (!this.client?.isConnected()) {
      return {
        valid: false,
        confirmed: false,
        status: 'failed',
        errors: ['XRPL client not connected for on-chain verification'],
        checks: validation.checks,
      };
    }

    try {
      const tx = await this.client.request({
        command: 'tx',
        transaction: proof.txHash,
      });

      const txData = tx.result as any;
      
      // Check if transaction is validated
      if (!txData.validated) {
        return {
          valid: true,
          confirmed: false,
          status: 'confirming',
          errors: [],
          checks: { ...validation.checks, txFinalized: false },
        };
      }

      // Check transaction result
      const txResult = txData.meta?.TransactionResult;
      if (txResult !== 'tesSUCCESS') {
        return {
          valid: false,
          confirmed: false,
          status: 'failed',
          errors: [`Transaction failed: ${txResult}`],
          checks: { ...validation.checks, txFinalized: false },
        };
      }

      // Verify destination
      if (txData.Destination !== request.destinationAddress) {
        return {
          valid: false,
          confirmed: false,
          status: 'failed',
          errors: ['Destination address mismatch on-chain'],
          checks: { ...validation.checks, addressMatch: false },
        };
      }

      // Verify amount (for XRP)
      const deliveredAmount = txData.meta?.delivered_amount;
      if (typeof deliveredAmount === 'string') {
        const deliveredXrp = dropsToXrp(deliveredAmount);
        if (deliveredXrp !== request.amount) {
          return {
            valid: false,
            confirmed: false,
            status: 'failed',
            errors: [`Amount mismatch: expected ${request.amount}, delivered ${deliveredXrp}`],
            checks: { ...validation.checks, amountMatch: false },
          };
        }
      }

      // Verify memo contains payment ID
      const agilityMemo = parseAgilityMemo(txData.Memos || []);
      if (agilityMemo && agilityMemo.paymentId !== request.paymentId) {
        return {
          valid: false,
          confirmed: false,
          status: 'failed',
          errors: ['Payment ID mismatch in transaction memo'],
          checks: validation.checks,
        };
      }

      // All checks passed
      return {
        valid: true,
        confirmed: true,
        status: 'confirmed',
        errors: [],
        checks: { ...validation.checks, txFinalized: true },
        meta: {
          verifiedAt: Date.now(),
          blockHeight: txData.ledger_index,
          confirmations: 1, // XRPL has fast finality
        },
      };

    } catch (error) {
      return {
        valid: false,
        confirmed: false,
        status: 'failed',
        errors: [`On-chain verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        checks: validation.checks,
      };
    }
  }

  /**
   * Get transaction details from XRPL
   */
  async getTransaction(txHash: string): Promise<TransactionDetails | null> {
    if (!this.client?.isConnected()) {
      return null;
    }

    try {
      const tx = await this.client.request({
        command: 'tx',
        transaction: txHash,
      });

      const txData = tx.result as any;
      const deliveredAmount = txData.meta?.delivered_amount;
      
      let amount: string;
      let currency: string;
      
      if (typeof deliveredAmount === 'string') {
        amount = dropsToXrp(deliveredAmount);
        currency = 'XRP';
      } else if (deliveredAmount && typeof deliveredAmount === 'object') {
        amount = deliveredAmount.value;
        currency = deliveredAmount.currency;
      } else {
        // Fallback to Amount field
        if (typeof txData.Amount === 'string') {
          amount = dropsToXrp(txData.Amount);
          currency = 'XRP';
        } else {
          amount = txData.Amount?.value || '0';
          currency = txData.Amount?.currency || 'XRP';
        }
      }

      // Parse memo for payment ID
      const agilityMemo = parseAgilityMemo(txData.Memos || []);

      return {
        txHash,
        network: 'xrpl',
        status: txData.validated ? 'confirmed' : 'pending',
        ledgerIndex: txData.ledger_index,
        timestamp: txData.date ? (txData.date + 946684800) * 1000 : undefined, // XRPL epoch
        from: txData.Account,
        to: txData.Destination,
        amount,
        currency,
        fee: txData.Fee ? dropsToXrp(txData.Fee) : undefined,
        memo: agilityMemo ? JSON.stringify(agilityMemo) : undefined,
        confirmations: txData.validated ? 1 : 0,
        raw: txData,
      };

    } catch {
      return null;
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(address: string): Promise<string> {
    if (!this.client?.isConnected()) {
      throw new Error('XRPL client not connected');
    }

    try {
      const accountInfo = await this.client.request({
        command: 'account_info',
        account: address,
      });

      return dropsToXrp((accountInfo.result as any).account_data.Balance);
    } catch (error) {
      throw new Error(`Failed to get account balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Prepare a payment for signing with XUMM or other wallet
   */
  async preparePaymentForWallet(
    request: PaymentRequest,
    fromAddress: string
  ): Promise<{
    tx: XrplPaymentTx;
    txJson: string;
  }> {
    if (!this.client?.isConnected()) {
      throw new Error('XRPL client not connected');
    }

    // Get account sequence
    const accountInfo = await this.client.request({
      command: 'account_info',
      account: fromAddress,
    });

    const sequence = (accountInfo.result as any).account_data.Sequence;

    // Get current ledger for LastLedgerSequence
    const ledger = await this.client.request({
      command: 'ledger_current',
    });

    const currentLedger = (ledger.result as any).ledger_current_index;

    // Convert amount
    const amount = request.currency === 'XRP'
      ? xrpToDrops(request.amount)
      : {
          currency: request.currency,
          value: request.amount,
          issuer: (request.metadata?.issuer as string) || '',
        };

    const tx: XrplPaymentTx = {
      TransactionType: 'Payment',
      Account: fromAddress,
      Destination: request.destinationAddress,
      Amount: amount,
      Fee: '12', // Standard fee in drops
      Sequence: sequence,
      LastLedgerSequence: currentLedger + 75, // ~5 minutes
      Memos: [createAgilityMemo(request.paymentId, request.orderId)],
    };

    if (request.metadata?.destinationTag) {
      tx.DestinationTag = request.metadata.destinationTag as number;
    }

    return {
      tx,
      txJson: JSON.stringify(tx),
    };
  }
}

/**
 * Create and return a new XRPL payment adapter instance
 */
export function createXrplPaymentAdapter(): XrplPaymentAdapter {
  return new XrplPaymentAdapter();
}
