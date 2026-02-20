# Security Threat Model

This document describes the security measures implemented in Agility Protocol and the threats they address.

## Phase 1: Time-Based Security

### Replay Attack Prevention

**Threat:** An attacker intercepts a valid proof and resubmits it to gain unauthorized access.

**Mitigation:**
- **Replay Cache:** Every verified proof is stored with a unique key (`${prover.id}:${binding.requestHash}`)
- **TTL-based expiry:** Replay keys expire based on the request's TTL
- **Persistent storage:** File-backed cache survives process restarts (configurable to in-memory for serverless)

**Configuration:**
```typescript
ENABLE_REPLAY_PROTECTION = true  // Default: enabled
```

### Clock Skew Tolerance

**Threat:** Legitimate proofs rejected due to clock differences between systems.

**Mitigation:**
- **±120 second tolerance:** Allows for reasonable clock drift
- **Configurable:** `MAX_CLOCK_SKEW_SECONDS = 120`

### Expiry Validation

**Threat:** Expired proofs being accepted.

**Mitigation:**
- `issuedAt` must be ≤ `expiresAt`
- `expiresAt` must be > `issuedAt` (strict)
- `issuedAt` cannot be in the future beyond clock skew
- `expiresAt` cannot already be expired (with skew allowance)

### Proof Age Validation

**Threat:** Very old proofs (even if not technically expired) being reused.

**Mitigation:**
- **Maximum age:** 600 seconds from `issuedAt`
- **Configurable:** `MAX_PROOF_AGE_SECONDS = 600`

## Phase 2: Cryptographic Verification (Optional)

### XRPL Consent Transaction Verification

**Threat:** Forged consent grants claiming XRPL wallet authorization.

**Mitigation (when enabled):**
- Verify transaction exists on XRPL ledger
- Confirm `tx.Account` matches `grant.signer.id`
- Validate memo contains expected consent hash
- Check transaction is in validated ledger

**Configuration:**
```typescript
ENABLE_XRPL_CONSENT_TX_VERIFY = false  // Default: disabled
```

### Cardano signData Verification (Scaffold)

**Threat:** Forged consent grants claiming Cardano wallet authorization.

**Mitigation (when enabled):**
- Verify CIP-30 signature over consent hash
- Validate public key matches claimed address

**Configuration:**
```typescript
ENABLE_CARDANO_SIGNDATA_VERIFY = false  // Default: disabled
```

## What Phase 1 Does NOT Solve

| Gap | Description | Future Phase |
|-----|-------------|--------------|
| **Signer cryptographic verification** | Phase 1 checks signature format but doesn't verify cryptographic validity | Phase 2 |
| **On-chain anchoring** | Proofs are not anchored to any blockchain | Phase 3+ |
| **Credential issuer verification** | Credentials are self-asserted | Phase 3+ |
| **Zero-knowledge proofs** | Claims are disclosed, not proven in ZK | Midnight integration |
| **Revocation** | No credential revocation mechanism | Future |

## Error Codes

| Code | Description | Phase |
|------|-------------|-------|
| `INVALID_TIME_RANGE` | issuedAt/expiresAt relationship invalid | 1 |
| `EXPIRED` | Proof has expired | 1 |
| `FUTURE_ISSUED_AT` | issuedAt is too far in the future | 1 |
| `PROOF_TOO_OLD` | Proof exceeds maximum age | 1 |
| `REPLAY_DETECTED` | Proof has already been used | 1 |
| `SIGNATURE_INVALID` | Signature format or content invalid | 2 |
| `XRPL_TX_NOT_FOUND` | XRPL transaction not found | 2 |
| `XRPL_MEMO_MISMATCH` | Consent hash not in tx memo | 2 |
| `XRPL_ACCOUNT_MISMATCH` | tx.Account doesn't match signer | 2 |
| `CARDANO_SIGNATURE_INVALID` | Cardano signature verification failed | 2 |

## Recommendations

1. **Always enable replay protection** in production
2. **Use file-backed replay store** for persistent deployments
3. **Use in-memory replay store** for serverless/ephemeral environments
4. **Enable XRPL verification** when verifying XRPL-signed grants in production
5. **Monitor clock skew** between your servers and client devices
6. **Set appropriate TTLs** based on your use case (shorter = more secure)

## Testing Security

```bash
# Run Phase 1 security tests
npm run test:phase1

# Run Phase 1 demo showing all security scenarios
npm run cli -- demo phase1
```
