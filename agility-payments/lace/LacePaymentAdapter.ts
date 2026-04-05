/**
 * Agility Payments - Lace Payment Adapter
 * 
 * Payment adapter for Lace wallet (CIP-30) supporting Cardano payments
 * and integration with Midnight network.
 */

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
  IWalletAdapter,
  WalletConnectionResult,
  SignedPayment,
  WalletBalance,
} from '../core/types.js';
import { PaymentAdapterBase } from '../core/ChainBridge.js';
import {
  LacePaymentConfig,
  LaceWalletState,
  LacePaymentTx,
  createAgilityCardanoMetadata,
  parseAgilityCardanoMetadata,
  lovelaceToAda,
  adaToLovelace,
  isValidCardanoAddress,
} from './types.js';

/**
 * CIP-30 Wallet API interface
 */
interface Cip30WalletApi {
  getNetworkId(): Promise<number>;
  getUsedAddresses(): Promise<string[]>;
  getUnusedAddresses(): Promise<string[]>;
  getChangeAddress(): Promise<string>;
  getBalance(): Promise<string>;
  getUtxos(): Promise<string[] | null>;
  signTx(tx: string, partialSign?: boolean): Promise<string>;
  signData(addr: string, payload: string): Promise<{ signature: string; key: string }>;
  submitTx(tx: string): Promise<string>;
}

/**
 * Window with Cardano wallet injection
 */
interface CardanoWindow {
  cardano?: {
    lace?: {
      enable(): Promise<Cip30WalletApi>;
      isEnabled(): Promise<boolean>;
      apiVersion: string;
      name: string;
      icon: string;
    };
  };
}

declare const window: CardanoWindow | undefined;

/**
 * Lace Payment Adapter
 * 
 * Implements payment operations via Lace wallet for Cardano/Midnight.
 */
export class LacePaymentAdapter extends PaymentAdapterBase implements IWalletAdapter {
  readonly network: PaymentNetwork = 'cardano';
  readonly walletType = 'lace' as const;
  
  private walletApi: Cip30WalletApi | null = null;
  private walletState: LaceWalletState = {
    connected: false,
    address: null,
    networkId: null,
    walletName: null,
    walletIcon: null,
    apiVersion: null,
  };
  private laceConfig: LacePaymentConfig | null = null;

  /**
   * Check if Lace wallet is available in browser
   */
  isAvailable(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return !!(window.cardano?.lace);
  }

