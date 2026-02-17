# Agility Headless Identity Wallet Engine

**Protocol Version: 0.1.0**

A headless identity orchestration engine designed to manage private identity proofs using Midnight and public settlement using XRPL.

## Supported Midnight Canary Matrix

| Component | Version |
|-----------|---------|
| Ledger | 7.0.0 |
| Node | 0.20.1 |
| Proof Server | 7.0.0 |
| On-chain Runtime | 2.0.0 |
| Indexer | 3.0.0 |
| DApp Connector API | 4.0.0 |
| Wallet SDK | 1.0.0 |
| Midnight.js | 3.0.0 |
| Compact.js | 2.4.0 |

## Network Presets

The SDK supports three network environments:

| Environment | RPC | Indexer | Proof Server |
|-------------|-----|---------|--------------|
| `preprod` | rpc.preprod.midnight.network | indexer.preprod.midnight.network | lace-proof-pub.preprod.midnight.network |
| `preview` | rpc.preview.midnight.network | indexer.preview.midnight.network | lace-proof-pub.preview.midnight.network |
| `local` | localhost:8545 | localhost:4000 | localhost:6300 |

Set via environment variable:
```bash
export MIDNIGHT_ENV=preprod  # or preview, local
```

## SDK Usage

```typescript
import { 
  Verifier, 
  Prover, 
  Credentials,
  createMidnightAdapter,
  createLaceAdapter,
  PROTOCOL_VERSION 
} from '@agility/sdk';

// Initialize Verifier
const verifier = new Verifier({ persistence, logger });
const request = await verifier.createProofRequest({
  audience: 'my-app',
  requiredPermissions: ['age_over_18', 'email_verified'],
});

// Initialize Prover
const prover = await initProver({ persistence, logger });
const grant = prover.createConsentGrant({ request });
const proof = prover.generateProof({ request, grant });

// Verify
const result = verifier.verifyProof({ request, proof });
console.log(result.valid); // true
```

## Health Check

Check Midnight network connectivity:

```bash
npm run cli -- midnight health
```

Output:
```
Network: Midnight Preprod
Protocol: 0.1.0

RPC: ✅ OK (670ms)
Indexer: ✅ OK (679ms)
ProofServer: ✅ OK (450ms)

Matrix:
  Node: 0.20.1
  ProofServer: 7.0.0
  Indexer: 3.0.0
```

## Demo Applications

### Node Verifier Server

A minimal Express server for verification:

```bash
cd examples/node-verifier-server
npm install
npm start
```

Endpoints:
- `POST /request` - Create ProofRequest
- `POST /verify` - Verify ProofResponse
- `GET /health` - Health check

### Browser Demo

A browser-based demo with Lace integration:

```bash
cd examples/browser-demo
# Open index.html in browser
```

Features:
- Connect Lace wallet
- Generate ProofRequest
- Sign consent
- Verify proof

## Overview

Agility Headless is **not** a traditional wallet UI. It is a modular, adapter-based identity orchestration engine that integrates with existing wallets like:

- **Xaman** (XRPL)
- **Lace** (Midnight)

The system is designed to be extensible, allowing Agility to evolve into a full wallet solution if needed.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AgilityHeadless                         │
│                   (Main Orchestrator)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌──────────────────┐  ┌──────────────┐   │
│  │  Identity   │  │  PermissionDeck  │  │    Grant     │   │
│  │  Manager    │  │     Engine       │  │   Manager    │   │
│  └─────────────┘  └──────────────────┘  └──────────────┘   │
│                                                             │
│  ┌─────────────┐  ┌──────────────────┐                     │
│  │   Proof     │  │     State        │                     │
│  │   Engine    │  │    Manager       │                     │
│  └─────────────┘  └──────────────────┘                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                        Adapters                             │
│  ┌─────────────────────┐  ┌─────────────────────────────┐  │
│  │    XRPL Adapter     │  │     Midnight Adapter        │  │
│  │  (Public Settlement)│  │   (Private Identity Proofs) │  │
│  └─────────────────────┘  └─────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Storage Layer                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Encrypted FileSystem Storage                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Module Responsibilities

### IdentityManager

Manages the user's decentralized identity:

- Create identity linked to XRPL and Midnight accounts
- Generate unique identity IDs and hashes
- Store identity state locally
- Anchor identity hash to XRPL via adapter

### PermissionDeckEngine

Manages permission decks (collections of permissions):

- Create and manage permission decks
- Validate deck configurations
- Match decks to incoming proof requests

### GrantManager

Manages permission grants to applications:

- Create permission grants for specific apps
- Revoke grants
- Track active grants
- Sync grants with Midnight adapter

### ProofEngine

Handles proof generation:

- Accept and validate proof requests
- Match requests against available decks and grants
- Generate proofs via Midnight adapter
- Submit settlement receipts to XRPL

### StateManager

Manages persistent state:

- Initialize and persist application state
- Provide state access to all modules
- Handle state migrations

### XRPLAdapter

Interface for XRPL blockchain operations:

- Connect to XRPL wallet
- Anchor identity hashes
- Submit settlement receipts

### MidnightAdapter

Interface for Midnight blockchain operations:

- Connect to Midnight wallet
- Create identity contracts
- Create and revoke grants
- Generate zero-knowledge proofs

## Installation

```bash
npm install
npm run build
```

