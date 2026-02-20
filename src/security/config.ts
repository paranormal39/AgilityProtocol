/**
 * Security Configuration
 * 
 * Constants and utilities for time validation and replay protection.
 */

import { TimestampAdapter } from './TimestampAdapter.js';

// Phase 1 Configuration
export const MAX_CLOCK_SKEW_SECONDS = 120;
export const MAX_PROOF_AGE_SECONDS = 600;
export const ENABLE_REPLAY_PROTECTION = true;

// Phase 2 Feature Flags (disabled by default for safety)
export const ENABLE_XRPL_CONSENT_TX_VERIFY = false;
export const ENABLE_CARDANO_SIGNDATA_VERIFY = false;

// Phase 4 Feature Flags
export const ENABLE_STRICT_DECK_PERMISSIONS = false;
export const ENABLE_PAIRWISE_DID = true; // Privacy by default

// Phase 5 Input Size Limits (robustness)
export const MAX_PERMISSIONS = 64;
export const MAX_PERMISSION_ID_LENGTH = 128;
export const MAX_DECK_SOURCES = 128;

// Phase 6 Protocol Version
export const PROTOCOL_VERSION = '1.0';
export const SUPPORTED_PROTOCOL_MAJOR = 1;
export const SUPPORTED_PROTOCOL_MINOR_MIN = 0;
export const SUPPORTED_PROTOCOL_MINOR_MAX = 999;

/**
 * Parsed protocol version.
 */
export interface ParsedProtocolVersion {
  major: number;
  minor: number;
}

/**
 * Parse a protocol version string into major and minor components.
 * @param version Version string (e.g., "1.0", "1.2")
 * @returns Parsed version or null if invalid
 */
export function parseProtocolVersion(version: string): ParsedProtocolVersion | null {
  if (!version || typeof version !== 'string') {
    return null;
  }
  const parts = version.split('.');
  if (parts.length !== 2) {
    return null;
  }
  const major = parseInt(parts[0], 10);
  const minor = parseInt(parts[1], 10);
  if (isNaN(major) || isNaN(minor) || major < 0 || minor < 0) {
    return null;
  }
  return { major, minor };
}

/**
 * Check if a protocol version is supported.
 * @param version Version string to check
 * @returns Result with ok flag and optional error
 */
export function isProtocolVersionSupported(version: string): { ok: boolean; errorCode?: VerificationErrorCode; errorMessage?: string } {
  const parsed = parseProtocolVersion(version);
  if (!parsed) {
    return {
      ok: false,
      errorCode: VerificationErrorCode.UNSUPPORTED_PROTOCOL_VERSION,
      errorMessage: `Invalid protocol version format: ${version}`,
    };
  }
  
  if (parsed.major !== SUPPORTED_PROTOCOL_MAJOR) {
    return {
      ok: false,
      errorCode: VerificationErrorCode.UNSUPPORTED_PROTOCOL_VERSION,
      errorMessage: `Unsupported major version: ${parsed.major} (supported: ${SUPPORTED_PROTOCOL_MAJOR})`,
    };
  }
  
  if (parsed.minor < SUPPORTED_PROTOCOL_MINOR_MIN || parsed.minor > SUPPORTED_PROTOCOL_MINOR_MAX) {
    return {
      ok: false,
      errorCode: VerificationErrorCode.UNSUPPORTED_PROTOCOL_VERSION,
      errorMessage: `Unsupported minor version: ${parsed.minor} (supported: ${SUPPORTED_PROTOCOL_MINOR_MIN}-${SUPPORTED_PROTOCOL_MINOR_MAX})`,
    };
  }
  
  return { ok: true };
}

/**
 * Get current time in seconds (Unix timestamp).
 * All timestamps must use seconds precision for consistency.
 * @deprecated Use TimestampAdapter.nowEpochSeconds() instead
 */
export function getNow(): number {
  return TimestampAdapter.nowEpochSeconds();
}

/**
 * Get current time as ISO string.
 * @deprecated Use TimestampAdapter.nowISO() instead
 */
export function getNowISO(): string {
  return TimestampAdapter.nowISO();
}

/**
 * Parse ISO string to seconds timestamp.
 * @deprecated Use TimestampAdapter.toEpochSeconds() instead
 */
export function isoToSeconds(iso: string): number {
  return TimestampAdapter.toEpochSeconds(iso);
}

