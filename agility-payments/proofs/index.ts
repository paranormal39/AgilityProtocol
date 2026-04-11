/**
 * Agility Payments - ZK Proofs Module
 * 
 * Zero-knowledge proof circuits for privacy-preserving verification
 * of payments, orders, and identity.
 */

// Types
export * from './types.js';

// Payment proofs
export {
  PaymentProofCircuit,
  createPaymentProofCircuit,
  provePaymentMade,
  provePaymentSufficient,
  type PaymentProofType,
  type PaymentCircuitConfig,
} from './PaymentProofCircuit.js';

// Order proofs
export {
  OrderProofCircuit,
  createOrderProofCircuit,
  proveOrderPlaced,
  proveOrderAgeRestricted,
  type OrderProofType,
  type OrderCircuitConfig,
} from './OrderProofCircuit.js';

// Identity proofs
export {
  IdentityProofCircuit,
  createIdentityProofCircuit,
  proveAgeOver,
  proveKycVerified,
  type IdentityProofType,
  type IdentityCircuitConfig,
} from './IdentityProofCircuit.js';
