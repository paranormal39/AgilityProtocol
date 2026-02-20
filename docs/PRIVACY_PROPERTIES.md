# Agility Protocol Privacy Properties

**Version:** 1.0  
**Last Updated:** 2026-02-19

This document formally describes the privacy properties, guarantees, and limitations of the Agility Protocol.

---

## 1. Pairwise DID Anti-Correlation Model

### 1.1 Overview

Agility supports **pairwise DIDs** to prevent cross-application user correlation. When enabled, each (master DID, audience) pair derives a unique pairwise DID.

### 1.2 Derivation

```
pairwiseDid = "did:agility:pairwise:" + sha256(masterDid + "|" + audience)
```

### 1.3 Properties

| Property | Guarantee |
|----------|-----------|
| **Determinism** | Same (master, audience) always produces same pairwise DID |
| **Unlinkability** | Different audiences see different DIDs |
| **One-way** | Cannot derive master DID from pairwise DID |
| **Collision resistance** | SHA-256 provides 128-bit collision resistance |

### 1.4 What This Prevents

- **Direct correlation:** App A cannot link user to App B using DID alone
- **DID enumeration:** Cannot enumerate all pairwise DIDs for a master DID
- **Reverse lookup:** Cannot determine master DID from pairwise DID

### 1.5 What This Does NOT Prevent

- **Metadata correlation:** IP address, timing, browser fingerprint
- **Content correlation:** If proof contains unique identifiable data
- **Colluding verifiers:** If verifiers share proof content (not just DIDs)
- **Wallet compromise:** Attacker with master DID can derive all pairwise DIDs

---

## 2. Replay Protection

### 2.1 Mechanism

Each proof is bound to a unique replay key:

```
replayKey = prover.id + ":" + binding.requestHash
```

The replay store tracks used keys with a TTL (time-to-live).

### 2.2 What This Prevents

| Attack | Prevention |
|--------|------------|
| **Simple replay** | Same proof rejected on second use |
| **Cross-session replay** | Key includes prover ID |
| **Stale proof reuse** | TTL expires old keys |

### 2.3 What This Does NOT Prevent

| Attack | Limitation |
|--------|------------|
| **Cross-verifier replay** | Each verifier has separate store |
| **Pre-TTL replay** | Proof valid until TTL expires |
| **Distributed replay** | Requires distributed replay store |

### 2.4 Recommendations

- Use short TTLs (default: 600 seconds)
- For high-security: use distributed replay store
- For cross-verifier protection: use shared replay infrastructure

---

## 3. Chain Anchoring Guarantees

### 3.1 XRPL Anchoring

When XRPL verification is enabled:

| Property | Guarantee |
|----------|-----------|
| **Existence proof** | Transaction exists on XRPL ledger |
| **Account binding** | Transaction signed by claimed account |
| **Content binding** | Memo contains consent hash |
| **Timestamp** | Ledger provides authoritative timestamp |

### 3.2 Cardano Anchoring

When Cardano CIP-30 verification is enabled:

| Property | Guarantee |
|----------|-----------|
| **Signature validity** | Ed25519 signature is valid |
| **Key binding** | Signature matches provided public key |
| **Content binding** | Signature covers consent hash |

### 3.3 What Chain Anchoring Provides

- **Non-repudiation:** User cannot deny signing consent
- **Auditability:** Third parties can verify consent
- **Timestamp authority:** Blockchain provides ordering

### 3.4 What Chain Anchoring Does NOT Provide

- **Privacy:** Transaction is public on-chain
- **Revocation:** Cannot revoke anchored consent
- **Offline verification:** Requires network access

---

## 4. Metadata Leakage

### 4.1 What Metadata Can Leak

| Metadata | Leaked To | Mitigation |
|----------|-----------|------------|
| **IP address** | Verifier | Use Tor/VPN |
| **Timing** | Verifier | Batch requests |
| **User agent** | Verifier | Normalize UA |
| **Request frequency** | Verifier | Rate limiting |
| **Permission set** | Verifier | Minimal disclosure |
| **Proof size** | Network | Padding |

### 4.2 Protocol-Level Leakage

| Field | Visibility | Notes |
|-------|------------|-------|
| `prover.id` | Verifier | Pairwise DID mitigates |
| `satisfiedPermissions` | Verifier | Inherent to protocol |
| `issuedAt` | Verifier | Timing information |
| `audience` | Prover | Verifier identity |

### 4.3 Recommendations

1. **Use pairwise DIDs** (enabled by default)
2. **Minimize permissions** requested
3. **Use privacy-preserving transport** (Tor, VPN)
4. **Avoid unique permission combinations** that identify users

---

## 5. Master DID Rotation

### 5.1 When to Rotate

- Suspected key compromise
- Periodic security hygiene
- Wallet migration
- Privacy reset (break all correlations)

### 5.2 Rotation Procedure

