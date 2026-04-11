/**
 * Agility Auth - Biometric Types
 * 
 * Type definitions for biometric authentication supporting
 * iOS (Face ID/Touch ID), Android (Fingerprint/Face), and Web (WebAuthn).
 */

// ============================================
// BIOMETRIC TYPES
// ============================================

/**
 * Supported biometric authentication methods
 */
export type BiometricType = 
  | 'faceId'        // iOS Face ID
  | 'touchId'       // iOS Touch ID
  | 'fingerprint'   // Android Fingerprint
  | 'faceUnlock'    // Android Face Unlock
  | 'iris'          // Android Iris Scanner
  | 'webauthn'      // Web platform authenticator
  | 'none';         // No biometric available

/**
 * Biometric authentication level
 */
export type BiometricLevel = 
  | 'strong'        // Hardware-backed, secure enclave
  | 'weak'          // Software-based
  | 'none';         // Not available

/**
 * Platform type for biometric support
 */
export type BiometricPlatform = 
  | 'ios'
  | 'android'
  | 'web'
  | 'unknown';

// ============================================
// CAPABILITIES
// ============================================

/**
 * Device biometric capabilities
 */
export interface BiometricCapabilities {
  /** Whether biometric auth is available on device */
  available: boolean;
  
  /** Whether user has enrolled biometrics */
  enrolled: boolean;
  
  /** Available biometric types */
  types: BiometricType[];
  
  /** Primary/preferred biometric type */
  primaryType: BiometricType;
  
  /** Security level of available biometrics */
  level: BiometricLevel;
  
  /** Whether secure enclave/keystore is available */
  secureEnclaveAvailable: boolean;
  
  /** Platform */
  platform: BiometricPlatform;
  
  /** Whether passcode/PIN fallback is available */
  passcodeAvailable: boolean;
}

// ============================================
// AUTHENTICATION REQUEST
// ============================================

/**
 * Biometric authentication request options
 */
export interface BiometricAuthRequest {
  /** Reason shown to user (e.g., "Approve payment of 50 XRP") */
  reason: string;
  
  /** Optional title for the prompt */
  title?: string;
  
  /** Optional subtitle */
  subtitle?: string;
  
  /** Allow fallback to passcode/PIN */
  fallbackToPasscode?: boolean;
  
  /** Custom fallback button text */
  fallbackLabel?: string;
  
  /** Cancel button text */
  cancelLabel?: string;
  
  /** Require explicit user confirmation (not just presence) */
  requireConfirmation?: boolean;
  
  /** Authentication timeout in milliseconds */
  timeout?: number;
  
  /** Data to sign with biometric-protected key */
  dataToSign?: string | Uint8Array;
  
  /** Challenge for WebAuthn */
  challenge?: string;
}

/**
 * Default authentication request values
 */
export const DEFAULT_AUTH_REQUEST: Partial<BiometricAuthRequest> = {
  fallbackToPasscode: true,
  fallbackLabel: 'Use Passcode',
  cancelLabel: 'Cancel',
  requireConfirmation: false,
  timeout: 30000,
};

// ============================================
// AUTHENTICATION RESULT
// ============================================

/**
 * Biometric error types
 */
export type BiometricError = 
  | 'user_cancel'       // User cancelled authentication
  | 'user_fallback'     // User chose fallback method
  | 'lockout'           // Too many failed attempts
  | 'lockout_permanent' // Permanent lockout, requires device unlock
  | 'not_enrolled'      // No biometrics enrolled
  | 'not_available'     // Biometrics not available on device
  | 'system_cancel'     // System cancelled (e.g., app backgrounded)
  | 'timeout'           // Authentication timed out
  | 'hardware_error'    // Hardware failure
  | 'invalid_context'   // Invalid authentication context
  | 'passcode_not_set'  // Device passcode not set
  | 'unknown';          // Unknown error

/**
 * Biometric authentication result
 */
export interface BiometricAuthResult {
  /** Whether authentication succeeded */
  success: boolean;
  
  /** Method used for authentication */
  method: BiometricType;
  
  /** Timestamp of authentication */
  timestamp: number;
  
  /** Error if authentication failed */
  error?: BiometricError;
  
  /** Error message for display */
  errorMessage?: string;
  
  /** Whether fallback was used */
  usedFallback?: boolean;
  
