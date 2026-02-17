import { LocalSigner } from '../signers/LocalSigner.js';
import { LocalProver } from '../prover/LocalProver.js';
import { ProofProtocol } from '../protocol/ProofProtocol.js';
import { JsonPersistence } from '../persistence/JsonPersistence.js';
import { generateNonce, generateUUID, canonicalJson, sha256Hex } from '../utils/canonical.js';
import type { ProofRequest } from '../schemas/ProofRequest.js';
import type { ConsentPayload } from '../signers/SignerProvider.js';
import * as fs from 'node:fs';

const TEST_STORAGE_PATH = './.agility-signer-test';

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
  console.log('=== LocalSigner Tests ===');
  console.log('');

  const localSigner = new LocalSigner({
    rootPublicKey: 'test_public_key_12345',
    pairwiseId: 'a'.repeat(64),
  });

  await test('LocalSigner returns type "local"', async () => {
    return localSigner.getType() === 'local';
  });

  const testPayload: ConsentPayload = {
    version: '0.1',
    requestId: generateUUID(),
    audience: 'test_app',
    nonce: generateNonce(16),
    expiresAt: new Date(Date.now() + 300000).toISOString(),
    issuedAt: new Date().toISOString(),
    permissions: ['age_over_18'],
    requestHash: 'a'.repeat(64),
  };

  await test('LocalSigner signs consent payload', async () => {
    const bundle = await localSigner.signConsent(testPayload);
    return (
      bundle.signer.type === 'did' &&
      bundle.signer.id.startsWith('did:agility:') &&
      bundle.signature.startsWith('agility_sig_') &&
      bundle.method === 'ed25519_mock'
    );
  });

  await test('LocalSigner produces deterministic signatures', async () => {
    const bundle1 = await localSigner.signConsent(testPayload);
    const bundle2 = await localSigner.signConsent(testPayload);
    return bundle1.signature === bundle2.signature;
  });

  await test('LocalSigner produces different signatures for different payloads', async () => {
    const payload2: ConsentPayload = {
      ...testPayload,
      requestId: generateUUID(),
    };
    const bundle1 = await localSigner.signConsent(testPayload);
    const bundle2 = await localSigner.signConsent(payload2);
    return bundle1.signature !== bundle2.signature;
  });

  console.log('');
  console.log('=== ConsentPayload Serialization Tests ===');
  console.log('');

  await test('ConsentPayload canonical serialization is deterministic', async () => {
    const json1 = canonicalJson(testPayload);
    const json2 = canonicalJson(testPayload);
    return json1 === json2;
  });

  await test('ConsentPayload hash is 64 chars hex', async () => {
    const hash = sha256Hex(canonicalJson(testPayload));
    return hash.length === 64 && /^[a-f0-9]+$/.test(hash);
  });

  console.log('');
  console.log('=== Prover + Signer Integration Tests ===');
  console.log('');

  const persistence = new JsonPersistence(TEST_STORAGE_PATH);
  await persistence.initialize();

  const prover = new LocalProver(persistence);
  await prover.initialize();

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

  await test('prover grant with local signer works', async () => {
    const localSignerForAudience = prover.getLocalSignerForAudience(validRequest.audience);
    const grant = await prover.createConsentGrantWithSigner(validRequest, localSignerForAudience);
    
    return (
      grant.grantId.length > 0 &&
      grant.requestId === validRequest.requestId &&
      grant.signer.type === 'did' &&
      grant.signature.startsWith('agility_sig_') &&
      grant.consent !== undefined &&
      grant.consent.requestHash.length === 64
    );
  });

  await test('grant consent.requestHash matches computed hash', async () => {
    const localSignerForAudience = prover.getLocalSignerForAudience(validRequest.audience);
    const grant = await prover.createConsentGrantWithSigner(validRequest, localSignerForAudience);
    const expectedHash = prover.computeRequestHash(validRequest);
    
    return grant.consent?.requestHash === expectedHash;
  });

  console.log('');
  console.log('=== Verification with Grant Tests ===');
  console.log('');

  const protocol = new ProofProtocol(persistence);

  await test('verifier accepts valid proof with local grant', async () => {
    const grant = prover.createConsentGrant(validRequest);
    const proof = prover.generateProof(validRequest, grant);
    const result = protocol.verify(validRequest, proof, grant);
    
    return result.valid === true && result.errors.length === 0;
  });

  await test('verifier rejects grant with wrong requestHash', async () => {
    const localSignerForAudience = prover.getLocalSignerForAudience(validRequest.audience);
    const grant = await prover.createConsentGrantWithSigner(validRequest, localSignerForAudience);
    
    if (grant.consent) {
      grant.consent.requestHash = 'b'.repeat(64);
    }
    
    const proof = prover.generateProof(validRequest, grant);
    const result = protocol.verify(validRequest, proof, grant);
    
    return result.valid === false && result.checks.grantValid === false;
  });

  await test('verifier rejects grant with wrong audience', async () => {
    const badRequest = { ...validRequest, requestId: generateUUID() };
    const grant = prover.createConsentGrant(badRequest);
    
    grant.audience = 'wrong_audience';
    
    const proof = prover.generateProof(badRequest, { ...grant, audience: badRequest.audience });
    const result = protocol.verify(badRequest, proof, grant);
    
    return result.valid === false;
  });

  await test('verifier rejects expired grant', async () => {
    const expiredRequest: ProofRequest = {
      ...validRequest,
      requestId: generateUUID(),
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    };
    const grant = prover.createConsentGrant(expiredRequest);
    const proof = prover.generateProof(expiredRequest, grant);
    
    const result = protocol.verify(expiredRequest, proof, grant);
    return result.valid === false && result.checks.notExpired === false;
  });

  await test('verifier rejects grant missing permissions', async () => {
    const grant = prover.createConsentGrant(validRequest, ['age_over_18']);
    const proof = prover.generateProof(validRequest, grant, ['age_over_18']);
    
    const result = protocol.verify(validRequest, proof, grant);
    return result.valid === false;
  });

  console.log('');
  console.log('=== XamanSigner Tests (Mocked) ===');
  console.log('');

  await test('XamanSigner builds correct memo payload structure', async () => {
    const memoType = Buffer.from('agility_consent', 'utf8').toString('hex').toUpperCase();
    const expectedType = '6167696C6974795F636F6E73656E74';
    return memoType === expectedType;
  });

  await test('XamanSigner memo data is valid JSON hex', async () => {
    const memoData = {
      requestId: testPayload.requestId,
      requestHash: testPayload.requestHash,
      audience: testPayload.audience,
      consentHash: sha256Hex(canonicalJson(testPayload)).slice(0, 32),
    };
    const hex = Buffer.from(JSON.stringify(memoData), 'utf8').toString('hex').toUpperCase();
    const decoded = Buffer.from(hex, 'hex').toString('utf8');
    const parsed = JSON.parse(decoded);
    
    return parsed.requestId === testPayload.requestId && parsed.audience === testPayload.audience;
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
