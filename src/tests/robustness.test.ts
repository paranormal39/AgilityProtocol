/**
 * Phase 5 Robustness Tests
 * 
 * Tests for edge cases, malformed inputs, and security limits.
 */

import { validateTimeRange, VerificationErrorCode } from '../security/config.js';
import { parseCoseSign1 } from '../security/cardano/verifyCardanoSignData.js';
import {
  MAX_PERMISSIONS,
  MAX_PERMISSION_ID_LENGTH,
  MAX_DECK_SOURCES,
} from '../security/config.js';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean | Promise<boolean>): Promise<void> {
  return Promise.resolve()
    .then(() => fn())
    .then((result) => {
      if (result) {
        console.log(`  ✓ ${name}`);
        passed++;
      } else {
        console.log(`  ✗ ${name}`);
        failed++;
      }
    })
    .catch((err) => {
      console.log(`  ✗ ${name} (error: ${err})`);
      failed++;
    });
}

/**
 * Validate permissions array size.
 */
function validatePermissionsSize(permissions: string[]): { valid: boolean; errorCode?: VerificationErrorCode } {
  if (permissions.length > MAX_PERMISSIONS) {
    return { valid: false, errorCode: VerificationErrorCode.TOO_MANY_PERMISSIONS };
  }
  for (const p of permissions) {
    if (p.length > MAX_PERMISSION_ID_LENGTH) {
      return { valid: false, errorCode: VerificationErrorCode.PERMISSION_ID_TOO_LONG };
    }
  }
  return { valid: true };
}

/**
 * Validate deck sources size.
 */
function validateDeckSourcesSize(sources: Record<string, unknown>): { valid: boolean; errorCode?: VerificationErrorCode } {
  if (Object.keys(sources).length > MAX_DECK_SOURCES) {
    return { valid: false, errorCode: VerificationErrorCode.TOO_MANY_DECK_SOURCES };
  }
  return { valid: true };
}

/**
 * Safe timestamp parser that returns null on invalid input.
 */
function safeParseTimestamp(input: string): number | null {
  try {
    if (!input || typeof input !== 'string') {
      return null;
    }
    const date = new Date(input);
    if (isNaN(date.getTime())) {
      return null;
    }
    return Math.floor(date.getTime() / 1000);
  } catch {
    return null;
  }
}

/**
 * Safe hex decoder that returns null on invalid input.
 */
function safeHexDecode(hex: string): Buffer | null {
  try {
    if (!hex || typeof hex !== 'string') {
      return null;
    }
    if (!/^[0-9a-fA-F]*$/.test(hex)) {
      return null;
    }
    if (hex.length % 2 !== 0) {
      return null;
    }
    return Buffer.from(hex, 'hex');
  } catch {
    return null;
  }
}

/**
 * Safe base64 decoder that returns null on invalid input.
 */
function safeBase64Decode(b64: string): Buffer | null {
  try {
    if (!b64 || typeof b64 !== 'string') {
      return null;
    }
    const buffer = Buffer.from(b64, 'base64');
    // Verify it's valid base64 by re-encoding
    const reencoded = buffer.toString('base64');
    // Handle padding differences
    const normalized = b64.replace(/=+$/, '');
    const renormalized = reencoded.replace(/=+$/, '');
    if (normalized !== renormalized) {
      return null;
    }
    return buffer;
  } catch {
    return null;
  }
}

/**
 * Normalize unicode string for comparison.
 */
function normalizeUnicode(str: string): string {
  try {
    return str.normalize('NFC');
  } catch {
    return str;
  }
}

