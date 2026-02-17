import * as fs from 'node:fs';
import { JsonPersistence } from '../persistence/JsonPersistence.js';
import { CredentialIssuer } from '../credentials/CredentialIssuer.js';
import { CredentialStore } from '../credentials/CredentialStore.js';
import { CredentialAnchor } from '../credentials/CredentialAnchor.js';
import { LocalProver } from '../prover/LocalProver.js';
import { ProofProtocol } from '../protocol/ProofProtocol.js';
import {
  validateVerifiableCredential,
  extractClaimPermissions,
} from '../credentials/VerifiableCredential.js';
import type { VerifiableCredential, CredentialClaims } from '../credentials/VerifiableCredential.js';

const TEST_DIR = './.agility-test-credentials';

async function cleanTestStorage(): Promise<void> {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
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
  const persistence = new JsonPersistence(TEST_DIR);
  await persistence.initialize();

  console.log('');
  console.log('=== Phase 6: Verifiable Credentials Tests ===');
  console.log('');

  console.log('--- VerifiableCredential Schema ---');

  await test('validates a well-formed credential', async () => {
    const credential: VerifiableCredential = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      issuer: 'did:agility:issuer123',
      subject: 'did:agility:subject456',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      claims: {
        age_over_18: true,
        email_verified: true,
      },
      proof: {
        type: 'Ed25519Signature2020',
        created: new Date().toISOString(),
        verificationMethod: 'did:agility:issuer123#key-1',
        signature: 'agility_vc_sig_abc123',
      },
      version: '0.1',
    };

    const validated = validateVerifiableCredential(credential);
    return validated.id === credential.id && validated.issuer === credential.issuer;
  });

  await test('extracts claim permissions from claims', async () => {
    const claims: CredentialClaims = {
      age_over_18: true,
      email_verified: true,
      faction_member: 'dragon',
      score: 100,
      inactive: false,
    };

    const permissions = extractClaimPermissions(claims);
    return (
      permissions.includes('age_over_18') &&
      permissions.includes('email_verified') &&
      permissions.includes('faction_member') &&
      permissions.includes('score') &&
      !permissions.includes('inactive')
    );
  });

  console.log('');
  console.log('--- CredentialIssuer ---');

  await test('initializes and generates issuer keys', async () => {
    const issuer = new CredentialIssuer(persistence);
    await issuer.initialize();

    const keyInfo = issuer.getKeyInfo();
    return keyInfo !== null && keyInfo.issuerId.startsWith('did:agility:issuer:');
  });

  await test('issues a credential with valid signature', async () => {
    const issuer = new CredentialIssuer(persistence);
    await issuer.initialize();

    const credential = issuer.issueCredential({
      subjectId: 'did:agility:test_subject',
      claims: {
        age_over_18: true,
        email_verified: true,
      },
      expiresInSeconds: 3600,
    });

    return (
      credential.id !== undefined &&
      credential.issuer.startsWith('did:agility:issuer:') &&
      credential.subject === 'did:agility:test_subject' &&
      credential.claims.age_over_18 === true &&
      credential.proof.signature.startsWith('agility_vc_sig_')
    );
  });

  await test('verifies its own credential signature', async () => {
    const issuer = new CredentialIssuer(persistence);
    await issuer.initialize();

    const credential = issuer.issueCredential({
      subjectId: 'did:agility:test_subject',
      claims: { test_claim: true },
    });

    return issuer.verifyCredentialSignature(credential);
  });

  await test('detects tampered credentials', async () => {
    const issuer = new CredentialIssuer(persistence);
    await issuer.initialize();

    const credential = issuer.issueCredential({
      subjectId: 'did:agility:test_subject',
      claims: { test_claim: true },
    });

    const tampered = { ...credential, claims: { test_claim: false } };
    return !issuer.verifyCredentialSignature(tampered);
  });

  console.log('');
  console.log('--- CredentialStore ---');

  await cleanTestStorage();
  const persistence2 = new JsonPersistence(TEST_DIR);
  await persistence2.initialize();

  await test('saves and retrieves credentials', async () => {
    const issuer = new CredentialIssuer(persistence2);
    await issuer.initialize();

    const credential = issuer.issueCredential({
      subjectId: 'did:agility:test_subject',
      claims: { age_over_18: true },
    });

    const store = new CredentialStore(persistence2);
    store.saveCredential(credential);

    const retrieved = store.getCredential(credential.id);
    return retrieved !== null && retrieved !== undefined && retrieved.id === credential.id;
  });

  await test('lists all credentials', async () => {
    const issuer = new CredentialIssuer(persistence2);
    await issuer.initialize();

    const store = new CredentialStore(persistence2);

    const cred1 = issuer.issueCredential({
      subjectId: 'subject1',
      claims: { claim1: true },
    });
    const cred2 = issuer.issueCredential({
      subjectId: 'subject2',
      claims: { claim2: true },
    });

    store.saveCredential(cred1);
    store.saveCredential(cred2);

    const all = store.getAllCredentials();
    return all.length >= 2;
  });

  await test('finds credentials by subject', async () => {
    const issuer = new CredentialIssuer(persistence2);
    await issuer.initialize();

    const store = new CredentialStore(persistence2);

    const cred1 = issuer.issueCredential({
      subjectId: 'unique_target_subject',
      claims: { claim1: true },
    });

    store.saveCredential(cred1);

    const found = store.getCredentialsBySubject('unique_target_subject');
    return found.length === 1 && found[0]?.subject === 'unique_target_subject';
  });

  console.log('');
  console.log('--- CredentialAnchor ---');

  await cleanTestStorage();
  const persistence3 = new JsonPersistence(TEST_DIR);
  await persistence3.initialize();

  await test('anchors a credential and retrieves the anchor', async () => {
    const issuer = new CredentialIssuer(persistence3);
    await issuer.initialize();

    const credential = issuer.issueCredential({
      subjectId: 'test_subject',
      claims: { anchored: true },
    });

    const anchorModule = new CredentialAnchor(persistence3, { network: 'testnet' });
    const result = await anchorModule.anchorCredential(credential);

    const retrieved = anchorModule.getAnchor(credential.id);
    return (
      result.credentialId === credential.id &&
      result.txHash !== undefined &&
      result.network === 'testnet' &&
      retrieved !== null &&
      retrieved.txHash === result.txHash
    );
  });

  await test('verifies anchor integrity', async () => {
    const issuer = new CredentialIssuer(persistence3);
    await issuer.initialize();

    const credential = issuer.issueCredential({
      subjectId: 'test_subject_verify',
      claims: { verified: true },
    });

    const anchorModule = new CredentialAnchor(persistence3, { network: 'testnet' });
    const result = await anchorModule.anchorCredential(credential);

    return anchorModule.verifyAnchor(credential, result);
  });

  await test('detects tampered credential in anchor verification', async () => {
    const issuer = new CredentialIssuer(persistence3);
    await issuer.initialize();

    const credential = issuer.issueCredential({
      subjectId: 'test_subject_tamper',
      claims: { original: true },
    });

    const anchorModule = new CredentialAnchor(persistence3, { network: 'testnet' });
    const result = await anchorModule.anchorCredential(credential);

    const tampered = { ...credential, claims: { original: false } };
    return !anchorModule.verifyAnchor(tampered, result);
  });

  console.log('');
  console.log('--- Credential-based Proof Generation ---');

  await cleanTestStorage();
  const persistence4 = new JsonPersistence(TEST_DIR);
  await persistence4.initialize();

  await test('generates proof from credential', async () => {
    const issuer = new CredentialIssuer(persistence4);
    await issuer.initialize();

    const prover = new LocalProver(persistence4);
    await prover.initialize();

    const proverInfo = prover.getKeyInfo();
    const credential = issuer.issueCredential({
      subjectId: proverInfo!.rootId,
      claims: {
        age_over_18: true,
        email_verified: true,
      },
    });

    const protocol = new ProofProtocol(persistence4);
    const request = await protocol.createRequest({
      audience: 'test_app',
      requiredPermissions: ['age_over_18', 'email_verified'],
      ttlSeconds: 300,
    });

    const grant = prover.createConsentGrant(request);
    const proof = prover.generateProofFromCredential(request, credential, grant);

    return (
      proof.proofId !== undefined &&
      proof.verified === true &&
      proof.binding.credentialId === credential.id &&
      proof.binding.credentialHash !== undefined &&
      proof.satisfiedPermissions.includes('age_over_18') &&
      proof.satisfiedPermissions.includes('email_verified')
    );
  });

  await test('rejects proof if credential missing required claims', async () => {
    const issuer = new CredentialIssuer(persistence4);
    await issuer.initialize();

    const prover = new LocalProver(persistence4);
    await prover.initialize();

    const proverInfo = prover.getKeyInfo();
    const credential = issuer.issueCredential({
      subjectId: proverInfo!.rootId,
      claims: {
        age_over_18: true,
      },
    });

    const protocol = new ProofProtocol(persistence4);
    const request = await protocol.createRequest({
      audience: 'test_app_reject',
      requiredPermissions: ['age_over_18', 'email_verified'],
      ttlSeconds: 300,
    });

    const grant = prover.createConsentGrant(request);

    try {
      prover.generateProofFromCredential(request, credential, grant);
      return false;
    } catch (e) {
      return e instanceof Error && e.message.toLowerCase().includes('missing');
    }
  });

  console.log('');
  console.log('--- Credential-based Proof Verification ---');

  await cleanTestStorage();
  const persistence5 = new JsonPersistence(TEST_DIR);
  await persistence5.initialize();

  await test('verifies credential-based proof', async () => {
    const issuer = new CredentialIssuer(persistence5);
    await issuer.initialize();

    const prover = new LocalProver(persistence5);
    await prover.initialize();

    const proverInfo = prover.getKeyInfo();
    const credential = issuer.issueCredential({
      subjectId: proverInfo!.rootId,
      claims: {
        age_over_18: true,
        email_verified: true,
      },
    });

    const protocol = new ProofProtocol(persistence5);
    const request = await protocol.createRequest({
      audience: 'test_app_verify',
      requiredPermissions: ['age_over_18', 'email_verified'],
      ttlSeconds: 300,
    });

    const grant = prover.createConsentGrant(request);
    const proof = prover.generateProofFromCredential(request, credential, grant);

    const result = protocol.verifyCredentialProof(request, proof, credential, grant);

    return (
      result.valid === true &&
      result.checks.credentialValid === true &&
      result.checks.credentialSignatureValid === true &&
      result.checks.credentialClaimsValid === true
    );
  });

  await test('detects expired credential in verification', async () => {
    const issuer = new CredentialIssuer(persistence5);
    await issuer.initialize();

    const prover = new LocalProver(persistence5);
    await prover.initialize();

    const proverInfo = prover.getKeyInfo();
    const credential = issuer.issueCredential({
      subjectId: proverInfo!.rootId,
      claims: { age_over_18: true },
      expiresInSeconds: 3600,
    });

    const protocol = new ProofProtocol(persistence5);
    const request = await protocol.createRequest({
      audience: 'test_app_expired',
      requiredPermissions: ['age_over_18'],
      ttlSeconds: 300,
    });

    const grant = prover.createConsentGrant(request);
    const proof = prover.generateProofFromCredential(request, credential, grant);

    const expiredCredential = {
      ...credential,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    };

    const result = protocol.verifyCredentialProof(request, proof, expiredCredential, grant);

    return result.valid === false && result.errors.some((e) => e.includes('expired'));
  });

  console.log('');
  console.log('=== Test Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('');

  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});
