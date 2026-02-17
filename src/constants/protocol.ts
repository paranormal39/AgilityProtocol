/**
 * Agility Protocol Constants
 * 
 * Protocol Version: 0.1.0
 * Frozen at Phase 8 for SDK release
 */

export const PROTOCOL_VERSION = '0.1.0';

export const PROTOCOL_NAME = 'agility';

export const SUPPORTED_PROOF_TYPES = ['selective-disclosure', 'credential-based'] as const;

export const SUPPORTED_SIGNER_TYPES = ['local', 'xaman', 'lace'] as const;

export const SUPPORTED_BINDING_TYPES = ['sha256', 'sha256-credential'] as const;

export type ProofType = typeof SUPPORTED_PROOF_TYPES[number];
export type SignerType = typeof SUPPORTED_SIGNER_TYPES[number];
export type BindingType = typeof SUPPORTED_BINDING_TYPES[number];

export interface ProtocolInfo {
  version: string;
  name: string;
  supportedProofTypes: readonly string[];
  supportedSignerTypes: readonly string[];
  supportedBindingTypes: readonly string[];
}

export function getProtocolInfo(): ProtocolInfo {
  return {
    version: PROTOCOL_VERSION,
    name: PROTOCOL_NAME,
    supportedProofTypes: SUPPORTED_PROOF_TYPES,
    supportedSignerTypes: SUPPORTED_SIGNER_TYPES,
    supportedBindingTypes: SUPPORTED_BINDING_TYPES,
  };
}

export function isProtocolVersionSupported(version: string): boolean {
  return version === PROTOCOL_VERSION;
}

export class UnsupportedProtocolVersionError extends Error {
  constructor(receivedVersion: string) {
    super(`Unsupported protocol version: ${receivedVersion}. Expected: ${PROTOCOL_VERSION}`);
    this.name = 'UnsupportedProtocolVersionError';
  }
}
