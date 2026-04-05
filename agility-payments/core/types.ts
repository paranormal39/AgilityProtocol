/**
 * Agility Payments - Core Types
 * 
 * Type definitions for the payment module supporting XRPL, Midnight, and Cardano/Lace.
 */

// ============================================
// NETWORK & STATUS TYPES
// ============================================

/**
 * Supported payment networks
 */
export type PaymentNetwork = 'xrpl' | 'midnight' | 'cardano';

/**
 * Payment transaction status
 */
export type PaymentStatus = 
  | 'pending'      // Payment initiated, awaiting confirmation
  | 'confirming'   // Transaction submitted, awaiting finality
  | 'confirmed'    // Payment confirmed on-chain
  | 'failed'       // Payment failed
  | 'expired'      // Payment request expired
  | 'cancelled';   // Payment cancelled by user

/**
 * Supported currencies per network
 */
export type XrplCurrency = 'XRP' | 'USD' | 'EUR' | string; // string for issued currencies
export type MidnightCurrency = 'DUST' | 'tDUST';
export type CardanoCurrency = 'ADA' | 'tADA' | string; // string for native tokens

export type PaymentCurrency = XrplCurrency | MidnightCurrency | CardanoCurrency;

// ============================================
// PAYMENT REQUEST
// ============================================

/**
 * Payment request created by merchant
 */
export interface PaymentRequest {
  /** Unique payment identifier */
  paymentId: string;
  
  /** Merchant identifier */
  merchantId: string;
  
  /** Human-readable merchant name */
  merchantName: string;
  
  /** Payment amount as string (to preserve precision) */
  amount: string;
  
  /** Currency code */
  currency: PaymentCurrency;
  
  /** Target blockchain network */
  network: PaymentNetwork;
  
  /** Destination address for payment */
  destinationAddress: string;
  
  /** Optional memo/reference for tracking */
  memo?: string;
  
  /** Associated order ID */
  orderId?: string;
  
  /** Request expiration timestamp (ms) */
  expiresAt: number;
  
  /** Required KYC permissions for this payment */
  requiredKyc?: string[];
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Options for creating a payment request
 */
export interface CreatePaymentRequestOptions {
  merchantId: string;
  merchantName: string;
  amount: string;
  currency: PaymentCurrency;
  network: PaymentNetwork;
  destinationAddress: string;
  memo?: string;
  orderId?: string;
  expiresInMinutes?: number;
  requiredKyc?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================
// PAYMENT PROOF
// ============================================

/**
 * Proof of payment after transaction confirmation
 */
export interface PaymentProof {
  /** Payment ID this proof relates to */
  paymentId: string;
  
  /** On-chain transaction hash */
  txHash: string;
  
  /** Network where payment was made */
  network: PaymentNetwork;
  
  /** Amount paid */
  amount: string;
  
  /** Currency used */
  currency: PaymentCurrency;
  
  /** Sender address */
  fromAddress: string;
  
  /** Recipient address */
  toAddress: string;
  
  /** Timestamp of payment */
  timestamp: number;
  
  /** Block height (if applicable) */
  blockHeight?: number;
  
  /** Ledger index (XRPL specific) */
  ledgerIndex?: number;
  
  /** Cryptographic signature over proof */
  signature?: string;
  
  /** ZK proof data (Midnight specific) */
  zkProof?: string;
  
  /** Additional chain-specific metadata */
  chainMeta?: Record<string, unknown>;
}

/**
 * Options for creating a payment proof
 */
export interface CreatePaymentProofOptions {
  paymentRequest: PaymentRequest;
  txHash: string;
  fromAddress: string;
  blockHeight?: number;
  ledgerIndex?: number;
  signature?: string;
  zkProof?: string;
  chainMeta?: Record<string, unknown>;
}

// ============================================
// VERIFICATION
// ============================================

/**
 * Result of payment verification
 */
export interface PaymentVerificationResult {
  /** Overall verification status */
  valid: boolean;
  
  /** Payment confirmed on-chain */
  confirmed: boolean;
  