## Usage

### Basic Example

```typescript
import { AgilityHeadless } from 'agility-headless';

const agility = new AgilityHeadless();

// Initialize the engine
await agility.initialize();

// Create an identity linked to XRPL and Midnight addresses
const identity = await agility.createIdentity(
  'rXRPL_ADDRESS_HERE',
  'midnight_address_here'
);

// Anchor the identity to XRPL
await agility.anchorIdentity();

// Create a permission deck
const deck = await agility.createDeck('Age Verification', [
  'age_over_18',
  'age_over_21',
]);

// Grant permission to an application
const grant = await agility.grantPermission(deck.id, 'example_dapp');

// Handle a proof request from an application
const proofResult = await agility.handleProofRequest({
  id: 'request_123',
  requesterId: 'verifier_456',
  requesterApp: 'example_dapp',
  requiredPermissions: ['age_over_18'],
  createdAt: new Date(),
});

if (proofResult.success) {
  console.log('Proof generated:', proofResult.response?.proof);
}
```

### Configuration Options

```typescript
const agility = new AgilityHeadless({
  storagePath: './my-agility-data',
  encryptStorage: true,
  encryptionKey: 'your-secure-encryption-key',
  xrplNetwork: 'testnet',
  midnightNetwork: 'testnet',
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `storagePath` | string | `./.agility-data` | Path for local storage |
| `encryptStorage` | boolean | `false` | Enable storage encryption |
| `encryptionKey` | string | `''` | Key for storage encryption |
| `xrplNetwork` | string | `'testnet'` | XRPL network to use |
| `midnightNetwork` | string | `'testnet'` | Midnight network to use |

### Custom Adapters

You can replace the default adapters with custom implementations:

```typescript
import { AgilityHeadless, IXRPLAdapter, IMidnightAdapter } from 'agility-headless';

class MyXRPLAdapter implements IXRPLAdapter {
  // Implement the interface
}

class MyMidnightAdapter implements IMidnightAdapter {
  // Implement the interface
}

const agility = new AgilityHeadless();
agility.setXRPLAdapter(new MyXRPLAdapter());
agility.setMidnightAdapter(new MyMidnightAdapter());

await agility.initialize();
```

### Managing Permission Decks

```typescript
// Create a deck
const deck = await agility.createDeck('KYC Verification', [
  'full_name',
  'date_of_birth',
  'country_of_residence',
]);

// Get all decks
const decks = await agility.getDecks();

// Update a deck
await agility.updateDeck(deck.id, {
  name: 'Updated KYC',
  permissions: ['full_name', 'date_of_birth'],
});

// Delete a deck
await agility.deleteDeck(deck.id);
```

### Managing Grants

```typescript
// Grant permission with expiration
const grant = await agility.grantPermission(
  deckId,
  'trusted_app',
  new Date('2025-12-31')
);

// Get active grants
const activeGrants = await agility.getActiveGrants();

// Get grants for a specific app
const appGrants = await agility.getGrantsForApp('trusted_app');

// Revoke a specific grant
await agility.revokeGrant(grant.id);

// Revoke all grants for an app
await agility.revokeAllGrantsForApp('untrusted_app');
```

### Handling Proof Requests

```typescript
import { ProofRequest } from 'agility-headless';

const request: ProofRequest = {
  id: 'unique_request_id',
  requesterId: 'verifier_id',
  requesterApp: 'app_name',
  requiredPermissions: ['age_over_18'],
  challenge: 'random_challenge_string',
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 300000), // 5 minutes
};

// Validate the request
const validation = await agility.validateProofRequest(request);
if (!validation.valid) {
  console.error('Invalid request:', validation.errors);
}

// Check if we can fulfill the request
const canFulfill = await agility.canFulfillProofRequest(request);

// Handle the request
const result = await agility.handleProofRequest(request);
```

## Project Structure

```
agility-headless/
├── src/
│   ├── core/
│   │   ├── IdentityManager.ts
│   │   ├── PermissionDeckEngine.ts
│   │   ├── ProofEngine.ts
│   │   ├── GrantManager.ts
│   │   └── StateManager.ts
│   │
│   ├── adapters/
│   │   ├── xrpl/
│   │   │   ├── XRPLAdapter.ts
│   │   │   └── XRPLTypes.ts
│   │   │
│   │   └── midnight/
│   │       ├── MidnightAdapter.ts
│   │       └── MidnightTypes.ts
│   │
│   ├── storage/
│   │   ├── StorageAdapter.ts
│   │   └── FileSystemStorage.ts
│   │
│   ├── types/
│   │   ├── Identity.ts
│   │   ├── PermissionDeck.ts
│   │   ├── Grant.ts
│   │   └── ProofRequest.ts
│   │
│   └── AgilityHeadless.ts
│
├── package.json
├── tsconfig.json
└── README.md
```

## Design Principles

1. **Adapter Pattern**: All external integrations (XRPL, Midnight) use interface-driven adapters, making them easily replaceable.

2. **Clean Architecture**: Core business logic is separated from infrastructure concerns.

3. **No Key Storage**: Agility does not store private keys. External wallets handle all signing operations.

4. **Modular Design**: Each component has a single responsibility and can be used independently.

5. **Extensibility**: The system is designed to evolve from a headless engine to a full wallet if needed.

## Future Roadmap

This engine serves as the foundation for:

- **Agility Web App**
- **Agility xApp** (XRPL ecosystem)
- **Agility Mobile App**
- **Agility Full Wallet** (future)

## CLI Demo / Debug

The CLI provides a debugging pipeline to test the full headless flow in **mock** or **real** mode.

### WSL Requirement

This project must be run from within WSL (Windows Subsystem for Linux). Running from Windows PowerShell with UNC paths will fail.

### Installation

```bash
npm install
npm run build
```

### Running the CLI

**From WSL terminal** (recommended):

```bash
# Mock mode (default) - uses stub adapters
npm run cli -- run --xrpl rTEST --midnight mTEST --debug

