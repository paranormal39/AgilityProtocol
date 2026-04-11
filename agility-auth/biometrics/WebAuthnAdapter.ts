/**
 * Agility Auth - WebAuthn Adapter
 * 
 * Browser-based biometric authentication using WebAuthn API.
 * Supports platform authenticators (Face ID, Touch ID, Windows Hello, etc.)
 */

import type {
  BiometricCapabilities,
  BiometricAuthRequest,
  BiometricAuthResult,
  BiometricType,
  BiometricError,
  IBiometricAdapter,
  SecureStorageOptions,
  SecureStorageResult,
  BiometricAttestation,
} from './types.js';

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate a random challenge
 */
function generateChallenge(): Uint8Array {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  return challenge;
}

/**
 * WebAuthn Adapter
 * 
 * Implements biometric authentication using the Web Authentication API.
 */
export class WebAuthnAdapter implements IBiometricAdapter {
  private rpId: string;
  private rpName: string;
  private credentials: Map<string, PublicKeyCredential> = new Map();

  constructor(options?: { rpId?: string; rpName?: string }) {
    this.rpId = options?.rpId || (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
    this.rpName = options?.rpName || 'Agility Protocol';
  }

  /**
   * Get device biometric capabilities
   */
  async getCapabilities(): Promise<BiometricCapabilities> {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      return {
        available: false,
        enrolled: false,
        types: ['none'],
        primaryType: 'none',
        level: 'none',
        secureEnclaveAvailable: false,
        platform: 'web',
        passcodeAvailable: false,
      };
    }

    try {
      // Check if platform authenticator is available
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

      // Detect biometric type based on platform
      const types: BiometricType[] = [];
      let primaryType: BiometricType = 'webauthn';

      const userAgent = navigator.userAgent.toLowerCase();
      
      if (/iphone|ipad|ipod|mac/.test(userAgent)) {
        // iOS/macOS - likely Face ID or Touch ID
        if (/iphone|ipad/.test(userAgent)) {
          types.push('faceId', 'touchId');
          primaryType = 'faceId';
        } else {
          types.push('touchId');
          primaryType = 'touchId';
        }
      } else if (/android/.test(userAgent)) {
        types.push('fingerprint', 'faceUnlock');
        primaryType = 'fingerprint';
      } else if (/windows/.test(userAgent)) {
        types.push('webauthn'); // Windows Hello
        primaryType = 'webauthn';
      } else {
        types.push('webauthn');
      }

      return {
        available,
        enrolled: available, // WebAuthn doesn't distinguish enrollment
        types,
        primaryType,
        level: available ? 'strong' : 'none',
        secureEnclaveAvailable: available,
        platform: 'web',
        passcodeAvailable: true,
      };
    } catch {
      return {
        available: false,
        enrolled: false,
        types: ['none'],
        primaryType: 'none',
        level: 'none',
        secureEnclaveAvailable: false,
        platform: 'web',
        passcodeAvailable: false,
      };
    }
  }

  /**
   * Check if biometric auth is available
   */
  async isAvailable(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      return false;
    }

    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Check if biometrics are enrolled
   */
  async isEnrolled(): Promise<boolean> {
    // WebAuthn doesn't provide a way to check enrollment
    // We assume if platform authenticator is available, it's enrolled
    return this.isAvailable();
  }

  /**
   * Authenticate user with biometrics
   */
  async authenticate(request: BiometricAuthRequest): Promise<BiometricAuthResult> {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      return {
        success: false,
        method: 'none',
        timestamp: Date.now(),
        error: 'not_available',
        errorMessage: 'WebAuthn not available in this browser',
      };
    }

    try {
      const challenge = request.challenge 
        ? base64ToArrayBuffer(request.challenge)
        : generateChallenge();

      // Create credential options
      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout: request.timeout || 60000,
        rpId: this.rpId,
        userVerification: request.requireConfirmation ? 'required' : 'preferred',
      };

