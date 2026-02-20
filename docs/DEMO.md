# Agility Protocol Demos

This document describes how to run the various demo scenarios.

## Phase 1: Security Hardening Demo

Demonstrates time validation and replay attack protection.

### Running the Demo

```bash
npm run build
npm run cli -- demo phase1
```

### Scenarios

The Phase 1 demo runs 5 scenarios:

| # | Scenario | Expected Result | Error Code |
|---|----------|-----------------|------------|
| 1 | Happy path | PASS | - |
| 2 | Replay attack | FAIL | `REPLAY_DETECTED` |
| 3 | Expired request | FAIL | `EXPIRED` |
| 4 | Future issuedAt | FAIL | `FUTURE_ISSUED_AT` |
| 5 | Proof too old | FAIL | `PROOF_TOO_OLD` |

### Sample Output

```
══════════════════════════════════════════════════
  PHASE 1 DEMO: Security Hardening
══════════════════════════════════════════════════

Scenario 1: Happy Path
  Result: PASS
  Meta: nowEpoch=1708300000, proofAgeSeconds=0

Scenario 2: Replay Attack
  Result: FAIL
  Error: REPLAY_DETECTED - Proof has already been used
  Meta: replayKey=prover:abc123...

Scenario 3: Expired Request
  Result: FAIL
  Error: EXPIRED - Proof has expired
  Meta: proofAgeSeconds=601

...
```

### Debug Mode

For detailed output including all checks and meta information:

```bash
npm run cli -- demo phase1 --debug
```

## Phase 2: Verifiable Consent Demo

Demonstrates XRPL and Cardano consent verification (when enabled).

### Running the Demo

```bash
npm run cli -- demo phase2
```

### Feature Flags

Phase 2 verification is disabled by default. To enable:

```typescript
// In src/security/config.ts
export const ENABLE_XRPL_CONSENT_TX_VERIFY = true;
export const ENABLE_CARDANO_SIGNDATA_VERIFY = true;
```

Or set environment variables:

```bash
export AGILITY_ENABLE_XRPL_VERIFY=true
export AGILITY_ENABLE_CARDANO_VERIFY=true
```

### XRPL Verification Requirements

When enabled, XRPL verification requires:

1. `grant.signer.type === 'xrpl'`
2. `grant.signatureMeta.txHash` - The XRPL transaction hash
3. Network access to XRPL node (testnet by default)

The verifier will:
- Fetch the transaction from XRPL
- Verify `tx.Account` matches `grant.signer.id`
- Check memo contains the consent hash

### Cardano Verification (Scaffold)

Cardano verification is scaffolded but not fully implemented. When enabled:

1. `grant.signer.type === 'cardano'`
2. `grant.signatureMeta.signature` - CIP-30 signature
3. `grant.signatureMeta.key` - Public key

### Sample Output

```
══════════════════════════════════════════════════
  PHASE 2 DEMO: Verifiable Consent
══════════════════════════════════════════════════

XRPL Consent Verification:
  Status: SKIPPED (disabled)
  To enable: set ENABLE_XRPL_CONSENT_TX_VERIFY = true

Cardano signData Verification:
  Status: SKIPPED (disabled)
  To enable: set ENABLE_CARDANO_SIGNDATA_VERIFY = true
```

## One-Command Demos (Phase 4)

Three streamlined demo commands for quick verification:

### Offline Demo

Runs the full verification pipeline with no network calls:

```bash
npm run demo:offline
```

Output includes a verification table showing all checks:
- Time Checks
- Binding Checks
- Permission Checks
- Replay Checks
- XRPL Consent (skipped)
- Cardano signData (skipped)

### XRPL Demo

Demonstrates XRPL consent transaction verification:

```bash
npm run demo:xrpl
```

To enable real XRPL verification:
```bash
ENABLE_XRPL_CONSENT_TX_VERIFY=true npm run demo:xrpl
```

### Cardano Demo

Demonstrates CIP-30 signData verification with ed25519:

```bash
npm run demo:cardano
```

To enable real Cardano verification:
```bash
ENABLE_CARDANO_SIGNDATA_VERIFY=true npm run demo:cardano
```

## Running All Demos