1. **Generate new master DID** in wallet
2. **Re-issue credentials** to new DID (if applicable)
3. **Update deck instances** with new owner DID
4. **Invalidate old pairwise mappings** (automatic with new master)

### 5.3 Implications

| Aspect | Impact |
|--------|--------|
| **Pairwise DIDs** | All change (new derivations) |
| **Verifier sessions** | May require re-authentication |
| **On-chain history** | Old anchors reference old DID |
| **Credentials** | May need re-issuance |

### 5.4 Partial Rotation

To rotate for specific audiences only:
- Not directly supported
- Workaround: Use different master DIDs per audience group

---

## 6. Threat Boundaries

### 6.1 Threat Model

The Agility Protocol assumes:

| Assumption | Description |
|------------|-------------|
| **Honest prover** | Prover does not share private keys |
| **Honest-but-curious verifier** | Verifier follows protocol but may analyze data |
| **Secure transport** | TLS or equivalent protects messages in transit |
| **Secure wallet** | Private keys are not compromised |

### 6.2 Verifier Compromise

**Scenario:** Attacker gains access to verifier systems.

| Asset | Exposure |
|-------|----------|
| Proof history | All proofs submitted to verifier |
| Pairwise DIDs | DIDs used with this verifier |
| Permission grants | What permissions were proven |
| Replay store | Used proof keys |

**Mitigation:**
- Pairwise DIDs limit cross-verifier correlation
- Proofs do not contain private keys
- Credentials are not stored by verifier

### 6.3 Wallet Compromise

**Scenario:** Attacker gains access to user's wallet/keys.

| Asset | Exposure |
|-------|----------|
| Master DID | Full control |
| All pairwise DIDs | Can derive all |
| Credentials | Full access |
| Proof history | Can create new proofs |

**Mitigation:**
- Rotate master DID immediately
- Revoke credentials if possible
- Notify verifiers of compromise

### 6.4 Network Adversary

**Scenario:** Attacker observes network traffic.

| Asset | Exposure |
|-------|----------|
| Message content | If TLS compromised |
| Traffic analysis | Timing, size, endpoints |
| IP addresses | Source and destination |

**Mitigation:**
- Use TLS 1.3+
- Use Tor for anonymity
- Pad messages to uniform size

### 6.5 Colluding Verifiers

**Scenario:** Multiple verifiers share data to correlate users.

| Asset | Exposure |
|-------|----------|
| Pairwise DIDs | Different per verifier (no direct link) |
| Proof content | May enable correlation |
| Timing | May enable correlation |
| Permission patterns | May enable correlation |

**Mitigation:**
- Pairwise DIDs prevent DID-based correlation
- Minimize unique permission combinations
- Use common proof patterns

---

## 7. Privacy Levels

### 7.1 Permission Privacy Levels

| Level | Description | Example |
|-------|-------------|---------|
| `boolean-only` | Only true/false disclosed | "Is over 18" |
| `range` | Value within range | "Age 25-35" |
| `fields` | Specific fields disclosed | "Country: US" |
| `full` | Complete data disclosed | Full credential |

### 7.2 Recommendations

1. **Prefer `boolean-only`** when possible
2. **Use `range`** for numeric values
3. **Avoid `full`** unless necessary
4. **Document privacy level** in deck definitions

---

## 8. Compliance Considerations

### 8.1 GDPR

| Requirement | Agility Support |
|-------------|-----------------|
| Data minimization | Selective disclosure via permissions |
| Right to erasure | Verifier must delete proofs |
| Consent | Explicit consent grant |
| Portability | Deck export/import |

### 8.2 Recommendations

- Verifiers should implement proof retention policies
- Users should use pairwise DIDs
- Document data processing in privacy policy

---

## 9. Summary

| Property | Guarantee Level | Notes |
|----------|-----------------|-------|
| **DID unlinkability** | Strong | With pairwise DIDs |
| **Replay resistance** | Strong | Per-verifier |
| **Time-bound validity** | Strong | Enforced by protocol |
| **Non-repudiation** | Strong | With chain anchoring |
| **Metadata privacy** | Weak | Requires external measures |
| **Cross-verifier privacy** | Moderate | Pairwise DIDs help |

---

## Appendix: Security Checklist

### For Users

- [ ] Enable pairwise DIDs (default: on)
- [ ] Use privacy-preserving transport
- [ ] Minimize permissions granted
- [ ] Rotate master DID periodically
- [ ] Review verifier privacy policies

### For Verifiers

- [ ] Implement proof retention policy
- [ ] Use replay protection
- [ ] Request minimal permissions
- [ ] Document data processing
- [ ] Support pairwise DIDs

### For Developers

- [ ] Use TLS 1.3+
- [ ] Implement proper key management
- [ ] Follow secure coding practices
- [ ] Audit third-party dependencies
- [ ] Test with pairwise DIDs enabled
