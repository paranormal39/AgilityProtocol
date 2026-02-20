/**
 * Phase 6 Forward Compatibility Tests
 * 
 * Tests ensuring the protocol handles unknown fields, versions, and types gracefully.
 */

import { ProofProtocol } from '../protocol/ProofProtocol.js';
import { 
  parseProtocolVersion, 
  isProtocolVersionSupported,
  PROTOCOL_VERSION,
  VerificationErrorCode,
} from '../security/config.js';
import { getAdapterRegistry, resetAdapterRegistry } from '../adapters/AdapterRegistry.js';
import { getDidResolverRegistry, resetDidResolverRegistry, resolveDid } from '../did/index.js';
import { canSatisfyPermission, getDeckStore, getDeckRegistry, resetDeckStore, resetDeckRegistry } from '../decks/index.js';
import { JsonPersistence } from '../persistence/JsonPersistence.js';

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

async function runTests(): Promise<void> {
  console.log('');
  console.log('═'.repeat(50));
  console.log('  Phase 6 Forward Compatibility Tests');
  console.log('═'.repeat(50));
  console.log('');

  // Reset singletons
  resetAdapterRegistry();
  resetDidResolverRegistry();
  resetDeckStore();
  resetDeckRegistry();

  console.log('=== Protocol Version Tests ===');
  console.log('');

  await test('parseProtocolVersion parses valid version', () => {
    const result = parseProtocolVersion('1.0');
    return result !== null && result.major === 1 && result.minor === 0;
  });

  await test('parseProtocolVersion parses higher minor version', () => {
    const result = parseProtocolVersion('1.5');
    return result !== null && result.major === 1 && result.minor === 5;
  });

  await test('parseProtocolVersion returns null for invalid format', () => {
    return parseProtocolVersion('invalid') === null;
  });

  await test('parseProtocolVersion returns null for empty string', () => {
    return parseProtocolVersion('') === null;
  });

  await test('parseProtocolVersion returns null for single number', () => {
    return parseProtocolVersion('1') === null;
  });

  await test('isProtocolVersionSupported accepts current version', () => {
    const result = isProtocolVersionSupported(PROTOCOL_VERSION);
    return result.ok === true;
  });

  await test('isProtocolVersionSupported accepts higher minor version', () => {
    const result = isProtocolVersionSupported('1.5');
    return result.ok === true;
  });

  await test('isProtocolVersionSupported rejects higher major version', () => {
    const result = isProtocolVersionSupported('2.0');
    return result.ok === false && result.errorCode === VerificationErrorCode.UNSUPPORTED_PROTOCOL_VERSION;
  });

  await test('isProtocolVersionSupported rejects lower major version', () => {
    const result = isProtocolVersionSupported('0.9');
    return result.ok === false && result.errorCode === VerificationErrorCode.UNSUPPORTED_PROTOCOL_VERSION;
  });

  await test('isProtocolVersionSupported rejects invalid format', () => {
    const result = isProtocolVersionSupported('not-a-version');
    return result.ok === false && result.errorCode === VerificationErrorCode.UNSUPPORTED_PROTOCOL_VERSION;
  });

  console.log('');
  console.log('=== Unknown Fields in Messages ===');
  console.log('');

  const persistence = new JsonPersistence('./data');
  const protocol = new ProofProtocol(persistence);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const futureIso = new Date(now + 600000).toISOString();

  // Create request with unknown fields
  const requestWithUnknownFields = {
    requestId: '550e8400-e29b-41d4-a716-446655440001',
    audience: 'test.app',
    nonce: 'abc123def456abc123def456abc123def456',
    requiredPermissions: ['test:perm'],
    issuedAt: nowIso,
    expiresAt: futureIso,
    version: '0.1' as const,
    protocolVersion: '1.0',
    // Unknown fields
    unknownField1: 'should be ignored',
    futureFeature: { nested: true },
    _internal: 12345,
  };

  // Create matching proof with unknown fields
  const proofWithUnknownFields = {
    proofId: '660e8400-e29b-41d4-a716-446655440001',
    prover: { type: 'local' as const, id: 'did:test:prover' },
    audience: 'test.app',
    nonce: 'abc123def456abc123def456abc123def456',
    requestId: '550e8400-e29b-41d4-a716-446655440001',
    satisfiedPermissions: ['test:perm'],
    verified: true,
    proof: {},
    version: '0.1' as const,
    binding: {
      requestHash: '', // Will be computed
    },
    issuedAt: nowIso,
    expiresAt: futureIso,
    // Unknown fields
    unknownProofField: 'also ignored',
    _metadata: { version: 2 },
  };

  // Compute proper binding - hash the full request including unknown fields
  const { sha256Hex, canonicalJson } = await import('../utils/canonical.js');
  proofWithUnknownFields.binding.requestHash = sha256Hex(canonicalJson(requestWithUnknownFields));

  await test('Verification passes with unknown fields in request', () => {
    const result = protocol.verify(requestWithUnknownFields as any, proofWithUnknownFields as any);
    if (!result.valid) {
      console.log('    Debug: errors =', result.errors);
    }
    return result.valid === true;
  });

  await test('Unknown fields are included in hash (forward compatible)', () => {
    // Unknown fields ARE included in canonicalization - this is correct
    // The prover must hash the exact request it received
    const requestWithoutUnknown = {
      requestId: requestWithUnknownFields.requestId,
      audience: requestWithUnknownFields.audience,
      nonce: requestWithUnknownFields.nonce,
      requiredPermissions: requestWithUnknownFields.requiredPermissions,
      issuedAt: requestWithUnknownFields.issuedAt,
      expiresAt: requestWithUnknownFields.expiresAt,
      protocolVersion: requestWithUnknownFields.protocolVersion,
    };
    const hashWithUnknown = sha256Hex(canonicalJson(requestWithUnknownFields));
    const hashWithoutUnknown = sha256Hex(canonicalJson(requestWithoutUnknown));
    // Hashes differ because unknown fields are included
    return hashWithUnknown !== hashWithoutUnknown;
  });

  console.log('');
  console.log('=== Unknown Evidence Types ===');
  console.log('');

  const registry = getAdapterRegistry();

  await test('Unknown evidence type has no handler', () => {
    return registry.getEvidenceHandler('future-zk-snark') === undefined;
  });

  await test('Known evidence types have handlers', () => {
    return registry.hasEvidenceHandler('vc') && 
           registry.hasEvidenceHandler('zk') && 
           registry.hasEvidenceHandler('onchain');
  });

  await test('Deck permission with unknown evidence type fails cleanly', () => {
    const store = getDeckStore();
    const instance = store.create({
      deckId: 'agility:kyc:v1',
      ownerDid: 'did:test:user',
    });

    // Add source with unknown type
    store.updateSources(instance.instanceId, {
      'agility:kyc:age_over_18': {
        type: 'future-quantum-proof',
        ref: 'qp:12345',
      },
    });

    const updated = store.get(instance.instanceId)!;
    const result = canSatisfyPermission(updated, 'agility:kyc:age_over_18');
    
    // Should fail because evidence type doesn't match required 'zk'
    return result.ok === false;
  });

  console.log('');
  console.log('=== Unknown Permission IDs ===');
  console.log('');

  await test('Unknown permission ID in non-strict mode is allowed in deck', () => {
    const store = getDeckStore();
    const instance = store.create({
      deckId: 'agility:kyc:v1',
      ownerDid: 'did:test:user2',
    });

    // Add source for unknown permission
    store.updateSources(instance.instanceId, {
      'future:permission:quantum_verified': {
        type: 'vc',
        ref: 'vc:12345',
        metadata: { issuer: 'did:test:issuer' },
      },
    });

    const updated = store.get(instance.instanceId)!;
    // Should have the source even though permission is unknown
    return updated.sources['future:permission:quantum_verified'] !== undefined;
  });

  await test('Verification accepts proof with extra satisfied permissions', async () => {
    const request2 = {
      requestId: '550e8400-e29b-41d4-a716-446655440002',
      audience: 'test.app',
      nonce: 'xyz789xyz789xyz789xyz789xyz789xyz789',
      requiredPermissions: ['perm:a'],
      issuedAt: nowIso,
      expiresAt: futureIso,
      version: '0.1' as const,
      protocolVersion: '1.0',
    };

    const proof2 = {
      proofId: '660e8400-e29b-41d4-a716-446655440002',
      prover: { type: 'local' as const, id: 'did:test:prover2' },
      audience: 'test.app',
      nonce: 'xyz789xyz789xyz789xyz789xyz789xyz789',
      requestId: '550e8400-e29b-41d4-a716-446655440002',
      satisfiedPermissions: ['perm:a', 'perm:b', 'perm:c'], // Extra permissions
      verified: true,
      proof: {},
      version: '0.1' as const,
      binding: {
        requestHash: sha256Hex(canonicalJson(request2)),
      },
      issuedAt: nowIso,
      expiresAt: futureIso,
    };

    const result = protocol.verify(request2 as any, proof2 as any);
    return result.valid === true;
  });

  console.log('');
  console.log('=== DID Resolution ===');
  console.log('');

  await test('did:key resolves successfully', async () => {
    const result = await resolveDid('did:key:z6MkTest123');
    return result.didDocument !== null && result.didDocument.id === 'did:key:z6MkTest123';
  });

  await test('Pairwise DID resolves locally', async () => {
    const result = await resolveDid('did:agility:pairwise:abc123def456');
    return result.didDocument !== null && 
           result.didDocument.id === 'did:agility:pairwise:abc123def456' &&
           result.didDocument._localOnly === true;
  });

  await test('Unknown DID method fails cleanly', async () => {
    const result = await resolveDid('did:unknown:xyz');
    return result.didDocument === null && 
           result.didResolutionMetadata.error === 'methodNotSupported';
  });

  await test('Invalid DID format fails cleanly', async () => {
    const result = await resolveDid('not-a-did');
    return result.didDocument === null && 
           result.didResolutionMetadata.error === 'invalidDid';
  });

  console.log('');
  console.log('=== Adapter Registry ===');
  console.log('');

  await test('Chain verifiers are registered by default', () => {
    return registry.hasChainVerifier('xrpl') && registry.hasChainVerifier('cardano');
  });

  await test('DID resolvers are registered by default', () => {
    const didRegistry = getDidResolverRegistry();
    return didRegistry.hasResolver('key') && didRegistry.hasResolver('agility');
  });

  await test('Registry can be extended with custom verifier', () => {
    registry.registerChainVerifier('custom-chain', {
      async verify() {
        return { valid: true, meta: { custom: true } };
      },
    });
    return registry.hasChainVerifier('custom-chain');
  });

  await test('Custom verifier can be retrieved and used', async () => {
    const verifier = registry.getChainVerifier('custom-chain');
    if (!verifier) return false;
    const result = await verifier.verify({} as any, 'hash');
    return result.valid === true && result.meta?.custom === true;
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
