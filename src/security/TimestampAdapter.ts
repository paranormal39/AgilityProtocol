/**
 * Timestamp Adapter
 * 
 * Centralized time handling for consistent timestamp operations.
 * All time comparisons should go through this adapter.
 */

/**
 * Get current time in epoch seconds.
 */
export function nowEpochSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Get current time as ISO string.
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Convert ISO string to epoch seconds.
 */
export function toEpochSeconds(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000);
}

/**
 * Convert epoch seconds to ISO string.
 */
export function toISO(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toISOString();
}

/**
 * Calculate age in seconds from an ISO timestamp.
 */
export function ageInSeconds(issuedAtISO: string): number {
  return nowEpochSeconds() - toEpochSeconds(issuedAtISO);
}

/**
 * Check if an ISO timestamp is expired.
 */
export function isExpired(expiresAtISO: string, skewSeconds: number = 0): boolean {
  return toEpochSeconds(expiresAtISO) < nowEpochSeconds() - skewSeconds;
}

/**
 * Check if an ISO timestamp is in the future beyond allowed skew.
 */
export function isFutureBeyondSkew(issuedAtISO: string, maxSkewSeconds: number): boolean {
  return toEpochSeconds(issuedAtISO) > nowEpochSeconds() + maxSkewSeconds;
}

export const TimestampAdapter = {
  nowEpochSeconds,
  nowISO,
  toEpochSeconds,
  toISO,
  ageInSeconds,
  isExpired,
  isFutureBeyondSkew,
};
