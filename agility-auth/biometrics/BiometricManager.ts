/**
 * Agility Auth - Biometric Manager
 * 
 * Core biometric authentication manager that delegates to
 * platform-specific adapters (WebAuthn, React Native, etc.)
 */

import {
  DEFAULT_AUTH_REQUEST,
  type BiometricCapabilities,
  type BiometricAuthRequest,
  type BiometricAuthResult,
  type BiometricConsentRequest,
  type BiometricConsentResult,
  type BiometricType,
  type BiometricPlatform,
  type IBiometricAdapter,
  type SecureStorageOptions,
  type SecureStorageResult,
} from './types.js';

/**
 * Detect current platform
 */
function detectPlatform(): BiometricPlatform {
  if (typeof window === 'undefined') {
    return 'unknown';
  }
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios';
  }
  
  if (/android/.test(userAgent)) {
    return 'android';
  }
  
  if (typeof window !== 'undefined') {
    return 'web';
  }
  
  return 'unknown';
}

/**
 * Biometric Manager
 * 
 * Provides a unified API for biometric authentication across platforms.
 */
export class BiometricManager implements IBiometricAdapter {
  private adapter: IBiometricAdapter | null = null;
  private platform: BiometricPlatform;
  private initialized = false;

  constructor() {
    this.platform = detectPlatform();
  }

  /**
   * Initialize with a platform-specific adapter
   */
  async initialize(adapter?: IBiometricAdapter): Promise<void> {
    if (adapter) {
      this.adapter = adapter;
      this.initialized = true;
      return;
    }

    // Auto-detect and load appropriate adapter
    if (this.platform === 'web') {
      const { WebAuthnAdapter } = await import('./WebAuthnAdapter.js').catch(() => ({ WebAuthnAdapter: null }));
      if (WebAuthnAdapter) {
        this.adapter = new WebAuthnAdapter();
      }
    }

    // For React Native, adapter must be provided externally
    // as it requires native modules

    this.initialized = true;
  }

  /**
   * Ensure manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('BiometricManager not initialized. Call initialize() first.');
    }
  }

  /**
   * Get device biometric capabilities
   */
  async getCapabilities(): Promise<BiometricCapabilities> {
    this.ensureInitialized();

    if (!this.adapter) {
      return {
        available: false,
        enrolled: false,
        types: ['none'],
        primaryType: 'none',
        level: 'none',
        secureEnclaveAvailable: false,
        platform: this.platform,
        passcodeAvailable: false,
      };
    }

    return this.adapter.getCapabilities();
  }

  /**
   * Check if biometric auth is available
   */
  async isAvailable(): Promise<boolean> {
    this.ensureInitialized();

    if (!this.adapter) {
      return false;
    }

    return this.adapter.isAvailable();
  }

  /**
   * Check if biometrics are enrolled
   */
  async isEnrolled(): Promise<boolean> {
    this.ensureInitialized();

    if (!this.adapter) {
      return false;
    }

    return this.adapter.isEnrolled();
  }

  /**
   * Authenticate user with biometrics
   */
  async authenticate(request: BiometricAuthRequest): Promise<BiometricAuthResult> {
    this.ensureInitialized();

    if (!this.adapter) {
      return {
        success: false,
        method: 'none',
        timestamp: Date.now(),
        error: 'not_available',
        errorMessage: 'Biometric authentication not available on this device',
      };
    }

    // Merge with defaults
    const fullRequest: BiometricAuthRequest = {
      ...DEFAULT_AUTH_REQUEST,
      ...request,
    };

    return this.adapter.authenticate(fullRequest);
  }

  /**
   * Authenticate and approve consent
   */
  async authenticateConsent(request: BiometricConsentRequest): Promise<BiometricConsentResult> {
    // Build reason string from consent request
    let reason = request.description;
    
    if (request.type === 'payment' && request.consentData.amount) {
      reason = `Approve payment of ${request.consentData.amount} ${request.consentData.currency || ''} to ${request.requestor}`;
    } else if (request.type === 'proof_request' && request.consentData.permissions) {
      reason = `Share ${request.consentData.permissions.join(', ')} with ${request.requestor}`;
    }

    const authResult = await this.authenticate({
      reason,
      title: request.type === 'payment' ? 'Approve Payment' : 'Approve Request',
      requireConfirmation: true,
      fallbackToPasscode: !request.requireBiometric,
    });

    if (!authResult.success) {
      return authResult;
    }

    // Add consent data to result
    return {
      ...authResult,
      consent: {
        type: request.type,
        approvedAt: Date.now(),
        signature: authResult.attestation?.signature || '',
      },
    };
  }

  /**
   * Store data in secure storage (biometric protected)
   */
  async secureStore(key: string, value: string, options?: SecureStorageOptions): Promise<SecureStorageResult> {
    this.ensureInitialized();

    if (!this.adapter) {
      return {
        success: false,
        error: 'not_available',
        errorMessage: 'Secure storage not available',
      };
    }

    return this.adapter.secureStore(key, value, options);
  }

  /**
   * Retrieve data from secure storage
   */
  async secureRetrieve(key: string, options?: SecureStorageOptions): Promise<SecureStorageResult> {
    this.ensureInitialized();

    if (!this.adapter) {
      return {
        success: false,
        error: 'not_available',
        errorMessage: 'Secure storage not available',
      };
    }

    return this.adapter.secureRetrieve(key, options);
  }

  /**
   * Delete data from secure storage
   */
  async secureDelete(key: string): Promise<SecureStorageResult> {
    this.ensureInitialized();

    if (!this.adapter) {
      return {
        success: false,
        error: 'not_available',
        errorMessage: 'Secure storage not available',
      };
    }

    return this.adapter.secureDelete(key);
  }

  /**
   * Generate a biometric-protected key pair
   */
  async generateKeyPair(keyId: string): Promise<{ publicKey: string } | null> {
    this.ensureInitialized();

    if (!this.adapter) {
      return null;
    }

    return this.adapter.generateKeyPair(keyId);
  }

  /**
   * Sign data with biometric-protected key
   */
  async signWithBiometric(
    keyId: string,
    data: string | Uint8Array,
    request: BiometricAuthRequest
  ): Promise<BiometricAuthResult> {
    this.ensureInitialized();

    if (!this.adapter) {
      return {
        success: false,
        method: 'none',
        timestamp: Date.now(),
        error: 'not_available',
        errorMessage: 'Biometric signing not available',
      };
    }

    return this.adapter.signWithBiometric(keyId, data, request);
  }

  /**
   * Get current platform
   */
  getPlatform(): BiometricPlatform {
    return this.platform;
  }

  /**
   * Check if a specific biometric type is available
   */
  async isBiometricTypeAvailable(type: BiometricType): Promise<boolean> {
    const capabilities = await this.getCapabilities();
    return capabilities.types.includes(type);
  }
}

/**
 * Create a new BiometricManager instance
 */
export function createBiometricManager(): BiometricManager {
  return new BiometricManager();
}

/**
 * Singleton instance for convenience
 */
let defaultManager: BiometricManager | null = null;

/**
 * Get the default BiometricManager instance
 */
export function getDefaultBiometricManager(): BiometricManager {
  if (!defaultManager) {
    defaultManager = new BiometricManager();
  }
  return defaultManager;
}