  /** Cryptographic attestation (if dataToSign provided) */
  attestation?: BiometricAttestation;
}

/**
 * Cryptographic attestation from biometric auth
 */
export interface BiometricAttestation {
  /** Signature over the provided data */
  signature: string;
  
  /** Public key used for signing */
  publicKey: string;
  
  /** Challenge that was signed */
  challenge: string;
  
  /** Algorithm used */
  algorithm: 'ES256' | 'RS256' | 'EdDSA';
  
  /** Authenticator data (WebAuthn) */
  authenticatorData?: string;
  
  /** Client data JSON (WebAuthn) */
  clientDataJSON?: string;
}

// ============================================
// SECURE STORAGE
// ============================================

/**
 * Secure storage options for biometric-protected data
 */
export interface SecureStorageOptions {
  /** Key identifier */
  key: string;
  
  /** Require biometric auth to access */
  requireBiometric: boolean;
  
  /** Allow passcode fallback */
  allowPasscode?: boolean;
  
  /** Access control level */
  accessControl?: SecureAccessControl;
  
  /** Invalidate on biometric change */
  invalidateOnBiometricChange?: boolean;
}

/**
 * Access control levels for secure storage
 */
export type SecureAccessControl = 
  | 'biometryAny'           // Any enrolled biometric
  | 'biometryCurrentSet'    // Current enrolled biometrics only
  | 'devicePasscode'        // Device passcode
  | 'userPresence';         // Any user presence check

/**
 * Secure storage result
 */
export interface SecureStorageResult {
  success: boolean;
  data?: string;
  error?: BiometricError;
  errorMessage?: string;
}

// ============================================
// ADAPTER INTERFACE
// ============================================

/**
 * Biometric adapter interface
 * Implemented by platform-specific adapters
 */
export interface IBiometricAdapter {
  /** Get device biometric capabilities */
  getCapabilities(): Promise<BiometricCapabilities>;
  
  /** Check if biometric auth is available */
  isAvailable(): Promise<boolean>;
  
  /** Check if biometrics are enrolled */
  isEnrolled(): Promise<boolean>;
  
  /** Authenticate user with biometrics */
  authenticate(request: BiometricAuthRequest): Promise<BiometricAuthResult>;
  
  /** Store data in secure storage (biometric protected) */
  secureStore(key: string, value: string, options?: SecureStorageOptions): Promise<SecureStorageResult>;
  
  /** Retrieve data from secure storage */
  secureRetrieve(key: string, options?: SecureStorageOptions): Promise<SecureStorageResult>;
  
  /** Delete data from secure storage */
  secureDelete(key: string): Promise<SecureStorageResult>;
  
  /** Generate a biometric-protected key pair */
  generateKeyPair(keyId: string): Promise<{ publicKey: string } | null>;
  
  /** Sign data with biometric-protected key */
  signWithBiometric(keyId: string, data: string | Uint8Array, request: BiometricAuthRequest): Promise<BiometricAuthResult>;
}

// ============================================
// CONSENT INTEGRATION
// ============================================

/**
 * Biometric consent request
 * Used when approving proof requests or payments
 */
export interface BiometricConsentRequest {
  /** Type of consent */
  type: 'proof_request' | 'payment' | 'data_sharing' | 'transaction';
  
  /** Human-readable description */
  description: string;
  
  /** Requesting party */
  requestor: string;
  
  /** Data being consented to */
  consentData: {
    permissions?: string[];
    amount?: string;
    currency?: string;
    recipient?: string;
  };
  
  /** Require biometric (vs allowing passcode) */
  requireBiometric?: boolean;
}

/**
 * Biometric consent result
 */
export interface BiometricConsentResult extends BiometricAuthResult {
  /** The consent that was approved */
  consent?: {
    type: string;
    approvedAt: number;
    signature: string;
  };
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Biometric event types for listeners
 */
export type BiometricEventType = 
  | 'available_changed'
  | 'enrollment_changed'
  | 'lockout_started'
  | 'lockout_ended';

/**
 * Biometric event listener
 */
export interface BiometricEventListener {
  type: BiometricEventType;
  callback: (event: BiometricEvent) => void;
}

/**
 * Biometric event
 */
export interface BiometricEvent {
  type: BiometricEventType;
  timestamp: number;
  data?: Record<string, unknown>;
}
