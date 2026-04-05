/**
 * Agility Payments - Lace Wallet Types
 * 
 * Type definitions for Lace wallet payment integration (CIP-30).
 */

/**
 * Lace wallet configuration
 */
export interface LacePaymentConfig {
  /** Network type */
  networkType: 'mainnet' | 'testnet' | 'preprod';
  
  /** Auto-connect on initialization */
  autoConnect?: boolean;
  
  /** Connection timeout in milliseconds */
  timeout?: number;
}

/**
 * Lace wallet connection state
 */
export interface LaceWalletState {
  /** Wallet is connected */
  connected: boolean;
  
  /** Primary wallet address */
  address: string | null;
  
  /** Network ID (0 = testnet, 1 = mainnet) */
  networkId: number | null;
  
  /** Wallet name */
  walletName: string | null;
  
  /** Wallet icon */
  walletIcon: string | null;
  
  /** API version */
  apiVersion: string | null;
}

/**
 * Lace transaction for payment
 */
export interface LacePaymentTx {
  /** Recipient address (bech32) */
  to: string;
  
  /** Amount in lovelace */
  amount: string;
  
  /** Native assets to include */
  assets?: LaceAsset[];
  
  /** Transaction metadata */
  metadata?: Record<number, unknown>;
  
  /** TTL in slots */
  ttl?: number;
}

/**
 * Lace native asset
 */
export interface LaceAsset {
  /** Policy ID */
  policyId: string;
  
  /** Asset name (hex) */
  assetName: string;
  
  /** Amount */
  amount: string;
}

/**
 * Lace transaction result
 */
export interface LaceTxResult {
  /** Transaction hash */
  txHash: string;
  
  /** Transaction submitted successfully */
  submitted: boolean;
  
  /** Error message if failed */
  error?: string;
}

/**
 * Lace balance response
 */
export interface LaceBalance {
  /** ADA balance in lovelace */
  lovelace: string;
  
  /** ADA balance formatted */
  ada: string;
  
  /** Native assets */
  assets?: LaceAsset[];
}

/**
 * Lace UTxO
 */
export interface LaceUtxo {
  /** Transaction hash */
  txHash: string;
  
  /** Output index */
  outputIndex: number;
  
  /** Amount in lovelace */
  amount: string;
  
  /** Assets at this UTxO */
  assets?: LaceAsset[];
  
  /** Address */
  address: string;
}

/**
 * Agility payment metadata for Cardano
 */
export interface AgilityCardanoMetadata {
  /** CIP-20 message */
  674: {
    msg: string[];
  };
  
  /** Agility payment data */
  1: {
    agility: {
      paymentId: string;
      orderId?: string;
      version: string;
      timestamp: number;
    };
  };
}

/**
 * Convert lovelace to ADA
 */
export function lovelaceToAda(lovelace: string | number): string {
  const lovelaceNum = typeof lovelace === 'string' ? parseInt(lovelace, 10) : lovelace;
  return (lovelaceNum / 1_000_000).toFixed(6);
}

/**
 * Convert ADA to lovelace
 */
export function adaToLovelace(ada: string | number): string {
  const adaNum = typeof ada === 'string' ? parseFloat(ada) : ada;
  return Math.floor(adaNum * 1_000_000).toString();
}

/**
 * Create Agility payment metadata for Cardano
 */
export function createAgilityCardanoMetadata(
  paymentId: string,
  orderId?: string
): AgilityCardanoMetadata {
  return {
    674: {
      msg: ['Agility Payment', paymentId.substring(0, 16)],
    },
    1: {
      agility: {
        paymentId,
        orderId,
        version: '1.0.0',
        timestamp: Date.now(),
      },
    },
  };
}

/**
 * Parse Agility payment metadata from Cardano transaction
 */
export function parseAgilityCardanoMetadata(
  metadata: Record<number, unknown>
): { paymentId: string; orderId?: string; timestamp: number } | null {
  try {
    const agilityData = metadata[1] as any;
    if (agilityData?.agility) {
      return {
        paymentId: agilityData.agility.paymentId,
        orderId: agilityData.agility.orderId,
        timestamp: agilityData.agility.timestamp,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validate Cardano address (basic check)
 */
export function isValidCardanoAddress(address: string): boolean {
  // Mainnet addresses start with addr1
  // Testnet addresses start with addr_test1
  return address.startsWith('addr1') || address.startsWith('addr_test1');
}