# Real mode - uses real XRPL testnet transactions
npm run cli -- run --mode real --midnight mTEST --debug
```

**From Windows PowerShell** (use wrapper):

```powershell
# Using the helper script
.\scripts\run-wsl.ps1 run --xrpl rTEST --midnight mTEST --debug

# Or manually
wsl -e bash -c "cd /home/anthony/CascadeProjects/Windsurf-Porject/agility-headless && npm run cli -- run --xrpl rTEST --midnight mTEST --debug"
```

### Mock vs Real Mode

| Mode | Description |
|------|-------------|
| `mock` | Uses stub adapters. No real blockchain calls. Deterministic output. Default mode. |
| `real` | Uses real XRPL testnet. Submits actual transactions. Requires funded wallet. |

### Setting Up Real Mode

1. **Get a testnet wallet**: Visit https://xrpl.org/xrp-testnet-faucet.html
2. **Copy `.env.template` to `.env`**:
   ```bash
   cp .env.template .env
   ```
3. **Add your testnet seed**:
   ```
   AGILITY_MODE=real
   XRPL_NETWORK=testnet
   XRPL_SEED=sYourTestnetSeedHere
   ```
4. **Run in real mode**:
   ```bash
   npm run cli -- run --mode real --midnight mTEST --debug
   ```

### CLI Commands

| Command | Description |
|---------|-------------|
| `run` | Run the full checks pipeline (Phase 2) |
| `request` | Create a new ProofRequest with nonce + expiry (Phase 3) |
| `grant` | Create a ConsentGrant from a ProofRequest (Phase 3) |
| `prove` | Generate a ProofResponse with binding (Phase 3) |
| `verify` | Verify a proof against a request (Phase 3) |
| `identity:create` | Create a new identity |
| `deck:create` | Create a new permission deck |
| `request:simulate` | Simulate a proof request (legacy) |

### CLI Options

| Option | Description |
|--------|-------------|
| `--mode <mock\|real>` | Adapter mode (default: mock) |
| `--xrpl <address>` | XRPL wallet address (mock mode) |
| `--midnight <address>` | Midnight wallet address |
| `--name <name>` | Deck name (for deck:create) |
| `--perm <p1,p2,...>` | Permissions (comma-separated) |
| `--audience <aud>` | Audience for proof request (e.g. app domain) |
| `--ttl <seconds>` | Time-to-live for request (default: 300) |
| `--request <path\|json>` | ProofRequest file path or JSON |
| `--grant <path\|json>` | ConsentGrant file path or JSON |
| `--proof <path\|json>` | ProofResponse file path or JSON |
| `--receipt <txHash>` | Transaction hash to verify |
| `--out <path>` | Output file path for JSON |
| `--debug, -d` | Enable debug logging |

### Example Output (Mock Mode)

```
[Agility] Mode: mock
[Agility] Starting checks pipeline (mode=mock)...

[Agility] ✅ Storage round-trip (5ms)
          key=__test__
[Agility] ✅ Identity created (12ms)
          id=agility_id_abc123..., xrpl=rTEST, midnight=mTEST
[Agility] ✅ Identity anchored (3ms)
          txId=XRPL_TX_a1b2c3d4e5
[Agility] ✅ Deck created (8ms)
          id=deck_xyz789..., name="Test Deck", permissions=[age_over_18, email_verified]
[Agility] ✅ Deck matching (2ms)
          Matched deck for permissions=[age_over_18]
[Agility] ✅ Grant created (6ms)
          id=grant_def456..., app="test_app", permissions=[age_over_18, email_verified]
[Agility] ✅ Proof generated (4ms)
          verified=true, proofId=MID_PROOF_abc123def4
[Agility] ✅ Receipt submitted (2ms)
          receiptId=XRPL_RCPT_typepro

[Agility] All checks passed!
```

### Example Output (Real Mode)

```
[Agility] Mode: real
[Agility] XRPL Network: testnet
[Agility] Starting checks pipeline (mode=real)...

[Agility] ✅ Storage round-trip (3ms)
[Agility] ✅ Identity created (15ms)
          id=agility_id_..., xrpl=rPx7b..., midnight=mTEST
[Agility] ✅ Identity anchored (4523ms)
          txId=A1B2C3D4E5F6...  <-- Real XRPL transaction hash!
...
```

### Verify Command

```bash
# Verify a mock receipt
npm run cli -- verify --receipt XRPL_RCPT_abc123

# Verify a real transaction on testnet
npm run cli -- verify --receipt A1B2C3D4E5F6... --mode real

