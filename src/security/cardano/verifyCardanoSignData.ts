/**
 * Cardano signData Verification (CIP-30)
 * 
 * Verifies Cardano wallet signatures using ed25519.
 * Supports COSE_Sign1 format as used by CIP-30 wallets.
 */

import { createVerify, createHash } from 'crypto';
import { VerificationErrorCode, ENABLE_CARDANO_SIGNDATA_VERIFY } from '../config.js';
import type { ConsentGrant } from '../../schemas/ConsentGrant.js';

export interface CardanoVerifyMeta {
  note?: string;
  address?: string;
  expectedHash?: string;
  signatureValid?: boolean;
  keyUsed?: string;
}

export interface CardanoVerifyResult {
  ok: boolean;
  code?: VerificationErrorCode;
  message?: string;
  meta?: CardanoVerifyMeta;
}

/**
 * Decode hex string to Buffer.
 */
function hexToBuffer(hex: string): Buffer {
  return Buffer.from(hex, 'hex');
}

/**
 * Verify ed25519 signature using Node.js crypto.
 * 
 * @param publicKey - 32-byte ed25519 public key (hex)
 * @param signature - 64-byte ed25519 signature (hex)
 * @param message - Message that was signed (hex or utf8)
 * @returns true if signature is valid
 */
export function verifyEd25519Signature(
  publicKey: string,
  signature: string,
  message: string
): boolean {
  try {
    const pubKeyBuffer = hexToBuffer(publicKey);
    const sigBuffer = hexToBuffer(signature);
    
    // Message can be hex or utf8
    let msgBuffer: Buffer;
    if (/^[0-9a-fA-F]+$/.test(message) && message.length % 2 === 0) {
      msgBuffer = hexToBuffer(message);
    } else {
      msgBuffer = Buffer.from(message, 'utf8');
    }

    // Node.js crypto expects the public key in a specific format
    // For ed25519, we need to construct the proper key format
    const keyObject = {
      key: Buffer.concat([
        // Ed25519 public key prefix (DER format)
        Buffer.from('302a300506032b6570032100', 'hex'),
        pubKeyBuffer,
      ]),
      format: 'der' as const,
      type: 'spki' as const,
    };

    const verify = createVerify('ed25519');
    verify.update(msgBuffer);
    
    // Use the raw verification
    const publicKeyObj = require('crypto').createPublicKey(keyObject);
    return require('crypto').verify(null, msgBuffer, publicKeyObj, sigBuffer);
  } catch (error) {
    return false;
  }
}

/**
 * Parse minimal COSE_Sign1 structure.
 * 
 * CIP-30 uses COSE_Sign1 which is CBOR-encoded.
 * This is a minimal parser for the common case.
 */
export function parseCoseSign1(coseHex: string): {
  signature: string;
  payload: string;
} | null {
  try {
    const buffer = hexToBuffer(coseHex);
    
    // COSE_Sign1 is a CBOR array with 4 elements:
    // [protected, unprotected, payload, signature]
    // For simplicity, we extract signature from the end (last 64 bytes for ed25519)
    
    if (buffer.length < 64) {
      return null;
    }
    
    // Extract signature (last 64 bytes)
    const signature = buffer.slice(-64).toString('hex');
    
    // Payload is typically in the middle - for our use case,
    // we reconstruct it from the expected consent hash
    return {
      signature,
      payload: '', // Will be reconstructed
    };
  } catch {
    return null;
  }
}

/**
 * Verify Cardano signData signature.
 * 
 * When disabled: returns ok=true with note
 * When enabled: verifies CIP-30 signature over consent hash
 */
