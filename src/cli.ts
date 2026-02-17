#!/usr/bin/env node

import * as fs from 'node:fs';
import { AgilityHeadless } from './AgilityHeadless.js';
import { ChecksPipeline } from './cli/checks.js';
import { loadEnvConfig, validateRealModeConfig, validateXamanConfig, printConfigSummary } from './config/env.js';
import type { AgilityMode } from './config/env.js';
import type { ProofRequest as LegacyProofRequest } from './types/ProofRequest.js';
import { ProofProtocol } from './protocol/ProofProtocol.js';
import { JsonPersistence } from './persistence/JsonPersistence.js';
import { validateProofRequest, validateProofResponse, validateConsentGrant } from './schemas/index.js';
import type { ProofRequest, ProofResponse, ConsentGrant } from './schemas/index.js';
import { ConsoleLogger } from './utils/Logger.js';
import { LocalProver } from './prover/LocalProver.js';
import type { SignerProvider } from './signers/SignerProvider.js';
import { XamanSigner } from './signers/XamanSigner.js';
import { CredentialIssuer } from './credentials/CredentialIssuer.js';
import { CredentialStore } from './credentials/CredentialStore.js';
import { MidnightCredentialStore } from './credentials/MidnightCredentialStore.js';
import type { VerifiableCredential, CredentialClaims } from './credentials/VerifiableCredential.js';
import { LocalEncryptedMidnightAdapter } from './adapters/midnight/LocalEncryptedMidnightAdapter.js';
import type { MidnightStorageConfig } from './adapters/midnight/IMidnightAdapter.js';
import { MidnightHealthCheck } from './adapters/midnight/MidnightHealthCheck.js';
import type { MidnightEnvironment } from './config/networkPresets.js';
import { StubLaceAdapter } from './adapters/lace/StubLaceAdapter.js';
import type { LaceConfig } from './adapters/lace/ILaceAdapter.js';

type SignerType = 'local' | 'xaman';
type MidnightMode = 'local' | 'sdk';
type LaceMode = 'stub' | 'browser';

interface ParsedArgs {
  command: string;
  xrpl?: string;
  midnight?: string;
  name?: string;
  perm?: string;
  req?: string;
  app?: string;
  mode?: AgilityMode;
  receipt?: string;
  proof?: string;
  request?: string;
  grant?: string;
  audience?: string;
  ttl?: number;
  out?: string;
  signer?: SignerType;
  subject?: string;
  claim?: string[];
  credential?: string;
  credentialRef?: string;
  credStore?: 'local' | 'midnight';
  midnightMode?: MidnightMode;
  laceMode?: LaceMode;
  in?: string;
  ref?: string;
  data?: string;
  debug: boolean;
}

function checkUNCPath(): void {
  const cwd = process.cwd();
  if (cwd.startsWith('\\\\') || cwd.startsWith('C:\\Windows')) {
    console.error('');
    console.error('❌ ERROR: UNC paths are not supported.');
    console.error('');
    console.error('You are running from a Windows context with a WSL path.');
    console.error('Please run from within WSL or use the wrapper command:');
    console.error('');
    console.error('  wsl -e bash -c "cd /home/anthony/CascadeProjects/Windsurf-Porject/agility-headless && npm run cli -- <args>"');
    console.error('');
    console.error('Or use the PowerShell helper script:');
    console.error('');
    console.error('  .\\scripts\\run-wsl.ps1 run --xrpl rTEST --midnight mTEST --debug');
    console.error('');
    process.exit(1);
  }
}

function parseArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = {
    command: '',
    debug: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i]!;

    if (arg === '--debug' || arg === '-d') {
      result.debug = true;
    } else if (arg === '--xrpl' && args[i + 1]) {
      result.xrpl = args[++i];
    } else if (arg === '--midnight' && args[i + 1]) {
      result.midnight = args[++i];
    } else if (arg === '--name' && args[i + 1]) {
      result.name = args[++i];
    } else if (arg === '--perm' && args[i + 1]) {
      result.perm = args[++i];
    } else if (arg === '--req' && args[i + 1]) {
      result.req = args[++i];
    } else if (arg === '--app' && args[i + 1]) {
      result.app = args[++i];
    } else if (arg === '--mode' && args[i + 1]) {
      const modeVal = args[++i];
      if (modeVal === 'mock' || modeVal === 'real') {
        result.mode = modeVal;
      }
    } else if (arg === '--receipt' && args[i + 1]) {
      result.receipt = args[++i];
    } else if (arg === '--proof' && args[i + 1]) {
      result.proof = args[++i];
    } else if (arg === '--request' && args[i + 1]) {
      result.request = args[++i];
    } else if (arg === '--grant' && args[i + 1]) {
      result.grant = args[++i];
    } else if (arg === '--audience' && args[i + 1]) {
      result.audience = args[++i];
    } else if (arg === '--ttl' && args[i + 1]) {
      result.ttl = parseInt(args[++i]!, 10);
    } else if (arg === '--out' && args[i + 1]) {
      result.out = args[++i];
    } else if (arg === '--signer' && args[i + 1]) {
      const signerVal = args[++i];
      if (signerVal === 'local' || signerVal === 'xaman') {
        result.signer = signerVal;
      }
    } else if (arg === '--subject' && args[i + 1]) {
      result.subject = args[++i];
    } else if (arg === '--claim' && args[i + 1]) {
      if (!result.claim) result.claim = [];
      result.claim.push(args[++i]!);
    } else if (arg === '--credential' && args[i + 1]) {
      result.credential = args[++i];
    } else if (arg === '--credential-ref' && args[i + 1]) {
      result.credentialRef = args[++i];
    } else if (arg === '--cred-store' && args[i + 1]) {
      const storeVal = args[++i];
      if (storeVal === 'local' || storeVal === 'midnight') {
        result.credStore = storeVal;
      }
    } else if (arg === '--midnight-mode' && args[i + 1]) {
      const modeVal = args[++i];
      if (modeVal === 'local' || modeVal === 'sdk') {
        result.midnightMode = modeVal;
      }
    } else if (arg === '--lace-mode' && args[i + 1]) {
      const modeVal = args[++i];
      if (modeVal === 'stub' || modeVal === 'browser') {
        result.laceMode = modeVal;
      }
    } else if (arg === '--in' && args[i + 1]) {
      result.in = args[++i];
    } else if (arg === '--ref' && args[i + 1]) {
      result.ref = args[++i];
    } else if (arg === '--data' && args[i + 1]) {
      result.data = args[++i];
    } else if (!arg.startsWith('-') && !result.command) {
      result.command = arg;
    }

    i++;
  }

  return result;
}

function printHelp(): void {
  console.log(`
Agility Headless CLI

Usage:
  agility <command> [options]

Verifier Commands:
  request                 Create a new ProofRequest with nonce + expiry
  verify                  Verify a proof against a request

Prover Commands (wallet-side):
  prover init             Initialize or load prover identity keys
  prover grant            Create a ConsentGrant from a ProofRequest
  prover prove            Generate a ProofResponse with binding

Credential Commands (Phase 6):
  credential issue        Issue a new Verifiable Credential
  credential list         List all stored credentials
  credential verify       Verify a credential signature

Midnight Commands (Phase 7):
  midnight status         Check Midnight adapter status
  midnight encrypt        Encrypt data using Midnight adapter
  midnight decrypt        Decrypt data using Midnight adapter
  midnight cred put       Store credential in Midnight storage
  midnight cred list      List credential refs for a subject
  midnight cred get       Load credential from Midnight storage

Lace Commands (Phase 7):
  lace status             Check Lace adapter status
  lace connect            Connect to Lace wallet
  lace addresses          Get wallet addresses
  lace network            Get current network
  lace sign               Sign data with Lace wallet

Demo Commands:
  demo phase4             Run full Phase 4 protocol flow demo (local signer)
  demo phase5             Run full Phase 5 protocol flow demo (Xaman consent)
  demo phase6             Run full Phase 6 credential flow demo
  demo phase7             Run full Phase 7 Midnight + Lace demo

Legacy Commands:
  run                     Run the full checks pipeline
  identity:create         Create a new identity
  deck:create             Create a new permission deck
  request:simulate        Simulate a proof request (legacy)
  grant                   Create a ConsentGrant (legacy, use prover grant)
  prove                   Generate a ProofResponse (legacy, use prover prove)

Options:
  --mode <mock|real>      Adapter mode (default: mock)
                          mock = stub adapters, no real blockchain calls
                          real = real XRPL testnet transactions
  --signer <local|xaman>  Signer for ConsentGrant (default: local)
                          local = local mock signing
                          xaman = Xaman wallet consent signing
  --xrpl <address>        XRPL wallet address (mock mode)
  --midnight <address>    Midnight wallet address
  --name <name>           Deck name (for deck:create)
  --perm <p1,p2,...>      Permissions (comma-separated)
  --req <r1,r2,...>       Required permissions for proof request
  --app <appId>           Application ID
  --audience <aud>        Audience for proof request (e.g. app domain)
  --ttl <seconds>         Time-to-live for request (default: 300)
  --request <path|json>   ProofRequest file path or JSON
  --grant <path|json>     ConsentGrant file path or JSON
  --proof <path|json>     ProofResponse file path or JSON
  --credential <path>     Credential file path for credential-based proofs
  --credential-ref <ref>  Credential reference (for Midnight storage)
  --cred-store <type>     Credential store: local, midnight (default: local)
  --subject <id>          Subject ID for credential issuance
  --claim <key=value>     Claim for credential (can repeat)
  --receipt <txHash>      Transaction hash to verify
  --out <path>            Output file path for JSON
  --in <data>             Input data for encrypt/decrypt
  --ref <ref>             Reference ID for Midnight credential
  --data <data>           Data to sign (for Lace)
  --midnight-mode <mode>  Midnight mode: local, sdk (default: local)
  --lace-mode <mode>      Lace mode: stub, browser (default: stub)
  --debug, -d             Enable debug logging

Environment Variables (for real mode):
  XRPL_NETWORK            Network: mainnet, testnet, devnet (default: testnet)
  XRPL_ENDPOINT           WebSocket endpoint (optional)
  XRPL_SEED               Wallet seed (required for real mode)

Environment Variables (for Xaman signing):
  XAMAN_API_KEY           Xaman developer API key
  XAMAN_API_SECRET        Xaman developer API secret

Examples:
  # Phase 4: Verifier + Prover flow (local signer)
  npm run cli -- request --audience test_app --perm age_over_18 --out request.json
  npm run cli -- prover init
  npm run cli -- prover grant --request request.json --out grant.json
  npm run cli -- prover prove --request request.json --grant grant.json --out proof.json
  npm run cli -- verify --request request.json --proof proof.json

  # Phase 5: Xaman consent signing
  npm run cli -- prover grant --request request.json --signer xaman --out grant.json

  # Full demos:
  npm run cli -- demo phase4
  npm run cli -- demo phase5 --signer xaman

  # With real XRPL receipt:
  npm run cli -- prover prove --request request.json --grant grant.json --mode real --out proof.json
  npm run cli -- verify --request request.json --proof proof.json --receipt <txHash> --mode real

  # Phase 6: Credential-based proofs
  npm run cli -- credential issue --subject <pairwiseId> --claim age_over_18=true --out credential.json
  npm run cli -- credential list
  npm run cli -- prover prove --request request.json --grant grant.json --credential credential.json --out proof.json

  # Phase 7: Midnight storage
  npm run cli -- midnight status
  npm run cli -- midnight encrypt --in "hello world" --out ciphertext.txt
  npm run cli -- midnight decrypt --in ciphertext.txt
  npm run cli -- midnight cred put --credential credential.json --subject <subjectId>
  npm run cli -- midnight cred list --subject <subjectId>
  npm run cli -- midnight cred get --ref <ref> --out credential.from.midnight.json

  # Phase 7: Lace wallet (stub mode)
  npm run cli -- lace status
  npm run cli -- lace connect
  npm run cli -- lace addresses
  npm run cli -- lace sign --data "consent test"

  # Phase 7 demo:
  npm run cli -- demo phase7 --midnight-mode local --lace-mode stub
`);
}