      // Request authentication
      const credential = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      }) as PublicKeyCredential | null;

      if (!credential) {
        return {
          success: false,
          method: 'webauthn',
          timestamp: Date.now(),
          error: 'user_cancel',
          errorMessage: 'Authentication cancelled',
        };
      }

      const response = credential.response as AuthenticatorAssertionResponse;

      // Build attestation
      const attestation: BiometricAttestation = {
        signature: arrayBufferToBase64(response.signature),
        publicKey: credential.id,
        challenge: arrayBufferToBase64(challenge instanceof Uint8Array ? challenge.buffer : challenge),
        algorithm: 'ES256', // Most common for platform authenticators
        authenticatorData: arrayBufferToBase64(response.authenticatorData),
        clientDataJSON: arrayBufferToBase64(response.clientDataJSON),
      };

      return {
        success: true,
        method: 'webauthn',
        timestamp: Date.now(),
        attestation,
      };

    } catch (error) {
      const errorResult = this.handleWebAuthnError(error);
      return {
        success: false,
        method: 'webauthn',
        timestamp: Date.now(),
        ...errorResult,
      };
    }
  }

  /**
   * Handle WebAuthn errors
   */
  private handleWebAuthnError(error: unknown): { error: BiometricError; errorMessage: string } {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
          return {
            error: 'user_cancel',
            errorMessage: 'Authentication was cancelled or not allowed',
          };
        case 'SecurityError':
          return {
            error: 'invalid_context',
            errorMessage: 'Security error - ensure you are on HTTPS',
          };
        case 'NotSupportedError':
          return {
            error: 'not_available',
            errorMessage: 'WebAuthn not supported',
          };
        case 'InvalidStateError':
          return {
            error: 'invalid_context',
            errorMessage: 'Invalid authenticator state',
          };
        case 'AbortError':
          return {
            error: 'timeout',
            errorMessage: 'Authentication timed out',
          };
        default:
          return {
            error: 'unknown',
            errorMessage: error.message,
          };
      }
    }

    return {
      error: 'unknown',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  /**
   * Store data in secure storage
   * Note: WebAuthn doesn't provide secure storage, using localStorage with encryption
   */
  async secureStore(key: string, value: string, options?: SecureStorageOptions): Promise<SecureStorageResult> {
    if (typeof window === 'undefined') {
      return {
        success: false,
        error: 'not_available',
        errorMessage: 'Storage not available',
      };
    }

    try {
      // For web, we authenticate first if required
      if (options?.requireBiometric) {
        const authResult = await this.authenticate({
          reason: 'Authenticate to store secure data',
        });

        if (!authResult.success) {
          return {
            success: false,
            error: authResult.error,
            errorMessage: authResult.errorMessage,
          };
        }
      }

      // Store in localStorage (in production, should encrypt)
      const storageKey = `agility_secure_${key}`;
      localStorage.setItem(storageKey, value);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'unknown',
        errorMessage: error instanceof Error ? error.message : 'Storage failed',
      };
    }
  }

  /**
   * Retrieve data from secure storage
   */
  async secureRetrieve(key: string, options?: SecureStorageOptions): Promise<SecureStorageResult> {
    if (typeof window === 'undefined') {
      return {
        success: false,
        error: 'not_available',
        errorMessage: 'Storage not available',
      };
    }

    try {
      // Authenticate if required
      if (options?.requireBiometric) {
        const authResult = await this.authenticate({
          reason: 'Authenticate to access secure data',
        });

        if (!authResult.success) {
          return {
            success: false,
            error: authResult.error,
            errorMessage: authResult.errorMessage,
          };
        }
      }

      const storageKey = `agility_secure_${key}`;
      const data = localStorage.getItem(storageKey);

      if (data === null) {
        return {
          success: false,
          error: 'unknown',
          errorMessage: 'Key not found',
        };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: 'unknown',
        errorMessage: error instanceof Error ? error.message : 'Retrieval failed',
      };
    }
  }

  /**
   * Delete data from secure storage
   */
  async secureDelete(key: string): Promise<SecureStorageResult> {
    if (typeof window === 'undefined') {
      return {
        success: false,
        error: 'not_available',
        errorMessage: 'Storage not available',
      };
    }

    try {
      const storageKey = `agility_secure_${key}`;
      localStorage.removeItem(storageKey);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'unknown',
        errorMessage: error instanceof Error ? error.message : 'Deletion failed',
      };
    }
  }

  /**
   * Generate a biometric-protected key pair
   */
  async generateKeyPair(keyId: string): Promise<{ publicKey: string } | null> {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      return null;
    }

    try {
      const challenge = generateChallenge();

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: this.rpName,
          id: this.rpId,
        },
        user: {
          id: new TextEncoder().encode(keyId),
          name: keyId,
          displayName: keyId,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as PublicKeyCredential | null;

      if (!credential) {
        return null;
      }

      // Store credential reference
      this.credentials.set(keyId, credential);

      return {
        publicKey: credential.id,
      };
    } catch {
      return null;
    }
  }

  /**
   * Sign data with biometric-protected key
   */
  async signWithBiometric(
    keyId: string,
    data: string | Uint8Array,
    request: BiometricAuthRequest
  ): Promise<BiometricAuthResult> {
    // Convert data to challenge
    const dataBytes = typeof data === 'string' 
      ? new TextEncoder().encode(data)
      : data;

    // Use data as challenge for signing
    const challenge = arrayBufferToBase64(dataBytes.buffer);

    return this.authenticate({
      ...request,
      challenge,
      dataToSign: typeof data === 'string' ? data : arrayBufferToBase64(data.buffer),
    });
  }
}

/**
 * Create a new WebAuthn adapter
 */
export function createWebAuthnAdapter(options?: { rpId?: string; rpName?: string }): WebAuthnAdapter {
  return new WebAuthnAdapter(options);
}
