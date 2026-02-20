# Agility Protocol

**Protocol Version: 1.0** | **127+ Tests** | **TypeScript**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## What is Agility Protocol?

Agility is a **privacy-preserving identity verification protocol** that enables applications to verify user eligibility without exposing wallet history, balances, or personal data.

The protocol uses a simple three-message flow:

```
Verifier                          Prover (Wallet)
   │                                   │
   │  1. ProofRequest ─────────────►   │
   │                                   │  (User reviews & consents)
   │  ◄───────────── 2. ConsentGrant   │
   │  ◄───────────── 3. ProofResponse  │
   │                                   │
   ▼  (Verify proof)                   ▼
```

**Key Properties:**
- **Privacy-Preserving** — Selective disclosure reveals only what's needed
- **Wallet-Controlled** — Users sign consent; Agility never holds keys
- **Pairwise DIDs** — Unique identifier per application prevents tracking
- **Replay-Resistant** — Nonce + expiry + replay cache prevent proof reuse
- **Chain-Agnostic** — Optional anchoring on XRPL or Cardano

## Quick Start

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run offline demo (no network required)
npm run demo:offline

# Run all tests
npm run test:all
```

## SDK Usage

```typescript
import { 
  ProofProtocol, 
  LocalProver, 
  JsonPersistence,
  PROTOCOL_VERSION 
} from '@agility-protocol/headless';

// Initialize
const persistence = new JsonPersistence('./data');
await persistence.initialize();

const protocol = new ProofProtocol(persistence);
const prover = new LocalProver(persistence);
await prover.initialize();

// Verifier creates a request
const request = await protocol.createRequest({
  audience: 'my-app',
  requiredPermissions: ['age_over_18'],
  ttlSeconds: 300,
});

// Prover creates consent and proof
const grant = prover.createConsentGrant(request);
const proof = await protocol.createProof({
  request,
  grant,
  deckPermissions: request.requiredPermissions,
});

// Verifier validates
const result = protocol.verify(request, proof, grant);
console.log(result.valid); // true
```

## Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `ENABLE_REPLAY_PROTECTION` | `true` | Prevent proof reuse |
| `ENABLE_XRPL_CONSENT_TX_VERIFY` | `false` | Verify XRPL on-chain consent |
| `ENABLE_CARDANO_SIGNDATA_VERIFY` | `false` | Verify Cardano CIP-30 signatures |
| `ENABLE_PAIRWISE_DID` | `true` | Use pairwise DIDs per audience |
| `ENABLE_STRICT_DECK_PERMISSIONS` | `false` | Strict permission validation |

Set via environment variables:
```bash
export ENABLE_XRPL_CONSENT_TX_VERIFY=true
export XRPL_RPC_URL=https://s.altnet.rippletest.net:51234
```

## Demo Commands

| Command | Description |
|---------|-------------|
| `npm run demo:offline` | Full verification (no network) |
| `npm run demo:xrpl` | XRPL consent verification |
| `npm run demo:cardano` | Cardano signData verification |
| `npm run test:all` | Run all 127+ tests |

## CLI Commands

| Command | Description |
|---------|-------------|
| `npm run cli -- demo offline` | Offline verification demo |
| `npm run cli -- demo xrpl` | XRPL consent demo |
| `npm run cli -- demo cardano` | Cardano signData demo |
| `npm run cli -- deck create` | Create a deck instance |
| `npm run cli -- request --perm <perms>` | Create ProofRequest |

## Documentation

| Document | Description |
|----------|-------------|
| [PROTOCOL.md](docs/PROTOCOL.md) | Formal protocol specification |
| [PRIVACY_PROPERTIES.md](docs/PRIVACY_PROPERTIES.md) | Privacy guarantees and threat model |
| [DECKS.md](docs/DECKS.md) | Permission deck system |
| [DEMO.md](docs/DEMO.md) | Demo walkthroughs and tutorials |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture |

## Verification Pipeline

The protocol performs these checks in order:

| Check | Description |
|-------|-------------|
| Schema Valid | Request/Response match protocol schema |
| Time Range Valid | issuedAt/expiresAt sanity checks |
| Not Expired | `now < expiresAt` |
| Not Too Old | Proof age within 600 seconds |
| Not Replay | Proof not previously used |
| Audience Match | Proof audience matches request |
| Nonce Match | Proof nonce matches request |
| Permissions Satisfied | All required permissions present |
| Binding Valid | `sha256(request) == proof.binding.requestHash` |
| XRPL Consent | (Optional) On-chain consent verification |
| Cardano Consent | (Optional) CIP-30 signature verification |

## Project Structure

```
src/
├── protocol/      # Core protocol logic (ProofProtocol)
├── schemas/       # Zod schemas (ProofRequest, ConsentGrant, ProofResponse)
├── decks/         # Permission deck system
├── did/           # DID resolution and pairwise DIDs
├── adapters/      # Chain adapters (XRPL, Cardano, Midnight)
├── security/      # Replay protection, time validation
├── w3c/           # W3C Verifiable Credentials adapter
├── credentials/   # Credential issuing and storage
└── cli.ts         # CLI entry point
```

## Test Coverage

```bash
npm run test:all    # Run all tests (127+)
npm run test:phase1 # Security hardening tests
npm run test:phase6 # Forward compatibility tests
```

## License

MIT