async function runChecks(args: ParsedArgs): Promise<void> {
  const envConfig = loadEnvConfig({ mode: args.mode });
  
  if (args.debug) {
    printConfigSummary(envConfig, args.debug);
    console.log('');
  }

  if (envConfig.mode === 'real') {
    const validation = validateRealModeConfig(envConfig);
    if (!validation.valid) {
      console.error('❌ Configuration errors for real mode:');
      validation.errors.forEach((e) => console.error(`   - ${e}`));
      process.exit(1);
    }
  }

  if (envConfig.mode === 'mock' && (!args.xrpl || !args.midnight)) {
    console.error('Error: --xrpl and --midnight addresses are required for mock mode');
    process.exit(1);
  }

  if (!args.midnight) {
    console.error('Error: --midnight address is required');
    process.exit(1);
  }

  const xrplAddress = envConfig.mode === 'real' ? 'FROM_SEED' : args.xrpl!;

  const pipeline = new ChecksPipeline({
    xrplAddress,
    midnightAddress: args.midnight,
    debug: args.debug,
    mode: envConfig.mode,
    xrplConfig: envConfig.mode === 'real' ? {
      endpoint: envConfig.xrpl.endpoint!,
      seed: envConfig.xrpl.seed!,
    } : undefined,
  });

  const success = await pipeline.run({
    xrplAddress,
    midnightAddress: args.midnight,
    debug: args.debug,
    mode: envConfig.mode,
    xrplConfig: envConfig.mode === 'real' ? {
      endpoint: envConfig.xrpl.endpoint!,
      seed: envConfig.xrpl.seed!,
    } : undefined,
  });

  process.exit(success ? 0 : 1);
}

