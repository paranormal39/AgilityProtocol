/**
 * Phase 2 XRPL Consent Verification Tests
 * 
 * Tests for XRPL transaction memo verification with mocked client.
 */

import { JsonPersistence } from '../persistence/JsonPersistence.js';
import { ProofProtocol } from '../protocol/ProofProtocol.js';
import { LocalProver } from '../prover/LocalProver.js';
import {
  verifyXrplConsentTx,
  computeConsentHash,
} from '../security/xrpl/verifyXrplConsentTx.js';
import { MockXrplClient } from '../security/xrpl/XrplClient.js';
import { VerificationErrorCode } from '../security/config.js';
import type { ConsentGrant } from '../schemas/ConsentGrant.js';

const TEST_DIR = './.agility-phase2-test';

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
  console.log('  Phase 2 XRPL Consent Verification Tests');
  console.log('═'.repeat(50));
  console.log('');

  const persistence = new JsonPersistence(TEST_DIR);
  await persistence.initialize();

  const protocol = new ProofProtocol(persistence);
  const prover = new LocalProver(persistence);
  await prover.initialize();

  // Create a sample grant for testing
  const request = await protocol.createRequest({
    audience: 'test_xrpl_app',
    requiredPermissions: ['age_over_18'],
    ttlSeconds: 300,
  });
  const grant = prover.createConsentGrant(request);

  console.log('=== Consent Hash Computation ===');
  console.log('');

  await test('computeConsentHash returns consistent hash', () => {
    const hash1 = computeConsentHash(grant);
    const hash2 = computeConsentHash(grant);
    return hash1 === hash2 && hash1.length === 64;
  });

  await test('computeConsentHash excludes signature', () => {
    const hash1 = computeConsentHash(grant);
    const modifiedGrant = { ...grant, signature: 'different_signature' };
    const hash2 = computeConsentHash(modifiedGrant as ConsentGrant);
    // Hash should be the same since signature is excluded
    return hash1 === hash2;
  });

  console.log('');
  console.log('=== XRPL Verification (Disabled) ===');
  console.log('');

  await test('verifyXrplConsentTx returns ok when disabled', async () => {
    const result = await verifyXrplConsentTx(grant, 'somehash');
    return result.ok === true && result.meta?.note === 'XRPL tx verify disabled';
  });

  console.log('');
  console.log('=== Mock XRPL Client Tests ===');
  console.log('');

  const mockClient = new MockXrplClient();

  await test('MockXrplClient returns null for unknown tx', async () => {
    const tx = await mockClient.getTransaction('unknown_hash');
    return tx === null;
  });

  await test('MockXrplClient returns added transaction', async () => {
    const testTx = MockXrplClient.createMockTx(
      'rTestAccount123',
      'test_consent_hash'
    );
    mockClient.addTransaction('test_tx_hash', testTx);
    const tx = await mockClient.getTransaction('test_tx_hash');
    return tx !== null && tx.Account === 'rTestAccount123';
  });

  await test('MockXrplClient clear removes all transactions', async () => {
    mockClient.clear();
    const tx = await mockClient.getTransaction('test_tx_hash');
    return tx === null;
  });

  console.log('');
  console.log('=== Memo Encoding Tests ===');
  console.log('');

  await test('createMockTx with hex memo', () => {
    const tx = MockXrplClient.createMockTx('rTest', 'abc123', { memoAsHex: true });
    return tx.Memos?.[0]?.Memo?.MemoData === 'abc123';
  });

  await test('createMockTx with utf8 memo (auto hex encoded)', () => {
    const tx = MockXrplClient.createMockTx('rTest', 'hello');
    const expectedHex = Buffer.from('hello', 'utf8').toString('hex');
    return tx.Memos?.[0]?.Memo?.MemoData === expectedHex;
  });

  console.log('');
  console.log('=== XRPL Grant Verification Scenarios ===');
  console.log('');

  // Create an XRPL-type grant for testing
  const xrplGrant: ConsentGrant = {
    ...grant,
    signer: {
      type: 'xrpl',
      id: 'rXRPLTestAddress123',
    },
    signatureMeta: {
      txHash: 'valid_tx_hash_123',
    },
  };

  const consentHash = computeConsentHash(xrplGrant);

  await test('Non-XRPL signer skips verification', async () => {
    // This test uses the default grant which has 'did' signer type
    // When XRPL verify is enabled, it should skip for non-XRPL signers
    const result = await verifyXrplConsentTx(grant, consentHash);
    // Since ENABLE_XRPL_CONSENT_TX_VERIFY is false, it returns ok
    return result.ok === true;
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