```bash
# One-command demos (recommended)
npm run demo:offline    # Full offline verification
npm run demo:xrpl       # XRPL consent verification
npm run demo:cardano    # Cardano signData verification

# Phase demos
npm run cli -- demo phase1   # Security hardening
npm run cli -- demo phase2   # Verifiable consent
npm run cli -- demo phase4   # Full protocol flow
npm run cli -- demo phase5   # Credentials
```

## Quick Walkthrough: Create Deck → Satisfy Request

This walkthrough shows how to create a deck, add sources, and use it to satisfy a proof request.

### Step 1: Create a Deck Instance

```bash
npm run cli -- deck create --deck agility:kyc:v1 --owner did:key:z6MkUser123
```

Output:
```
  Instance ID: abc123-def456-...
  Deck: agility:kyc:v1
  Owner: did:key:z6MkUser123
```

### Step 2: Add Evidence Sources

```bash
# Add a VC source for identity verification
npm run cli -- deck add-source \
  --instance abc123-def456 \
  --permission agility:kyc:identity_verified \
  --type vc \
  --ref urn:uuid:my-credential-id \
  --issuer did:agility:issuer:trusted-kyc
```

### Step 3: View Deck Status

```bash
npm run cli -- deck show --instance abc123-def456
```

Output shows which permissions have sources:
```
  ✓ agility:kyc:identity_verified
      Source: vc (urn:uuid:my-credential-id)
  ○ agility:kyc:age_over_18
      (no source)
```

### Step 4: Create and Satisfy a Proof Request

```bash
# Create a request requiring identity verification
npm run cli -- request --perm agility:kyc:identity_verified --audience app.example.com

# Create proof using the deck instance
npm run cli -- proof --request request.json --deck-instance abc123-def456
```

### Step 5: Export for Backup

```bash
npm run cli -- deck export --instance abc123-def456 --out my-deck-backup.json
```

## CLI Options

| Option | Description |
|--------|-------------|
| `--debug` | Enable verbose output |
| `--replay-store memory` | Use in-memory replay store |
| `--replay-store file` | Use file-backed replay store (default) |
| `--replay-path <path>` | Custom replay cache file path |

---

## Step 3 — Testing Real On-Chain Consent

This section explains how to test **real** XRPL and Cardano consent verification.

---

### XRPL Consent Verification (Testnet)

XRPL verification proves that a user anchored their consent hash on the XRP Ledger.

#### Prerequisites

