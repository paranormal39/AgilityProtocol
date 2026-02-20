/**
 * XRPL Consent Transaction Verification
 * 
 * Verifies that a consent grant was properly signed via XRPL transaction
 * by checking the transaction memo contains the expected consent hash.
 */

import { VerificationErrorCode, ENABLE_XRPL_CONSENT_TX_VERIFY } from '../config.js';
import { canonicalJson, sha256Hex } from '../../utils/canonical.js';
import type { ConsentGrant } from '../../schemas/ConsentGrant.js';
import { type IXrplClient, XrplJsonRpcClient } from './XrplClient.js';

export interface XrplVerifyMeta {
  note?: string;
  txHash?: string;
  ledgerIndex?: number;
  foundMemo?: string;
  account?: string;
  expectedHash?: string;
  memoMatched?: boolean;
}

export interface XrplVerifyResult {
  ok: boolean;
  code?: VerificationErrorCode;
  message?: string;
  meta?: XrplVerifyMeta;
}

/**
 * Compute the consent hash from a grant (excluding signature fields).
 */
export function computeConsentHash(grant: ConsentGrant): string {
  const consentPayload = {
    grantId: grant.grantId,
    requestId: grant.requestId,
    audience: grant.audience,
    nonce: grant.nonce,
    permissions: grant.permissions,
    expiresAt: grant.expiresAt,
    issuedAt: grant.issuedAt,
    signer: grant.signer,
    version: grant.version,
    protocolVersion: grant.protocolVersion,
    consent: grant.consent,
  };
  
  const canonical = canonicalJson(consentPayload);
  return sha256Hex(canonical);
}

/**
 * Decode memo data from various formats.
 * Supports hex, base64, and utf8 plaintext.
 */
function decodeMemoData(data: string): string[] {
  const results: string[] = [];
  
  // Add raw data (lowercase for comparison)
  results.push(data.toLowerCase());
  
  // Try hex decode
  if (/^[0-9a-fA-F]+$/.test(data)) {
    try {
      const hexDecoded = Buffer.from(data, 'hex').toString('utf8');
      results.push(hexDecoded.toLowerCase());
    } catch {
      // Ignore decode errors
    }
  }
  
  // Try base64 decode
  if (/^[A-Za-z0-9+/=]+$/.test(data) && data.length % 4 === 0) {
    try {
      const base64Decoded = Buffer.from(data, 'base64').toString('utf8');
      // Only add if it looks like valid text (no control chars except newline)
      if (/^[\x20-\x7E\n\r\t]*$/.test(base64Decoded)) {
        results.push(base64Decoded.toLowerCase());
      }
    } catch {
      // Ignore decode errors
    }
  }
  
  return results;
}

/**
 * Extract memo data from XRPL transaction.
 * Handles hex, base64, and utf8 encoded memos.
 */
function extractMemoData(tx: any): string[] {
  const memos: string[] = [];
  
  if (!tx.Memos || !Array.isArray(tx.Memos)) {
    return memos;
  }

  for (const memoWrapper of tx.Memos) {
    const memo = memoWrapper.Memo;
    if (!memo) continue;

    // Try MemoData field
    if (memo.MemoData) {
      const decoded = decodeMemoData(memo.MemoData);
      memos.push(...decoded);
    }
  }

  return memos;
}

/**
 * Verify XRPL consent transaction.
 * 
 * When disabled: returns ok=true with note
 * When enabled: fetches tx and validates memo + account
 */
export async function verifyXrplConsentTx(
  grant: ConsentGrant,
  expectedConsentHash: string,
  xrplClient?: IXrplClient
): Promise<XrplVerifyResult> {
  // If disabled, return success with note
  if (!ENABLE_XRPL_CONSENT_TX_VERIFY) {
    return {
      ok: true,
      meta: {
        note: 'XRPL tx verify disabled',
      },
    };
  }

  // Validate signer type
  if (grant.signer.type !== 'xrpl') {
    return {
      ok: true,
      meta: {
        note: 'Signer is not XRPL type, skipping XRPL verification',
      },
    };
  }

  // Require txHash in signatureMeta
  const signatureMeta = grant.signatureMeta as Record<string, unknown> | undefined;
  const txHashRaw = signatureMeta?.txHash;
  if (!txHashRaw || typeof txHashRaw !== 'string') {
    return {
      ok: false,
      code: VerificationErrorCode.SIGNATURE_INVALID,
      message: 'Missing txHash in signatureMeta for XRPL signer',
      meta: {
        expectedHash: expectedConsentHash,
      },
    };
  }
  
  const txHash = txHashRaw;

  // Use provided client or create default
  const client = xrplClient || new XrplJsonRpcClient();

  try {
    const tx = await client.getTransaction(txHash);

    if (!tx) {
      return {
        ok: false,
        code: VerificationErrorCode.XRPL_TX_NOT_FOUND,
        message: `Transaction not found: ${txHash}`,
        meta: {
          txHash,
          expectedHash: expectedConsentHash,
        },
      };
    }

    // Validate account matches signer
    const txAccount = tx.Account;
    const expectedAccount = grant.signer.id;
    
    // Handle both raw address and did:xrpl: format
    const normalizedExpected = expectedAccount.startsWith('did:xrpl:')
      ? expectedAccount.split(':').pop()
      : expectedAccount;

    if (txAccount !== normalizedExpected) {
      return {
        ok: false,
        code: VerificationErrorCode.XRPL_ACCOUNT_MISMATCH,
        message: `Account mismatch: tx=${txAccount}, expected=${normalizedExpected}`,
        meta: {
          txHash,
          account: txAccount,
          expectedHash: expectedConsentHash,
        },
      };
    }

    // Extract and check memos
    const memos = extractMemoData(tx);
    const expectedHashLower = expectedConsentHash.toLowerCase();
    
    const foundMemo = memos.find(m => 
      m.toLowerCase() === expectedHashLower ||
      m.toLowerCase().includes(expectedHashLower)
    );

    if (!foundMemo) {
      return {
        ok: false,
        code: VerificationErrorCode.XRPL_MEMO_MISMATCH,
        message: 'Consent hash not found in transaction memos',
        meta: {
          txHash,
          account: txAccount,
          expectedHash: expectedConsentHash,
          ledgerIndex: tx.ledger_index,
        },
      };
    }

    // Success
    return {
      ok: true,
      meta: {
        txHash,
        account: txAccount,
        foundMemo,
        expectedHash: expectedConsentHash,
        ledgerIndex: tx.ledger_index,
      },
    };

  } catch (error) {
    return {
      ok: false,
      code: VerificationErrorCode.XRPL_TX_NOT_FOUND,
      message: `Failed to fetch transaction: ${error instanceof Error ? error.message : String(error)}`,
      meta: {
        txHash,
        expectedHash: expectedConsentHash,
      },
    };
  }
}

// Re-export MockXrplClient from XrplClient.ts for backwards compatibility
export { MockXrplClient as MockXrplClientProvider } from './XrplClient.js';
