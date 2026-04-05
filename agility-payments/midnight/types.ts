/**
 * Agility Payments - Midnight Types
 * 
 * Midnight-specific type definitions for ZK payment operations.
 */

/**
 * Midnight network configuration
 */
export interface MidnightConfig {
  /** Network type */
  networkType: 'mainnet' | 'testnet' | 'devnet';
  
  /** Midnight node URL */
  nodeUrl?: string;
  
  /** Indexer URL */
  indexerUrl?: string;
  
  /** Proof server URL */
  proofServerUrl?: string;
  
  /** Connection timeout in milliseconds */
  timeout?: number;
}

/**
 * Default Midnight endpoints
 */
export const MIDNIGHT_ENDPOINTS = {
  mainnet: {
    node: 'https://rpc.midnight.network',
    indexer: 'https://indexer.midnight.network',
    proofServer: 'https://proof.midnight.network',
  },
  testnet: {
    node: 'https://rpc.testnet.midnight.network',
    indexer: 'https://indexer.testnet.midnight.network',
    proofServer: 'https://proof.testnet.midnight.network',
  },
  devnet: {
    node: 'https://rpc.devnet.midnight.network',
    indexer: 'https://indexer.devnet.midnight.network',
    proofServer: 'https://proof.devnet.midnight.network',
  },
} as const;

/**
 * Midnight wallet state
 */
export interface MidnightWalletState {
  connected: boolean;
  address: string | null;
  network: 'mainnet' | 'testnet' | 'devnet' | null;
  balance?: MidnightBalance;
}

/**
 * Midnight balance
 */
export interface MidnightBalance {
  /** DUST token balance */
  dust: string;
  
  /** Shielded balance (private) */
  shielded?: string;
  
  /** Unshielded balance (public) */
  unshielded?: string;
}

/**
 * Midnight transaction types
 */
export type MidnightTxType = 
  | 'transfer'           // Standard transfer
  | 'shielded_transfer'  // Private transfer
  | 'contract_call'      // Smart contract interaction
  | 'proof_submission';  // ZK proof submission

/**
 * Midnight payment transaction
 */
export interface MidnightPaymentTx {
  /** Transaction type */
  type: MidnightTxType;
  
  /** Sender address */
  from: string;
  
  /** Recipient address */
  to: string;
  
  /** Amount in DUST */
  amount: string;
  
  /** Whether to use shielded (private) transfer */
  shielded: boolean;
  
  /** Transaction memo/reference */
  memo?: string;
  
  /** ZK proof data */
  zkProof?: MidnightZkProof;
  
  /** Transaction metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Midnight ZK proof structure
 */
export interface MidnightZkProof {
  /** Proof type */
  proofType: 'payment' | 'identity' | 'custom';
  
  /** Serialized proof data */
  proofData: string;
  
  /** Public inputs */
  publicInputs: string[];
  
  /** Verification key hash */
  vkHash: string;
  
  /** Circuit identifier */
  circuitId: string;
  
  /** Proof generation timestamp */
  generatedAt: number;
}

/**
 * Midnight transaction result
 */
export interface MidnightTxResult {
  /** Transaction hash */
  txHash: string;
  
  /** Block height */
  blockHeight?: number;
  
  /** Transaction status */
  status: 'pending' | 'confirmed' | 'failed';
  
  /** ZK proof verified */
  zkVerified?: boolean;
  
  /** Error message if failed */
  error?: string;
  
  /** Transaction metadata */
  meta?: Record<string, unknown>;
}

/**
 * Midnight payment verification result
 */
export interface MidnightPaymentVerification {
  /** Verification passed */
  valid: boolean;
  
  /** Transaction found on chain */
  txFound: boolean;
  
  /** Transaction confirmed */
  txConfirmed: boolean;
  
  /** ZK proof verified */
  zkProofValid: boolean;
  
  /** Amount matches expected */
  amountMatch: boolean;
  
  /** Recipient matches expected */
  recipientMatch: boolean;
  
  /** Block height of transaction */
  blockHeight?: number;
  
  /** Error message if verification failed */
  error?: string;
}

/**
 * Agility payment proof for Midnight
 */
export interface AgilityMidnightPaymentProof {
  /** Payment ID */
  paymentId: string;
  
  /** Order ID (optional) */
  orderId?: string;
  
  /** ZK proof of payment */
  zkProof: MidnightZkProof;
  
  /** Transaction hash */
  txHash: string;
  
  /** Timestamp */
  timestamp: number;
  
  /** Protocol version */
  version: string;
}

/**
 * Midnight contract deployment result
 */
export interface MidnightContractResult {
  success: boolean;
  contractId?: string;
  txHash?: string;
  error?: string;
}

/**
 * Midnight proof generation options
 */
export interface MidnightProofOptions {
  /** Circuit to use */
  circuit: 'payment' | 'age_verification' | 'kyc' | 'custom';
  
  /** Private inputs (witness) */
  privateInputs: Record<string, unknown>;
  
  /** Public inputs */
  publicInputs: Record<string, unknown>;
  
  /** Custom circuit ID (for custom circuits) */
  customCircuitId?: string;
}

/**
 * Create a Midnight payment memo
 */
export function createMidnightMemo(paymentId: string, orderId?: string): string {
  return JSON.stringify({
    type: 'agility_payment',
    paymentId,
    orderId,
    timestamp: Date.now(),
    version: '1.0.0',
  });
}

/**
 * Parse a Midnight payment memo
 */
export function parseMidnightMemo(memo: string): {
  type: string;
  paymentId: string;
  orderId?: string;
  timestamp: number;
  version: string;
} | null {
  try {
    const parsed = JSON.parse(memo);
    if (parsed.type === 'agility_payment') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Convert DUST to smallest unit
 */
export function dustToSmallestUnit(dust: string | number): string {
  const dustNum = typeof dust === 'string' ? parseFloat(dust) : dust;
  return Math.floor(dustNum * 1_000_000).toString();
}

/**
 * Convert smallest unit to DUST
 */
export function smallestUnitToDust(units: string | number): string {
  const unitsNum = typeof units === 'string' ? parseInt(units, 10) : units;
  return (unitsNum / 1_000_000).toString();
}
