# Agility Protocol

**Protocol Version: 0.1.0**

A privacy-preserving identity verification protocol built on Midnight and XRPL.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## What is Agility?

Agility is a **wallet-controlled selective disclosure protocol** that enables applications to verify user eligibility without exposing wallet history, balances, or personal data.

```
ProofRequest → ConsentGrant → ProofResponse
```

- **Midnight** provides private computation, encrypted storage, and zero-knowledge proof infrastructure
- **XRPL** provides public anchoring and tamper-evident settlement receipts
- **Lace & Xaman** wallets handle signing — Agility never touches private keys

## Quick Start

```bash
# Install
npm install
npm run build

# Run a demo verification flow
npm run cli -- demo phase4

# Check Midnight network health
npm run cli -- midnight health
```

## SDK Usage

```typescript
import { Verifier, initProver, PROTOCOL_VERSION } from '@agility/sdk';

// Verifier creates a request
const verifier = new Verifier({ persistence, logger });
const request = await verifier.createProofRequest({
  audience: 'my-app',
  requiredPermissions: ['age_over_18', 'email_verified'],
});

// Prover generates consent and proof
const prover = await initProver({ persistence, logger });
const grant = prover.createConsentGrant({ request });
const proof = prover.generateProof({ request, grant });

// Verifier validates
const result = verifier.verifyProof({ request, proof });
console.log(result.valid); // true
```

## Protocol Flow

```
┌──────────────┐                      ┌──────────────┐
│   VERIFIER   │                      │    PROVER    │
│  (Your App)  │                      │   (Wallet)   │
└──────┬───────┘                      └──────┬───────┘
       │                                     │
       │  1. Create ProofRequest             │
       │  ──────────────────────────────►    │
       │                                     │
       │                                     │  2. Review & Consent
       │                                     │  3. Generate Proof
       │                                     │
       │    ◄──────────────────────────────  │
       │  4. Verify ProofResponse            │
       │                                     │
       │  5. (Optional) Anchor to XRPL       │
       ▼                                     ▼
```

## Midnight Compatibility Matrix

| Component | Version |
|-----------|---------|
| Node | 0.20.1 |
| Proof Server | 7.0.0 |
| Indexer | 3.0.0 |
| DApp Connector API | 4.0.0 |
| Wallet SDK | 1.0.0 |

## Network Environments

| Environment | Description |
|-------------|-------------|
| `preprod` | Midnight Pre-Production (default) |
| `preview` | Midnight Preview |
| `local` | Local development |

```bash
export MIDNIGHT_ENV=preprod
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `npm run cli -- midnight health` | Check network connectivity |
| `npm run cli -- lace capabilities` | Show Lace wallet capabilities |
| `npm run cli -- demo phase4` | Run verification demo |
| `npm run cli -- request --audience <app> --perm <perms>` | Create ProofRequest |
| `npm run cli -- verify --request <file> --proof <file>` | Verify a proof |

## Examples

### Node Verifier Server

```bash
cd examples/node-verifier-server
npm install && npm start
```

Endpoints:
- `POST /request` — Create ProofRequest
- `POST /verify` — Verify ProofResponse
- `GET /health` — Health check

### Browser Demo

```bash
cd examples/browser-demo
# Open index.html in browser
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Agility SDK                             │
├─────────────────────────────────────────────────────────────┤
│  Verifier  │  Prover  │  Credentials  │  Adapters           │
├─────────────────────────────────────────────────────────────┤
│                       Adapters                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │  XRPL Adapter   │  │ Midnight Adapter│  │ Lace Adapter│  │
│  │  (Settlement)   │  │ (Private Proofs)│  │ (Wallet)    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Encrypted Storage                         │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

- **Privacy-Preserving** — Zero-knowledge proofs reveal nothing beyond the claim
- **Wallet-Controlled** — Users sign consent; Agility never holds keys
- **Pairwise Identifiers** — Unique ID per application prevents tracking
- **Cross-Chain** — Midnight for privacy, XRPL for public anchoring
- **Replay-Resistant** — Nonce + expiry prevent proof reuse

## Verification Checks

| Check | Description |
|-------|-------------|
| Schema Valid | Request/Response match protocol schema |
| Not Expired | `now < expiresAt` |
| Audience Match | Proof audience matches request |
| Nonce Match | Proof nonce matches request |
| Permissions Satisfied | All required permissions present |
| Binding Valid | `sha256(request) == proof.binding.requestHash` |

## Project Structure

```
src/
├── sdk/           # SDK modules (verifier, prover, credentials, adapters)
├── protocol/      # Core protocol logic
├── schemas/       # Zod schemas for ProofRequest, ConsentGrant, ProofResponse
├── adapters/      # XRPL, Midnight, Lace adapters
├── credentials/   # Verifiable Credentials
├── config/        # Network presets
└── cli.ts         # CLI entry point
```

## Configuration

```typescript
const agility = new AgilityHeadless({
  storagePath: './my-data',
  encryptStorage: true,
  xrplNetwork: 'testnet',
  midnightNetwork: 'preprod',
});
```

| Option | Default | Description |
|--------|---------|-------------|
| `storagePath` | `./.agility-data` | Local storage path |
| `encryptStorage` | `false` | Enable AES encryption |
| `xrplNetwork` | `testnet` | XRPL network |
| `midnightNetwork` | `preprod` | Midnight network |

## Environment Variables

```bash
# .env
AGILITY_MODE=mock           # mock | real
MIDNIGHT_ENV=preprod        # preprod | preview | local
XRPL_NETWORK=testnet
XRPL_SEED=sYourSeedHere     # For real mode
```

## License

MIT