/**
 * Verification error codes for structured error handling.
 */
export enum VerificationErrorCode {
  // Phase 1 error codes
  INVALID_TIME_RANGE = 'INVALID_TIME_RANGE',
  EXPIRED = 'EXPIRED',
  FUTURE_ISSUED_AT = 'FUTURE_ISSUED_AT',
  PROOF_TOO_OLD = 'PROOF_TOO_OLD',
  REPLAY_DETECTED = 'REPLAY_DETECTED',
  // Phase 2 error codes
  SIGNATURE_INVALID = 'SIGNATURE_INVALID',
  XRPL_TX_NOT_FOUND = 'XRPL_TX_NOT_FOUND',
  XRPL_MEMO_MISMATCH = 'XRPL_MEMO_MISMATCH',
  XRPL_ACCOUNT_MISMATCH = 'XRPL_ACCOUNT_MISMATCH',
  CARDANO_SIGNATURE_INVALID = 'CARDANO_SIGNATURE_INVALID',
  // Phase 5 error codes (input validation)
  TOO_MANY_PERMISSIONS = 'TOO_MANY_PERMISSIONS',
  PERMISSION_ID_TOO_LONG = 'PERMISSION_ID_TOO_LONG',
  TOO_MANY_DECK_SOURCES = 'TOO_MANY_DECK_SOURCES',
  INVALID_TIMESTAMP_FORMAT = 'INVALID_TIMESTAMP_FORMAT',
  MALFORMED_INPUT = 'MALFORMED_INPUT',
  // Phase 6 error codes (protocol version, DID resolution)
  UNSUPPORTED_PROTOCOL_VERSION = 'UNSUPPORTED_PROTOCOL_VERSION',
  DID_RESOLUTION_FAILED = 'DID_RESOLUTION_FAILED',
}

export interface TimeValidationResult {
  valid: boolean;
  errorCode?: VerificationErrorCode;
  errorMessage?: string;
}

/**
 * Validate time fields for proof objects.
 * 
 * @param issuedAt - When the proof was issued (ISO string)
 * @param expiresAt - When the proof expires (ISO string)
 * @returns Validation result with error details if invalid
 */
export function validateTimeRange(
  issuedAt: string,
  expiresAt: string
): TimeValidationResult {
  const now = getNow();
  const issuedAtSec = isoToSeconds(issuedAt);
  const expiresAtSec = isoToSeconds(expiresAt);

  // issuedAt must be <= expiresAt
  if (issuedAtSec > expiresAtSec) {
    return {
      valid: false,
      errorCode: VerificationErrorCode.INVALID_TIME_RANGE,
      errorMessage: `issuedAt (${issuedAt}) cannot be greater than expiresAt (${expiresAt})`,
    };
  }

  // expiresAt must be > issuedAt (strict inequality)
  if (expiresAtSec <= issuedAtSec) {
    return {
      valid: false,
      errorCode: VerificationErrorCode.INVALID_TIME_RANGE,
      errorMessage: `expiresAt (${expiresAt}) must be greater than issuedAt (${issuedAt})`,
    };
  }

  // issuedAt cannot be in the future beyond clock skew
  if (issuedAtSec > now + MAX_CLOCK_SKEW_SECONDS) {
    return {
      valid: false,
      errorCode: VerificationErrorCode.FUTURE_ISSUED_AT,
      errorMessage: `issuedAt (${issuedAt}) is too far in the future (now: ${now}, max skew: ${MAX_CLOCK_SKEW_SECONDS}s)`,
    };
  }

  // expiresAt cannot already be expired (with skew allowance)
  if (expiresAtSec < now - MAX_CLOCK_SKEW_SECONDS) {
    return {
      valid: false,
      errorCode: VerificationErrorCode.EXPIRED,
      errorMessage: `Proof has expired at ${expiresAt} (now: ${now}, skew allowance: ${MAX_CLOCK_SKEW_SECONDS}s)`,
    };
  }

  // Proof age validation: reject if too old
  const proofAge = now - issuedAtSec;
  if (proofAge > MAX_PROOF_AGE_SECONDS) {
    return {
      valid: false,
      errorCode: VerificationErrorCode.PROOF_TOO_OLD,
      errorMessage: `Proof is too old (age: ${proofAge}s, max: ${MAX_PROOF_AGE_SECONDS}s)`,
    };
  }

  return { valid: true };
}