  /** Current payment status */
  status: PaymentStatus;
  
  /** List of verification errors */
  errors: string[];
  
  /** Detailed check results */
  checks: {
    amountMatch: boolean;
    addressMatch: boolean;
    networkMatch: boolean;
    notExpired: boolean;
    txExists: boolean;
    txFinalized: boolean;
  };
  
  /** Verification metadata */
  meta?: {
    verifiedAt: number;
    blockHeight?: number;
    confirmations?: number;
  };
}

/**
 * Options for verifying a payment
 */
export interface VerifyPaymentOptions {
  /** Original payment request */
  request: PaymentRequest;
  
  /** Payment proof to verify */
  proof: PaymentProof;
  
  /** Verify on-chain (requires network access) */
  verifyOnChain?: boolean;
  
  /** Minimum confirmations required */
  minConfirmations?: number;
}

// ============================================
// KYC + PAYMENT BUNDLE
// ============================================

/**
 * Combined KYC and payment verification bundle
 */
export interface KycPaymentBundle {
  /** Payment proof */
  payment: PaymentProof;
  
  /** KYC verification data */
  kyc: {
    /** Satisfied permissions */
    permissions: string[];
    
    /** Hash of KYC proof */
    proofHash: string;
    
    /** KYC verification status */
    verified: boolean;
    
    /** Pairwise DID used */
    pairwiseDid?: string;
  };
  
  /** Associated order ID */
  orderId?: string;
  
  /** Bundle integrity hash */
  bundleHash: string;
  
  /** Bundle creation timestamp */
  createdAt: number;
}

/**
 * Options for creating a KYC + Payment bundle
 */
export interface CreateKycPaymentBundleOptions {
  paymentProof: PaymentProof;
  kycPermissions: string[];
  kycProofHash: string;
  orderId?: string;
  pairwiseDid?: string;
}

/**
 * Result of merchant verification (KYC + Payment)
 */
export interface MerchantVerificationResult {
  /** Overall verification status */
  valid: boolean;
  
  /** Payment confirmed */
  paymentConfirmed: boolean;
  
  /** KYC requirements satisfied */
  kycVerified: boolean;
  
  /** Age verification passed (if required) */
  ageVerified?: boolean;
  
  /** Region verification passed (if required) */
  regionVerified?: boolean;
  
  /** List of errors */
  errors: string[];
  
  /** Verification details */
  details: {
    paymentId: string;
    txHash?: string;
    amount?: string;
    currency?: PaymentCurrency;
    network?: PaymentNetwork;
    kycPermissions?: string[];
  };
}

// ============================================
// CHAIN BRIDGE INTERFACE
// ============================================

/**
 * Generic chain bridge interface for payment operations
 * Implementations: XrplBridge, MidnightBridge, CardanoBridge
 */
export interface IChainBridge {
  /** Network this bridge supports */
  readonly network: PaymentNetwork;
  
  /** Check if bridge is connected */
  isConnected(): boolean;
  
  /** Connect to the network */
  connect(config?: ChainConfig): Promise<void>;
  
  /** Disconnect from the network */
  disconnect(): Promise<void>;
  
  /** Get current network status */
  getNetworkStatus(): Promise<NetworkStatus>;
}

/**
 * Payment adapter interface extending chain bridge
 */
export interface IPaymentAdapter extends IChainBridge {
  /** Create a payment transaction */
  createPayment(request: PaymentRequest): Promise<PaymentTransaction>;
  
  /** Submit a signed transaction */
  submitPayment(signedTx: string): Promise<SubmitResult>;
  
  /** Get payment status */
  getPaymentStatus(txHash: string): Promise<PaymentStatus>;
  
  /** Verify a payment on-chain */
  verifyPayment(options: VerifyPaymentOptions): Promise<PaymentVerificationResult>;
  
  /** Get transaction details */
  getTransaction(txHash: string): Promise<TransactionDetails | null>;
}

/**
 * Chain configuration
 */
export interface ChainConfig {
  /** Network type (mainnet, testnet, devnet) */
  networkType: 'mainnet' | 'testnet' | 'devnet';
  
