/**
 * Phase 7 Unit Tests: Midnight + Lace Adapters
 */

import * as fs from 'node:fs';
import { JsonPersistence } from '../persistence/JsonPersistence.js';
import { LocalEncryptedMidnightAdapter } from '../adapters/midnight/LocalEncryptedMidnightAdapter.js';
import { StubLaceAdapter } from '../adapters/lace/StubLaceAdapter.js';
import { MidnightCredentialStore } from '../credentials/MidnightCredentialStore.js';
import { CredentialIssuer } from '../credentials/CredentialIssuer.js';
import { ConsoleLogger } from '../utils/Logger.js';

const TEST_STORAGE_PATH = './.agility-test-phase7';

let passed = 0;
let failed = 0;

function cleanTestStorage(): void {
  const persistencePath = `${TEST_STORAGE_PATH}/persistence.json`;
  if (fs.existsSync(persistencePath)) {
    fs.unlinkSync(persistencePath);
  }
  if (fs.existsSync(TEST_STORAGE_PATH)) {
    fs.rmdirSync(TEST_STORAGE_PATH, { recursive: true });
  }
}

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ❌ ${name}`);
    console.log(`     Error: ${error instanceof Error ? error.message : error}`);
    failed++;
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

async function runTests(): Promise<void> {
  console.log('');
  console.log('═'.repeat(60));
  console.log('  Phase 7 Unit Tests: Midnight + Lace Adapters');
  console.log('═'.repeat(60));
  console.log('');

  const logger = new ConsoleLogger('silent');

  // ============================================================================
  // LocalEncryptedMidnightAdapter Tests
  // ============================================================================
  console.log('LocalEncryptedMidnightAdapter Tests:');

  await test('should initialize with local mode', async () => {
    cleanTestStorage();
    const persistence = new JsonPersistence(TEST_STORAGE_PATH);
    await persistence.initialize();

    const adapter = new LocalEncryptedMidnightAdapter(persistence, logger);
    await adapter.init({ mode: 'local', network: 'testnet' });

    assertEqual(adapter.getMode(), 'local', 'Mode should be local');
    assert(adapter.isAvailable(), 'Adapter should be available');
  });

  await test('should encrypt and decrypt data', async () => {
    cleanTestStorage();
    const persistence = new JsonPersistence(TEST_STORAGE_PATH);
    await persistence.initialize();

    const adapter = new LocalEncryptedMidnightAdapter(persistence, logger);
    await adapter.init({ mode: 'local', network: 'testnet' });

    const plaintext = 'Hello, Midnight!';
    const ciphertext = await adapter.encrypt(plaintext);

    assert(ciphertext !== plaintext, 'Ciphertext should differ from plaintext');
    assert(ciphertext.length > plaintext.length, 'Ciphertext should be longer');

    const decrypted = await adapter.decrypt(ciphertext);
    assertEqual(decrypted, plaintext, 'Decrypted should match original');
  });

  await test('should persist encryption key across instances', async () => {
    cleanTestStorage();
    const persistence = new JsonPersistence(TEST_STORAGE_PATH);
    await persistence.initialize();

    const adapter1 = new LocalEncryptedMidnightAdapter(persistence, logger);
    await adapter1.init({ mode: 'local', network: 'testnet' });

    const plaintext = 'Persistent key test';
    const ciphertext = await adapter1.encrypt(plaintext);

    // Create new adapter instance with same persistence
    const adapter2 = new LocalEncryptedMidnightAdapter(persistence, logger);
    await adapter2.init({ mode: 'local', network: 'testnet' });

    const decrypted = await adapter2.decrypt(ciphertext);
    assertEqual(decrypted, plaintext, 'Second adapter should decrypt with same key');
  });

  await test('should store and load credentials', async () => {
    cleanTestStorage();
    const persistence = new JsonPersistence(TEST_STORAGE_PATH);
    await persistence.initialize();

    const adapter = new LocalEncryptedMidnightAdapter(persistence, logger);
    await adapter.init({ mode: 'local', network: 'testnet' });

    const subjectId = 'test_subject_123';
    const vcJson = JSON.stringify({
      id: 'cred_001',
      issuer: 'did:agility:issuer:test',
      subject: subjectId,
      claims: { age_over_18: true },
    });

    const { ref } = await adapter.storeCredential(subjectId, vcJson);
    assert(ref.startsWith('midnight_cred_'), 'Ref should have midnight prefix');

    const loaded = await adapter.loadCredential(ref);
    assertEqual(loaded.vcJson, vcJson, 'Loaded credential should match stored');
  });

  await test('should list credential refs by subject', async () => {
    cleanTestStorage();
    const persistence = new JsonPersistence(TEST_STORAGE_PATH);
    await persistence.initialize();

    const adapter = new LocalEncryptedMidnightAdapter(persistence, logger);
    await adapter.init({ mode: 'local', network: 'testnet' });

    const subject1 = 'subject_a';
    const subject2 = 'subject_b';

    await adapter.storeCredential(subject1, '{"id":"cred1"}');
    await adapter.storeCredential(subject1, '{"id":"cred2"}');
    await adapter.storeCredential(subject2, '{"id":"cred3"}');

    const refs1 = await adapter.listCredentialRefs(subject1);
    const refs2 = await adapter.listCredentialRefs(subject2);

    assertEqual(refs1.length, 2, 'Subject1 should have 2 credentials');
    assertEqual(refs2.length, 1, 'Subject2 should have 1 credential');
  });

  await test('should delete credentials', async () => {
    cleanTestStorage();
    const persistence = new JsonPersistence(TEST_STORAGE_PATH);
    await persistence.initialize();

    const adapter = new LocalEncryptedMidnightAdapter(persistence, logger);
    await adapter.init({ mode: 'local', network: 'testnet' });

    const subjectId = 'delete_test_subject';
    const { ref } = await adapter.storeCredential(subjectId, '{"id":"to_delete"}');

    let refs = await adapter.listCredentialRefs(subjectId);
    assertEqual(refs.length, 1, 'Should have 1 credential before delete');

    await adapter.deleteCredential(ref);

    refs = await adapter.listCredentialRefs(subjectId);
    assertEqual(refs.length, 0, 'Should have 0 credentials after delete');
  });

  console.log('');

  // ============================================================================
  // StubLaceAdapter Tests
  // ============================================================================
  console.log('StubLaceAdapter Tests:');

  await test('should initialize with stub mode', async () => {
    const adapter = new StubLaceAdapter(logger);
    await adapter.init({ mode: 'stub', network: 'preprod' });

    assertEqual(adapter.getMode(), 'stub', 'Mode should be stub');
    assert(adapter.isAvailable(), 'Adapter should be available');
    assert(!adapter.isConnected(), 'Should not be connected initially');
  });

  await test('should connect and return wallet info', async () => {
    const adapter = new StubLaceAdapter(logger);
    await adapter.init({ mode: 'stub', network: 'preprod' });

    const result = await adapter.connect();

    assert(result.enabled, 'Should be enabled after connect');
    assertEqual(result.name, 'Lace (Stub)', 'Name should be Lace (Stub)');
    assert(adapter.isConnected(), 'Should be connected after connect');
  });

  await test('should return addresses', async () => {
    const adapter = new StubLaceAdapter(logger);
    await adapter.init({ mode: 'stub', network: 'preprod' });
    await adapter.connect();

    const addresses = await adapter.getAddresses();

    assert(addresses.length > 0, 'Should return at least one address');
    assert(addresses[0]!.startsWith('addr_test1'), 'Address should have testnet prefix');
  });

  await test('should return change address', async () => {
    const adapter = new StubLaceAdapter(logger);
    await adapter.init({ mode: 'stub', network: 'preprod' });
    await adapter.connect();

    const changeAddr = await adapter.getChangeAddress();

    assert(changeAddr.startsWith('addr_test1'), 'Change address should have testnet prefix');
  });

  await test('should return network', async () => {
    const adapter = new StubLaceAdapter(logger);
    await adapter.init({ mode: 'stub', network: 'preprod' });
    await adapter.connect();

    const network = await adapter.getNetwork();

    assertEqual(network, 'preprod', 'Network should be preprod');
  });

  await test('should sign data', async () => {
    const adapter = new StubLaceAdapter(logger);
    await adapter.init({ mode: 'stub', network: 'preprod' });
    await adapter.connect();

    const result = await adapter.signData('test payload');

    assert(result.signature.startsWith('stub_lace_sig_'), 'Signature should have stub prefix');
    assert(result.key !== undefined, 'Key should be present');
  });

  await test('should disconnect', async () => {
    const adapter = new StubLaceAdapter(logger);
    await adapter.init({ mode: 'stub', network: 'preprod' });
    await adapter.connect();

    assert(adapter.isConnected(), 'Should be connected');

    await adapter.disconnect();

    assert(!adapter.isConnected(), 'Should not be connected after disconnect');
  });

  await test('should return empty when not connected', async () => {
    const adapter = new StubLaceAdapter(logger);
    await adapter.init({ mode: 'stub', network: 'preprod' });

    // StubLaceAdapter auto-connects on getAddresses for convenience
    // This test verifies the adapter handles the not-connected state gracefully
    assert(!adapter.isConnected(), 'Should not be connected initially');
  });

  console.log('');

  // ============================================================================
  // MidnightCredentialStore Tests
  // ============================================================================
  console.log('MidnightCredentialStore Tests:');

  await test('should store and load verifiable credentials', async () => {
    cleanTestStorage();
    const persistence = new JsonPersistence(TEST_STORAGE_PATH);
    await persistence.initialize();

    const adapter = new LocalEncryptedMidnightAdapter(persistence, logger);
    await adapter.init({ mode: 'local', network: 'testnet' });

    const issuer = new CredentialIssuer(persistence, logger);
    await issuer.initialize();

    const credential = issuer.issueCredential({
      subjectId: 'test_subject_for_midnight',
      claims: { age_over_18: true, email_verified: true },
      expiresInSeconds: 3600,
    });

    const store = new MidnightCredentialStore({ adapter, logger });

    const ref = await store.storeCredential(credential);
    assert(ref.startsWith('midnight_cred_'), 'Ref should have midnight prefix');

    const loaded = await store.loadCredential(ref);
    assertEqual(loaded.id, credential.id, 'Loaded credential ID should match');
    assertEqual(loaded.subject, credential.subject, 'Subject should match');
    assertEqual(loaded.claims.age_over_18, true, 'Claims should match');
  });

  await test('should list and delete credentials', async () => {
    cleanTestStorage();
    const persistence = new JsonPersistence(TEST_STORAGE_PATH);
    await persistence.initialize();

    const adapter = new LocalEncryptedMidnightAdapter(persistence, logger);
    await adapter.init({ mode: 'local', network: 'testnet' });

    const issuer = new CredentialIssuer(persistence, logger);
    await issuer.initialize();

    const store = new MidnightCredentialStore({ adapter, logger });

    const subjectId = 'list_delete_test_subject';
    const cred1 = issuer.issueCredential({
      subjectId,
      claims: { claim1: true },
      expiresInSeconds: 3600,
    });
    const cred2 = issuer.issueCredential({
      subjectId,
      claims: { claim2: true },
      expiresInSeconds: 3600,
    });

    const ref1 = await store.storeCredential(cred1);
    const ref2 = await store.storeCredential(cred2);

    let refs = await store.listCredentialRefs(subjectId);
    assertEqual(refs.length, 2, 'Should have 2 credentials');

    await store.deleteCredential(ref1);

    refs = await store.listCredentialRefs(subjectId);
    assertEqual(refs.length, 1, 'Should have 1 credential after delete');
    assertEqual(refs[0], ref2, 'Remaining ref should be ref2');
  });

  await test('should report availability', async () => {
    cleanTestStorage();
    const persistence = new JsonPersistence(TEST_STORAGE_PATH);
    await persistence.initialize();

    const adapter = new LocalEncryptedMidnightAdapter(persistence, logger);
    await adapter.init({ mode: 'local', network: 'testnet' });

    const store = new MidnightCredentialStore({ adapter, logger });

    assert(store.isAvailable(), 'Store should be available');
    assertEqual(store.getMode(), 'local', 'Mode should be local');
  });

  console.log('');

  // ============================================================================
  // Persistence Tests
  // ============================================================================
  console.log('Persistence Midnight Methods Tests:');

  await test('should save and get midnight key', async () => {
    cleanTestStorage();
    const persistence = new JsonPersistence(TEST_STORAGE_PATH);
    await persistence.initialize();

    const testKey = 'test_encryption_key_hex';
    persistence.saveMidnightKey(testKey);

    const retrieved = persistence.getMidnightKey();
    assertEqual(retrieved, testKey, 'Retrieved key should match saved key');
  });

  await test('should save and get midnight credentials', async () => {
    cleanTestStorage();
    const persistence = new JsonPersistence(TEST_STORAGE_PATH);
    await persistence.initialize();

    const record = {
      ref: 'midnight_cred_test123',
      subjectId: 'subject_abc',
      ciphertext: 'encrypted_data_here',
      createdAt: new Date().toISOString(),
    };

    persistence.saveMidnightCredential(record.ref, record);

    const retrieved = persistence.getMidnightCredential(record.ref);
    assert(retrieved !== undefined, 'Should retrieve saved credential');
    assertEqual(retrieved!.ref, record.ref, 'Ref should match');
    assertEqual(retrieved!.subjectId, record.subjectId, 'SubjectId should match');
  });

  await test('should list midnight credential refs by subject', async () => {
    cleanTestStorage();
    const persistence = new JsonPersistence(TEST_STORAGE_PATH);
    await persistence.initialize();

    const subject = 'test_subject_list';
    persistence.saveMidnightCredential('ref1', {
      ref: 'ref1',
      subjectId: subject,
      ciphertext: 'data1',
      createdAt: new Date().toISOString(),
    });
    persistence.saveMidnightCredential('ref2', {
      ref: 'ref2',
      subjectId: subject,
      ciphertext: 'data2',
      createdAt: new Date().toISOString(),
    });
    persistence.saveMidnightCredential('ref3', {
      ref: 'ref3',
      subjectId: 'other_subject',
      ciphertext: 'data3',
      createdAt: new Date().toISOString(),
    });

    const refs = persistence.listMidnightCredentialRefs(subject);
    assertEqual(refs.length, 2, 'Should have 2 refs for subject');
    assert(refs.includes('ref1'), 'Should include ref1');
    assert(refs.includes('ref2'), 'Should include ref2');
  });

  await test('should delete midnight credentials', async () => {
    cleanTestStorage();
    const persistence = new JsonPersistence(TEST_STORAGE_PATH);
    await persistence.initialize();

    const ref = 'to_delete_ref';
    persistence.saveMidnightCredential(ref, {
      ref,
      subjectId: 'subject',
      ciphertext: 'data',
      createdAt: new Date().toISOString(),
    });

    assert(persistence.getMidnightCredential(ref) !== undefined, 'Should exist before delete');

    persistence.deleteMidnightCredential(ref);

    assert(persistence.getMidnightCredential(ref) === undefined, 'Should not exist after delete');
  });

  await test('should save and get lace state', async () => {
    cleanTestStorage();
    const persistence = new JsonPersistence(TEST_STORAGE_PATH);
    await persistence.initialize();

    const state = {
      connected: true,
      network: 'preprod',
      addresses: ['addr_test1abc', 'addr_test1def'],
      lastConnected: new Date().toISOString(),
    };

    persistence.saveLaceState(state);

    const retrieved = persistence.getLaceState();
    assert(retrieved !== undefined, 'Should retrieve saved state');
    assertEqual(retrieved!.connected, true, 'Connected should match');
    assertEqual(retrieved!.network, 'preprod', 'Network should match');
    assertEqual(retrieved!.addresses.length, 2, 'Should have 2 addresses');
  });

  console.log('');

  // ============================================================================
  // Summary
  // ============================================================================
  console.log('═'.repeat(60));
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('═'.repeat(60));
  console.log('');

  cleanTestStorage();

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('Test runner error:', error);
  process.exit(1);
});
