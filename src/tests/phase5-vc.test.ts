/**
 * Phase 5 W3C VC Adapter Tests
 * 
 * Tests for VC to SourceRef conversion and deck integration.
 */

import {
  vcToSourceRef,
  sourceRefToVc,
  isVcSourceRef,
  validateVcSourceRef,
  getIssuerId,
  getCredentialTypes,
  isCredentialExpired,
} from '../w3c/index.js';
import type { VerifiableCredential } from '../w3c/index.js';
import {
  canSatisfyPermission,
  getDeckRegistry,
  getDeckStore,
  resetDeckRegistry,
  resetDeckStore,
} from '../decks/index.js';
import type { SourceRef } from '../decks/index.js';

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

// Sample W3C VC for testing
const sampleVc: VerifiableCredential = {
  '@context': ['https://www.w3.org/2018/credentials/v1'],
  id: 'urn:uuid:12345678-1234-1234-1234-123456789012',
  type: ['VerifiableCredential', 'AgeVerificationCredential'],
  issuer: {
    id: 'did:agility:issuer:trusted-kyc-provider',
    name: 'Trusted KYC Provider',
  },
  issuanceDate: '2024-01-15T10:30:00Z',
  expirationDate: '2025-01-15T10:30:00Z',
  credentialSubject: {
    id: 'did:agility:user:alice',
    ageOver18: true,
  },
};

const sampleVcStringIssuer: VerifiableCredential = {
  '@context': 'https://www.w3.org/2018/credentials/v1',
  id: 'urn:uuid:abcdef12-3456-7890-abcd-ef1234567890',
  type: 'VerifiableCredential',
  issuer: 'did:agility:issuer:simple',
  issuanceDate: '2024-02-20T15:00:00Z',
  credentialSubject: {
    id: 'did:agility:user:bob',
  },
};