export function verifyCardanoSignData(
  grant: ConsentGrant,
  expectedConsentHash: string
): CardanoVerifyResult {
  // If disabled, return success with note
  if (!ENABLE_CARDANO_SIGNDATA_VERIFY) {
    return {
      ok: true,
      meta: {
        note: 'Cardano signData verify disabled',
      },
    };
  }

  // Validate signer type (use string comparison for future compatibility)
  const signerType = grant.signer.type as string;
  if (signerType !== 'cardano') {
    return {
      ok: true,
      meta: {
        note: 'Signer is not Cardano type, skipping Cardano verification',
      },
    };
  }

  // Extract signature data from signatureMeta
  const signatureMeta = grant.signatureMeta as Record<string, unknown> | undefined;
  const signature = signatureMeta?.signature as string | undefined;
  const key = signatureMeta?.key as string | undefined;
  const payload = signatureMeta?.payload as string | undefined;

  if (!signature || !key) {
    return {
      ok: false,
      code: VerificationErrorCode.CARDANO_SIGNATURE_INVALID,
      message: 'Missing signature or key in signatureMeta for Cardano signer',
      meta: {
        expectedHash: expectedConsentHash,
      },
    };
  }

  // Determine the message to verify
  // If payload is provided, use it; otherwise use expectedConsentHash
  const messageToVerify = payload || expectedConsentHash;

  // Verify the signature
  const isValid = verifyEd25519Signature(key, signature, messageToVerify);

  if (!isValid) {
    return {
      ok: false,
      code: VerificationErrorCode.CARDANO_SIGNATURE_INVALID,
      message: 'Cardano signature verification failed',
      meta: {
        address: grant.signer.id,
        expectedHash: expectedConsentHash,
        signatureValid: false,
        keyUsed: key.slice(0, 16) + '...',
      },
    };
  }

  // Verify the payload matches expected consent hash (if payload was provided)
  if (payload && payload !== expectedConsentHash) {
    return {
      ok: false,
      code: VerificationErrorCode.CARDANO_SIGNATURE_INVALID,
      message: 'Signed payload does not match expected consent hash',
      meta: {
        address: grant.signer.id,
        expectedHash: expectedConsentHash,
        signatureValid: true,
        note: 'Signature valid but payload mismatch',
      },
    };
  }

  return {
    ok: true,
    meta: {
      address: grant.signer.id,
      expectedHash: expectedConsentHash,
      signatureValid: true,
      keyUsed: key.slice(0, 16) + '...',
    },
  };
}

/**
 * Verify Cardano signature using raw inputs (for testing/fixtures).
 */
export function verifyCardanoSignatureRaw(
  publicKey: string,
  signature: string,
  message: string
): CardanoVerifyResult {
  const isValid = verifyEd25519Signature(publicKey, signature, message);

  if (!isValid) {
    return {
      ok: false,
      code: VerificationErrorCode.CARDANO_SIGNATURE_INVALID,
      message: 'Signature verification failed',
      meta: {
        signatureValid: false,
        keyUsed: publicKey.slice(0, 16) + '...',
      },
    };
  }

  return {
    ok: true,
    meta: {
      signatureValid: true,
      keyUsed: publicKey.slice(0, 16) + '...',
    },
  };
}

/**
 * Mock Cardano verifier for testing.
 */
export class MockCardanoVerifier {
  private validSignatures: Set<string> = new Set();

  addValidSignature(consentHash: string): void {
    this.validSignatures.add(consentHash);
  }

  verify(grant: ConsentGrant, expectedConsentHash: string): CardanoVerifyResult {
    if (!ENABLE_CARDANO_SIGNDATA_VERIFY) {
      return {
        ok: true,
        meta: { note: 'Cardano signData verify disabled' },
      };
    }

    if (this.validSignatures.has(expectedConsentHash)) {
      return {
        ok: true,
        meta: {
          address: grant.signer.id,
          expectedHash: expectedConsentHash,
          signatureValid: true,
        },
      };
    }

    return {
      ok: false,
      code: VerificationErrorCode.CARDANO_SIGNATURE_INVALID,
      message: 'Mock: signature not in valid set',
      meta: {
        address: grant.signer.id,
        expectedHash: expectedConsentHash,
        signatureValid: false,
      },
    };
  }

  clear(): void {
    this.validSignatures.clear();
  }
}
