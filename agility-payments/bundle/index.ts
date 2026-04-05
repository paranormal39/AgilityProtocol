/**
 * Agility Payments - Bundle Module
 * 
 * KYC + Payment bundling for complete merchant verification.
 */

export {
  createKycPaymentBundle,
  verifyMerchantBundle,
  encodeBundleToQR,
  decodeBundleFromQR,
  createMerchantCheckout,
  extractCourierInfo,
  extractMerchantInfo,
} from './KycPaymentBundle.js';

export type {
  MerchantCheckoutOptions,
  CourierVerificationResult,
  MerchantOrderInfo,
} from './KycPaymentBundle.js';
