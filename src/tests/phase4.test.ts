/**
 * Phase 4 Tests
 * 
 * Tests for DeckEvaluator, PairwiseDid, and Cardano verification.
 */

import { derivePairwiseDid, isPairwiseDid } from '../did/index.js';
import {
  canSatisfyPermission,
  satisfyRequest,
  isDeckStrict,
  validateStrictPermissions,
  getDeckRegistry,
  getDeckStore,
  resetDeckRegistry,
  resetDeckStore,
} from '../decks/index.js';
import type { DeckInstance, SourceRef } from '../decks/index.js';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean | Promise<boolean>): Promise<void> {
  return Promise.resolve(fn()).then((result) => {
    if (result) {
      console.log(`  ✓ ${name}`);
      passed++;
    } else {
      console.log(`  ✗ ${name}`);
      failed++;
    }
  }).catch((err) => {
    console.log(`  ✗ ${name} (error: ${err})`);
    failed++;
  });
}

async function runTests(): Promise<void> {
  console.log('');
  console.log('═'.repeat(50));
  console.log('  Phase 4 Tests');
  console.log('═'.repeat(50));
  console.log('');

  // Reset singletons
  resetDeckRegistry();
  resetDeckStore();

  console.log('=== Pairwise DID Tests ===');
  console.log('');

  await test('derivePairwiseDid returns consistent hash', () => {
    const did1 = derivePairwiseDid('did:key:z6MkTest', 'app1.example.com');
    const did2 = derivePairwiseDid('did:key:z6MkTest', 'app1.example.com');
    return did1 === did2;
  });

  await test('derivePairwiseDid different audiences produce different DIDs', () => {
    const did1 = derivePairwiseDid('did:key:z6MkTest', 'app1.example.com');
    const did2 = derivePairwiseDid('did:key:z6MkTest', 'app2.example.com');
    return did1 !== did2;
  });

  await test('derivePairwiseDid different masters produce different DIDs', () => {
    const did1 = derivePairwiseDid('did:key:z6MkTest1', 'app1.example.com');
    const did2 = derivePairwiseDid('did:key:z6MkTest2', 'app1.example.com');
    return did1 !== did2;
  });

  await test('derivePairwiseDid format is correct', () => {
    const did = derivePairwiseDid('did:key:z6MkTest', 'app1.example.com');
    return did.startsWith('did:agility:pairwise:') && did.length === 53;
  });

  await test('isPairwiseDid correctly identifies pairwise DIDs', () => {
    const pairwise = derivePairwiseDid('did:key:z6MkTest', 'app1.example.com');
    const regular = 'did:key:z6MkTest';
    return isPairwiseDid(pairwise) && !isPairwiseDid(regular);
  });

  console.log('');
  console.log('=== DeckEvaluator Tests ===');
  console.log('');

  // Create a test deck instance
  const registry = getDeckRegistry();
  const store = getDeckStore();

  const testInstance = store.create({
    deckId: 'agility:kyc:v1',
    ownerDid: 'did:key:z6MkTestOwner',
  });

  // Add sources to the instance
  const sources: Record<string, SourceRef> = {
    'agility:kyc:age_over_18': {
      type: 'zk',
      ref: 'proof-123',
      metadata: {
        issuer: 'did:agility:issuer1',
        issuedAt: Math.floor(Date.now() / 1000) - 60, // 1 minute ago
        trust: 90,
      },
    },
    'agility:kyc:identity_verified': {
      type: 'vc',
      ref: 'cred-456',
      metadata: {
        issuer: 'did:agility:issuer2',
        issuedAt: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      },
    },
  };

  store.updateSources(testInstance.instanceId, sources);
  const updatedInstance = store.get(testInstance.instanceId)!;

  await test('canSatisfyPermission returns ok for satisfied permission', () => {
    const result = canSatisfyPermission(updatedInstance, 'agility:kyc:age_over_18');
    return result.ok === true;
  });

  await test('canSatisfyPermission returns evidence summary', () => {
    const result = canSatisfyPermission(updatedInstance, 'agility:kyc:age_over_18');
    return result.ok && result.evidenceSummary !== undefined;
  });

  await test('canSatisfyPermission fails for missing source', () => {
    const result = canSatisfyPermission(updatedInstance, 'agility:kyc:age_over_21');
    return result.ok === false && (result.reason?.includes('No source') ?? false);
  });

  await test('canSatisfyPermission fails for unknown permission', () => {
    const result = canSatisfyPermission(updatedInstance, 'unknown:permission');
    return result.ok === false && (result.reason?.includes('not defined') ?? false);
  });

  await test('satisfyRequest correctly partitions permissions', () => {
    const result = satisfyRequest(
      updatedInstance,
      ['agility:kyc:age_over_18', 'agility:kyc:age_over_21', 'agility:kyc:identity_verified']
    );
    return (
      result.satisfiedPermissions.length === 2 &&
      result.unsatisfiedPermissions.length === 1 &&
      result.satisfiedPermissions.includes('agility:kyc:age_over_18') &&
      result.satisfiedPermissions.includes('agility:kyc:identity_verified') &&
      result.unsatisfiedPermissions.includes('agility:kyc:age_over_21')
    );
  });

  await test('satisfyRequest returns mapping for satisfied permissions', () => {
    const result = satisfyRequest(
      updatedInstance,
      ['agility:kyc:age_over_18']
    );
    return (
      result.mapping['agility:kyc:age_over_18'] !== undefined &&
      result.mapping['agility:kyc:age_over_18'].ref === 'proof-123'
    );
  });

  console.log('');
  console.log('=== Strict Deck Permissions Tests ===');
  console.log('');

  const deck = registry.get('agility:kyc:v1')!;

  await test('isDeckStrict returns false for non-strict deck', () => {
    return isDeckStrict(deck) === false;
  });

  await test('validateStrictPermissions passes for known permissions', () => {
    const result = validateStrictPermissions(deck, ['agility:kyc:age_over_18']);
    return result.valid === true && result.unknownPermissions.length === 0;
  });

  await test('validateStrictPermissions fails for unknown permissions', () => {
    const result = validateStrictPermissions(deck, ['agility:kyc:age_over_18', 'unknown:perm']);
    return result.valid === false && result.unknownPermissions.includes('unknown:perm');
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
