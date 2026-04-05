/**
 * Agility Payments - Chain Bridge
 * 
 * Abstract base class and factory for chain-specific payment adapters.
 * Provides a unified interface for XRPL, Midnight, and Cardano networks.
 */

import type {
  PaymentNetwork,
  PaymentStatus,
  PaymentRequest,
  PaymentProof,
  PaymentVerificationResult,
  VerifyPaymentOptions,
  IChainBridge,
  IPaymentAdapter,
  ChainConfig,
  NetworkStatus,
  PaymentTransaction,
  SubmitResult,
  TransactionDetails,
  MIN_CONFIRMATIONS,
} from './types.js';

/**
 * Abstract base class for chain bridges
 */
export abstract class ChainBridgeBase implements IChainBridge {
  abstract readonly network: PaymentNetwork;
  
  protected connected: boolean = false;
  protected config: ChainConfig | null = null;

  isConnected(): boolean {
    return this.connected;
  }

  abstract connect(config?: ChainConfig): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract getNetworkStatus(): Promise<NetworkStatus>;
}

/**
 * Abstract base class for payment adapters
 */
export abstract class PaymentAdapterBase extends ChainBridgeBase implements IPaymentAdapter {
  abstract createPayment(request: PaymentRequest): Promise<PaymentTransaction>;
  abstract submitPayment(signedTx: string): Promise<SubmitResult>;
  abstract getPaymentStatus(txHash: string): Promise<PaymentStatus>;
  abstract verifyPayment(options: VerifyPaymentOptions): Promise<PaymentVerificationResult>;
  abstract getTransaction(txHash: string): Promise<TransactionDetails | null>;

  /**
   * Common verification logic shared across adapters
   */
  protected validatePaymentRequest(request: PaymentRequest): string[] {
    const errors: string[] = [];

    if (!request.paymentId) {
      errors.push('Missing payment ID');
    }

    if (!request.amount || parseFloat(request.amount) <= 0) {
      errors.push('Invalid payment amount');
    }

    if (!request.destinationAddress) {
      errors.push('Missing destination address');
    }

    if (!request.network) {
      errors.push('Missing network');
    }

    if (request.expiresAt && Date.now() > request.expiresAt) {
      errors.push('Payment request has expired');
    }

    return errors;
  }

  /**
   * Common proof validation logic
   */
  protected validatePaymentProof(
    request: PaymentRequest,
    proof: PaymentProof
  ): { valid: boolean; errors: string[]; checks: PaymentVerificationResult['checks'] } {
    const errors: string[] = [];
    
    const checks = {
      amountMatch: proof.amount === request.amount,
      addressMatch: proof.toAddress === request.destinationAddress,
      networkMatch: proof.network === request.network,
      notExpired: Date.now() <= request.expiresAt,
      txExists: !!proof.txHash,
      txFinalized: false, // Set by on-chain verification
    };

    if (!checks.amountMatch) {
      errors.push(`Amount mismatch: expected ${request.amount}, got ${proof.amount}`);
    }

    if (!checks.addressMatch) {
      errors.push(`Address mismatch: expected ${request.destinationAddress}, got ${proof.toAddress}`);
    }

    if (!checks.networkMatch) {
      errors.push(`Network mismatch: expected ${request.network}, got ${proof.network}`);
    }

    if (!checks.notExpired) {
      errors.push('Payment request has expired');
    }

    if (!checks.txExists) {
      errors.push('Missing transaction hash');
    }

    return {
      valid: errors.length === 0,
      errors,
      checks,
    };
  }
}

/**
 * Chain bridge registry for managing adapters
 */
class ChainBridgeRegistry {
  private adapters: Map<PaymentNetwork, IPaymentAdapter> = new Map();

  /**
   * Register a payment adapter for a network
   */
  register(network: PaymentNetwork, adapter: IPaymentAdapter): void {
    this.adapters.set(network, adapter);
  }

  /**
   * Get a payment adapter for a network
   */
  get(network: PaymentNetwork): IPaymentAdapter | undefined {
    return this.adapters.get(network);
  }

  /**
   * Check if an adapter is registered for a network
   */
  has(network: PaymentNetwork): boolean {
    return this.adapters.has(network);
  }

