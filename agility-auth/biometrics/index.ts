/**
 * Agility Auth - Biometrics Module
 * 
 * Biometric authentication for iOS, Android, and Web platforms.
 */

// Types
export * from './types.js';

// Core manager
export {
  BiometricManager,
  createBiometricManager,
  getDefaultBiometricManager,
} from './BiometricManager.js';

// WebAuthn adapter (browser)
export {
  WebAuthnAdapter,
  createWebAuthnAdapter,
} from './WebAuthnAdapter.js';
