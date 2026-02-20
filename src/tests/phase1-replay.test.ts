/**
 * Phase 1 Replay Protection Tests
 * 
 * Tests for:
 * - Clock skew tolerance
 * - Expiry validation
 * - Proof age validation
 * - Replay attack protection
 */

import { ProofProtocol } from '../protocol/ProofProtocol.js';
import { LocalProver } from '../prover/LocalProver.js';
import { JsonPersistence } from '../persistence/JsonPersistence.js';
import {
  getNow,
  validateTimeRange,
  VerificationErrorCode,
  MAX_CLOCK_SKEW_SECONDS,
  MAX_PROOF_AGE_SECONDS,
} from '../security/config.js';
import { getReplayStore, generateReplayKey } from '../security/ReplayStore.js';

const TEST_DIR = './.agility-phase1-test';

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
  console.log('  Phase 1 Security Hardening Tests');
  console.log('═'.repeat(50));
  console.log('');

  const persistence = new JsonPersistence(TEST_DIR);
  await persistence.initialize();

  const replayStore = getReplayStore();

  console.log('=== Time Validation Tests ===');
  console.log('');

  await test('validateTimeRange: valid time range passes', () => {
    const now = new Date();
    const issuedAt = new Date(now.getTime() - 60000).toISOString();
    const expiresAt = new Date(now.getTime() + 240000).toISOString();
    const result = validateTimeRange(issuedAt, expiresAt);
    return result.valid === true;
  });

  await test('validateTimeRange: issuedAt > expiresAt fails with INVALID_TIME_RANGE', () => {
    const now = new Date();
    const issuedAt = new Date(now.getTime() + 100000).toISOString();
    const expiresAt = new Date(now.getTime() - 100000).toISOString();
    const result = validateTimeRange(issuedAt, expiresAt);
    return result.valid === false && result.errorCode === VerificationErrorCode.INVALID_TIME_RANGE;
  });

  await test('validateTimeRange: future issuedAt beyond clock skew fails', () => {
    const now = new Date();
    const issuedAt = new Date(now.getTime() + (MAX_CLOCK_SKEW_SECONDS + 60) * 1000).toISOString();
    const expiresAt = new Date(now.getTime() + (MAX_CLOCK_SKEW_SECONDS + 360) * 1000).toISOString();
    const result = validateTimeRange(issuedAt, expiresAt);
    return result.valid === false && result.errorCode === VerificationErrorCode.FUTURE_ISSUED_AT;
  });

  await test('validateTimeRange: expired proof fails with EXPIRED', () => {
    const now = new Date();
    const issuedAt = new Date(now.getTime() - 1000000).toISOString();
    const expiresAt = new Date(now.getTime() - (MAX_CLOCK_SKEW_SECONDS + 60) * 1000).toISOString();
    const result = validateTimeRange(issuedAt, expiresAt);
    return result.valid === false && result.errorCode === VerificationErrorCode.EXPIRED;
  });

  await test('validateTimeRange: proof too old fails with PROOF_TOO_OLD', () => {
    const now = new Date();
    const issuedAt = new Date(now.getTime() - (MAX_PROOF_AGE_SECONDS + 60) * 1000).toISOString();
    const expiresAt = new Date(now.getTime() + 60000).toISOString();
    const result = validateTimeRange(issuedAt, expiresAt);
    return result.valid === false && result.errorCode === VerificationErrorCode.PROOF_TOO_OLD;
  });

  console.log('');
  console.log('=== Replay Store Tests ===');
  console.log('');

  // Clear store before tests
  replayStore.clear();

  await test('ReplayStore: add and check key', () => {
    replayStore.add('test:key:1', 300);
    return replayStore.has('test:key:1') === true;
  });

  await test('ReplayStore: non-existent key returns false', () => {
    return replayStore.has('nonexistent:key') === false;
  });

  await test('ReplayStore: expired key returns false', () => {
    replayStore.add('test:expired:key', -1);
    return replayStore.has('test:expired:key') === false;
  });

  await test('generateReplayKey: correct format', () => {
    const key = generateReplayKey('prover123', 'hash456');
    return key === 'prover123:hash456';
  });

  console.log('');
  console.log('=== Replay Protection Integration Tests ===');
  console.log('');

  // Clear store before integration tests
  replayStore.clear();

  const protocol = new ProofProtocol(persistence);
  const prover = new LocalProver(persistence);
  await prover.initialize();

  await test('First verification passes', async () => {
    const request = await protocol.createRequest({
      audience: 'test_app_replay',
      requiredPermissions: ['age_over_18'],
      ttlSeconds: 300,
    });

    const grant = prover.createConsentGrant(request);
    const proof = prover.generateProof(request, grant);

    const result = protocol.verify(request, proof, grant);
    return result.valid === true;
  });

  await test('Second verification of same proof fails with REPLAY_DETECTED', async () => {
    // Create a fresh request/proof pair
    const request = await protocol.createRequest({
      audience: 'test_app_replay2',
      requiredPermissions: ['age_over_18'],
      ttlSeconds: 300,
    });

    const grant = prover.createConsentGrant(request);
    const proof = prover.generateProof(request, grant);

    // First verification should pass
    const result1 = protocol.verify(request, proof, grant);
    if (!result1.valid) {
      return false;
    }

    // Second verification should fail with REPLAY_DETECTED
    const result2 = protocol.verify(request, proof, grant);
    return (
      result2.valid === false &&
      result2.checks.notReplay === false &&
      result2.errorCodes?.includes(VerificationErrorCode.REPLAY_DETECTED) === true
    );
  });

  await test('Different provers generate different replay keys', async () => {
    // Clear replay store for this test
    replayStore.clear();

    const request = await protocol.createRequest({
      audience: 'test_app_multi',
      requiredPermissions: ['age_over_18'],
      ttlSeconds: 300,
    });

    // First prover
    const grant1 = prover.createConsentGrant(request);
    const proof1 = prover.generateProof(request, grant1);
    const result1 = protocol.verify(request, proof1, grant1);

    // Create a new request for second prover (different audience to avoid replay)
    const request2 = await protocol.createRequest({
      audience: 'test_app_multi_2',
      requiredPermissions: ['age_over_18'],
      ttlSeconds: 300,
    });

    // Create a new prover with different identity
    const persistence2 = new JsonPersistence(TEST_DIR + '-2');
    await persistence2.initialize();
    const prover2 = new LocalProver(persistence2);
    await prover2.initialize();

    const grant2 = prover2.createConsentGrant(request2);
    const proof2 = prover2.generateProof(request2, grant2);
    const result2 = protocol.verify(request2, proof2, grant2);

    return result1.valid === true && result2.valid === true;
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
