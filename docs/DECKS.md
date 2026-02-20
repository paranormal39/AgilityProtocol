# Proof Decks

Proof Decks are templates that define sets of permissions for selective disclosure in the Agility Protocol.

## What are Decks?

A **Deck** is a collection of related permissions that can be verified together. Think of it as a "verification template" that defines:

- What permissions are available
- What type of evidence is required for each
- What privacy level applies to each permission

## Deck Structure

### Deck Definition

```typescript
interface DeckDefinition {
  deckId: string;           // e.g., "agility:kyc:v1"
  name: string;             // Human-readable name
  version: string;          // Semantic version
  issuer: string;           // DID of the deck issuer
  permissions: PermissionDefinition[];
}
```

### Permission Definition

```typescript
interface PermissionDefinition {
  id: string;               // Namespaced ID, e.g., "agility:kyc:age_over_18"
  description: string;      // Human-readable description
  evidenceType: EvidenceType;
  privacyLevel: PrivacyLevel;
}
```

### Evidence Types

| Type | Description |
|------|-------------|
| `zk` | Zero-knowledge proof (Midnight) |
| `vc` | Verifiable Credential |
| `onchain` | On-chain data verification |
| `attestation` | Third-party attestation |

### Privacy Levels

| Level | Description |
|-------|-------------|
| `boolean-only` | Only reveals true/false |
| `range` | Reveals value within a range |
| `fields` | Reveals specific fields |

## Deck Instances

A **Deck Instance** is a user's personalized copy of a deck with sources attached.

```typescript
interface DeckInstance {
  instanceId: string;       // Unique instance ID
  deckId: string;           // Reference to deck definition
  ownerDid: string;         // Owner's DID
  createdAt: string;        // ISO timestamp
  sources: Record<string, SourceRef>;  // Permission sources
}
```

### Source Reference

```typescript
interface SourceRef {
  type: string;             // "credential", "attestation", "onchain"
  ref: string;              // Reference ID (credential ID, tx hash, etc.)
  metadata?: Record<string, unknown>;
}
```

## Available Decks

### agility:kyc:v1 - KYC Verification

Standard KYC verification permissions:

| Permission | Description | Evidence | Privacy |
|------------|-------------|----------|---------|
| `agility:kyc:age_over_18` | User is over 18 | ZK | Boolean |
| `agility:kyc:age_over_21` | User is over 21 | ZK | Boolean |
| `agility:kyc:country_verified` | Country verified | VC | Fields |
| `agility:kyc:identity_verified` | Identity verified | VC | Boolean |

### agility:defi:v1 - DeFi Access

DeFi platform access permissions:

| Permission | Description | Evidence | Privacy |
|------------|-------------|----------|---------|
| `agility:defi:accredited_investor` | Accredited investor | VC | Boolean |
| `agility:defi:not_sanctioned` | Not on sanctions list | Attestation | Boolean |
| `agility:defi:wallet_age` | Wallet age requirement | Onchain | Range |

### agility:social:v1 - Social Verification

Social identity verification:

| Permission | Description | Evidence | Privacy |
|------------|-------------|----------|---------|
| `agility:social:email_verified` | Email verified | Attestation | Boolean |
| `agility:social:phone_verified` | Phone verified | Attestation | Boolean |
| `agility:social:twitter_verified` | Twitter verified | Attestation | Boolean |

## CLI Commands

### List Decks

```bash
npm run cli -- deck list
```

Shows all available deck definitions and your deck instances.

### Initialize a Deck Instance

```bash
npm run cli -- deck init --deck agility:kyc:v1 --owner did:key:z6Mk...
```

Creates a new deck instance for the specified owner.

### Show Deck Instance

```bash
npm run cli -- deck show --instance <instanceId>
```

Shows details of a specific deck instance including permission status.

## Using Decks in Proof Generation

When generating a proof, you can optionally specify a deck instance:

```bash
npm run cli -- prove --request request.json --grant grant.json --deck-instance <instanceId>
```

The prover will only mark permissions as satisfied if they are present in the deck instance's sources.

## How Decks Support Selective Disclosure

1. **Verifier** requests specific permissions (e.g., `age_over_18`)
2. **Prover** checks their deck instance for matching sources
3. **Prover** generates proof using only the required evidence
4. **Verifier** receives boolean/range/field disclosure based on privacy level

This ensures:
- Users only share what's necessary
- Evidence types are appropriate for each claim
- Privacy levels are enforced consistently

## Storage

- **Deck Definitions**: `decks/registry.json` (or built-in defaults)
- **Deck Instances**: `data/decks.json`

## CLI Commands

### Create a Deck Instance

```bash
npm run cli -- deck create --deck agility:kyc:v1 --owner did:key:z6MkUser --name "My KYC Deck"
```

### Add a Source to a Permission

```bash
npm run cli -- deck add-source \
  --instance <instance-id> \
  --permission agility:kyc:age_over_18 \
  --type vc \
  --ref urn:uuid:credential-123 \
  --issuer did:agility:issuer:trusted \
  --issuedAt 2024-01-15T10:30:00Z
```

Source types: `vc`, `attestation`, `onchain`, `zk`

### Export a Deck Instance

```bash
# Export to file
npm run cli -- deck export --instance <instance-id> --out my-deck.json

# Export to stdout
npm run cli -- deck export --instance <instance-id>
```

### Import a Deck Instance

```bash
npm run cli -- deck import --file my-deck.json
```

### List Decks and Instances

```bash
npm run cli -- deck list
```

### Show Instance Details

```bash
npm run cli -- deck show --instance <instance-id>
```

## Permission Evaluation Policies (Phase 4)

The DeckEvaluator enforces policies when satisfying permissions:

### Issuer Policy

Control which issuers are trusted for a permission:

```typescript
issuerPolicy: {
  allow: ['did:agility:trusted-issuer'],  // Only these issuers
  deny: ['did:agility:revoked-issuer'],   // Block these issuers
  minTrust: 80,                            // Minimum trust score (0-100)
}
```

### Freshness Policy

Require evidence to be recent:

```typescript
freshnessSeconds: 86400  // Evidence must be less than 24 hours old
```

### Required Evidence Type

Specify what type of evidence is acceptable:

```typescript
requiredEvidence: 'zk' | 'vc' | 'onchain' | 'attestation' | 'any'
```

### Strict Mode

When `ENABLE_STRICT_DECK_PERMISSIONS=true`, requests must only contain permission IDs that are defined in the deck. Unknown permissions are rejected.

### Using DeckEvaluator

```typescript
import { canSatisfyPermission, satisfyRequest } from './decks/index.js';

// Check single permission
const result = canSatisfyPermission(deckInstance, 'agility:kyc:age_over_18');
if (result.ok) {
  console.log('Permission satisfied:', result.evidenceSummary);
} else {
  console.log('Cannot satisfy:', result.reason);
}

// Evaluate full request
const evalResult = satisfyRequest(deckInstance, ['age_over_18', 'email_verified']);
console.log('Satisfied:', evalResult.satisfiedPermissions);
console.log('Unsatisfied:', evalResult.unsatisfiedPermissions);
```

## Future Enhancements

- Deck marketplace for custom deck definitions
- Cross-chain deck verification
- Deck inheritance and composition
- Time-limited deck instances