  /**
   * Connect to Lace wallet
   */
  async connect(config?: ChainConfig): Promise<void> {
    if (this.connected && this.walletApi) {
      return;
    }

    if (!this.isAvailable()) {
      throw new Error('Lace wallet not available. Please install the Lace browser extension.');
    }

    this.laceConfig = {
      networkType: (config?.networkType as 'mainnet' | 'testnet' | 'preprod') || 'preprod',
      autoConnect: true,
      timeout: 30000,
    };

    try {
      this.walletApi = await window!.cardano!.lace!.enable();
      
      const networkId = await this.walletApi.getNetworkId();
      const addresses = await this.walletApi.getUsedAddresses();
      const address = addresses[0] || (await this.walletApi.getChangeAddress());

      this.walletState = {
        connected: true,
        address: address,
        networkId,
        walletName: window!.cardano!.lace!.name,
        walletIcon: window!.cardano!.lace!.icon,
        apiVersion: window!.cardano!.lace!.apiVersion,
      };

      this.connected = true;
      this.config = config || { networkType: networkId === 1 ? 'mainnet' : 'testnet' };

    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect to Lace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Wallet adapter connect method
   */
  async connectWallet(): Promise<WalletConnectionResult> {
    try {
      await this.connect();
      return {
        connected: true,
        address: this.walletState.address || undefined,
        network: 'cardano',
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Disconnect from Lace wallet
   */
  async disconnect(): Promise<void> {
    this.walletApi = null;
    this.walletState = {
      connected: false,
      address: null,
      networkId: null,
      walletName: null,
      walletIcon: null,
      apiVersion: null,
    };
    this.connected = false;
  }

  /**
   * Get current network status
   */
  async getNetworkStatus(): Promise<NetworkStatus> {
    if (!this.connected || !this.walletApi) {
      return {
        connected: false,
        network: 'cardano',
        networkType: this.laceConfig?.networkType || 'preprod',
      };
    }

    try {
      const networkId = await this.walletApi.getNetworkId();

      return {
        connected: true,
        network: 'cardano',
        networkType: networkId === 1 ? 'mainnet' : 'testnet',
      };
    } catch {
      return {
        connected: this.connected,
        network: 'cardano',
        networkType: this.laceConfig?.networkType || 'preprod',
      };
    }
  }

  /**
   * Get wallet addresses
   */
  async getAddresses(): Promise<string[]> {
    if (!this.walletApi) {
      throw new Error('Lace wallet not connected');
    }

    const used = await this.walletApi.getUsedAddresses();
    const unused = await this.walletApi.getUnusedAddresses();

    return [...used, ...unused];
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<WalletBalance> {
    if (!this.walletApi) {
      throw new Error('Lace wallet not connected');
    }

    const balanceCbor = await this.walletApi.getBalance();
    
    return {
      available: balanceCbor,
      currency: 'ADA',
    };
  }

  /**
   * Create a payment transaction
   */
  async createPayment(request: PaymentRequest): Promise<PaymentTransaction> {
    const errors = this.validatePaymentRequest(request);
    if (errors.length > 0) {
      throw new Error(`Invalid payment request: ${errors.join(', ')}`);
    }

    if (!isValidCardanoAddress(request.destinationAddress)) {
      throw new Error('Invalid Cardano address');
    }

    const amountLovelace = adaToLovelace(request.amount);

    const paymentTx: LacePaymentTx = {
      to: request.destinationAddress,
      amount: amountLovelace,
      metadata: createAgilityCardanoMetadata(request.paymentId, request.orderId),
    };

    return {
      network: 'cardano',
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
   * Sign a payment transaction
   */
  async signPayment(tx: PaymentTransaction): Promise<SignedPayment> {
    if (!this.walletApi) {
      throw new Error('Lace wallet not connected');
    }

    try {
      const signedTx = await this.walletApi.signTx(tx.unsignedTx, false);
      const txHash = `CARDANO_TX_${Date.now().toString(16)}`;
      
      return {
        signedTx,
        txHash,
      };
    } catch (error) {
      throw new Error(`Failed to sign transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit a signed transaction
   */
  async submitPayment(signedTx: string): Promise<SubmitResult> {
    if (!this.walletApi) {
      return {
        success: false,
        error: 'Lace wallet not connected',
      };
    }

    try {
      const txHash = await this.walletApi.submitTx(signedTx);

      return {
        success: true,
        txHash,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction submission failed',
      };
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(txHash: string): Promise<PaymentStatus> {
    // Cardano transaction status would typically be checked via a blockchain explorer API
    // For now, return pending as we'd need external API integration
    return 'confirming';
  }

  /**
   * Verify a payment
   */
  async verifyPayment(options: VerifyPaymentOptions): Promise<PaymentVerificationResult> {
    const { request, proof } = options;

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

    // For full on-chain verification, would need to integrate with Cardano explorer API
    return {
      valid: true,
      confirmed: false,
      status: 'confirming',
      errors: [],
      checks: validation.checks,
    };
  }

  /**
   * Get transaction details
   */
  async getTransaction(txHash: string): Promise<TransactionDetails | null> {
    // Would need Cardano explorer API integration
    return null;
  }

  /**
   * Sign arbitrary data (for KYC proofs)
   */
  async signData(payload: string): Promise<{ signature: string; key: string }> {
    if (!this.walletApi) {
      throw new Error('Lace wallet not connected');
    }

    const address = this.walletState.address;
    if (!address) {
      throw new Error('No wallet address available');
    }

    const payloadHex = Buffer.from(payload, 'utf8').toString('hex');
    return await this.walletApi.signData(address, payloadHex);
  }

  /**
   * Get wallet state
   */
  getWalletState(): LaceWalletState {
    return { ...this.walletState };
  }
}

/**
 * Create and return a new Lace payment adapter instance
 */
export function createLacePaymentAdapter(): LacePaymentAdapter {
  return new LacePaymentAdapter();
}
