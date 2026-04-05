/**
 * Agility QR - Payment Integration
 * 
 * Bridges agility-qr proof system with agility-payments module.
 * Enables QR-based payment requests with KYC verification.
 */

import { v4 as uuidv4 } from 'uuid';
import { encodeToQR, decodeFromQR, QRPayload } from '../shared/qr.js';
import type {
  PaymentRequest,
  PaymentProof,
  PaymentNetwork,
  KycPaymentBundle,
} from '../../agility-payments/core/types.js';

// ============================================
// PAYMENT QR CREATION
// ============================================

export interface CreatePaymentQROptions {
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
}

/**
 * Create a QR code for payment request with optional KYC requirements
 */
export function createPaymentQR(options: CreatePaymentQROptions): string {
  const now = Date.now();
  const expiresAt = now + (options.expiresInMinutes || 15) * 60 * 1000;

  const paymentRequest: PaymentRequest = {
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

  const payload: QRPayload = {
    type: 'request',
    data: {
      ...paymentRequest,
      requestType: 'payment',
    },
    timestamp: now,
    version: '1.0.0',
  };

  return encodeToQR(payload, { compress: true });
}

/**
 * Decode a payment QR request
 */
export function decodePaymentQR(qrString: string): PaymentRequest {
  const payload = decodeFromQR(qrString);

  if (payload.data.requestType !== 'payment') {
    throw new Error('Invalid QR type: expected payment request');
  }

  const request = payload.data as PaymentRequest;

  if (Date.now() > request.expiresAt) {
    throw new Error('Payment request has expired');
  }

  return request;
}

// ============================================
// PAYMENT RESPONSE QR
// ============================================

export interface CreatePaymentResponseOptions {
  paymentRequest: PaymentRequest;
  txHash: string;
  fromAddress: string;
  kycPermissions?: string[];
  kycProofHash?: string;
  blockHeight?: number;
  signature?: string;
}

/**
 * Create a QR code for payment response (proof of payment)
 */
export function createPaymentResponseQR(options: CreatePaymentResponseOptions): string {
  const now = Date.now();

  const paymentProof: PaymentProof = {
    paymentId: options.paymentRequest.paymentId,
    txHash: options.txHash,
    network: options.paymentRequest.network,
    amount: options.paymentRequest.amount,
    currency: options.paymentRequest.currency,
    fromAddress: options.fromAddress,
    toAddress: options.paymentRequest.destinationAddress,
    timestamp: now,
    blockHeight: options.blockHeight,
    signature: options.signature,
  };

  // If KYC permissions provided, create a bundle
  if (options.kycPermissions && options.kycProofHash) {
    const bundle: KycPaymentBundle = {
      payment: paymentProof,
      kyc: {
        permissions: options.kycPermissions,
        proofHash: options.kycProofHash,
        verified: true,
      },
      orderId: options.paymentRequest.orderId,
      bundleHash: '', // Will be computed
      createdAt: now,
    };

    // Compute bundle hash
    const bundleData = JSON.stringify({
      payment: paymentProof,
      kyc: options.kycPermissions,
      orderId: options.paymentRequest.orderId,
    });
    bundle.bundleHash = simpleHash(bundleData);

    const payload: QRPayload = {
      type: 'response',
      data: {
        ...bundle,
        responseType: 'kyc_payment',
      },
      timestamp: now,
      version: '1.0.0',
    };

    return encodeToQR(payload, { compress: true });
  }

  // Payment-only response
  const payload: QRPayload = {
    type: 'response',
    data: {
      ...paymentProof,
      responseType: 'payment',
    },
    timestamp: now,
    version: '1.0.0',
  };

  return encodeToQR(payload, { compress: true });
}

/**
 * Decode a payment response QR
 */
export function decodePaymentResponseQR(qrString: string): PaymentProof | KycPaymentBundle {
  const payload = decodeFromQR(qrString);

  if (payload.data.responseType === 'kyc_payment') {
    return payload.data as KycPaymentBundle;
  }

  if (payload.data.responseType === 'payment') {
    return payload.data as PaymentProof;
  }

  throw new Error('Invalid QR type: expected payment or kyc_payment response');
}

// ============================================
// VERIFICATION
// ============================================

export interface VerifyPaymentQROptions {
  originalRequest: PaymentRequest;
  responseQR: string;
}

/**
 * Verify a payment response QR against the original request
 */
export function verifyPaymentQR(options: VerifyPaymentQROptions): {
  valid: boolean;
  paymentConfirmed: boolean;
  kycVerified: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  let paymentConfirmed = false;
  let kycVerified = false;

  try {
    const response = decodePaymentResponseQR(options.responseQR);

    // Check if it's a bundle or just payment proof
    const isBundle = 'kyc' in response;
    const paymentProof = isBundle ? (response as KycPaymentBundle).payment : response as PaymentProof;

    // Verify payment matches request
    if (paymentProof.paymentId !== options.originalRequest.paymentId) {
      errors.push('Payment ID does not match');
    }

    if (paymentProof.amount !== options.originalRequest.amount) {
      errors.push('Amount does not match');
    }

    if (paymentProof.toAddress !== options.originalRequest.destinationAddress) {
      errors.push('Destination address does not match');
    }

    if (paymentProof.network !== options.originalRequest.network) {
      errors.push('Network does not match');
    }

    // Payment is confirmed if we have a tx hash
    if (paymentProof.txHash) {
      paymentConfirmed = true;
    }

    // Check KYC if it's a bundle
    if (isBundle) {
      const bundle = response as KycPaymentBundle;
      
      if (options.originalRequest.requiredKyc) {
        const missingKyc = options.originalRequest.requiredKyc.filter(
          req => !bundle.kyc.permissions.includes(req)
        );
        
        if (missingKyc.length > 0) {
          errors.push(`Missing KYC: ${missingKyc.join(', ')}`);
        } else {
          kycVerified = true;
        }
      } else {
        kycVerified = true;
      }
    } else if (options.originalRequest.requiredKyc && options.originalRequest.requiredKyc.length > 0) {
      errors.push('KYC required but not provided in response');
    } else {
      kycVerified = true;
    }

    return {
      valid: errors.length === 0,
      paymentConfirmed,
      kycVerified,
      errors,
    };

  } catch (error) {
    errors.push(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      valid: false,
      paymentConfirmed: false,
      kycVerified: false,
      errors,
    };
  }
}

// ============================================
// UTILITIES
// ============================================

/**
 * Simple hash function for bundle integrity
 */
function simpleHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Check if a QR string is a payment request
 */
export function isPaymentRequestQR(qrString: string): boolean {
  try {
    const payload = decodeFromQR(qrString);
    return payload.type === 'request' && payload.data.requestType === 'payment';
  } catch {
    return false;
  }
}

/**
 * Check if a QR string is a payment response
 */
export function isPaymentResponseQR(qrString: string): boolean {
  try {
    const payload = decodeFromQR(qrString);
    return payload.type === 'response' && 
      (payload.data.responseType === 'payment' || payload.data.responseType === 'kyc_payment');
  } catch {
    return false;
  }
}

/**
 * Get payment network display name
 */
export function getNetworkDisplayName(network: PaymentNetwork): string {
  const names: Record<PaymentNetwork, string> = {
    xrpl: 'XRP Ledger',
    midnight: 'Midnight',
    cardano: 'Cardano',
  };
  return names[network] || network;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    XRP: 'XRP',
    ADA: '₳',
    DUST: 'DUST',
    USD: '$',
    EUR: '€',
  };
  return symbols[currency] || currency;
}
