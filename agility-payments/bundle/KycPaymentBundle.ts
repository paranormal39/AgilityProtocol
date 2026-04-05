/**
 * Agility Payments - KYC + Payment Bundle
 * 
 * Combines KYC verification with payment proof for complete merchant verification.
 * Enables privacy-preserving commerce with split-knowledge architecture.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  PaymentRequest,
  PaymentProof,
  KycPaymentBundle,
  CreateKycPaymentBundleOptions,
  MerchantVerificationResult,
  PaymentNetwork,
} from '../core/types.js';

/**
 * Create a SHA-256 hash of data
 */
async function sha256(data: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Node.js fallback
  const { createHash } = await import('crypto');
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Create a KYC + Payment bundle
 */
export async function createKycPaymentBundle(
  options: CreateKycPaymentBundleOptions
): Promise<KycPaymentBundle> {
  const { paymentProof, kycPermissions, kycProofHash, orderId, pairwiseDid } = options;

  // Create bundle hash for integrity verification
  const bundleData = JSON.stringify({
    payment: paymentProof,
    kyc: kycPermissions,
    orderId,
  });
  const bundleHash = await sha256(bundleData);

  return {
    payment: paymentProof,
    kyc: {
      permissions: kycPermissions,
      proofHash: kycProofHash,
      verified: true,
      pairwiseDid,
    },
    orderId,
    bundleHash,
    createdAt: Date.now(),
  };
}

/**
 * Verify a KYC + Payment bundle for merchants
 */
export async function verifyMerchantBundle(
  originalRequest: PaymentRequest,
  bundle: KycPaymentBundle
): Promise<MerchantVerificationResult> {
  const errors: string[] = [];
  let paymentConfirmed = false;
  let kycVerified = false;

  // Verify payment matches request
  if (bundle.payment.paymentId !== originalRequest.paymentId) {
    errors.push('Payment ID does not match request');
  }

  if (bundle.payment.amount !== originalRequest.amount) {
    errors.push('Payment amount does not match');
  }

  if (bundle.payment.toAddress !== originalRequest.destinationAddress) {
    errors.push('Destination address does not match');
  }

  if (bundle.payment.network !== originalRequest.network) {
    errors.push('Payment network does not match');
  }

  // Verify bundle hash integrity
  const expectedBundleData = JSON.stringify({
    payment: bundle.payment,
    kyc: bundle.kyc.permissions,
    orderId: bundle.orderId,
  });
  const expectedHash = await sha256(expectedBundleData);

  if (bundle.bundleHash !== expectedHash) {
    errors.push('Bundle hash verification failed - data may be tampered');
  }

  // Check KYC requirements
  if (originalRequest.requiredKyc && originalRequest.requiredKyc.length > 0) {
    const missingKyc = originalRequest.requiredKyc.filter(
      req => !bundle.kyc.permissions.includes(req)
    );
    if (missingKyc.length > 0) {
      errors.push(`Missing KYC requirements: ${missingKyc.join(', ')}`);
    } else {
      kycVerified = true;
    }
  } else {
    kycVerified = true; // No KYC required
  }

  // Payment is confirmed if we have a valid tx hash and no errors
  if (bundle.payment.txHash && errors.length === 0) {
    paymentConfirmed = true;
  }

  // Check for specific permission types
  const ageVerified = bundle.kyc.permissions.some(p => p.startsWith('age_over_'));
  const regionVerified = bundle.kyc.permissions.some(p => p.startsWith('region_'));

  return {
    valid: errors.length === 0,
    paymentConfirmed,
    kycVerified,
    ageVerified: ageVerified || undefined,
    regionVerified: regionVerified || undefined,
    errors,
    details: {
      paymentId: bundle.payment.paymentId,
      txHash: bundle.payment.txHash,
      amount: bundle.payment.amount,
      currency: bundle.payment.currency,
      network: bundle.payment.network,
      kycPermissions: bundle.kyc.permissions,
    },
  };
}

/**
 * Encode a KYC + Payment bundle to QR-safe string
 */
export function encodeBundleToQR(bundle: KycPaymentBundle): string {
  const payload = {
    type: 'kyc_payment_bundle',
    data: bundle,
    timestamp: Date.now(),
    version: '1.0.0',
  };

  const jsonString = JSON.stringify(payload);
  const base64 = Buffer.from(jsonString, 'utf8').toString('base64');
  
  return `AQR1:${base64}`;
}

/**
 * Decode a KYC + Payment bundle from QR string
 */
export function decodeBundleFromQR(qrString: string): KycPaymentBundle {
  if (!qrString.startsWith('AQR1:')) {
    throw new Error('Invalid QR format - missing version prefix');
  }

  const base64 = qrString.substring(5);
  const jsonString = Buffer.from(base64, 'base64').toString('utf8');
  const payload = JSON.parse(jsonString);

  if (payload.type !== 'kyc_payment_bundle') {
    throw new Error('Invalid QR type - expected kyc_payment_bundle');
  }

  return payload.data as KycPaymentBundle;
}

/**
 * Create a merchant checkout request with KYC requirements
 */
export interface MerchantCheckoutOptions {
  merchantId: string;
  merchantName: string;
  orderId: string;
  items: Array<{ name: string; price: number; quantity: number }>;
  currency: string;
  network: PaymentNetwork;
  destinationAddress: string;
  requireAge?: 18 | 21;
  requireKyc?: boolean;
  requireRegion?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a complete merchant checkout with payment + KYC requirements
 */
export function createMerchantCheckout(options: MerchantCheckoutOptions): {
  paymentRequest: PaymentRequest;
  displayInfo: {
    total: string;
    itemCount: number;
    kycRequired: string[];
  };
} {
  // Calculate total
  const total = options.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Build KYC requirements
  const requiredKyc: string[] = [];
  if (options.requireAge) {
    requiredKyc.push(`age_over_${options.requireAge}`);
  }
  if (options.requireKyc) {
    requiredKyc.push('kyc_verified');
  }
  if (options.requireRegion) {
    requiredKyc.push(`region_${options.requireRegion}`);
  }

  const paymentRequest: PaymentRequest = {
    paymentId: uuidv4(),
    merchantId: options.merchantId,
    merchantName: options.merchantName,
    amount: total.toFixed(2),
    currency: options.currency,
    network: options.network,
    destinationAddress: options.destinationAddress,
    orderId: options.orderId,
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    requiredKyc: requiredKyc.length > 0 ? requiredKyc : undefined,
    metadata: {
      ...options.metadata,
      items: options.items.map(i => ({ name: i.name, qty: i.quantity })),
      itemCount: options.items.length,
    },
  };

  return {
    paymentRequest,
    displayInfo: {
      total: `${total.toFixed(2)} ${options.currency}`,
      itemCount: options.items.length,
      kycRequired: requiredKyc,
    },
  };
}

/**
 * Split-knowledge verification for courier
 * Courier only sees delivery address, not order details
 */
export interface CourierVerificationResult {
  valid: boolean;
  deliveryAddress?: string;
  deliveryInstructions?: string;
  recipientName?: string;
  errors: string[];
}

/**
 * Extract courier-only information from bundle
 * Implements split-knowledge: courier sees address, not order contents
 */
export function extractCourierInfo(
  bundle: KycPaymentBundle,
  shippingData: {
    address: string;
    instructions?: string;
    recipientName?: string;
  }
): CourierVerificationResult {
  // Verify shipping_address permission is present
  if (!bundle.kyc.permissions.includes('shipping_address')) {
    return {
      valid: false,
      errors: ['Missing shipping_address permission'],
    };
  }

  // Return only delivery information - no order details
  return {
    valid: true,
    deliveryAddress: shippingData.address,
    deliveryInstructions: shippingData.instructions,
    recipientName: shippingData.recipientName,
    errors: [],
  };
}

/**
 * Split-knowledge verification for merchant
 * Merchant sees order/payment, not delivery address
 */
export interface MerchantOrderInfo {
  valid: boolean;
  orderId?: string;
  items?: Array<{ name: string; qty: number }>;
  paymentConfirmed: boolean;
  ageVerified?: boolean;
  errors: string[];
}

/**
 * Extract merchant-only information from bundle
 * Implements split-knowledge: merchant sees order, not address
 */
export function extractMerchantInfo(
  bundle: KycPaymentBundle,
  orderData: {
    items: Array<{ name: string; qty: number }>;
  }
): MerchantOrderInfo {
  // Verify order_paid permission is present
  if (!bundle.kyc.permissions.includes('order_paid')) {
    return {
      valid: false,
      paymentConfirmed: false,
      errors: ['Missing order_paid permission'],
    };
  }

  const ageVerified = bundle.kyc.permissions.some(p => p.startsWith('age_over_'));

  // Return only order information - no delivery address
  return {
    valid: true,
    orderId: bundle.orderId,
    items: orderData.items,
    paymentConfirmed: !!bundle.payment.txHash,
    ageVerified: ageVerified || undefined,
    errors: [],
  };
}
