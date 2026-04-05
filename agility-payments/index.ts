/**
 * Agility Payments Module
 * 
 * Modular payment system supporting XRPL, Midnight, and Cardano/Lace.
 * Provides KYC + Payment bundling for complete merchant verification.
 */

// Core types and chain bridge
export * from './core/index.js';

// XRPL payment adapter
export * from './xrpl/index.js';

// Midnight payment adapter
export * from './midnight/index.js';

// Lace wallet adapter
export * from './lace/index.js';

// KYC + Payment bundle
export * from './bundle/index.js';

// Convenience re-exports
export {
  createXrplPaymentAdapter,
} from './xrpl/XrplPaymentAdapter.js';

export {
  createMidnightPaymentAdapter,
} from './midnight/MidnightPaymentAdapter.js';

export {
  createLacePaymentAdapter,
} from './lace/LacePaymentAdapter.js';

export {
  createKycPaymentBundle,
  verifyMerchantBundle,
  createMerchantCheckout,
} from './bundle/KycPaymentBundle.js';