# Verify a proof JSON
npm run cli -- verify --proof '{"proofId":"...", "requestId":"...", "satisfied":["age_over_18"], "timestamp":"..."}'
```

### Phase 3: Proof Request → Verify Flow

Phase 3 implements a complete request → grant → prove → verify flow with replay resistance:

```bash
# Step 1: Create a ProofRequest with nonce + expiry
npm run cli -- request --audience test_app --perm age_over_18 --out request.json

# Step 2: Create a ConsentGrant from the request
npm run cli -- grant --request request.json --out grant.json

# Step 3: Generate a ProofResponse with binding
npm run cli -- prove --request request.json --grant grant.json --out proof.json

# Step 4: Verify the proof against the request
npm run cli -- verify --request request.json --proof proof.json
```

**With real XRPL receipt:**

```bash
# Generate proof and submit receipt to XRPL testnet
npm run cli -- prove --request request.json --grant grant.json --mode real --out proof.json

# Verify with on-chain receipt lookup
npm run cli -- verify --request request.json --proof proof.json --receipt <txHash> --mode real
```

#### Example ProofRequest

```json
{
  "requestId": "1232f88e-db3d-4fc5-b286-738043096688",
  "requiredPermissions": ["age_over_18"],
  "nonce": "0e8282f7e62d591fce9921b4e74fe6d2",
  "audience": "test_app",
  "expiresAt": "2026-02-17T04:11:43.690Z",
  "issuedAt": "2026-02-17T04:06:43.690Z",
  "version": "0.1"
}
```

#### Example ConsentGrant

```json
{
  "grantId": "413ea39b-03e7-46ff-850d-1d46fddc1b55",
  "requestId": "1232f88e-db3d-4fc5-b286-738043096688",
  "audience": "test_app",
  "nonce": "0e8282f7e62d591fce9921b4e74fe6d2",
  "permissions": ["age_over_18"],
  "expiresAt": "2026-02-17T04:11:43.690Z",
  "issuedAt": "2026-02-17T04:06:50.233Z",
  "signer": {
    "type": "did",
    "id": "did:key:50b455419b728362025e885baa256ef0"
  },
  "signature": "mock_sig_3e1b46f54e1e0728aadc930b7e9a3e1b",
  "version": "0.1"
}
```

#### Example ProofResponse

```json
{
  "proofId": "a1314685-14eb-4585-8cc5-e196f8ebaca7",
  "requestId": "1232f88e-db3d-4fc5-b286-738043096688",
  "audience": "test_app",
  "nonce": "0e8282f7e62d591fce9921b4e74fe6d2",
  "satisfiedPermissions": ["age_over_18"],
  "verified": true,
  "issuedAt": "2026-02-17T04:06:58.128Z",
  "expiresAt": "2026-02-17T04:11:43.690Z",
  "proof": {
    "type": "mock_zk_proof",
    "satisfiedPermissions": ["age_over_18"],
    "timestamp": "2026-02-17T04:06:58.128Z"
  },
  "binding": {
    "requestHash": "6b19d7b41554cc6ef4e0eb2e7c1bc8eae4a22a9856a368066bcaed3195213f34"
  },
  "prover": {
    "type": "local",
    "id": "agility-headless"
  },
  "version": "0.1"
}
```

#### Verification Checks

The `verify` command performs these checks:

| Check | Description |
|-------|-------------|
| Schema validation | ProofRequest and ProofResponse match zod schemas |
| Not expired | `now < expiresAt` |
| Audience match | Proof audience matches request audience |
| Nonce match | Proof nonce matches request nonce |
| Request ID match | Proof requestId matches request requestId |
| Permissions satisfied | `requiredPermissions ⊆ satisfiedPermissions` |
| Binding hash valid | `binding.requestHash == sha256(canonical(request))` |
| Receipt valid | (real mode) Transaction exists on XRPL ledger |

### Persistence

All records are persisted to JSON files in the storage directory:
- Identities, anchors, decks, grants, proofs, receipts
- ProofRequests, ConsentGrants, LocalKeys (Phase 3)
- Default path: `./.agility-cli-test/persistence.json`

### Debug Mode

In `--debug` mode, the CLI shows:
- Configuration summary (with masked secrets)
- Each internal step with timestamps
- Meta objects with full details
- Timing for each check

In non-debug mode:
- Only ✅/❌ check summaries
- Essential IDs and results

## Phase 4 — Wallet-side Prover

Phase 4 implements a true wallet-side prover model by splitting the system into two logical roles:

### What is Agility?

Agility is a **decentralized identity and permission protocol** that allows wallets to generate verifiable proofs bound to verifier requests without revealing private data.

### Roles

```
┌─────────────────────────────────────────────────────────────┐
│                      VERIFIER                                │
│  (Application requesting proof)                              │
│                                                              │
│  - Creates ProofRequest with nonce + expiry                  │
│  - Verifies ProofResponse                                    │
│  - Optionally checks XRPL receipt                            │
│  - NEVER has access to prover keys                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ ProofRequest
┌─────────────────────────────────────────────────────────────┐
│                       PROVER                                 │
│  (User's wallet / identity holder)                           │
│                                                              │
│  - Holds identity keys locally                               │
│  - Creates ConsentGrant                                      │
│  - Generates ProofResponse                                   │
│  - NEVER exposes private keys                                │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ ProofResponse
┌─────────────────────────────────────────────────────────────┐
│                      VERIFIER                                │
│  - Verifies proof against request                            │
│  - Checks binding hash                                       │
│  - Validates permissions                                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ (optional)
┌─────────────────────────────────────────────────────────────┐
│                        XRPL                                  │
│  - Anchors receipt for audit trail                           │
│  - Provides on-chain verification                            │
└─────────────────────────────────────────────────────────────┘
```

### Pairwise Identifiers

To prevent cross-app tracking, the prover generates a **unique pairwise identifier** for each audience:

```
pairwiseId = sha256(rootId + audience)
```

- **Different ID per app**: Each verifier sees a different identifier
- **Stable per app**: Same verifier always sees the same identifier
- **Prevents correlation**: Apps cannot link user activity across services

### Protocol Flow

```
Verifier                          Prover (Wallet)
   │                                   │
   │  1. Create ProofRequest           │
   │  ─────────────────────────────►   │
   │                                   │
   │                                   │  2. Initialize identity
   │                                   │  3. Create ConsentGrant
   │                                   │  4. Generate ProofResponse
   │                                   │
   │  ◄─────────────────────────────   │
   │  5. Verify proof                  │
   │                                   │
   │  6. (optional) Check XRPL receipt │
   │                                   │
```

### CLI Commands

**Verifier commands:**

```bash
# Create a proof request
npm run cli -- request --audience test_app --perm age_over_18 --out request.json

# Verify a proof
npm run cli -- verify --request request.json --proof proof.json
```

**Prover commands:**

```bash
# Initialize prover identity (generates or loads keys)
npm run cli -- prover init

# Create consent grant from request
npm run cli -- prover grant --request request.json --out grant.json

# Generate proof response
npm run cli -- prover prove --request request.json --grant grant.json --out proof.json

# With XRPL receipt (real mode)
npm run cli -- prover prove --request request.json --grant grant.json --mode real --out proof.json
```

**Demo command:**

```bash
# Run full Phase 4 protocol flow
npm run cli -- demo phase4

# With XRPL receipt
npm run cli -- demo phase4 --mode real
```

### Example Demo Output

```
══════════════════════════════════════════════════
  PHASE 4 DEMO: Verifier + Prover Protocol Flow
══════════════════════════════════════════════════

┌─────────────────────────────────────────────────┐
│ STEP 1: Verifier creates ProofRequest           │
└─────────────────────────────────────────────────┘
  ✅ Verifier created requestId=677d235f...
     Audience: demo_verifier_app
     Permissions: age_over_18, email_verified

┌─────────────────────────────────────────────────┐
│ STEP 2: Prover initializes identity             │
└─────────────────────────────────────────────────┘
  ✅ Prover initialized rootId=6fac6602036bde10...
     Pairwise ID for "demo_verifier_app": bfa0c90bfe0779da...

┌─────────────────────────────────────────────────┐
│ STEP 3: Prover creates ConsentGrant             │
└─────────────────────────────────────────────────┘
  ✅ Prover created grantId=3d7eeff8...
     Signer: did:agility:bfa0c90bfe0779da20eaad86cb9e4012

┌─────────────────────────────────────────────────┐
│ STEP 4: Prover generates ProofResponse          │
└─────────────────────────────────────────────────┘
  ✅ Prover created proofId=cf543bd2...
     Verified: true
     Binding: 1546dfb654012095...

┌─────────────────────────────────────────────────┐
│ STEP 5: Verifier verifies ProofResponse         │
└─────────────────────────────────────────────────┘
  ✅ Schema validation
  ✅ Not expired
  ✅ Audience match
  ✅ Nonce match
  ✅ Request ID match
  ✅ Permissions satisfied
  ✅ Binding hash valid

══════════════════════════════════════════════════
  ✅ DEMO COMPLETE: Verification PASSED
══════════════════════════════════════════════════

Summary:
  Verifier created requestId=677d235f...
  Prover created grantId=3d7eeff8...
  Prover created proofId=cf543bd2...
  Verifier verified proof successfully
```

### Key Isolation

The `LocalProver` module ensures:

- **Root key never leaves prover**: Private key is stored locally and never exposed
- **Signatures are deterministic**: Based on canonical JSON + root key hash
- **Pairwise IDs are derived**: From root ID + audience, preventing tracking

### Persistence (Phase 4)

Additional records stored:

| Record | Description |
|--------|-------------|
| `rootKeyPair` | Prover's root public/private key pair |
| `pairwiseIds` | Mapping of audience → pairwise identifier |

## Phase 5 — Xaman Consent Signing (Wallet UX)

Phase 5 adds **wallet-based consent signatures** via Xaman (Xumm) as an optional signer path for ConsentGrant.

### What Phase 5 Adds

- **Xaman wallet consent signing**: Users approve consent requests in their Xaman mobile wallet
- **SignerProvider abstraction**: Pluggable signer interface for local or Xaman signing
- **On-ledger consent anchoring**: Consent is recorded as an XRPL AccountSet transaction with Memo
- **Enhanced verification**: Verifier can validate both local and Xaman-signed grants

### What Phase 5 Does NOT Do

- **Xaman is NOT the prover runtime**: Proof generation still happens locally in `LocalProver`
- **No XRPL signing for every step**: Only ConsentGrant uses Xaman; proofs are local
- **No private data on-chain**: Only consent hash, requestId, and audience go in the Memo

### Setup

1. **Get Xaman API credentials** at https://apps.xumm.dev/

2. **Add to `.env`**:
```bash
XAMAN_API_KEY=your_api_key_here
XAMAN_API_SECRET=your_api_secret_here
```

3. **Fund your XRPL testnet wallet** (for real mode receipts):
   - Get testnet XRP at https://xrpl.org/xrp-testnet-faucet.html

### CLI Commands

**Prover grant with Xaman signing:**

```bash
npm run cli -- prover grant --request request.json --signer xaman --out grant.json
```

**Full Phase 5 demo:**

```bash
# With local signer (default)
npm run cli -- demo phase5 --signer local

# With Xaman signer (requires XAMAN_API_KEY/SECRET)
npm run cli -- demo phase5 --signer xaman

# With XRPL receipt anchoring
npm run cli -- demo phase5 --signer xaman --mode real
```

### Consent Encoding

When using Xaman, consent is encoded as an XRPL AccountSet transaction with a Memo:

| Field | Description |
|-------|-------------|
| `MemoType` | `agility_consent` (hex encoded) |
| `MemoData` | JSON with requestId, requestHash, audience, consentHash |

**What goes on-ledger:**
- `requestId` (UUID)
- `requestHash` (sha256 of canonical ProofRequest)
- `audience` (app identifier)
- `consentHash` (sha256 of canonical ConsentPayload, truncated)

**What NEVER goes on-ledger:**
- Private keys
- Personal data
- Permission details beyond what's in the hash

### ConsentPayload Format

```typescript
interface ConsentPayload {
  version: '0.1';
  requestId: string;      // UUID of the ProofRequest
  audience: string;       // App identifier
  nonce: string;          // Replay protection
  expiresAt: string;      // ISO timestamp
  issuedAt: string;       // ISO timestamp
  permissions: string[];  // Permissions being granted
  requestHash: string;    // sha256(canonical(ProofRequest))
}
```

### Verification Logic

**For local signer (did):**
- Signature must start with `agility_sig_` or `mock_sig_`
- Deterministic based on canonical payload + root key

**For Xaman signer (xrpl):**
- Signature contains Xaman payload UUID or signed blob
- `signatureMeta` contains txid, payloadUuid, consentHash
- In `--mode real`, verifier can fetch tx from XRPL to confirm

### Troubleshooting

**WSL Issues:**
- Run from WSL terminal, not Windows PowerShell
- Use `wsl -e bash -c "cd /path && npm run cli -- ..."` if needed

**QR Code / Deep Link:**
- Xaman displays QR code URL and deep link in terminal
- Open Xaman app and scan QR or tap deep link

**Testnet Explorer:**
- View transactions at https://testnet.xrpl.org/

## Phase Progression

| Phase | Description |
|-------|-------------|
| **Phase 2** | XRPL anchoring with AccountSet + Memos |
| **Phase 3** | ProofRequest/Grant/Response schemas with canonical hashing |
| **Phase 4** | Wallet-side prover with local keys and pairwise IDs |
| **Phase 5** | Wallet UX consent via Xaman |
| **Phase 6** | Verifiable Credentials with cryptographic proofs (current) |

---

## Phase 6: Verifiable Credentials

Phase 6 introduces a **Verifiable Credentials (VC)** layer that enables cryptographic selective disclosure. Credentials are issued by trusted issuers, stored by wallet holders, and used to generate proofs that verifiers can validate without accessing the underlying data.

### Architecture Overview

```
┌─────────────────┐     issues      ┌─────────────────┐
│  Credential     │ ──────────────► │  Verifiable     │
│  Issuer         │                 │  Credential     │
└─────────────────┘                 └────────┬────────┘
                                             │
                                             │ stored by
                                             ▼
┌─────────────────┐                 ┌─────────────────┐
│  Verifier       │ ◄────────────── │  Wallet Holder  │
│  (App)          │   proof from    │  (Prover)       │
└─────────────────┘   credential    └─────────────────┘
```

### Credential Schema

```typescript
interface VerifiableCredential {
  id: string;                    // UUID
  issuer: string;                // did:agility:issuer:...
  subject: string;               // did:agility:... (holder's ID)
  issuedAt: string;              // ISO timestamp
  expiresAt?: string;            // Optional expiry
  claims: CredentialClaims;      // Key-value claims
  proof: CredentialProof;        // Cryptographic signature
  version: '0.1';
}

interface CredentialClaims {
  [key: string]: boolean | string | number | null;
}

interface CredentialProof {
  type: string;                  // e.g., 'Ed25519Signature2020'
  created: string;               // ISO timestamp
  verificationMethod: string;    // Issuer's key reference
  signature: string;             // agility_vc_sig_...
}
```

### CLI Commands

#### Issue a Credential

```bash
npm run cli -- credential issue \
  --subject "did:agility:user123" \
  --claim age_over_18=true \
  --claim email_verified=true \
  --claim faction_member=dragon \
  --ttl 86400 \
  --out credential.json
```

#### List Stored Credentials

```bash
npm run cli -- credential list
```

#### Verify a Credential

```bash
npm run cli -- credential verify --credential credential.json
```

### Credential-based Proof Flow

```bash
# 1. Issuer issues credential to user
npm run cli -- credential issue \
  --subject $(npm run cli -- prover init 2>/dev/null | grep rootId | cut -d= -f2) \
  --claim age_over_18=true \
  --out credential.json

# 2. Verifier creates request
npm run cli -- request \
  --audience my_app \
  --perm age_over_18 \
  --out request.json

# 3. Prover creates grant
npm run cli -- prover grant \
  --request request.json \
  --out grant.json

# 4. Prover generates credential-based proof
npm run cli -- prover prove \
  --request request.json \
  --grant grant.json \
  --credential credential.json \
  --out proof.json

# 5. Verifier verifies proof
npm run cli -- verify \
  --request request.json \
  --proof proof.json
```

### Demo: Phase 6 Flow

Run the complete Phase 6 demo:

```bash
npm run cli -- demo phase6
```

Output:
```
════════════════════════════════════════════════════════════
  PHASE 6 DEMO: Verifiable Credentials Protocol Flow
════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Initialize Credential Issuer                        │
└─────────────────────────────────────────────────────────────┘
  ✅ Issuer initialized: did:agility:issuer:abc123...

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Initialize Prover (wallet holder)                   │
└─────────────────────────────────────────────────────────────┘
  ✅ Prover initialized rootId=def456...

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Issuer issues Verifiable Credential to Prover       │
└─────────────────────────────────────────────────────────────┘
  ✅ Credential issued: 550e8400...
     Subject: def456...
     Claims: age_over_18, email_verified, faction_member
     Signature: agility_vc_sig_...

┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Verifier creates ProofRequest                       │
└─────────────────────────────────────────────────────────────┘
  ✅ Verifier created requestId=789abc...

┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Prover creates ConsentGrant                         │
└─────────────────────────────────────────────────────────────┘
  ✅ Prover created grantId=012def...

┌─────────────────────────────────────────────────────────────┐
│ STEP 6: Prover generates Credential-based ProofResponse     │
└─────────────────────────────────────────────────────────────┘
  ✅ Prover created proofId=345ghi...
     CredentialId: 550e8400...
     CredentialHash: abc123def456...

┌─────────────────────────────────────────────────────────────┐
│ STEP 7: Verifier verifies Credential-based Proof            │
└─────────────────────────────────────────────────────────────┘
  ✅ Schema validation
  ✅ Not expired
  ✅ Audience match
  ✅ Nonce match
  ✅ Request ID match
  ✅ Permissions satisfied
  ✅ Binding hash valid
  ✅ Credential valid
  ✅ Credential signature valid
  ✅ Credential claims valid

════════════════════════════════════════════════════════════
  ✅ PHASE 6 DEMO COMPLETE: Credential Verification PASSED
════════════════════════════════════════════════════════════

Trust Chain:
  Issuer: did:agility:issuer:abc123...
    ↓ issued credential to
  Subject: did:agility:def456...
    ↓ generated proof for
  Verifier: demo_verifier_app
```

### Verification Checks

The credential-based verification adds these checks:

| Check | Description |
|-------|-------------|
| `credentialValid` | Credential schema is valid and not expired |
| `credentialSignatureValid` | Issuer's signature is valid |
| `credentialSubjectValid` | Credential subject matches prover |
| `credentialClaimsValid` | Required claims are present in credential |

### Credential Anchoring (Optional)

Credentials can be anchored to XRPL for tamper-evident timestamping:

```typescript
import { CredentialAnchor } from './credentials/CredentialAnchor.js';

const anchor = new CredentialAnchor(persistence, { network: 'testnet' });
const result = await anchor.anchorCredential(credential);

console.log('Anchored:', result.txHash);
```

### Running Tests

```bash
# Run Phase 6 credential tests
npm run cli -- test:credentials

# Or directly:
node dist/tests/credential.test.js
```

### Key Components

| Component | File | Description |
|-----------|------|-------------|
| `VerifiableCredential` | `src/credentials/VerifiableCredential.ts` | Schema and validation |
| `CredentialIssuer` | `src/credentials/CredentialIssuer.ts` | Key management and issuance |
| `CredentialStore` | `src/credentials/CredentialStore.ts` | Persistence wrapper |
| `CredentialAnchor` | `src/credentials/CredentialAnchor.ts` | XRPL anchoring |
| `LocalProver` | `src/prover/LocalProver.ts` | Credential-based proof generation |
| `ProofProtocol` | `src/protocol/ProofProtocol.ts` | Credential proof verification |

### Future: Zero-Knowledge Proofs

Phase 6 establishes the VC foundation for future ZK integration:

- Credential claims can be selectively disclosed
- Proof binding includes credential hash for integrity
- Verification engine supports pluggable proof types
- Schema is compatible with W3C Verifiable Credentials

## Phase 7: Midnight + Lace Integration

Phase 7 introduces optional integration with **Midnight** for encrypted credential storage and **Lace** for Cardano wallet connectivity. Both integrations are fully optional and backward-compatible with existing CLI commands.

### Overview

| Feature | Description |
|---------|-------------|
| Midnight Storage | Encrypted credential storage using AES-256-GCM |
| Lace Wallet | Cardano wallet adapter for signing and addresses |
| Local Fallback | Works without external SDKs using local encryption |
| CLI Commands | Full command suite for testing both adapters |

### Midnight Adapter

The Midnight adapter provides encrypted credential storage with two modes:

- **`local`** (default): Uses AES-256-GCM encryption with a locally-generated key
- **`sdk`**: Reserved for future Midnight SDK integration

```bash
# Check Midnight adapter status
npm run cli -- midnight status

# Encrypt/decrypt data
npm run cli -- midnight encrypt --in "secret data" --out ciphertext.txt
npm run cli -- midnight decrypt --in ciphertext.txt

# Store credential in Midnight storage
npm run cli -- midnight cred put --credential credential.json --subject <subjectId>

# List credentials for a subject
npm run cli -- midnight cred list --subject <subjectId>

# Load credential from Midnight storage
npm run cli -- midnight cred get --ref <ref> --out credential.json
```

### Lace Adapter

The Lace adapter provides Cardano wallet connectivity with two modes:

- **`stub`** (default): Deterministic mock responses for CLI testing
- **`browser`**: Real Lace wallet via CIP-30 API (browser only)

```bash
# Check Lace adapter status
npm run cli -- lace status

# Connect to wallet
npm run cli -- lace connect

# Get wallet addresses
npm run cli -- lace addresses

# Get current network
npm run cli -- lace network

# Sign data
npm run cli -- lace sign --data "consent payload"
```

### Phase 7 Demo

Run the full Phase 7 demo to test Midnight + Lace integration:

```bash
npm run cli -- demo phase7
```

This demo:
1. Initializes Midnight adapter (local mode)
2. Initializes Lace adapter (stub mode)
3. Issues a Verifiable Credential
4. Stores credential in Midnight encrypted storage
5. Loads credential from Midnight storage
6. Creates ProofRequest and ConsentGrant
7. Generates proof from Midnight-stored credential
8. Verifies the credential-based proof
9. Tests Lace signing functionality

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MIDNIGHT_MODE` | Midnight mode: `local` or `sdk` | `local` |
| `MIDNIGHT_NETWORK` | Network: `testnet` or `mainnet` | `testnet` |
| `LACE_MODE` | Lace mode: `stub` or `browser` | `stub` |
| `LACE_NETWORK` | Cardano network: `preprod`, `preview`, `mainnet` | `preprod` |

### CLI Options

| Option | Description |
|--------|-------------|
| `--midnight-mode <mode>` | Set Midnight mode: `local` or `sdk` |
| `--lace-mode <mode>` | Set Lace mode: `stub` or `browser` |
| `--ref <ref>` | Credential reference for Midnight operations |
| `--in <data>` | Input data for encrypt/decrypt |
| `--data <payload>` | Data to sign with Lace |

### Programmatic Usage

```typescript
import { LocalEncryptedMidnightAdapter } from './adapters/midnight/LocalEncryptedMidnightAdapter.js';
import { StubLaceAdapter } from './adapters/lace/StubLaceAdapter.js';
import { MidnightCredentialStore } from './credentials/MidnightCredentialStore.js';

// Initialize Midnight adapter
const midnightAdapter = new LocalEncryptedMidnightAdapter(persistence, logger);
await midnightAdapter.init({ mode: 'local', network: 'testnet' });

// Store credential encrypted
const store = new MidnightCredentialStore({ adapter: midnightAdapter, logger });
const ref = await store.storeCredential(credential);

// Load credential decrypted
const loaded = await store.loadCredential(ref);

// Initialize Lace adapter
const laceAdapter = new StubLaceAdapter(logger);
await laceAdapter.init({ mode: 'stub', network: 'preprod' });
await laceAdapter.connect();

// Get addresses and sign
const addresses = await laceAdapter.getAddresses();
const signResult = await laceAdapter.signData('consent payload');
```

### Key Components

| Component | File | Description |
|-----------|------|-------------|
| `IMidnightStorageAdapter` | `src/adapters/midnight/IMidnightAdapter.ts` | Storage adapter interface |
| `LocalEncryptedMidnightAdapter` | `src/adapters/midnight/LocalEncryptedMidnightAdapter.ts` | Local AES-GCM encryption |
| `ILaceAdapter` | `src/adapters/lace/ILaceAdapter.ts` | Wallet adapter interface |
| `StubLaceAdapter` | `src/adapters/lace/StubLaceAdapter.ts` | CLI stub implementation |
| `LaceAdapter` | `src/adapters/lace/LaceAdapter.ts` | Browser CIP-30 implementation |
| `MidnightCredentialStore` | `src/credentials/MidnightCredentialStore.ts` | Credential storage wrapper |

### Running Tests

```bash
# Run Phase 7 unit tests
node dist/tests/phase7.test.js

# Run Phase 7 demo
npm run cli -- demo phase7

# Test individual commands
npm run cli -- midnight status
npm run cli -- lace status
```

### Security Notes

- Encryption keys are generated using Node.js `crypto.randomBytes(32)`
- AES-256-GCM provides authenticated encryption
- Keys are stored in the persistence layer (protect this file!)
- Lace browser mode requires user approval for wallet access
- Stub mode signatures are deterministic and NOT cryptographically secure

## Security Considerations

- Storage encryption is optional but recommended for production use
- Root private key is stored locally and never transmitted
- Pairwise identifiers prevent cross-app tracking
- All sensitive operations are logged for audit purposes
- Grants can be time-limited and revoked at any time
- Binding hash ensures proof is tied to specific request
- Xaman consent requires explicit user approval in mobile wallet
- API keys/secrets are never logged (even masked)

## License

MIT