  /** RPC endpoint URL */
  rpcUrl?: string;
  
  /** WebSocket endpoint URL */
  wsUrl?: string;
  
  /** API key (if required) */
  apiKey?: string;
  
  /** Additional chain-specific config */
  options?: Record<string, unknown>;
}

/**
 * Network status information
 */
export interface NetworkStatus {
  connected: boolean;
  network: PaymentNetwork;
  networkType: 'mainnet' | 'testnet' | 'devnet';
  blockHeight?: number;
  ledgerIndex?: number;
  latency?: number;
}

/**
 * Payment transaction (unsigned)
 */
export interface PaymentTransaction {
  /** Network */
  network: PaymentNetwork;
  
  /** Unsigned transaction blob */
  unsignedTx: string;
  
  /** Transaction hash (pre-computed) */
  txHash?: string;
  
  /** Expiration timestamp */
  expiresAt: number;
  
  /** Human-readable summary */
  summary: {
    from?: string;
    to: string;
    amount: string;
    currency: PaymentCurrency;
    fee?: string;
  };
}

/**
 * Result of submitting a transaction
 */
export interface SubmitResult {
  success: boolean;
  txHash?: string;
  error?: string;
  meta?: Record<string, unknown>;
}

/**
 * On-chain transaction details
 */
export interface TransactionDetails {
  txHash: string;
  network: PaymentNetwork;
  status: 'pending' | 'confirmed' | 'failed';
  blockHeight?: number;
  ledgerIndex?: number;
  timestamp?: number;
  from: string;
  to: string;
  amount: string;
  currency: PaymentCurrency;
  fee?: string;
  memo?: string;
  confirmations?: number;
  raw?: unknown;
}

// ============================================
// WALLET INTEGRATION
// ============================================

/**
 * Wallet adapter interface for signing payments
 */
export interface IWalletAdapter {
  /** Wallet type */
  readonly walletType: 'xumm' | 'lace' | 'local';
  
  /** Check if wallet is available */
  isAvailable(): boolean;
  
  /** Check if wallet is connected */
  isConnected(): boolean;
  
  /** Connect to wallet */
  connect(): Promise<WalletConnectionResult>;
  
  /** Disconnect from wallet */
  disconnect(): Promise<void>;
  
  /** Get wallet addresses */
  getAddresses(): Promise<string[]>;
  
  /** Sign a payment transaction */
  signPayment(tx: PaymentTransaction): Promise<SignedPayment>;
  
  /** Get wallet balance */
  getBalance(): Promise<WalletBalance>;
}

/**
 * Wallet connection result
 */
export interface WalletConnectionResult {
  connected: boolean;
  address?: string;
  network?: PaymentNetwork;
  error?: string;
}

/**
 * Signed payment transaction
 */
export interface SignedPayment {
  signedTx: string;
  txHash: string;
  signature?: string;
}

/**
 * Wallet balance
 */
export interface WalletBalance {
  available: string;
  currency: PaymentCurrency;
  locked?: string;
  assets?: Array<{
    currency: string;
    amount: string;
    issuer?: string;
  }>;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Default payment expiration (15 minutes)
 */
export const DEFAULT_PAYMENT_EXPIRY_MINUTES = 15;

/**
 * Minimum confirmations per network
 */
export const MIN_CONFIRMATIONS: Record<PaymentNetwork, number> = {
  xrpl: 1,      // XRPL is fast-finality
  midnight: 1,  // Midnight has ZK finality
  cardano: 2,   // Cardano needs a few blocks
};

/**
 * Network display names
 */
export const NETWORK_NAMES: Record<PaymentNetwork, string> = {
  xrpl: 'XRP Ledger',
  midnight: 'Midnight',
  cardano: 'Cardano',
};

/**
 * Default currencies per network
 */
export const DEFAULT_CURRENCY: Record<PaymentNetwork, PaymentCurrency> = {
  xrpl: 'XRP',
  midnight: 'DUST',
  cardano: 'ADA',
};
