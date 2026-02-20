# Agility Protocol Architecture

This document describes the internal architecture of the Agility Protocol verification pipeline.

## Verifier Pipeline

The verification process follows a strict pipeline of checks:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        VERIFICATION PIPELINE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │  PARSE   │───►│  TIME    │───►│ REQUEST  │───►│PERMISSION│          │
│  │  SCHEMA  │    │  CHECKS  │    │ BINDING  │    │  CHECKS  │          │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘          │
│       │               │               │               │                  │
│       ▼               ▼               ▼               ▼                  │
│  Schema valid?   Time range OK?  Hash matches?  Perms satisfied?        │
│                  Not expired?                                            │
│                  Not too old?                                            │
│                  Not future?                                             │
│                                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │  REPLAY  │───►│  XRPL    │───►│ CARDANO  │───►│ SUCCESS  │          │
│  │  CHECK   │    │  VERIFY  │    │  VERIFY  │    │          │          │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘          │
│       │               │               │               │                  │
│       ▼               ▼               ▼               ▼                  │
│  Not replayed?   (Optional)      (Optional)     All checks pass         │
│                  TX memo OK?     Sig valid?                              │
│                  Account OK?                                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Pipeline Stages

### 1. Parse Schema
- Validate `ProofRequest` schema
- Validate `ProofResponse` schema
- Validate `ConsentGrant` schema (if provided)

### 2. Time Checks
- **Time Range Valid:** `issuedAt <= expiresAt`
- **Not Expired:** `expiresAt > now - clockSkew`
- **Not Future:** `issuedAt < now + clockSkew`
- **Not Too Old:** `now - issuedAt < MAX_PROOF_AGE_SECONDS`

### 3. Request Binding
- **Audience Match:** `proof.audience === request.audience`
- **Nonce Match:** `proof.nonce === request.nonce`
- **RequestId Match:** `proof.requestId === request.requestId`
- **Hash Binding:** `proof.binding.requestHash === sha256(request)`

### 4. Permission Checks
- All `request.requiredPermissions` present in `proof.satisfiedPermissions`

### 5. Replay Check (Phase 1)
- Generate replay key: `${prover.id}:${binding.requestHash}`
- Check if key exists in replay store
- If not replayed and all checks pass, add to store

### 6. XRPL Verify (Phase 2, Optional)
- Fetch transaction from XRPL
- Verify `tx.Account` matches signer
- Verify memo contains consent hash

### 7. Cardano Verify (Phase 2, Optional)
- Verify CIP-30 signature over consent hash
- Validate public key matches address

## Module Structure

```
src/
├── security/
│   ├── config.ts              # Constants and feature flags
│   ├── TimestampAdapter.ts    # Centralized time handling
│   ├── VerificationReport.ts  # Debug/demo report structure
│   ├── InMemoryReplayStore.ts # Non-persistent replay store
│   ├── ReplayStoreFactory.ts  # Replay store factory
│   ├── index.ts               # Module exports
│   ├── xrpl/
│   │   └── verifyXrplConsentTx.ts  # XRPL verification
│   └── cardano/
│       └── verifyCardanoSignData.ts # Cardano verification
├── protocol/
│   └── ProofProtocol.ts       # Core verification logic
├── schemas/
│   ├── ProofRequest.ts
│   ├── ProofResponse.ts
│   └── ConsentGrant.ts
└── utils/
    └── canonical.ts           # JSON canonicalization, hashing
```

## Configuration

### Phase 1 (Always Active)

| Constant | Default | Description |
|----------|---------|-------------|
| `MAX_CLOCK_SKEW_SECONDS` | 120 | Clock tolerance |
| `MAX_PROOF_AGE_SECONDS` | 600 | Max proof age |
| `ENABLE_REPLAY_PROTECTION` | true | Replay cache |

### Phase 2 (Optional)

| Constant | Default | Description |
|----------|---------|-------------|
| `ENABLE_XRPL_CONSENT_TX_VERIFY` | false | XRPL tx verification |
| `ENABLE_CARDANO_SIGNDATA_VERIFY` | false | Cardano sig verification |

## Replay Store Options

| Type | Use Case | Persistence |
|------|----------|-------------|
| `file` | Server deployments | Yes |
| `memory` | Serverless, testing | No |

```typescript
import { createReplayStore } from './security';

// File-backed (default)
const fileStore = createReplayStore({ type: 'file', path: './data/replay.json' });

// In-memory
const memStore = createReplayStore({ type: 'memory' });
```

## Verification Result

```typescript
interface VerifyResult {
  valid: boolean;
  errors: string[];
  errorCodes?: VerificationErrorCode[];
  checks: {
    schemaValid: boolean;
    notExpired: boolean;
    timeRangeValid: boolean;
    notTooOld: boolean;
    notReplay: boolean;
    audienceMatch: boolean;
    nonceMatch: boolean;
    requestIdMatch: boolean;
    permissionsSatisfied: boolean;
    bindingValid: boolean;
    grantValid?: boolean;
    grantSignerValid?: boolean;
    // ... additional checks
  };
}
```

## Pairwise DIDs (Phase 4)

For privacy and anti-correlation, the protocol supports pairwise DIDs:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PAIRWISE DID DERIVATION                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Master DID: did:key:z6MkUser123...                                     │
│                                                                          │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐               │
│  │   App A     │     │   App B     │     │   App C     │               │
│  │  audience   │     │  audience   │     │  audience   │               │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘               │
│         │                   │                   │                       │
│         ▼                   ▼                   ▼                       │
│  sha256(master|A)    sha256(master|B)    sha256(master|C)              │
│         │                   │                   │                       │
│         ▼                   ▼                   ▼                       │
│  did:agility:       did:agility:       did:agility:                    │
│  pairwise:abc123    pairwise:def456    pairwise:ghi789                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Benefits

- **Privacy**: Different apps see different DIDs
- **Anti-correlation**: Apps cannot link user activity across services
- **Deterministic**: Same master + audience always produces same pairwise DID

### Configuration

| Constant | Default | Description |
|----------|---------|-------------|
| `ENABLE_PAIRWISE_DID` | true | Privacy by default |

### Usage

```typescript
import { derivePairwiseDid, isPairwiseDid } from './did/index.js';

// Derive pairwise DID
const pairwise = derivePairwiseDid('did:key:z6MkUser', 'app.example.com');
// => did:agility:pairwise:a1b2c3d4...

// Check if DID is pairwise
isPairwiseDid(pairwise); // true
isPairwiseDid('did:key:z6MkUser'); // false
```

## Verification Report (Debug)

For CLI and debugging, a detailed report is available:

```typescript
interface VerificationReport {
  ok: boolean;
  errors: Array<{ code: string; message: string; field?: string }>;
  checks: Array<{ name: string; pass: boolean; details?: string }>;
  meta: {
    nowEpoch: number;
    clockSkewSeconds: number;
    proofAgeSeconds?: number;
    replayKey?: string;
    replayTtlSeconds?: number;
    requestHash?: string;
    consentHash?: string;
  };
}
```