  /**
   * List all registered networks
   */
  listNetworks(): PaymentNetwork[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Get all connected adapters
   */
  getConnected(): IPaymentAdapter[] {
    return Array.from(this.adapters.values()).filter(a => a.isConnected());
  }

  /**
   * Disconnect all adapters
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.adapters.values())
      .filter(a => a.isConnected())
      .map(a => a.disconnect());
    
    await Promise.all(disconnectPromises);
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.adapters.clear();
  }
}

// Singleton registry instance
let registryInstance: ChainBridgeRegistry | null = null;

/**
 * Get the chain bridge registry singleton
 */
export function getChainBridgeRegistry(): ChainBridgeRegistry {
  if (!registryInstance) {
    registryInstance = new ChainBridgeRegistry();
  }
  return registryInstance;
}

/**
 * Reset the chain bridge registry (for testing)
 */
export function resetChainBridgeRegistry(): void {
  if (registryInstance) {
    registryInstance.clear();
  }
  registryInstance = null;
}

/**
 * Get a payment adapter for a specific network
 */
export function getPaymentAdapter(network: PaymentNetwork): IPaymentAdapter | undefined {
  return getChainBridgeRegistry().get(network);
}

/**
 * Register a payment adapter
 */
export function registerPaymentAdapter(network: PaymentNetwork, adapter: IPaymentAdapter): void {
  getChainBridgeRegistry().register(network, adapter);
}

/**
 * Create a payment request with validation
 */
export function createPaymentRequest(options: {
  merchantId: string;
  merchantName: string;
  amount: string;
  currency: string;
  network: PaymentNetwork;
  destinationAddress: string;
  memo?: string;
  orderId?: string;
  expiresInMinutes?: number;
  requiredKyc?: string[];
  metadata?: Record<string, unknown>;
}): PaymentRequest {
  const { v4: uuidv4 } = require('uuid');
  
  const now = Date.now();
  const expiresAt = now + (options.expiresInMinutes || 15) * 60 * 1000;

  return {
    paymentId: uuidv4(),
    merchantId: options.merchantId,
    merchantName: options.merchantName,
    amount: options.amount,
    currency: options.currency,
    network: options.network,
    destinationAddress: options.destinationAddress,
    memo: options.memo,
    orderId: options.orderId,
    expiresAt,
    requiredKyc: options.requiredKyc,
    metadata: options.metadata,
  };
}

/**
 * Create a payment proof from transaction details
 */
export function createPaymentProof(options: {
  paymentRequest: PaymentRequest;
  txHash: string;
  fromAddress: string;
  blockHeight?: number;
  ledgerIndex?: number;
  signature?: string;
  zkProof?: string;
  chainMeta?: Record<string, unknown>;
}): PaymentProof {
  return {
    paymentId: options.paymentRequest.paymentId,
    txHash: options.txHash,
    network: options.paymentRequest.network,
    amount: options.paymentRequest.amount,
    currency: options.paymentRequest.currency,
    fromAddress: options.fromAddress,
    toAddress: options.paymentRequest.destinationAddress,
    timestamp: Date.now(),
    blockHeight: options.blockHeight,
    ledgerIndex: options.ledgerIndex,
    signature: options.signature,
    zkProof: options.zkProof,
    chainMeta: options.chainMeta,
  };
}

/**
 * Verify a payment using the appropriate adapter
 */
export async function verifyPayment(
  options: VerifyPaymentOptions
): Promise<PaymentVerificationResult> {
  const adapter = getPaymentAdapter(options.request.network);
  
  if (!adapter) {
    return {
      valid: false,
      confirmed: false,
      status: 'failed',
      errors: [`No adapter registered for network: ${options.request.network}`],
      checks: {
        amountMatch: false,
        addressMatch: false,
        networkMatch: false,
        notExpired: false,
        txExists: false,
        txFinalized: false,
      },
    };
  }

  if (!adapter.isConnected()) {
    return {
      valid: false,
      confirmed: false,
      status: 'failed',
      errors: [`Adapter not connected for network: ${options.request.network}`],
      checks: {
        amountMatch: false,
        addressMatch: false,
        networkMatch: false,
        notExpired: false,
        txExists: false,
        txFinalized: false,
      },
    };
  }

  return adapter.verifyPayment(options);
}

export { ChainBridgeRegistry };