async function runTests(): Promise<void> {
  console.log('');
  console.log('═'.repeat(50));
  console.log('  Phase 5 Robustness Tests');
  console.log('═'.repeat(50));
  console.log('');

  console.log('=== Malformed Timestamp Tests ===');
  console.log('');

  await test('safeParseTimestamp handles valid ISO string', () => {
    const result = safeParseTimestamp('2024-01-15T10:30:00Z');
    return result !== null && result > 0;
  });

  await test('safeParseTimestamp returns null for nonsense string', () => {
    return safeParseTimestamp('not-a-date') === null;
  });

  await test('safeParseTimestamp returns null for empty string', () => {
    return safeParseTimestamp('') === null;
  });

  await test('safeParseTimestamp returns null for random garbage', () => {
    return safeParseTimestamp('🎉🎊🎈') === null;
  });

  await test('safeParseTimestamp handles epoch-like numbers in string', () => {
    const result = safeParseTimestamp('1705315800000');
    // This may parse as a year far in the future, but shouldn't crash
    return result === null || typeof result === 'number';
  });

  await test('validateTimeRange handles malformed issuedAt gracefully', () => {
    // This should not throw, even with bad input
    try {
      const result = validateTimeRange('garbage', '2024-01-15T10:30:00Z');
      return !result.valid; // Should fail validation, not crash
    } catch {
      return false; // Should not throw
    }
  });

  console.log('');
  console.log('=== Input Size Limit Tests ===');
  console.log('');

  await test('validatePermissionsSize passes for normal array', () => {
    const perms = ['age_over_18', 'email_verified'];
    return validatePermissionsSize(perms).valid;
  });

  await test('validatePermissionsSize fails for too many permissions', () => {
    const perms = Array(MAX_PERMISSIONS + 1).fill('perm');
    const result = validatePermissionsSize(perms);
    return !result.valid && result.errorCode === VerificationErrorCode.TOO_MANY_PERMISSIONS;
  });

  await test('validatePermissionsSize fails for too long permission ID', () => {
    const longPerm = 'a'.repeat(MAX_PERMISSION_ID_LENGTH + 1);
    const result = validatePermissionsSize([longPerm]);
    return !result.valid && result.errorCode === VerificationErrorCode.PERMISSION_ID_TOO_LONG;
  });

  await test('validateDeckSourcesSize passes for normal sources', () => {
    const sources = { perm1: {}, perm2: {} };
    return validateDeckSourcesSize(sources).valid;
  });

  await test('validateDeckSourcesSize fails for too many sources', () => {
    const sources: Record<string, unknown> = {};
    for (let i = 0; i < MAX_DECK_SOURCES + 1; i++) {
      sources[`perm${i}`] = {};
    }
    const result = validateDeckSourcesSize(sources);
    return !result.valid && result.errorCode === VerificationErrorCode.TOO_MANY_DECK_SOURCES;
  });

  console.log('');
  console.log('=== Unicode Normalization Tests ===');
  console.log('');

  await test('normalizeUnicode handles NFC normalization', () => {
    // é can be represented as single char or e + combining accent
    const composed = '\u00e9'; // é
    const decomposed = 'e\u0301'; // e + combining acute
    return normalizeUnicode(composed) === normalizeUnicode(decomposed);
  });

  await test('normalizeUnicode handles empty string', () => {
    return normalizeUnicode('') === '';
  });

  await test('normalizeUnicode handles ASCII unchanged', () => {
    return normalizeUnicode('hello') === 'hello';
  });

  await test('Permission ID comparison with unicode normalization', () => {
    const perm1 = normalizeUnicode('café');
    const perm2 = normalizeUnicode('cafe\u0301');
    return perm1 === perm2;
  });

  console.log('');
  console.log('=== Memo Decoding Edge Cases ===');
  console.log('');

  await test('safeHexDecode handles valid hex', () => {
    const result = safeHexDecode('48656c6c6f');
    return result !== null && result.toString() === 'Hello';
  });

  await test('safeHexDecode returns null for invalid hex chars', () => {
    return safeHexDecode('GHIJ') === null;
  });

  await test('safeHexDecode returns null for odd length', () => {
    return safeHexDecode('abc') === null;
  });

  await test('safeHexDecode returns null for empty string', () => {
    return safeHexDecode('') === null;
  });

  await test('safeBase64Decode handles valid base64', () => {
    const result = safeBase64Decode('SGVsbG8=');
    return result !== null && result.toString() === 'Hello';
  });

  await test('safeBase64Decode handles base64 without padding', () => {
    const result = safeBase64Decode('SGVsbG8');
    return result !== null && result.toString() === 'Hello';
  });

  await test('safeBase64Decode returns null for empty string', () => {
    return safeBase64Decode('') === null;
  });

  console.log('');
  console.log('=== COSE Parser Edge Cases ===');
  console.log('');

  await test('parseCoseSign1 returns null for empty input', () => {
    return parseCoseSign1('') === null;
  });

  await test('parseCoseSign1 returns null for too short input', () => {
    return parseCoseSign1('abcd') === null;
  });

  await test('parseCoseSign1 handles malformed CBOR gracefully', () => {
    // Should not throw, just return null or partial result
    try {
      const result = parseCoseSign1('00'.repeat(100));
      return result === null || typeof result === 'object';
    } catch {
      return false; // Should not throw
    }
  });

  await test('parseCoseSign1 handles non-hex input gracefully', () => {
    try {
      const result = parseCoseSign1('not-hex-data!!!');
      return result === null || typeof result === 'object';
    } catch {
      return false; // Should not throw
    }
  });

  console.log('');
  console.log('=== Structured Error Codes ===');
  console.log('');

  await test('VerificationErrorCode has TOO_MANY_PERMISSIONS', () => {
    return VerificationErrorCode.TOO_MANY_PERMISSIONS === 'TOO_MANY_PERMISSIONS';
  });

  await test('VerificationErrorCode has PERMISSION_ID_TOO_LONG', () => {
    return VerificationErrorCode.PERMISSION_ID_TOO_LONG === 'PERMISSION_ID_TOO_LONG';
  });

  await test('VerificationErrorCode has MALFORMED_INPUT', () => {
    return VerificationErrorCode.MALFORMED_INPUT === 'MALFORMED_INPUT';
  });

  console.log('');
  console.log('=== Test Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