- XRPL Testnet wallet (get one at [XRPL Faucet](https://xrpl.org/xrp-testnet-faucet.html))
- Node.js environment with this SDK built

#### Step 1: Set Environment Variables

```bash
export ENABLE_XRPL_CONSENT_TX_VERIFY=true
export XRPL_RPC_URL=https://s.altnet.rippletest.net:51234
```

#### Step 2: Generate Consent Hash

First, create a proof request and generate the consent hash:

```bash
node dist/cli.js demo xrpl --print-consent-hash
```

This outputs a 64-character hex string (SHA-256 hash of the consent payload).

Example output:
```
Consent Hash: a1b2c3d4e5f6...
```

#### Step 3: Send XRPL Testnet Transaction

Using your XRPL testnet wallet:

1. **From:** Your testnet wallet address
2. **To:** Your own address (self-payment is fine)
3. **Amount:** 1 drop (minimum)
4. **MemoData:** The consent hash (hex-encoded)

Using `xrpl.js`:
```javascript
const { Client, Wallet, Payment } = require('xrpl');

const client = new Client('wss://s.altnet.rippletest.net:51233');
await client.connect();

const wallet = Wallet.fromSeed('YOUR_TESTNET_SECRET');
const consentHash = 'a1b2c3d4e5f6...'; // From step 2

const tx = {
  TransactionType: 'Payment',
  Account: wallet.address,
  Destination: wallet.address,
  Amount: '1',
  Memos: [{
    Memo: {
      MemoData: Buffer.from(consentHash, 'utf8').toString('hex').toUpperCase(),
      MemoType: Buffer.from('agility/consent', 'utf8').toString('hex').toUpperCase(),
    }
  }]
};

const result = await client.submitAndWait(tx, { wallet });
console.log('Transaction Hash:', result.result.hash);
```

#### Step 4: Retrieve Transaction Hash

Copy the transaction hash from the result. You can also find it on [XRPL Testnet Explorer](https://testnet.xrpl.org/).

#### Step 5: Run Verification

```bash
node dist/cli.js demo xrpl --enable-xrpl-verify --tx-hash <YOUR_TX_HASH>
```

#### Expected Results

| Scenario | Result | Reason |
|----------|--------|--------|
| Valid tx with matching memo | ✓ PASS | Consent hash matches |
| Memo data mismatch | ✗ FAIL | Hash doesn't match consent |
| Wrong account | ✗ FAIL | tx.Account ≠ grant.signer.id |
| Transaction not found | ✗ FAIL | Invalid txHash |
| Network error | ✗ FAIL | Cannot reach XRPL node |

---

### Cardano CIP-30 signData Verification

Cardano verification proves that a user signed the consent hash with their wallet.

#### Prerequisites

- Cardano wallet with CIP-30 support (Lace, Nami, Eternl)
- Browser environment or wallet connector

#### Step 1: Set Environment Variable

```bash
export ENABLE_CARDANO_SIGNDATA_VERIFY=true
```

#### Step 2: Generate Consent Hash

```bash
node dist/cli.js demo cardano --print-consent-hash
```

#### Step 3: Sign with Wallet (Browser)

In your dApp frontend:

```javascript
// Connect to wallet
const api = await window.cardano.lace.enable();

// Get address
const addresses = await api.getUsedAddresses();
const address = addresses[0];

// Sign the consent hash
const consentHashHex = 'a1b2c3d4e5f6...'; // From step 2
const signature = await api.signData(address, consentHashHex);

console.log('Signature:', signature.signature);
console.log('Key:', signature.key);
console.log('Address:', address);
```

#### Step 4: Attach to ConsentGrant

Include the signature data in your grant:

```typescript
const grant: ConsentGrant = {
  // ... other fields
  signer: {
    type: 'cardano',
    id: address,
  },
  signatureMeta: {
    signature: signature.signature,  // COSE_Sign1 hex
    key: signature.key,              // Public key hex
    address: address,
  },
};
```

#### Step 5: Run Verification

```bash
node dist/cli.js demo cardano --enable-cardano-verify
```

Or programmatically:

```typescript
import { verifyCardanoSignData } from '@agility-protocol/headless';

const result = verifyCardanoSignData(grant.signatureMeta, consentHash);
console.log(result.ok ? 'PASS' : 'FAIL');
```

#### Expected Results

| Scenario | Result | Reason |
|----------|--------|--------|
| Valid signature | ✓ PASS | Ed25519 signature valid |
| Altered payload | ✗ FAIL | Signature doesn't match |
| Wrong key | ✗ FAIL | Key doesn't match signature |
| Malformed COSE | ✗ FAIL | Invalid signature format |

---

### Understanding the Difference

| Aspect | XRPL Verification | Cardano Verification |
|--------|-------------------|----------------------|
| **What it proves** | Public anchoring of hash | Wallet signature authenticity |
| **On-chain?** | Yes (transaction) | No (signature only) |
| **Requires network?** | Yes (XRPL node) | No (local crypto) |
| **Non-repudiation** | Strong (ledger record) | Moderate (signature) |
| **Privacy** | Lower (public tx) | Higher (no on-chain data) |
| **Cost** | ~0.00001 XRP | Free |

**XRPL verification** proves the user publicly committed to the consent hash on a decentralized ledger. This provides strong non-repudiation and auditability.

**Cardano verification** proves the user signed the consent hash with their wallet's private key. This is faster and free, but doesn't create a public record.

---

### Troubleshooting

#### XRPL Issues

```
Error: Transaction not found
```
→ Wait for transaction to be validated (usually <5 seconds on testnet)

```
Error: Memo hash mismatch
```
→ Ensure MemoData is hex-encoded consent hash

```
Error: Account mismatch
```
→ Ensure grant.signer.id matches tx.Account

#### Cardano Issues

```
Error: Invalid signature format
```
→ Ensure signature is COSE_Sign1 hex format

```
Error: Signature verification failed
```
→ Ensure the same address was used for signing and verification

```
Error: Key mismatch
```
→ Ensure the public key corresponds to the signing address
