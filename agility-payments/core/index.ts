/**
 * Agility Payments - Core Module
 * 
 * Core types, interfaces, and chain bridge functionality.
 */

// Types
export * from './types.js';

// Chain Bridge
export {
  ChainBridgeBase,
  PaymentAdapterBase,
  ChainBridgeRegistry,
  getChainBridgeRegistry,
  resetChainBridgeRegistry,
  getPaymentAdapter,
  registerPaymentAdapter,
  createPaymentRequest,
  createPaymentProof,
  verifyPayment,
} from './ChainBridge.js';
