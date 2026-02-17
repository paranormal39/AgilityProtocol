import { canonicalJson, sha256Hex, computeRequestHash, generateNonce, generateUUID } from '../utils/canonical.js';
import { ProofProtocol } from '../protocol/ProofProtocol.js';
import { JsonPersistence } from '../persistence/JsonPersistence.js';
import type { ProofRequest } from '../schemas/ProofRequest.js';
import type { ProofResponse } from '../schemas/ProofResponse.js';

async function runTests(): Promise<void> {
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => boolean): void {
    try {
      if (fn()) {
        console.log(`✅ ${name}`);
        passed++;
      } else {
        console.log(`❌ ${name}`);
        failed++;
      }
    } catch (e) {
      console.log(`❌ ${name}: ${e instanceof Error ? e.message : e}`);
      failed++;
    }
  }

  console.log('');
  console.log('=== Canonical JSON Tests ===');
  console.log('');

  test('canonicalJson sorts object keys', () => {
    const obj = { z: 1, a: 2, m: 3 };
    const result = canonicalJson(obj);
    return result === '{"a":2,"m":3,"z":1}';
  });

  test('canonicalJson sorts nested object keys', () => {
    const obj = { outer: { z: 1, a: 2 }, first: true };
    const result = canonicalJson(obj);
    return result === '{"first":true,"outer":{"a":2,"z":1}}';
  });

  test('canonicalJson handles arrays', () => {
    const obj = { items: [3, 1, 2], name: 'test' };
    const result = canonicalJson(obj);
    return result === '{"items":[3,1,2],"name":"test"}';
  });

  test('canonicalJson is deterministic', () => {
    const obj1 = { b: 2, a: 1 };
    const obj2 = { a: 1, b: 2 };
    return canonicalJson(obj1) === canonicalJson(obj2);
  });

  test('sha256Hex produces 64-char hex string', () => {
    const hash = sha256Hex('test');
    return hash.length === 64 && /^[a-f0-9]+$/.test(hash);
  });

  test('sha256Hex is deterministic', () => {
    return sha256Hex('hello') === sha256Hex('hello');
  });

  test('computeRequestHash uses canonical JSON', () => {
    const req1 = { requestId: 'abc', audience: 'test', nonce: '123' };
    const req2 = { nonce: '123', requestId: 'abc', audience: 'test' };
    return computeRequestHash(req1) === computeRequestHash(req2);
  });

  test('generateNonce produces correct length', () => {
    const nonce = generateNonce(16);
    return nonce.length === 32;
  });

  test('generateUUID produces valid format', () => {
    const uuid = generateUUID();
    return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(uuid);
  });

  console.log('');
  console.log('=== Verification Tests ===');
  console.log('');

  const persistence = new JsonPersistence('./.agility-test-temp');
  await persistence.initialize();
  const protocol = new ProofProtocol(persistence);

  const validRequest: ProofRequest = {
    requestId: generateUUID(),
    requiredPermissions: ['age_over_18'],
    nonce: generateNonce(16),
    audience: 'test_app',
    expiresAt: new Date(Date.now() + 300000).toISOString(),
    issuedAt: new Date().toISOString(),
    version: '0.1',
    protocolVersion: '0.1.0',
  };

  const requestHash = computeRequestHash(validRequest);

  const validProof: ProofResponse = {
    proofId: generateUUID(),
    requestId: validRequest.requestId,
    audience: validRequest.audience,
    nonce: validRequest.nonce,
    satisfiedPermissions: ['age_over_18'],
    verified: true,
    issuedAt: new Date().toISOString(),
    expiresAt: validRequest.expiresAt,
    proof: { type: 'mock' },
    binding: { requestHash },
    prover: { type: 'local', id: 'test' },
    version: '0.1',
    protocolVersion: '0.1.0',
  };

  test('verify passes for valid request+proof', () => {
    const result = protocol.verify(validRequest, validProof);
    return result.valid === true && result.errors.length === 0;
  });

  test('verify fails for mismatched audience', () => {
    const badProof = { ...validProof, audience: 'wrong_app' };
    const result = protocol.verify(validRequest, badProof as ProofResponse);
    return result.valid === false && result.checks.audienceMatch === false;
  });

  test('verify fails for mismatched nonce', () => {
    const badProof = { ...validProof, nonce: 'wrong_nonce_1234567890123456' };
    const result = protocol.verify(validRequest, badProof as ProofResponse);
    return result.valid === false && result.checks.nonceMatch === false;
  });

  test('verify fails for mismatched requestId', () => {
    const badProof = { ...validProof, requestId: generateUUID() };
    const result = protocol.verify(validRequest, badProof as ProofResponse);
    return result.valid === false && result.checks.requestIdMatch === false;
  });

  test('verify fails for missing permissions', () => {
    const badProof = { ...validProof, satisfiedPermissions: [] };
    const result = protocol.verify(validRequest, badProof as ProofResponse);
    return result.valid === false && result.checks.permissionsSatisfied === false;
  });

  test('verify fails for invalid binding hash', () => {
    const badProof = { ...validProof, binding: { requestHash: 'a'.repeat(64) } };
    const result = protocol.verify(validRequest, badProof as ProofResponse);
    return result.valid === false && result.checks.bindingValid === false;
  });

  test('verify fails for expired request', () => {
    const expiredRequest = {
      ...validRequest,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    };
    const expiredProof = {
      ...validProof,
      expiresAt: expiredRequest.expiresAt,
      binding: { requestHash: computeRequestHash(expiredRequest) },
    };
    const result = protocol.verify(expiredRequest, expiredProof as ProofResponse);
    return result.valid === false && result.checks.notExpired === false;
  });

  console.log('');
  console.log('=== Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((e) => {
  console.error('Test error:', e);
  process.exit(1);
});