async function runTests(): Promise<void> {
  console.log('');
  console.log('═'.repeat(50));
  console.log('  Phase 5 W3C VC Adapter Tests');
  console.log('═'.repeat(50));
  console.log('');

  // Reset singletons
  resetDeckRegistry();
  resetDeckStore();

  console.log('=== VC Type Helper Tests ===');
  console.log('');

  await test('getIssuerId extracts ID from object issuer', () => {
    return getIssuerId(sampleVc.issuer) === 'did:agility:issuer:trusted-kyc-provider';
  });

  await test('getIssuerId extracts ID from string issuer', () => {
    return getIssuerId(sampleVcStringIssuer.issuer) === 'did:agility:issuer:simple';
  });

  await test('getCredentialTypes returns array for array type', () => {
    const types = getCredentialTypes(sampleVc);
    return types.length === 2 && types.includes('AgeVerificationCredential');
  });

  await test('getCredentialTypes returns array for string type', () => {
    const types = getCredentialTypes(sampleVcStringIssuer);
    return types.length === 1 && types[0] === 'VerifiableCredential';
  });

  await test('isCredentialExpired returns false for valid credential', () => {
    const futureDate = new Date('2024-06-01T00:00:00Z');
    return !isCredentialExpired(sampleVc, futureDate);
  });

  await test('isCredentialExpired returns true for expired credential', () => {
    const pastDate = new Date('2026-01-01T00:00:00Z');
    return isCredentialExpired(sampleVc, pastDate);
  });

  await test('isCredentialExpired returns false for no expiration', () => {
    return !isCredentialExpired(sampleVcStringIssuer);
  });

  console.log('');
  console.log('=== VC to SourceRef Conversion Tests ===');
  console.log('');

  await test('vcToSourceRef creates valid SourceRef', () => {
    const ref = vcToSourceRef(sampleVc);
    return ref.type === 'vc' && ref.ref === sampleVc.id;
  });

  await test('vcToSourceRef extracts issuer', () => {
    const ref = vcToSourceRef(sampleVc);
    return ref.metadata?.issuer === 'did:agility:issuer:trusted-kyc-provider';
  });

  await test('vcToSourceRef extracts issuerName', () => {
    const ref = vcToSourceRef(sampleVc);
    return ref.metadata?.issuerName === 'Trusted KYC Provider';
  });

  await test('vcToSourceRef parses issuedAt', () => {
    const ref = vcToSourceRef(sampleVc);
    const issuedAt = ref.metadata?.issuedAt as number;
    return issuedAt > 0 && issuedAt < Date.now() / 1000 + 86400;
  });

  await test('vcToSourceRef includes credential types', () => {
    const ref = vcToSourceRef(sampleVc);
    const types = ref.metadata?.credentialTypes as string[];
    return Array.isArray(types) && types.includes('AgeVerificationCredential');
  });

  await test('vcToSourceRef includes summary', () => {
    const ref = vcToSourceRef(sampleVc);
    const summary = ref.metadata?.summary as string;
    return typeof summary === 'string' && summary.includes('AgeVerificationCredential');
  });

  await test('vcToSourceRef handles string issuer', () => {
    const ref = vcToSourceRef(sampleVcStringIssuer);
    return ref.metadata?.issuer === 'did:agility:issuer:simple';
  });

  console.log('');
  console.log('=== SourceRef to VC Conversion Tests ===');
  console.log('');

  await test('sourceRefToVc reconstructs basic VC', () => {
    const ref = vcToSourceRef(sampleVc);
    const reconstructed = sourceRefToVc(ref);
    return reconstructed !== null && reconstructed.id === sampleVc.id;
  });

  await test('sourceRefToVc returns null for non-VC type', () => {
    const ref: SourceRef = { type: 'attestation', ref: 'test' };
    return sourceRefToVc(ref) === null;
  });

  await test('sourceRefToVc preserves issuer', () => {
    const ref = vcToSourceRef(sampleVc);
    const reconstructed = sourceRefToVc(ref);
    return reconstructed !== null && 
      getIssuerId(reconstructed.issuer) === 'did:agility:issuer:trusted-kyc-provider';
  });

  console.log('');
  console.log('=== SourceRef Validation Tests ===');
  console.log('');

  await test('isVcSourceRef returns true for vc type', () => {
    const ref = vcToSourceRef(sampleVc);
    return isVcSourceRef(ref);
  });

  await test('isVcSourceRef returns true for credential type', () => {
    const ref: SourceRef = { type: 'credential', ref: 'test' };
    return isVcSourceRef(ref);
  });

  await test('isVcSourceRef returns false for other types', () => {
    const ref: SourceRef = { type: 'attestation', ref: 'test' };
    return !isVcSourceRef(ref);
  });

  await test('validateVcSourceRef passes for valid VC ref', () => {
    const ref = vcToSourceRef(sampleVc);
    const result = validateVcSourceRef(ref);
    return result.valid && result.errors.length === 0;
  });

  await test('validateVcSourceRef fails for missing issuer', () => {
    const ref: SourceRef = { type: 'vc', ref: 'test' };
    const result = validateVcSourceRef(ref);
    return !result.valid && result.errors.some(e => e.includes('issuer'));
  });

  console.log('');
  console.log('=== Deck Integration Tests ===');
  console.log('');

  const store = getDeckStore();

  // Create a deck instance with VC source
  const instance = store.create({
    deckId: 'agility:kyc:v1',
    ownerDid: 'did:agility:user:alice',
  });

  // Add VC source - use identity_verified which has evidenceType: 'vc'
  const vcRef = vcToSourceRef(sampleVc);
  store.updateSources(instance.instanceId, {
    'agility:kyc:identity_verified': vcRef,
  });

  const updatedInstance = store.get(instance.instanceId)!;

  await test('Deck permission with VC source can be satisfied', () => {
    // identity_verified has evidenceType: 'vc', so VC source should work
    const result = canSatisfyPermission(updatedInstance, 'agility:kyc:identity_verified');
    return result.ok === true;
  });

  await test('Deck permission evidence summary includes VC info', () => {
    const result = canSatisfyPermission(updatedInstance, 'agility:kyc:identity_verified');
    return result.ok && result.evidenceSummary !== undefined && 
      result.evidenceSummary.includes('vc');
  });

  await test('Deck permission without source fails', () => {
    // age_over_21 has no source added
    const result = canSatisfyPermission(updatedInstance, 'agility:kyc:age_over_21');
    return result.ok === false;
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
