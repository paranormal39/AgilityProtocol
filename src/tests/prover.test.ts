import { LocalProver } from '../prover/LocalProver.js';
import { ProofProtocol } from '../protocol/ProofProtocol.js';
import { JsonPersistence } from '../persistence/JsonPersistence.js';
import { generateNonce, generateUUID, computeRequestHash } from '../utils/canonical.js';
import type { ProofRequest } from '../schemas/ProofRequest.js';
import * as fs from 'node:fs';

const TEST_STORAGE_PATH = './.agility-prover-test';

async function cleanTestStorage(): Promise<void> {
  const persistencePath = `${TEST_STORAGE_PATH}/persistence.json`;
  if (fs.existsSync(persistencePath)) {
    fs.unlinkSync(persistencePath);
  }
}

async function runTests(): Promise<void> {
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => boolean | Promise<boolean>): Promise<void> {
    return Promise.resolve(fn()).then(
      (result) => {
        if (result) {
          console.log(`✅ ${name}`);
          passed++;
        } else {
          console.log(`❌ ${name}`);
          failed++;
        }
      },
      (e) => {
        console.log(`❌ ${name}: ${e instanceof Error ? e.message : e}`);
        failed++;
      }
    );
  }

  await cleanTestStorage();

  console.log('');
  console.log('=== LocalProver Tests ===');
  console.log('');

  const persistence = new JsonPersistence(TEST_STORAGE_PATH);
  await persistence.initialize();

  const prover = new LocalProver(persistence);
  await prover.initialize();

  await test('prover generates stable rootId', async () => {
    const rootId1 = prover.getRootId();
    const rootId2 = prover.getRootId();
    return rootId1 === rootId2 && rootId1.length === 64;
  });

  await test('prover rootId persists across instances', async () => {
    const rootId1 = prover.getRootId();
    
    const prover2 = new LocalProver(persistence);
    await prover2.initialize();
    const rootId2 = prover2.getRootId();
    
    return rootId1 === rootId2;
  });

  await test('pairwiseId differs per audience', async () => {
    const pairwise1 = prover.getPairwiseId('app_one');
    const pairwise2 = prover.getPairwiseId('app_two');
    return pairwise1 !== pairwise2 && pairwise1.length === 64 && pairwise2.length === 64;
  });

  await test('pairwiseId is stable for same audience', async () => {
    const pairwise1 = prover.getPairwiseId('stable_app');
    const pairwise2 = prover.getPairwiseId('stable_app');
    return pairwise1 === pairwise2;
  });

  await test('pairwiseId persists across instances', async () => {
    const pairwise1 = prover.getPairwiseId('persist_app');
    
    const prover2 = new LocalProver(persistence);
    await prover2.initialize();
    const pairwise2 = prover2.getPairwiseId('persist_app');
    
    return pairwise1 === pairwise2;
  });

  console.log('');
  console.log('=== Grant Creation Tests ===');
  console.log('');

  const validRequest: ProofRequest = {
    requestId: generateUUID(),
    requiredPermissions: ['age_over_18', 'email_verified'],
    nonce: generateNonce(16),
    audience: 'test_verifier_app',
    expiresAt: new Date(Date.now() + 300000).toISOString(),
    issuedAt: new Date().toISOString(),
    version: '0.1',
    protocolVersion: '0.1.0',
  };

  await test('grant creation binds requestHash correctly', async () => {
    const grant = prover.createConsentGrant(validRequest);
    
    return (
      grant.requestId === validRequest.requestId &&
      grant.nonce === validRequest.nonce &&
      grant.audience === validRequest.audience &&
      grant.permissions.length === validRequest.requiredPermissions.length &&
      grant.signature.startsWith('agility_sig_')
    );
  });

  await test('grant uses pairwise signer ID', async () => {
    const grant = prover.createConsentGrant(validRequest);
    const pairwiseId = prover.getPairwiseId(validRequest.audience);
    
    return grant.signer.id === `did:agility:${pairwiseId.slice(0, 32)}`;
  });

  console.log('');
  console.log('=== Proof Generation Tests ===');
  console.log('');

  const grant = prover.createConsentGrant(validRequest);

  await test('proof generation binds correctly', async () => {
    const proof = prover.generateProof(validRequest, grant);
    const expectedHash = computeRequestHash(validRequest);
    
    return (
      proof.requestId === validRequest.requestId &&
      proof.nonce === validRequest.nonce &&
      proof.audience === validRequest.audience &&
      proof.binding.requestHash === expectedHash &&
      proof.verified === true
    );
  });

  await test('proof uses pairwise prover ID', async () => {
    const proof = prover.generateProof(validRequest, grant);
    const pairwiseId = prover.getPairwiseId(validRequest.audience);
    
    return proof.prover.id === `did:agility:${pairwiseId.slice(0, 32)}`;
  });

  console.log('');
  console.log('=== Verification Tests ===');
  console.log('');

  const protocol = new ProofProtocol(persistence);
  const proof = prover.generateProof(validRequest, grant);

  await test('verifier accepts valid proof', async () => {
    const result = protocol.verify(validRequest, proof, grant);
    return result.valid === true && result.errors.length === 0;
  });

  await test('verifier rejects wrong audience', async () => {
    const badProof = { ...proof, audience: 'wrong_app' };
    const result = protocol.verify(validRequest, badProof);
    return result.valid === false && result.checks.audienceMatch === false;
  });

  await test('verifier rejects wrong nonce', async () => {
    const badProof = { ...proof, nonce: 'wrong_nonce_1234567890123456' };
    const result = protocol.verify(validRequest, badProof);
    return result.valid === false && result.checks.nonceMatch === false;
  });

  await test('verifier rejects expired proof', async () => {
    const expiredRequest: ProofRequest = {
      ...validRequest,
      requestId: generateUUID(),
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    };
    const expiredGrant = prover.createConsentGrant(expiredRequest);
    const expiredProof = prover.generateProof(expiredRequest, expiredGrant);
    
    const result = protocol.verify(expiredRequest, expiredProof, expiredGrant);
    return result.valid === false && result.checks.notExpired === false;
  });

  await test('verifier rejects wrong requestId', async () => {
    const badProof = { ...proof, requestId: generateUUID() };
    const result = protocol.verify(validRequest, badProof);
    return result.valid === false && result.checks.requestIdMatch === false;
  });

  await test('verifier rejects invalid binding hash', async () => {
    const badProof = { ...proof, binding: { requestHash: 'a'.repeat(64) } };
    const result = protocol.verify(validRequest, badProof);
    return result.valid === false && result.checks.bindingValid === false;
  });

  await test('verifier rejects missing permissions', async () => {
    const badProof = { ...proof, satisfiedPermissions: ['age_over_18'] };
    const result = protocol.verify(validRequest, badProof);
    return result.valid === false && result.checks.permissionsSatisfied === false;
  });

  console.log('');
  console.log('=== Cross-App Tracking Prevention ===');
  console.log('');

  await test('different apps get different pairwise IDs', async () => {
    const id1 = prover.getPairwiseId('app_alpha');
    const id2 = prover.getPairwiseId('app_beta');
    const id3 = prover.getPairwiseId('app_gamma');
    
    return id1 !== id2 && id2 !== id3 && id1 !== id3;
  });

  await test('same app always gets same pairwise ID', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      ids.push(prover.getPairwiseId('consistent_app'));
    }
    return ids.every((id) => id === ids[0]);
  });

  console.log('');
  console.log('=== Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('');

  await cleanTestStorage();

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((e) => {
  console.error('Test error:', e);
  process.exit(1);
});
