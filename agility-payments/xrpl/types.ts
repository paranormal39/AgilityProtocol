/**
 * Agility Payments - XRPL Types
 * 
 * XRPL-specific type definitions for payment operations.
 */

import type { PaymentCurrency } from '../core/types.js';

/**
 * XRPL network configuration
 */
export interface XrplConfig {
  /** Network type */
  networkType: 'mainnet' | 'testnet' | 'devnet';
  
  /** WebSocket URL for XRPL node */
  wsUrl?: string;
  
  /** JSON-RPC URL (alternative to WebSocket) */
  rpcUrl?: string;
  
  /** Connection timeout in milliseconds */
  timeout?: number;
}

/**
 * Default XRPL endpoints
 */
export const XRPL_ENDPOINTS = {
  mainnet: 'wss://xrplcluster.com',
  testnet: 'wss://s.altnet.rippletest.net:51233',
  devnet: 'wss://s.devnet.rippletest.net:51233',
} as const;

/**
 * XRPL transaction for payment
 */
export interface XrplPaymentTx {
  TransactionType: 'Payment';
  Account: string;
  Destination: string;
  Amount: string | XrplAmount;
  Fee?: string;
  Sequence?: number;
  LastLedgerSequence?: number;
  Memos?: XrplMemo[];
  DestinationTag?: number;
  SourceTag?: number;
}

/**
 * XRPL amount (for issued currencies)
 */
export interface XrplAmount {
  currency: string;
  issuer: string;
  value: string;
}

/**
 * XRPL memo structure
 */
export interface XrplMemo {
  Memo: {
    MemoType?: string;
    MemoData?: string;
    MemoFormat?: string;
  };
}

/**
 * XRPL transaction result
 */
export interface XrplTxResult {
  /** Transaction hash */
  hash: string;
  
  /** Ledger index where tx was validated */
  ledger_index?: number;
  
  /** Transaction result code */
  result: string;
  
  /** Whether transaction was validated */
  validated: boolean;
  
  /** Transaction metadata */
  meta?: {
    TransactionResult: string;
    delivered_amount?: string | XrplAmount;
  };
}

/**
 * XRPL account info
 */
export interface XrplAccountInfo {
  account: string;
  balance: string;
  sequence: number;
  ownerCount: number;
}

/**
 * XRPL payment verification result
 */
export interface XrplPaymentVerification {
  /** Verification passed */
  valid: boolean;
  
  /** Transaction found on ledger */
  txFound: boolean;
  
  /** Transaction validated (finalized) */
  txValidated: boolean;
  
  /** Amount matches expected */
  amountMatch: boolean;
  
  /** Destination matches expected */
  destinationMatch: boolean;
  
  /** Memo contains expected data */
  memoMatch: boolean;
  
  /** Ledger index of transaction */
  ledgerIndex?: number;
  
  /** Actual delivered amount */
  deliveredAmount?: string;
  
  /** Error message if verification failed */
  error?: string;
}

/**
 * Agility payment memo structure
 */
export interface AgilityPaymentMemo {
  type: 'agility_payment';
  paymentId: string;
  orderId?: string;
  timestamp: number;
  version: string;
}

/**
 * Convert drops to XRP
 */
export function dropsToXrp(drops: string | number): string {
  const dropsNum = typeof drops === 'string' ? parseInt(drops, 10) : drops;
  return (dropsNum / 1_000_000).toString();
}

/**
 * Convert XRP to drops
 */
export function xrpToDrops(xrp: string | number): string {
  const xrpNum = typeof xrp === 'string' ? parseFloat(xrp) : xrp;
  return Math.floor(xrpNum * 1_000_000).toString();
}

/**
 * Encode memo data to hex
 */
export function encodeMemoData(data: string): string {
  return Buffer.from(data, 'utf8').toString('hex').toUpperCase();
}

/**
 * Decode memo data from hex
 */
export function decodeMemoData(hex: string): string {
  return Buffer.from(hex, 'hex').toString('utf8');
}

/**
 * Create Agility payment memo
 */
export function createAgilityMemo(paymentId: string, orderId?: string): XrplMemo {
  const memoData: AgilityPaymentMemo = {
    type: 'agility_payment',
    paymentId,
    orderId,
    timestamp: Date.now(),
    version: '1.0.0',
  };

  return {
    Memo: {
      MemoType: encodeMemoData('agility/payment'),
      MemoData: encodeMemoData(JSON.stringify(memoData)),
      MemoFormat: encodeMemoData('application/json'),
    },
  };
}

/**
 * Parse Agility payment memo from transaction
 */
export function parseAgilityMemo(memos: XrplMemo[]): AgilityPaymentMemo | null {
  if (!memos || memos.length === 0) {
    return null;
  }

  for (const memo of memos) {
    try {
      const memoType = memo.Memo.MemoType 
        ? decodeMemoData(memo.Memo.MemoType) 
        : '';
      
      if (memoType === 'agility/payment' && memo.Memo.MemoData) {
        const memoData = decodeMemoData(memo.Memo.MemoData);
        return JSON.parse(memoData) as AgilityPaymentMemo;
      }
    } catch {
      // Continue to next memo
    }
  }

  return null;
}