async function createIdentity(args: ParsedArgs): Promise<void> {
  if (!args.xrpl || !args.midnight) {
    console.error('Error: --xrpl and --midnight addresses are required');
    process.exit(1);
  }

  const agility = new AgilityHeadless({
    storagePath: './.agility-cli-data',
    debug: args.debug,
  });

  try {
    await agility.initialize();
    const identity = await agility.createIdentity(args.xrpl, args.midnight);

    console.log('');
    console.log('Identity created:');
    console.log(JSON.stringify(identity, null, 2));
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function createDeck(args: ParsedArgs): Promise<void> {
  if (!args.name) {
    console.error('Error: --name is required for deck:create');
    process.exit(1);
  }

  if (!args.perm) {
    console.error('Error: --perm is required for deck:create (comma-separated permissions)');
    process.exit(1);
  }

  const permissions = args.perm.split(',').map((p) => p.trim());

  const agility = new AgilityHeadless({
    storagePath: './.agility-cli-data',
    debug: args.debug,
  });

  try {
    await agility.initialize();
    const deck = await agility.createDeck(args.name, permissions);

    console.log('');
    console.log('Deck created:');
    console.log(JSON.stringify(deck, null, 2));
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function simulateRequest(args: ParsedArgs): Promise<void> {
  if (!args.req) {
    console.error('Error: --req is required (comma-separated required permissions)');
    process.exit(1);
  }

  if (!args.app) {
    console.error('Error: --app is required (application ID)');
    process.exit(1);
  }

  const requiredPermissions = args.req.split(',').map((p) => p.trim());

  const agility = new AgilityHeadless({
    storagePath: './.agility-cli-data',
    debug: args.debug,
  });

  try {
    await agility.initialize();

    const legacyRequest: LegacyProofRequest = {
      id: `req_${Date.now()}`,
      requesterId: 'cli_verifier',
      requesterApp: args.app,
      requiredPermissions,
      createdAt: new Date(),
    };

    console.log('');
    console.log('Proof Request:');
    console.log(JSON.stringify(legacyRequest, null, 2));
    console.log('');

    const canFulfill = await agility.canFulfillProofRequest(legacyRequest);
    console.log(`Can fulfill: ${canFulfill ? '✅ Yes' : '❌ No'}`);

    if (canFulfill) {
      const grants = await agility.getGrantsForApp(args.app);
      if (grants.length > 0) {
        const result = await agility.handleProofRequest(legacyRequest);
        console.log('');
        console.log('Proof Result:');
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log('');
        console.log('Note: No active grant for this app. Grant permission first.');
      }
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function verifyReceipt(args: ParsedArgs): Promise<void> {
  const envConfig = loadEnvConfig({ mode: args.mode });

  if (!args.receipt && !args.proof) {
    console.error('Error: --receipt <txHash> or --proof <pathOrJson> is required');
    process.exit(1);
  }

  console.log(`[Agility] Verify mode: ${envConfig.mode}`);
  console.log('');

  if (args.proof) {
    let proofData: unknown;
    try {
      if (fs.existsSync(args.proof)) {
        proofData = JSON.parse(fs.readFileSync(args.proof, 'utf-8'));
      } else {
        proofData = JSON.parse(args.proof);
      }
    } catch {
      console.error('❌ Invalid proof JSON');
      process.exit(1);
    }

    const proof = proofData as { proofId?: string; requestId?: string; satisfied?: string[]; timestamp?: string };
    
    const checks = [
      { name: 'proofId present', pass: !!proof.proofId },
      { name: 'requestId present', pass: !!proof.requestId },
      { name: 'satisfied array', pass: Array.isArray(proof.satisfied) },
      { name: 'timestamp valid', pass: !!proof.timestamp && !isNaN(Date.parse(proof.timestamp)) },
    ];

    let allPass = true;
    for (const check of checks) {
      console.log(`${check.pass ? '✅' : '❌'} ${check.name}`);
      if (!check.pass) allPass = false;
    }

    console.log('');
    console.log(allPass ? '✅ Proof schema valid' : '❌ Proof schema invalid');
    process.exit(allPass ? 0 : 1);
  }

  if (args.receipt) {
    if (envConfig.mode === 'mock') {
      console.log(`Verifying receipt: ${args.receipt}`);
      const isMockFormat = args.receipt.startsWith('XRPL_RCPT_') || args.receipt.startsWith('XRPL_TX_');
      console.log(isMockFormat ? '✅ Mock receipt format valid' : '❌ Invalid mock receipt format');
      process.exit(isMockFormat ? 0 : 1);
    } else {
      const validation = validateRealModeConfig(envConfig);
      if (!validation.valid) {
        console.error('❌ Configuration errors for real mode:');
        validation.errors.forEach((e) => console.error(`   - ${e}`));
        process.exit(1);
      }

      const { RealXRPLAdapter } = await import('./adapters/xrpl/RealXRPLAdapter.js');
      const adapter = new RealXRPLAdapter({
        endpoint: envConfig.xrpl.endpoint!,
        seed: envConfig.xrpl.seed!,
      });

      try {
        await adapter.connect('', { network: envConfig.xrpl.network });
        const tx = await adapter.fetchTransaction(args.receipt);
        
        if (!tx) {
          console.log('❌ Transaction not found');
          process.exit(1);
        }

        console.log('✅ Transaction found on ledger');
        console.log(`   Hash: ${tx.result.hash}`);
        console.log(`   Validated: ${tx.result.validated}`);
        
        await adapter.disconnect();
        process.exit(0);
      } catch (error) {
        console.error('❌ Error fetching transaction:', error instanceof Error ? error.message : error);
        await adapter.disconnect();
        process.exit(1);
      }
    }
  }
}

function loadJsonFromPathOrString(input: string): unknown {
  if (fs.existsSync(input)) {
    return JSON.parse(fs.readFileSync(input, 'utf-8'));
  }
  return JSON.parse(input);
}

function writeOutput(data: unknown, outPath?: string): void {
  const json = JSON.stringify(data, null, 2);
  console.log(json);
  if (outPath) {
    fs.writeFileSync(outPath, json);
    console.log(`\nWritten to: ${outPath}`);
  }
}

async function createProofRequest(args: ParsedArgs): Promise<void> {
  if (!args.audience) {
    console.error('Error: --audience is required');
    process.exit(1);
  }

  if (!args.perm) {
    console.error('Error: --perm is required (comma-separated permissions)');
    process.exit(1);
  }

  const permissions = args.perm.split(',').map((p) => p.trim());
  const logger = args.debug ? new ConsoleLogger('debug') : undefined;

  const persistence = new JsonPersistence('./.agility-cli-test');
  await persistence.initialize();

  const protocol = new ProofProtocol(persistence, logger);

  const request = await protocol.createRequest({
    audience: args.audience,
    requiredPermissions: permissions,
    ttlSeconds: args.ttl ?? 300,
  });

  console.log('');
  console.log('ProofRequest created:');
  writeOutput(request, args.out);
}

async function createConsentGrant(args: ParsedArgs): Promise<void> {
  if (!args.request) {
    console.error('Error: --request is required (path or JSON)');
    process.exit(1);
  }

  const logger = args.debug ? new ConsoleLogger('debug') : undefined;

  let requestData: ProofRequest;
  try {
    requestData = validateProofRequest(loadJsonFromPathOrString(args.request));
  } catch (e) {
    console.error('Error: Invalid ProofRequest:', e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const persistence = new JsonPersistence('./.agility-cli-test');
  await persistence.initialize();

  const protocol = new ProofProtocol(persistence, logger);

  const grant = await protocol.createGrant({
    request: requestData,
  });

  console.log('');
  console.log('ConsentGrant created:');
  writeOutput(grant, args.out);
}

async function createProofResponse(args: ParsedArgs): Promise<void> {
  if (!args.request) {
    console.error('Error: --request is required (path or JSON)');
    process.exit(1);
  }

  if (!args.grant) {
    console.error('Error: --grant is required (path or JSON)');
    process.exit(1);
  }

  const envConfig = loadEnvConfig({ mode: args.mode });
  const logger = args.debug ? new ConsoleLogger('debug') : undefined;

  let requestData: ProofRequest;
  let grantData: ConsentGrant;

  try {
    requestData = validateProofRequest(loadJsonFromPathOrString(args.request));
  } catch (e) {
    console.error('Error: Invalid ProofRequest:', e instanceof Error ? e.message : e);
    process.exit(1);
  }

  try {
    grantData = validateConsentGrant(loadJsonFromPathOrString(args.grant));
  } catch (e) {
    console.error('Error: Invalid ConsentGrant:', e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const persistence = new JsonPersistence('./.agility-cli-test');
  await persistence.initialize();

  const decks = persistence.getAllDecks();
  let deckPermissions: string[] = [];
  
  for (const deck of decks) {
    const data = deck.data as { permissions?: string[] };
    if (data.permissions) {
      const hasAll = requestData.requiredPermissions.every((p) => data.permissions!.includes(p));
      if (hasAll) {
        deckPermissions = data.permissions;
        break;
      }
    }
  }

  if (deckPermissions.length === 0) {
    deckPermissions = requestData.requiredPermissions;
  }

  const protocol = new ProofProtocol(persistence, logger);

  const proof = await protocol.createProof({
    request: requestData,
    grant: grantData,
    deckPermissions,
  });

  let receiptTxHash: string | undefined;

  if (envConfig.mode === 'real') {
    const validation = validateRealModeConfig(envConfig);
    if (!validation.valid) {
      console.error('❌ Configuration errors for real mode:');
      validation.errors.forEach((e) => console.error(`   - ${e}`));
      process.exit(1);
    }

    const { RealXRPLAdapter } = await import('./adapters/xrpl/RealXRPLAdapter.js');
    const adapter = new RealXRPLAdapter({
      endpoint: envConfig.xrpl.endpoint!,
      seed: envConfig.xrpl.seed!,
    }, logger);

    try {
      await adapter.connect('', { network: envConfig.xrpl.network });
      
      const receiptMemo = {
        type: 'proof_generated',
        requestId: proof.requestId,
        proofId: proof.proofId,
        requestHash: proof.binding.requestHash,
        timestamp: new Date().toISOString(),
      };

      const result = await adapter.submitReceipt(receiptMemo);
      
      if (result.success && result.txHash) {
        receiptTxHash = result.txHash;
        protocol.createReceipt(proof, receiptTxHash);
        console.log(`\n✅ XRPL receipt submitted: ${receiptTxHash}`);
      }

      await adapter.disconnect();
    } catch (error) {
      console.error('❌ Error submitting receipt:', error instanceof Error ? error.message : error);
    }
  }

  console.log('');
  console.log('ProofResponse created:');
  writeOutput(proof, args.out);

  if (receiptTxHash) {
    console.log(`\nReceipt TX: ${receiptTxHash}`);
  }
}

async function verifyProof(args: ParsedArgs): Promise<void> {
  if (!args.request) {
    console.error('Error: --request is required (path or JSON)');
    process.exit(1);
  }

  if (!args.proof) {
    console.error('Error: --proof is required (path or JSON)');
    process.exit(1);
  }

  const envConfig = loadEnvConfig({ mode: args.mode });
  const logger = args.debug ? new ConsoleLogger('debug') : undefined;

  let requestData: ProofRequest;
  let proofData: ProofResponse;
  let grantData: ConsentGrant | undefined;

  try {
    requestData = validateProofRequest(loadJsonFromPathOrString(args.request));
  } catch (e) {
    console.error('❌ Invalid ProofRequest schema:', e instanceof Error ? e.message : e);
    process.exit(1);
  }

  try {
    proofData = validateProofResponse(loadJsonFromPathOrString(args.proof));
  } catch (e) {
    console.error('❌ Invalid ProofResponse schema:', e instanceof Error ? e.message : e);
    process.exit(1);
  }

  if (args.grant) {
    try {
      grantData = validateConsentGrant(loadJsonFromPathOrString(args.grant));
    } catch (e) {
      console.error('❌ Invalid ConsentGrant schema:', e instanceof Error ? e.message : e);
      process.exit(1);
    }
  }

  const persistence = new JsonPersistence('./.agility-cli-test');
  await persistence.initialize();

  const protocol = new ProofProtocol(persistence, logger);
  const result = protocol.verify(requestData, proofData, grantData);

  console.log('');
  console.log('Verification Results:');
  console.log('─'.repeat(40));
  
  const checkLabels: Record<string, string> = {
    schemaValid: 'Schema validation',
    notExpired: 'Not expired',
    audienceMatch: 'Audience match',
    nonceMatch: 'Nonce match',
    requestIdMatch: 'Request ID match',
    permissionsSatisfied: 'Permissions satisfied',
    bindingValid: 'Binding hash valid',
  };

  for (const [key, label] of Object.entries(checkLabels)) {
    const passed = result.checks[key as keyof typeof result.checks];
    console.log(`${passed ? '✅' : '❌'} ${label}`);
  }

  if (args.receipt && envConfig.mode === 'real') {
    console.log('');
    console.log('XRPL Receipt Verification:');
    
    const validation = validateRealModeConfig(envConfig);
    if (!validation.valid) {
      console.log('❌ Cannot verify receipt: missing XRPL config');
    } else {
      const { RealXRPLAdapter } = await import('./adapters/xrpl/RealXRPLAdapter.js');
      const adapter = new RealXRPLAdapter({
        endpoint: envConfig.xrpl.endpoint!,
        seed: envConfig.xrpl.seed!,
      }, logger);

      try {
        await adapter.connect('', { network: envConfig.xrpl.network });
        const tx = await adapter.fetchTransaction(args.receipt);
        
        if (!tx) {
          console.log('❌ Transaction not found on ledger');
        } else {
          console.log('✅ Transaction found on ledger');
          console.log(`   Hash: ${tx.result.hash}`);
          console.log(`   Validated: ${tx.result.validated}`);
        }

        await adapter.disconnect();
      } catch (error) {
        console.error('❌ Error fetching transaction:', error instanceof Error ? error.message : error);
      }
    }
  }

  console.log('');
  console.log('─'.repeat(40));
  console.log(result.valid ? '✅ VERIFICATION PASSED' : '❌ VERIFICATION FAILED');
  
  if (result.errors.length > 0) {
    console.log('');
    console.log('Errors:');
    result.errors.forEach((e) => console.log(`  - ${e}`));
  }

  process.exit(result.valid ? 0 : 1);
}

async function proverInit(args: ParsedArgs): Promise<void> {
  const logger = args.debug ? new ConsoleLogger('debug') : new ConsoleLogger('info');

  const persistence = new JsonPersistence('./.agility-cli-test');
  const prover = new LocalProver(persistence, logger);

  await prover.initialize();

  const keyInfo = prover.getKeyInfo();
  if (!keyInfo) {
    console.error('❌ Failed to initialize prover');
    process.exit(1);
  }

  console.log('');
  console.log('Prover Identity Initialized:');
  console.log('─'.repeat(40));
  console.log(`Root ID:    ${keyInfo.rootId}`);
  console.log(`Created:    ${keyInfo.createdAt}`);
  console.log('─'.repeat(40));
  console.log('');
  console.log('Your identity keys are stored locally.');
  console.log('Use "prover grant" and "prover prove" to respond to requests.');
}

async function proverGrant(args: ParsedArgs): Promise<void> {
  if (!args.request) {
    console.error('Error: --request is required (path or JSON)');
    process.exit(1);
  }

  const envConfig = loadEnvConfig({ mode: args.mode });
  const logger = args.debug ? new ConsoleLogger('debug') : undefined;
  const signerType = args.signer ?? 'local';

  let requestData: ProofRequest;
  try {
    requestData = validateProofRequest(loadJsonFromPathOrString(args.request));
  } catch (e) {
    console.error('Error: Invalid ProofRequest:', e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const persistence = new JsonPersistence('./.agility-cli-test');
  const prover = new LocalProver(persistence, logger);

  await prover.initialize();

  let grant: ConsentGrant;

  if (signerType === 'xaman') {
    const xamanValidation = validateXamanConfig(envConfig);
    if (!xamanValidation.valid) {
      console.error('❌ Configuration errors for Xaman signing:');
      xamanValidation.errors.forEach((e) => console.error(`   - ${e}`));
      process.exit(1);
    }

    const xamanSigner = new XamanSigner({
      apiKey: envConfig.xaman.apiKey!,
      apiSecret: envConfig.xaman.apiSecret!,
      network: envConfig.xrpl.network,
    }, logger);

    grant = await prover.createConsentGrantWithSigner(requestData, xamanSigner);
  } else {
    grant = prover.createConsentGrant(requestData);
  }

  console.log('');
  console.log(`ConsentGrant created (${signerType} signer):`);
  console.log(`  Grant ID:     ${grant.grantId}`);
  console.log(`  Request ID:   ${grant.requestId}`);
  console.log(`  Audience:     ${grant.audience}`);
  console.log(`  Signer:       ${grant.signer.type}:${grant.signer.id}`);
  console.log(`  Permissions:  ${grant.permissions.join(', ')}`);
  console.log('');

  writeOutput(grant, args.out);
}

async function proverProve(args: ParsedArgs): Promise<void> {
  if (!args.request) {
    console.error('Error: --request is required (path or JSON)');
    process.exit(1);
  }

  if (!args.grant) {
    console.error('Error: --grant is required (path or JSON)');
    process.exit(1);
  }

  const envConfig = loadEnvConfig({ mode: args.mode });
  const logger = args.debug ? new ConsoleLogger('debug') : undefined;

  let requestData: ProofRequest;
  let grantData: ConsentGrant;

  try {
    requestData = validateProofRequest(loadJsonFromPathOrString(args.request));
  } catch (e) {
    console.error('Error: Invalid ProofRequest:', e instanceof Error ? e.message : e);
    process.exit(1);
  }

  try {
    grantData = validateConsentGrant(loadJsonFromPathOrString(args.grant));
  } catch (e) {
    console.error('Error: Invalid ConsentGrant:', e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const persistence = new JsonPersistence('./.agility-cli-test');
  const prover = new LocalProver(persistence, logger);

  await prover.initialize();

  const proof = prover.generateProof(requestData, grantData);

  let receiptTxHash: string | undefined;

  if (envConfig.mode === 'real') {
    const validation = validateRealModeConfig(envConfig);
    if (!validation.valid) {
      console.error('❌ Configuration errors for real mode:');
      validation.errors.forEach((e) => console.error(`   - ${e}`));
      process.exit(1);
    }

    const { RealXRPLAdapter } = await import('./adapters/xrpl/RealXRPLAdapter.js');
    const adapter = new RealXRPLAdapter({
      endpoint: envConfig.xrpl.endpoint!,
      seed: envConfig.xrpl.seed!,
    }, logger);

    try {
      await adapter.connect('', { network: envConfig.xrpl.network });
      
      const receiptMemo = {
        type: 'proof_generated',
        requestId: proof.requestId,
        proofId: proof.proofId,
        requestHash: proof.binding.requestHash,
        timestamp: new Date().toISOString(),
      };

      const result = await adapter.submitReceipt(receiptMemo);
      
      if (result.success && result.txHash) {
        receiptTxHash = result.txHash;
        persistence.saveReceipt(receiptTxHash, {
          txHash: receiptTxHash,
          requestId: proof.requestId,
          proofId: proof.proofId,
          requestHash: proof.binding.requestHash,
          timestamp: new Date().toISOString(),
          type: 'proof_generated',
        });
        console.log(`\n✅ XRPL receipt submitted: ${receiptTxHash}`);
      }

      await adapter.disconnect();
    } catch (error) {
      console.error('❌ Error submitting receipt:', error instanceof Error ? error.message : error);
    }
  }

  console.log('');
  console.log('ProofResponse created (prover):');
  console.log(`  Proof ID:     ${proof.proofId}`);
  console.log(`  Request ID:   ${proof.requestId}`);
  console.log(`  Verified:     ${proof.verified ? '✅' : '❌'}`);
  console.log(`  Permissions:  ${proof.satisfiedPermissions.join(', ')}`);
  console.log(`  Binding:      ${proof.binding.requestHash.slice(0, 16)}...`);
  console.log('');

  writeOutput(proof, args.out);

  if (receiptTxHash) {
    console.log(`\nReceipt TX: ${receiptTxHash}`);
  }
}

async function demoPhase4(args: ParsedArgs): Promise<void> {
  const envConfig = loadEnvConfig({ mode: args.mode });
  const logger = args.debug ? new ConsoleLogger('debug') : new ConsoleLogger('info');

  console.log('');
  console.log('═'.repeat(50));
  console.log('  PHASE 4 DEMO: Verifier + Prover Protocol Flow');
  console.log('═'.repeat(50));
  console.log('');

  const persistence = new JsonPersistence('./.agility-cli-test');
  await persistence.initialize();

  console.log('┌─────────────────────────────────────────────────┐');
  console.log('│ STEP 1: Verifier creates ProofRequest           │');
  console.log('└─────────────────────────────────────────────────┘');

  const protocol = new ProofProtocol(persistence, logger);
  const request = await protocol.createRequest({
    audience: 'demo_verifier_app',
    requiredPermissions: ['age_over_18', 'email_verified'],
    ttlSeconds: 300,
  });

  console.log(`  ✅ Verifier created requestId=${request.requestId.slice(0, 8)}...`);
  console.log(`     Audience: ${request.audience}`);
  console.log(`     Permissions: ${request.requiredPermissions.join(', ')}`);
  console.log('');

  console.log('┌─────────────────────────────────────────────────┐');
  console.log('│ STEP 2: Prover initializes identity             │');
  console.log('└─────────────────────────────────────────────────┘');

  const prover = new LocalProver(persistence, logger);
  await prover.initialize();

  const keyInfo = prover.getKeyInfo();
  console.log(`  ✅ Prover initialized rootId=${keyInfo?.rootId.slice(0, 16)}...`);
  
  const pairwiseId = prover.getPairwiseId(request.audience);
  console.log(`     Pairwise ID for "${request.audience}": ${pairwiseId.slice(0, 16)}...`);
  console.log('');

  console.log('┌─────────────────────────────────────────────────┐');
  console.log('│ STEP 3: Prover creates ConsentGrant             │');
  console.log('└─────────────────────────────────────────────────┘');

  const grant = prover.createConsentGrant(request);
  console.log(`  ✅ Prover created grantId=${grant.grantId.slice(0, 8)}...`);
  console.log(`     Signer: ${grant.signer.id}`);
  console.log('');

  console.log('┌─────────────────────────────────────────────────┐');
  console.log('│ STEP 4: Prover generates ProofResponse          │');
  console.log('└─────────────────────────────────────────────────┘');

  const proof = prover.generateProof(request, grant);
  console.log(`  ✅ Prover created proofId=${proof.proofId.slice(0, 8)}...`);
  console.log(`     Verified: ${proof.verified}`);
  console.log(`     Binding: ${proof.binding.requestHash.slice(0, 16)}...`);
  console.log('');

  let receiptTxHash: string | undefined;

  if (envConfig.mode === 'real') {
    console.log('┌─────────────────────────────────────────────────┐');
    console.log('│ STEP 4b: Prover anchors receipt to XRPL         │');
    console.log('└─────────────────────────────────────────────────┘');

    const validation = validateRealModeConfig(envConfig);
    if (validation.valid) {
      const { RealXRPLAdapter } = await import('./adapters/xrpl/RealXRPLAdapter.js');
      const adapter = new RealXRPLAdapter({
        endpoint: envConfig.xrpl.endpoint!,
        seed: envConfig.xrpl.seed!,
      }, logger);

      try {
        await adapter.connect('', { network: envConfig.xrpl.network });
        
        const receiptMemo = {
          type: 'proof_generated',
          requestId: proof.requestId,
          proofId: proof.proofId,
          requestHash: proof.binding.requestHash,
          timestamp: new Date().toISOString(),
        };

        const result = await adapter.submitReceipt(receiptMemo);
        
        if (result.success && result.txHash) {
          receiptTxHash = result.txHash;
          console.log(`  ✅ Receipt anchored: txHash=${receiptTxHash}`);
        }

        await adapter.disconnect();
      } catch (error) {
        console.error('  ❌ Error submitting receipt:', error instanceof Error ? error.message : error);
      }
    } else {
      console.log('  ⚠️  Skipping XRPL receipt (missing config)');
    }
    console.log('');
  }

  console.log('┌─────────────────────────────────────────────────┐');
  console.log('│ STEP 5: Verifier verifies ProofResponse         │');
  console.log('└─────────────────────────────────────────────────┘');

  const verifyResult = protocol.verify(request, proof, grant);

  const checkLabels: Record<string, string> = {
    schemaValid: 'Schema validation',
    notExpired: 'Not expired',
    audienceMatch: 'Audience match',
    nonceMatch: 'Nonce match',
    requestIdMatch: 'Request ID match',
    permissionsSatisfied: 'Permissions satisfied',
    bindingValid: 'Binding hash valid',
  };

  for (const [key, label] of Object.entries(checkLabels)) {
    const passed = verifyResult.checks[key as keyof typeof verifyResult.checks];
    console.log(`  ${passed ? '✅' : '❌'} ${label}`);
  }

  console.log('');
  console.log('═'.repeat(50));
  console.log(verifyResult.valid 
    ? '  ✅ DEMO COMPLETE: Verification PASSED' 
    : '  ❌ DEMO COMPLETE: Verification FAILED');
  console.log('═'.repeat(50));

  if (receiptTxHash) {
    console.log(`  Receipt anchored: ${receiptTxHash}`);
  }

  console.log('');
  console.log('Summary:');
  console.log(`  Verifier created requestId=${request.requestId.slice(0, 8)}...`);
  console.log(`  Prover created grantId=${grant.grantId.slice(0, 8)}...`);
  console.log(`  Prover created proofId=${proof.proofId.slice(0, 8)}...`);
  console.log(`  Verifier verified proof successfully`);
  if (receiptTxHash) {
    console.log(`  Receipt anchored: txHash=${receiptTxHash}`);
  }
  console.log('');

  process.exit(verifyResult.valid ? 0 : 1);
}

async function demoPhase5(args: ParsedArgs): Promise<void> {
  const envConfig = loadEnvConfig({ mode: args.mode });
  const logger = args.debug ? new ConsoleLogger('debug') : new ConsoleLogger('info');
  const signerType = args.signer ?? 'xaman';

  console.log('');
  console.log('═'.repeat(60));
  console.log('  PHASE 5 DEMO: Xaman Consent Signing Protocol Flow');
  console.log('═'.repeat(60));
  console.log('');

  if (signerType === 'xaman') {
    const xamanValidation = validateXamanConfig(envConfig);
    if (!xamanValidation.valid) {
      console.error('❌ Configuration errors for Xaman signing:');
      xamanValidation.errors.forEach((e) => console.error(`   - ${e}`));
      console.log('');
      console.log('To use Xaman signing, set XAMAN_API_KEY and XAMAN_API_SECRET in .env');
      console.log('Get your API credentials at: https://apps.xumm.dev/');
      process.exit(1);
    }
  }

  const persistence = new JsonPersistence('./.agility-cli-test');
  await persistence.initialize();

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 1: Verifier creates ProofRequest                       │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  const protocol = new ProofProtocol(persistence, logger);
  const request = await protocol.createRequest({
    audience: 'demo_verifier_app',
    requiredPermissions: ['age_over_18', 'email_verified'],
    ttlSeconds: 300,
  });

  console.log(`  ✅ Verifier created requestId=${request.requestId.slice(0, 8)}...`);
  console.log(`     Audience: ${request.audience}`);
  console.log(`     Permissions: ${request.requiredPermissions.join(', ')}`);
  console.log('');

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 2: Prover initializes identity                         │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  const prover = new LocalProver(persistence, logger);
  await prover.initialize();

  const keyInfo = prover.getKeyInfo();
  console.log(`  ✅ Prover initialized rootId=${keyInfo?.rootId.slice(0, 16)}...`);
  console.log('');

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 3: Prover creates ConsentGrant with Xaman signing      │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  let grant: ConsentGrant;

  if (signerType === 'xaman') {
    const xamanSigner = new XamanSigner({
      apiKey: envConfig.xaman.apiKey!,
      apiSecret: envConfig.xaman.apiSecret!,
      network: envConfig.xrpl.network,
    }, logger);

    grant = await prover.createConsentGrantWithSigner(request, xamanSigner);
  } else {
    const localSigner = prover.getLocalSignerForAudience(request.audience);
    grant = await prover.createConsentGrantWithSigner(request, localSigner);
  }

  console.log(`  ✅ Prover created grantId=${grant.grantId.slice(0, 8)}...`);
  console.log(`     Signer: ${grant.signer.type}:${grant.signer.id}`);
  console.log(`     Method: ${signerType}`);
  console.log('');

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 4: Prover generates ProofResponse                      │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  const proof = prover.generateProof(request, grant);
  console.log(`  ✅ Prover created proofId=${proof.proofId.slice(0, 8)}...`);
  console.log(`     Verified: ${proof.verified}`);
  console.log(`     Binding: ${proof.binding.requestHash.slice(0, 16)}...`);
  console.log('');

  let receiptTxHash: string | undefined;

  if (envConfig.mode === 'real') {
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ STEP 4b: Prover anchors receipt to XRPL                     │');
    console.log('└─────────────────────────────────────────────────────────────┘');

    const validation = validateRealModeConfig(envConfig);
    if (validation.valid) {
      const { RealXRPLAdapter } = await import('./adapters/xrpl/RealXRPLAdapter.js');
      const adapter = new RealXRPLAdapter({
        endpoint: envConfig.xrpl.endpoint!,
        seed: envConfig.xrpl.seed!,
      }, logger);

      try {
        await adapter.connect('', { network: envConfig.xrpl.network });
        
        const receiptMemo = {
          type: 'proof_generated',
          requestId: proof.requestId,
          proofId: proof.proofId,
          requestHash: proof.binding.requestHash,
          timestamp: new Date().toISOString(),
        };

        const result = await adapter.submitReceipt(receiptMemo);
        
        if (result.success && result.txHash) {
          receiptTxHash = result.txHash;
          console.log(`  ✅ Receipt anchored: txHash=${receiptTxHash}`);
        }

        await adapter.disconnect();
      } catch (error) {
        console.error('  ❌ Error submitting receipt:', error instanceof Error ? error.message : error);
      }
    } else {
      console.log('  ⚠️  Skipping XRPL receipt (missing config)');
    }
    console.log('');
  }

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 5: Verifier verifies ProofResponse                     │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  const verifyResult = protocol.verify(request, proof, grant);

  const checkLabels: Record<string, string> = {
    schemaValid: 'Schema validation',
    notExpired: 'Not expired',
    audienceMatch: 'Audience match',
    nonceMatch: 'Nonce match',
    requestIdMatch: 'Request ID match',
    permissionsSatisfied: 'Permissions satisfied',
    bindingValid: 'Binding hash valid',
  };

  for (const [key, label] of Object.entries(checkLabels)) {
    const passed = verifyResult.checks[key as keyof typeof verifyResult.checks];
    console.log(`  ${passed ? '✅' : '❌'} ${label}`);
  }

  if (grant.signer.type === 'xrpl') {
    console.log(`  ✅ Xaman consent signature present`);
    if (grant.signatureMeta?.txid) {
      console.log(`     TX ID: ${grant.signatureMeta.txid}`);
    }
  }

  console.log('');
  console.log('═'.repeat(60));
  console.log(verifyResult.valid 
    ? '  ✅ PHASE 5 DEMO COMPLETE: Verification PASSED' 
    : '  ❌ PHASE 5 DEMO COMPLETE: Verification FAILED');
  console.log('═'.repeat(60));

  if (receiptTxHash) {
    console.log(`  Receipt anchored: ${receiptTxHash}`);
  }

  console.log('');
  console.log('Summary:');
  console.log(`  Verifier created requestId=${request.requestId.slice(0, 8)}...`);
  console.log(`  Prover created grantId=${grant.grantId.slice(0, 8)}... (${signerType} signer)`);
  console.log(`  Prover created proofId=${proof.proofId.slice(0, 8)}...`);
  console.log(`  Verifier verified proof successfully`);
  if (receiptTxHash) {
    console.log(`  Receipt anchored: txHash=${receiptTxHash}`);
  }
  console.log('');

  process.exit(verifyResult.valid ? 0 : 1);
}

async function credentialIssue(args: ParsedArgs): Promise<void> {
  const envConfig = loadEnvConfig({ mode: args.mode });
  const logger = args.debug ? new ConsoleLogger('debug') : new ConsoleLogger('info');

  if (!args.subject) {
    console.error('Error: --subject is required for credential issuance');
    process.exit(1);
  }

  if (!args.claim || args.claim.length === 0) {
    console.error('Error: At least one --claim is required');
    console.error('Usage: --claim age_over_18=true --claim email_verified=true');
    process.exit(1);
  }

  const claims: CredentialClaims = {};
  for (const claimStr of args.claim) {
    const [key, value] = claimStr.split('=');
    if (!key || value === undefined) {
      console.error(`Invalid claim format: ${claimStr}`);
      console.error('Expected format: key=value (e.g., age_over_18=true)');
      process.exit(1);
    }
    if (value === 'true') {
      claims[key] = true;
    } else if (value === 'false') {
      claims[key] = false;
    } else if (!isNaN(Number(value))) {
      claims[key] = Number(value);
    } else {
      claims[key] = value;
    }
  }

  const persistence = new JsonPersistence(envConfig.storagePath);
  await persistence.initialize();

  const issuer = new CredentialIssuer(persistence, logger);
  await issuer.initialize();

  const credential = issuer.issueCredential({
    subjectId: args.subject,
    claims,
    expiresInSeconds: args.ttl,
  });

  console.log('');
  console.log('✅ Credential issued successfully');
  console.log('');
  console.log(`  ID:       ${credential.id}`);
  console.log(`  Issuer:   ${credential.issuer}`);
  console.log(`  Subject:  ${credential.subject}`);
  console.log(`  Claims:   ${Object.keys(credential.claims).join(', ')}`);
  console.log(`  IssuedAt: ${credential.issuedAt}`);
  if (credential.expiresAt) {
    console.log(`  ExpiresAt: ${credential.expiresAt}`);
  }
  console.log('');

  if (args.out) {
    fs.writeFileSync(args.out, JSON.stringify(credential, null, 2));
    console.log(`Credential saved to: ${args.out}`);
  } else {
    console.log('Credential JSON:');
    console.log(JSON.stringify(credential, null, 2));
  }
}

async function credentialList(args: ParsedArgs): Promise<void> {
  const envConfig = loadEnvConfig({ mode: args.mode });

  const persistence = new JsonPersistence(envConfig.storagePath);
  await persistence.initialize();

  const store = new CredentialStore(persistence);
  const credentials = store.getAllCredentials();

  console.log('');
  console.log(`Found ${credentials.length} credential(s):`);
  console.log('');

  if (credentials.length === 0) {
    console.log('  No credentials stored.');
    console.log('  Use "credential issue" to create one.');
  } else {
    for (const vc of credentials) {
      const claimKeys = Object.keys(vc.claims);
      const expired = vc.expiresAt && new Date(vc.expiresAt) < new Date();
      const status = expired ? '❌ EXPIRED' : '✅ VALID';
      
      console.log(`  ${status} ${vc.id.slice(0, 8)}...`);
      console.log(`       Subject: ${vc.subject.slice(0, 32)}...`);
      console.log(`       Claims:  ${claimKeys.join(', ')}`);
      console.log(`       Issued:  ${vc.issuedAt}`);
      if (vc.expiresAt) {
        console.log(`       Expires: ${vc.expiresAt}`);
      }
      console.log('');
    }
  }
}

async function credentialVerify(args: ParsedArgs): Promise<void> {
  const envConfig = loadEnvConfig({ mode: args.mode });
  const logger = args.debug ? new ConsoleLogger('debug') : new ConsoleLogger('info');

  if (!args.credential) {
    console.error('Error: --credential is required');
    process.exit(1);
  }

  let credential: VerifiableCredential;
  try {
    const credentialData = fs.existsSync(args.credential)
      ? fs.readFileSync(args.credential, 'utf-8')
      : args.credential;
    credential = JSON.parse(credentialData);
  } catch (e) {
    console.error(`Error reading credential: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }

  const persistence = new JsonPersistence(envConfig.storagePath);
  await persistence.initialize();

  const issuer = new CredentialIssuer(persistence, logger);
  await issuer.initialize();

  console.log('');
  console.log('Verifying credential...');
  console.log('');

  const isValid = issuer.verifyCredentialSignature(credential);
  const isExpired = credential.expiresAt && new Date(credential.expiresAt) < new Date();

  console.log(`  ID:        ${credential.id}`);
  console.log(`  Issuer:    ${credential.issuer}`);
  console.log(`  Subject:   ${credential.subject}`);
  console.log(`  Signature: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
  console.log(`  Expiry:    ${isExpired ? '❌ EXPIRED' : '✅ NOT EXPIRED'}`);
  console.log('');

  if (isValid && !isExpired) {
    console.log('✅ Credential verification PASSED');
  } else {
    console.log('❌ Credential verification FAILED');
    process.exit(1);
  }
}

async function demoPhase6(args: ParsedArgs): Promise<void> {
  const envConfig = loadEnvConfig({ mode: args.mode });
  const logger = args.debug ? new ConsoleLogger('debug') : new ConsoleLogger('info');

  console.log('');
  console.log('═'.repeat(60));
  console.log('  PHASE 6 DEMO: Verifiable Credentials Protocol Flow');
  console.log('═'.repeat(60));
  console.log('');

  const persistence = new JsonPersistence('./.agility-cli-test');
  await persistence.initialize();

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 1: Initialize Credential Issuer                        │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  const issuer = new CredentialIssuer(persistence, logger);
  await issuer.initialize();

  const issuerInfo = issuer.getKeyInfo();
  console.log(`  ✅ Issuer initialized: ${issuerInfo?.issuerId.slice(0, 32)}...`);
  console.log('');

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 2: Initialize Prover (wallet holder)                   │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  const prover = new LocalProver(persistence, logger);
  await prover.initialize();

  const proverInfo = prover.getKeyInfo();
  console.log(`  ✅ Prover initialized rootId=${proverInfo?.rootId.slice(0, 16)}...`);
  console.log('');

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 3: Issuer issues Verifiable Credential to Prover       │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  const credential = issuer.issueCredential({
    subjectId: proverInfo!.rootId,
    claims: {
      age_over_18: true,
      email_verified: true,
      faction_member: 'dragon',
    },
    expiresInSeconds: 3600,
  });

  console.log(`  ✅ Credential issued: ${credential.id.slice(0, 8)}...`);
  console.log(`     Subject: ${credential.subject.slice(0, 32)}...`);
  console.log(`     Claims: ${Object.keys(credential.claims).join(', ')}`);
  console.log(`     Signature: ${credential.proof.signature.slice(0, 24)}...`);
  console.log('');

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 4: Verifier creates ProofRequest                       │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  const protocol = new ProofProtocol(persistence, logger);
  const request = await protocol.createRequest({
    audience: 'demo_verifier_app',
    requiredPermissions: ['age_over_18', 'email_verified'],
    ttlSeconds: 300,
  });

  console.log(`  ✅ Verifier created requestId=${request.requestId.slice(0, 8)}...`);
  console.log(`     Audience: ${request.audience}`);
  console.log(`     Required: ${request.requiredPermissions.join(', ')}`);
  console.log('');

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 5: Prover creates ConsentGrant                         │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  const grant = prover.createConsentGrant(request);

  console.log(`  ✅ Prover created grantId=${grant.grantId.slice(0, 8)}...`);
  console.log(`     Signer: ${grant.signer.id.slice(0, 32)}...`);
  console.log('');

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 6: Prover generates Credential-based ProofResponse     │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  const proof = prover.generateProofFromCredential(request, credential, grant);

  console.log(`  ✅ Prover created proofId=${proof.proofId.slice(0, 8)}...`);
  console.log(`     Verified: ${proof.verified}`);
  console.log(`     CredentialId: ${proof.binding.credentialId?.slice(0, 8)}...`);
  console.log(`     CredentialHash: ${proof.binding.credentialHash?.slice(0, 16)}...`);
  console.log('');

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 7: Verifier verifies Credential-based Proof            │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  const verifyResult = protocol.verifyCredentialProof(request, proof, credential, grant);

  const checkSymbol = (v: boolean | undefined) => (v === true ? '✅' : v === false ? '❌' : '⚪');

  console.log(`  ${checkSymbol(verifyResult.checks.schemaValid)} Schema validation`);
  console.log(`  ${checkSymbol(verifyResult.checks.notExpired)} Not expired`);
  console.log(`  ${checkSymbol(verifyResult.checks.audienceMatch)} Audience match`);
  console.log(`  ${checkSymbol(verifyResult.checks.nonceMatch)} Nonce match`);
  console.log(`  ${checkSymbol(verifyResult.checks.requestIdMatch)} Request ID match`);
  console.log(`  ${checkSymbol(verifyResult.checks.permissionsSatisfied)} Permissions satisfied`);
  console.log(`  ${checkSymbol(verifyResult.checks.bindingValid)} Binding hash valid`);
  console.log(`  ${checkSymbol(verifyResult.checks.credentialValid)} Credential valid`);
  console.log(`  ${checkSymbol(verifyResult.checks.credentialSignatureValid)} Credential signature valid`);
  console.log(`  ${checkSymbol(verifyResult.checks.credentialClaimsValid)} Credential claims valid`);
  console.log('');

  if (verifyResult.valid) {
    console.log('═'.repeat(60));
    console.log('  ✅ PHASE 6 DEMO COMPLETE: Credential Verification PASSED');
    console.log('═'.repeat(60));
  } else {
    console.log('═'.repeat(60));
    console.log('  ❌ PHASE 6 DEMO FAILED');
    console.log('═'.repeat(60));
    console.log('');
    console.log('Errors:');
    verifyResult.errors.forEach((e) => console.log(`  - ${e}`));
  }

  console.log('');
  console.log('Trust Chain:');
  console.log(`  Issuer: ${credential.issuer.slice(0, 32)}...`);
  console.log(`    ↓ issued credential to`);
  console.log(`  Subject: ${credential.subject.slice(0, 32)}...`);
  console.log(`    ↓ generated proof for`);
  console.log(`  Verifier: ${request.audience}`);
  console.log('');

  process.exit(verifyResult.valid ? 0 : 1);
}

// ============================================================================
// Phase 7: Midnight Commands
// ============================================================================

async function midnightStatus(args: ParsedArgs): Promise<void> {
  const envConfig = loadEnvConfig({ mode: args.mode });
  const logger = args.debug ? new ConsoleLogger('debug') : new ConsoleLogger('info');

  const persistence = new JsonPersistence(envConfig.storagePath);
  await persistence.initialize();

  const midnightMode = args.midnightMode || 'local';
  const adapter = new LocalEncryptedMidnightAdapter(persistence, logger);

  const config: MidnightStorageConfig = {
    mode: midnightMode,
    network: 'testnet',
  };

  await adapter.init(config);

  console.log('');
  console.log('Midnight Adapter Status');
  console.log('─'.repeat(40));
  console.log(`  Mode:       ${adapter.getMode()}`);
  console.log(`  Available:  ${adapter.isAvailable() ? '✅ YES' : '❌ NO'}`);
  console.log(`  Network:    ${config.network}`);
  console.log('');

  const allCreds = persistence.getAllMidnightCredentials();
  console.log(`  Stored credentials: ${allCreds.length}`);
  console.log('');
  console.log('✅ PASS: Midnight adapter status check complete');
}

async function midnightEncrypt(args: ParsedArgs): Promise<void> {
  const envConfig = loadEnvConfig({ mode: args.mode });
  const logger = args.debug ? new ConsoleLogger('debug') : new ConsoleLogger('info');

  if (!args.in) {
    console.error('Error: --in <data> is required');
    process.exit(1);
  }

  const persistence = new JsonPersistence(envConfig.storagePath);
  await persistence.initialize();

  const adapter = new LocalEncryptedMidnightAdapter(persistence, logger);
  await adapter.init({ mode: args.midnightMode || 'local', network: 'testnet' });

  const plaintext = fs.existsSync(args.in) ? fs.readFileSync(args.in, 'utf-8') : args.in;
  const ciphertext = await adapter.encrypt(plaintext);

  console.log('');
  console.log('Midnight Encrypt');
  console.log('─'.repeat(40));
  console.log(`  Input length:  ${plaintext.length} chars`);
  console.log(`  Output length: ${ciphertext.length} chars`);
  console.log('');

  if (args.out) {
    fs.writeFileSync(args.out, ciphertext);
    console.log(`  Output written to: ${args.out}`);
  } else {
    console.log(`  Ciphertext: ${ciphertext.slice(0, 60)}...`);
  }
  console.log('');
  console.log('✅ PASS: Encryption complete');
}

async function midnightDecrypt(args: ParsedArgs): Promise<void> {
  const envConfig = loadEnvConfig({ mode: args.mode });
  const logger = args.debug ? new ConsoleLogger('debug') : new ConsoleLogger('info');

  if (!args.in) {
    console.error('Error: --in <ciphertext> is required');
    process.exit(1);
  }

  const persistence = new JsonPersistence(envConfig.storagePath);
  await persistence.initialize();

  const adapter = new LocalEncryptedMidnightAdapter(persistence, logger);
  await adapter.init({ mode: args.midnightMode || 'local', network: 'testnet' });

  const ciphertext = fs.existsSync(args.in) ? fs.readFileSync(args.in, 'utf-8').trim() : args.in;

  try {
    const plaintext = await adapter.decrypt(ciphertext);

    console.log('');
    console.log('Midnight Decrypt');
    console.log('─'.repeat(40));
    console.log(`  Input length:  ${ciphertext.length} chars`);
    console.log(`  Output length: ${plaintext.length} chars`);
    console.log('');

    if (args.out) {
      fs.writeFileSync(args.out, plaintext);
      console.log(`  Output written to: ${args.out}`);
    } else {
      console.log(`  Plaintext: ${plaintext.slice(0, 100)}${plaintext.length > 100 ? '...' : ''}`);
    }
    console.log('');
    console.log('✅ PASS: Decryption complete');
  } catch (e) {
    console.error(`❌ FAIL: Decryption failed: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

async function midnightHealth(args: ParsedArgs): Promise<void> {
  const logger = args.debug ? new ConsoleLogger('debug') : new ConsoleLogger('silent');
  const env = (process.env.MIDNIGHT_ENV as MidnightEnvironment) || 'preprod';

  console.log('');
  console.log('Midnight Network Health Check');
  console.log('═'.repeat(50));
  console.log('');

  const healthCheck = new MidnightHealthCheck(env, logger);
  const status = await healthCheck.checkAll();

  console.log(healthCheck.formatHealthStatus(status));
  console.log('');

  if (status.allHealthy) {
    console.log('✅ All services healthy');
  } else {
    console.log('⚠️  Some services unavailable');
  }
}

async function midnightCredPut(args: ParsedArgs): Promise<void> {
  const envConfig = loadEnvConfig({ mode: args.mode });
  const logger = args.debug ? new ConsoleLogger('debug') : new ConsoleLogger('info');

  if (!args.credential) {
    console.error('Error: --credential <path> is required');
    process.exit(1);
  }

  if (!args.subject) {
    console.error('Error: --subject <subjectId> is required');
    process.exit(1);
  }

  const persistence = new JsonPersistence(envConfig.storagePath);
  await persistence.initialize();

  const adapter = new LocalEncryptedMidnightAdapter(persistence, logger);
  await adapter.init({ mode: args.midnightMode || 'local', network: 'testnet' });

  const midnightStore = new MidnightCredentialStore({ adapter, logger });

  let credential: VerifiableCredential;
  try {
    const credData = fs.existsSync(args.credential)
      ? fs.readFileSync(args.credential, 'utf-8')
      : args.credential;
    credential = JSON.parse(credData);
  } catch (e) {
    console.error(`Error reading credential: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }

  const ref = await midnightStore.storeCredential(credential);

  console.log('');
  console.log('Midnight Credential Store');
  console.log('─'.repeat(40));
  console.log(`  Credential ID: ${credential.id}`);
  console.log(`  Subject:       ${args.subject}`);
  console.log(`  Reference:     ${ref}`);
  console.log('');
  console.log('✅ PASS: Credential stored in Midnight storage');
}

async function midnightCredList(args: ParsedArgs): Promise<void> {
  const envConfig = loadEnvConfig({ mode: args.mode });
  const logger = args.debug ? new ConsoleLogger('debug') : new ConsoleLogger('info');

  if (!args.subject) {
    console.error('Error: --subject <subjectId> is required');
    process.exit(1);
  }

  const persistence = new JsonPersistence(envConfig.storagePath);
  await persistence.initialize();

  const adapter = new LocalEncryptedMidnightAdapter(persistence, logger);
  await adapter.init({ mode: args.midnightMode || 'local', network: 'testnet' });

  const refs = await adapter.listCredentialRefs(args.subject);

  console.log('');
  console.log('Midnight Credential List');
  console.log('─'.repeat(40));
  console.log(`  Subject: ${args.subject}`);
  console.log(`  Count:   ${refs.length}`);
  console.log('');

  if (refs.length > 0) {
    console.log('  References:');
    refs.forEach((ref, i) => console.log(`    ${i + 1}. ${ref}`));
  } else {
    console.log('  No credentials found for this subject.');
  }
  console.log('');
  console.log('✅ PASS: Credential list complete');
}

async function midnightCredGet(args: ParsedArgs): Promise<void> {
  const envConfig = loadEnvConfig({ mode: args.mode });
  const logger = args.debug ? new ConsoleLogger('debug') : new ConsoleLogger('info');

  if (!args.ref) {
    console.error('Error: --ref <reference> is required');
    process.exit(1);
  }

  const persistence = new JsonPersistence(envConfig.storagePath);
  await persistence.initialize();

  const adapter = new LocalEncryptedMidnightAdapter(persistence, logger);
  await adapter.init({ mode: args.midnightMode || 'local', network: 'testnet' });

  const midnightStore = new MidnightCredentialStore({ adapter, logger });

  try {
    const credential = await midnightStore.loadCredential(args.ref);

    console.log('');
    console.log('Midnight Credential Get');
    console.log('─'.repeat(40));
    console.log(`  Reference:     ${args.ref}`);
    console.log(`  Credential ID: ${credential.id}`);
    console.log(`  Issuer:        ${credential.issuer}`);
    console.log(`  Subject:       ${credential.subject}`);
    console.log('');

    if (args.out) {
      fs.writeFileSync(args.out, JSON.stringify(credential, null, 2));
      console.log(`  Output written to: ${args.out}`);
    } else {
      console.log(`  Claims: ${Object.keys(credential.claims).join(', ')}`);
    }
    console.log('');
    console.log('✅ PASS: Credential loaded from Midnight storage');
  } catch (e) {
    console.error(`❌ FAIL: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

// ============================================================================
// Phase 7: Lace Commands
// ============================================================================

async function laceStatus(args: ParsedArgs): Promise<void> {
  const logger = args.debug ? new ConsoleLogger('debug') : new ConsoleLogger('info');

  const laceMode = args.laceMode || 'stub';
  const adapter = new StubLaceAdapter(logger);

  const config: LaceConfig = {
    mode: laceMode,
    network: 'preprod',
  };

  await adapter.init(config);

  console.log('');
  console.log('Lace Adapter Status');
  console.log('─'.repeat(40));
  console.log(`  Mode:       ${adapter.getMode()}`);
  console.log(`  Available:  ${adapter.isAvailable() ? '✅ YES' : '❌ NO'}`);
  console.log(`  Connected:  ${adapter.isConnected() ? '✅ YES' : '❌ NO'}`);
  console.log(`  Network:    ${config.network}`);
  console.log('');

  if (laceMode === 'browser') {
    console.log('  ⚠️  Browser mode requires running in a browser context with Lace extension.');
  }
  console.log('');
  console.log('✅ PASS: Lace adapter status check complete');
}

async function laceConnect(args: ParsedArgs): Promise<void> {
  const logger = args.debug ? new ConsoleLogger('debug') : new ConsoleLogger('info');

  const adapter = new StubLaceAdapter(logger);
  await adapter.init({ mode: args.laceMode || 'stub', network: 'preprod' });

  const result = await adapter.connect();

  console.log('');
  console.log('Lace Connect');
  console.log('─'.repeat(40));
  console.log(`  Enabled:     ${result.enabled ? '✅ YES' : '❌ NO'}`);
  console.log(`  Name:        ${result.name || 'N/A'}`);
  console.log(`  API Version: ${result.apiVersion || 'N/A'}`);
  console.log('');
  console.log('✅ PASS: Lace wallet connected');
}

async function laceAddresses(args: ParsedArgs): Promise<void> {
  const logger = args.debug ? new ConsoleLogger('debug') : new ConsoleLogger('info');

  const adapter = new StubLaceAdapter(logger);
  await adapter.init({ mode: args.laceMode || 'stub', network: 'preprod' });
  await adapter.connect();

  const addresses = await adapter.getAddresses();
  const changeAddr = await adapter.getChangeAddress();

  console.log('');
  console.log('Lace Addresses');
  console.log('─'.repeat(40));
  console.log(`  Count: ${addresses.length}`);
  console.log('');
  console.log('  Addresses:');
  addresses.forEach((addr, i) => {
    const isChange = addr === changeAddr ? ' (change)' : '';
    console.log(`    ${i + 1}. ${addr.slice(0, 40)}...${isChange}`);
  });
  console.log('');
  console.log('✅ PASS: Address retrieval complete');
}

async function laceNetwork(args: ParsedArgs): Promise<void> {
  const logger = args.debug ? new ConsoleLogger('debug') : new ConsoleLogger('info');

  const adapter = new StubLaceAdapter(logger);
  await adapter.init({ mode: args.laceMode || 'stub', network: 'preprod' });
  await adapter.connect();

  const network = await adapter.getNetwork();

  console.log('');
  console.log('Lace Network');
  console.log('─'.repeat(40));
  console.log(`  Network: ${network}`);
  console.log('');
  console.log('✅ PASS: Network retrieval complete');
}

async function laceSign(args: ParsedArgs): Promise<void> {
  const logger = args.debug ? new ConsoleLogger('debug') : new ConsoleLogger('info');

  if (!args.data) {
    console.error('Error: --data <payload> is required');
    process.exit(1);
  }

  const adapter = new StubLaceAdapter(logger);
  await adapter.init({ mode: args.laceMode || 'stub', network: 'preprod' });
  await adapter.connect();

  const result = await adapter.signData(args.data);

  console.log('');
  console.log('Lace Sign');
  console.log('─'.repeat(40));
  console.log(`  Data:      ${args.data.slice(0, 40)}${args.data.length > 40 ? '...' : ''}`);
  console.log(`  Signature: ${result.signature.slice(0, 40)}...`);
  console.log(`  Key:       ${result.key?.slice(0, 40)}...`);
  console.log('');
  console.log('✅ PASS: Data signing complete');
}

async function laceCapabilities(args: ParsedArgs): Promise<void> {
  const logger = args.debug ? new ConsoleLogger('debug') : new ConsoleLogger('info');

  const adapter = new StubLaceAdapter(logger);
  const config: LaceConfig = { mode: args.laceMode || 'stub', network: 'preprod' };
  await adapter.init(config);

  console.log('');
  console.log('Lace Wallet Capabilities');
  console.log('═'.repeat(50));
  console.log('');

  console.log('DApp Connector API:');
  console.log('  Version: 4.0.0 (CIP-30 compatible)');
  console.log('  Methods:');
  console.log('    - enable()');
  console.log('    - getNetworkId()');
  console.log('    - getUsedAddresses()');
  console.log('    - getChangeAddress()');
  console.log('    - signData()');
  console.log('    - signTx()');
  console.log('');

  console.log('Wallet SDK:');
  console.log('  Version: 1.0.0');
  console.log('');

  console.log('Current Configuration:');
  console.log(`  Mode:    ${adapter.getMode()}`);
  console.log(`  Network: ${config.network}`);
  console.log('');

  if (adapter.getMode() === 'stub') {
    console.log('  ⚠️  Running in stub mode (CLI testing)');
    console.log('     Browser mode required for real wallet interaction');
  } else {
    console.log('  ✅ Browser mode enabled');
  }
  console.log('');
  console.log('✅ PASS: Capabilities check complete');
}

// ============================================================================
// Phase 7: Demo
// ============================================================================

async function demoPhase7(args: ParsedArgs): Promise<void> {
  const envConfig = loadEnvConfig({ mode: args.mode });
  const logger = args.debug ? new ConsoleLogger('debug') : new ConsoleLogger('info');

  console.log('');
  console.log('═'.repeat(60));
  console.log('  PHASE 7 DEMO: Midnight + Lace Integration');
  console.log('═'.repeat(60));
  console.log('');

  const persistence = new JsonPersistence('./.agility-cli-test');
  await persistence.initialize();

  // Initialize Midnight adapter
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 1: Initialize Midnight Adapter                         │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  const midnightAdapter = new LocalEncryptedMidnightAdapter(persistence, logger);
  await midnightAdapter.init({ mode: args.midnightMode || 'local', network: 'testnet' });

  console.log(`  ✅ Midnight adapter initialized (mode=${midnightAdapter.getMode()})`);
  console.log('');

  // Initialize Lace adapter
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 2: Initialize Lace Adapter                             │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  const laceAdapter = new StubLaceAdapter(logger);
  await laceAdapter.init({ mode: args.laceMode || 'stub', network: 'preprod' });
  await laceAdapter.connect();

  const laceAddrs = await laceAdapter.getAddresses();
  console.log(`  ✅ Lace adapter connected (mode=${laceAdapter.getMode()})`);
  console.log(`     Addresses: ${laceAddrs.length}`);
  console.log('');

  // Initialize Prover
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 3: Initialize Prover                                   │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  const prover = new LocalProver(persistence, logger);
  await prover.initialize();
  const proverInfo = prover.getKeyInfo();
  console.log(`  ✅ Prover initialized rootId=${proverInfo?.rootId.slice(0, 16)}...`);
  console.log('');

  // Issue credential
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 4: Issue Verifiable Credential                         │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  const issuer = new CredentialIssuer(persistence, logger);
  await issuer.initialize();

  const credential = issuer.issueCredential({
    subjectId: proverInfo!.rootId,
    claims: {
      age_over_18: true,
      email_verified: true,
      faction_member: 'dragon',
    },
    expiresInSeconds: 3600,
  });

  console.log(`  ✅ Credential issued: ${credential.id.slice(0, 8)}...`);
  console.log('');

  // Store credential in Midnight
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 5: Store Credential in Midnight Storage                │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  const midnightStore = new MidnightCredentialStore({ adapter: midnightAdapter, logger });
  const credRef = await midnightStore.storeCredential(credential);

  console.log(`  ✅ Credential stored with ref=${credRef.slice(0, 24)}...`);
  console.log('');

  // Load credential from Midnight
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 6: Load Credential from Midnight Storage               │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  const loadedCred = await midnightStore.loadCredential(credRef);
  console.log(`  ✅ Credential loaded: ${loadedCred.id.slice(0, 8)}...`);
  console.log(`     Subject matches: ${loadedCred.subject === credential.subject ? '✅' : '❌'}`);
  console.log('');

  // Create ProofRequest
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 7: Verifier creates ProofRequest                       │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  const protocol = new ProofProtocol(persistence, logger);
  const request = await protocol.createRequest({
    audience: 'demo_verifier_app',
    requiredPermissions: ['age_over_18', 'email_verified'],
    ttlSeconds: 300,
  });

  console.log(`  ✅ Request created: ${request.requestId.slice(0, 8)}...`);
  console.log('');

  // Create ConsentGrant
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 8: Prover creates ConsentGrant                         │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  const grant = prover.createConsentGrant(request);
  console.log(`  ✅ Grant created: ${grant.grantId.slice(0, 8)}...`);
  console.log('');

  // Generate proof from Midnight-stored credential
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 9: Generate Proof from Midnight-stored Credential      │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  const proof = prover.generateProofFromCredential(request, loadedCred, grant);
  console.log(`  ✅ Proof generated: ${proof.proofId.slice(0, 8)}...`);
  console.log(`     CredentialId: ${proof.binding.credentialId?.slice(0, 8)}...`);
  console.log('');

  // Verify proof
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 10: Verify Credential-based Proof                      │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  const verifyResult = protocol.verifyCredentialProof(request, proof, loadedCred, grant);

  const checkSymbol = (v: boolean | undefined) => (v === true ? '✅' : v === false ? '❌' : '⚪');
  console.log(`  ${checkSymbol(verifyResult.checks.schemaValid)} Schema validation`);
  console.log(`  ${checkSymbol(verifyResult.checks.notExpired)} Not expired`);
  console.log(`  ${checkSymbol(verifyResult.checks.audienceMatch)} Audience match`);
  console.log(`  ${checkSymbol(verifyResult.checks.permissionsSatisfied)} Permissions satisfied`);
  console.log(`  ${checkSymbol(verifyResult.checks.credentialValid)} Credential valid`);
  console.log(`  ${checkSymbol(verifyResult.checks.credentialSignatureValid)} Credential signature valid`);
  console.log('');

  // Lace tests
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 11: Lace Adapter Tests                                 │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  const laceNetwork = await laceAdapter.getNetwork();
  const laceSignResult = await laceAdapter.signData('phase7_consent_test');

  console.log(`  ✅ Network: ${laceNetwork}`);
  console.log(`  ✅ Sign test: ${laceSignResult.signature.slice(0, 24)}...`);
  console.log('');

  // Summary
  if (verifyResult.valid) {
    console.log('═'.repeat(60));
    console.log('  ✅ PHASE 7 DEMO COMPLETE: All tests PASSED');
    console.log('═'.repeat(60));
  } else {
    console.log('═'.repeat(60));
    console.log('  ❌ PHASE 7 DEMO FAILED');
    console.log('═'.repeat(60));
    console.log('');
    console.log('Errors:');
    verifyResult.errors.forEach((e) => console.log(`  - ${e}`));
  }

  console.log('');
  console.log('Summary:');
  console.log(`  Midnight mode:     ${midnightAdapter.getMode()}`);
  console.log(`  Lace mode:         ${laceAdapter.getMode()}`);
  console.log(`  Credential ref:    ${credRef.slice(0, 24)}...`);
  console.log(`  Proof verified:    ${verifyResult.valid ? '✅' : '❌'}`);
  console.log('');

  process.exit(verifyResult.valid ? 0 : 1);
}

async function main(): Promise<void> {
  checkUNCPath();
  
  const args = parseArgs(process.argv.slice(2));

  if (!args.command || args.command === 'help' || args.command === '--help' || args.command === '-h') {
    printHelp();
    process.exit(0);
  }

  switch (args.command) {
    case 'run':
      await runChecks(args);
      break;
    case 'identity:create':
      await createIdentity(args);
      break;
    case 'deck:create':
      await createDeck(args);
      break;
    case 'request:simulate':
      await simulateRequest(args);
      break;
    case 'request':
      await createProofRequest(args);
      break;
    case 'grant':
      await createConsentGrant(args);
      break;
    case 'prove':
      await createProofResponse(args);
      break;
    case 'verify':
      await verifyProof(args);
      break;
    case 'prover':
      {
        const subCommand = process.argv[3];
        switch (subCommand) {
          case 'init':
            await proverInit(args);
            break;
          case 'grant':
            await proverGrant(args);
            break;
          case 'prove':
            await proverProve(args);
            break;
          default:
            console.error(`Unknown prover subcommand: ${subCommand}`);
            console.log('Available: prover init, prover grant, prover prove');
            process.exit(1);
        }
      }
      break;
    case 'demo':
      {
        const demoType = process.argv[3];
        switch (demoType) {
          case 'phase4':
            await demoPhase4(args);
            break;
          case 'phase5':
            await demoPhase5(args);
            break;
          case 'phase6':
            await demoPhase6(args);
            break;
          case 'phase7':
            await demoPhase7(args);
            break;
          default:
            console.error(`Unknown demo type: ${demoType}`);
            console.log('Available: demo phase4, demo phase5, demo phase6, demo phase7');
            process.exit(1);
        }
      }
      break;
    case 'midnight':
      {
        const midnightSubCmd = process.argv[3];
        switch (midnightSubCmd) {
          case 'status':
            await midnightStatus(args);
            break;
          case 'health':
            await midnightHealth(args);
            break;
          case 'encrypt':
            await midnightEncrypt(args);
            break;
          case 'decrypt':
            await midnightDecrypt(args);
            break;
          case 'cred':
            {
              const credSubCmd = process.argv[4];
              switch (credSubCmd) {
                case 'put':
                  await midnightCredPut(args);
                  break;
                case 'list':
                  await midnightCredList(args);
                  break;
                case 'get':
                  await midnightCredGet(args);
                  break;
                default:
                  console.error(`Unknown midnight cred subcommand: ${credSubCmd}`);
                  console.log('Available: midnight cred put, midnight cred list, midnight cred get');
                  process.exit(1);
              }
            }
            break;
          default:
            console.error(`Unknown midnight subcommand: ${midnightSubCmd}`);
            console.log('Available: midnight status, midnight health, midnight encrypt, midnight decrypt, midnight cred');
            process.exit(1);
        }
      }
      break;
    case 'lace':
      {
        const laceSubCmd = process.argv[3];
        switch (laceSubCmd) {
          case 'status':
            await laceStatus(args);
            break;
          case 'connect':
            await laceConnect(args);
            break;
          case 'addresses':
            await laceAddresses(args);
            break;
          case 'network':
            await laceNetwork(args);
            break;
          case 'sign':
            await laceSign(args);
            break;
          case 'capabilities':
            await laceCapabilities(args);
            break;
          default:
            console.error(`Unknown lace subcommand: ${laceSubCmd}`);
            console.log('Available: lace status, lace connect, lace addresses, lace network, lace sign, lace capabilities');
            process.exit(1);
        }
      }
      break;
    case 'credential':
      {
        const credSubCommand = process.argv[3];
        switch (credSubCommand) {
          case 'issue':
            await credentialIssue(args);
            break;
          case 'list':
            await credentialList(args);
            break;
          case 'verify':
            await credentialVerify(args);
            break;
          default:
            console.error(`Unknown credential subcommand: ${credSubCommand}`);
            console.log('Available: credential issue, credential list, credential verify');
            process.exit(1);
        }
      }
      break;
    default:
      console.error(`Unknown command: ${args.command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
