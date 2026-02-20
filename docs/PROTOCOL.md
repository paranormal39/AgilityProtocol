# Agility Protocol Specification

**Version:** 1.0  
**Status:** Stable  
**Last Updated:** 2026-02-19

This document formally specifies the Agility Protocol for privacy-preserving identity verification. Implementations conforming to this specification are interoperable.

---

## 1. Message Types

The protocol defines three core message types exchanged between Verifier and Prover.

### 1.1 ProofRequest

A ProofRequest is created by a Verifier to request proof of specific permissions from a Prover.

#### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `requestId` | `string` | Unique identifier (UUID v4 recommended) |
| `audience` | `string` | Identifier of the requesting application/verifier |
| `nonce` | `string` | Cryptographically random value (min 16 bytes, hex-encoded) |
| `requiredPermissions` | `string[]` | List of permission IDs being requested |
| `issuedAt` | `string` | ISO 8601 timestamp of request creation |
| `expiresAt` | `string` | ISO 8601 timestamp of request expiration |
| `protocolVersion` | `string` | Protocol version (e.g., "1.0") |

#### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `metadata` | `object` | Application-specific metadata (not hashed) |

#### Example

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "audience": "app.example.com",
  "nonce": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  "requiredPermissions": ["agility:kyc:age_over_18"],
  "issuedAt": "2024-01-15T10:30:00.000Z",
  "expiresAt": "2024-01-15T10:40:00.000Z",
  "protocolVersion": "1.0"
}
```

### 1.2 ConsentGrant

A ConsentGrant is created by the Prover to cryptographically bind consent to a specific request.

#### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `grantId` | `string` | Unique identifier (UUID v4 recommended) |
| `consent` | `object` | Consent payload (see below) |
| `signer` | `object` | Signer identity (see below) |

#### Consent Object

| Field | Type | Description |
|-------|------|-------------|
| `requestHash` | `string` | SHA-256 hash of canonicalized ProofRequest |
| `audience` | `string` | Must match ProofRequest.audience |
| `grantedPermissions` | `string[]` | Permissions being granted |
| `issuedAt` | `string` | ISO 8601 timestamp |
| `expiresAt` | `string` | ISO 8601 timestamp |

#### Signer Object

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Signer type: "local", "xrpl", "cardano", etc. |
| `id` | `string` | Signer identifier (DID or address) |

#### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `signatureMeta` | `object` | Chain-specific signature metadata |

#### Example

```json
{
  "grantId": "660e8400-e29b-41d4-a716-446655440001",
  "consent": {
    "requestHash": "a1b2c3d4...",
    "audience": "app.example.com",
    "grantedPermissions": ["agility:kyc:age_over_18"],
    "issuedAt": "2024-01-15T10:30:05.000Z",
    "expiresAt": "2024-01-15T10:40:00.000Z"
  },
  "signer": {
    "type": "local",
    "id": "did:key:z6MkUser123"
  }
}
```

### 1.3 ProofResponse

A ProofResponse is the Prover's response to a ProofRequest, containing the proof of permissions.

#### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `proofId` | `string` | Unique identifier (UUID v4 recommended) |
| `prover` | `object` | Prover identity |
| `audience` | `string` | Must match ProofRequest.audience |
| `nonce` | `string` | Must match ProofRequest.nonce |
| `requestId` | `string` | Must match ProofRequest.requestId |
| `satisfiedPermissions` | `string[]` | Permissions being proven |
| `binding` | `object` | Cryptographic binding to request |
| `issuedAt` | `string` | ISO 8601 timestamp |
| `expiresAt` | `string` | ISO 8601 timestamp |

#### Prover Object

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Prover type identifier |
| `id` | `string` | Prover DID (may be pairwise) |

#### Binding Object

| Field | Type | Description |
|-------|------|-------------|
| `requestHash` | `string` | SHA-256 hash of canonicalized ProofRequest |

#### Example

```json
{
  "proofId": "770e8400-e29b-41d4-a716-446655440002",
  "prover": {
    "type": "agility-headless",
    "id": "did:agility:pairwise:abc123"
  },
  "audience": "app.example.com",
  "nonce": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "satisfiedPermissions": ["agility:kyc:age_over_18"],
  "binding": {
    "requestHash": "a1b2c3d4..."
  },
  "issuedAt": "2024-01-15T10:30:05.000Z",
  "expiresAt": "2024-01-15T10:40:00.000Z"
}
```

---

## 2. Canonicalization Specification

All messages MUST be canonicalized before hashing. This ensures deterministic hash derivation across implementations.

### 2.1 Canonicalization Rules

1. **Object Key Ordering:** All object keys MUST be sorted lexicographically (Unicode code point order).

2. **Nested Objects:** Sorting applies recursively to all nested objects.

3. **Arrays:** Array element order is preserved (not sorted).

4. **Prohibited Values:** The following values MUST NOT appear:
   - `undefined`
   - `NaN`
   - `Infinity`
   - `-Infinity`
   - `BigInt` values

5. **String Normalization:** All strings MUST be normalized to Unicode NFC form.

6. **Timestamp Format:** All timestamps MUST be ISO 8601 strings with millisecond precision and UTC timezone (e.g., `"2024-01-15T10:30:00.000Z"`).

7. **Whitespace:** No extraneous whitespace. Use compact JSON serialization.

8. **Encoding:** The canonical JSON string MUST be encoded as UTF-8 for hashing.

### 2.2 Pseudocode

```
function canonicalize(value):
  if value is null:
    return "null"
  if value is boolean:
    return value ? "true" : "false"
  if value is number:
    if isNaN(value) or isInfinite(value):
      throw Error("Invalid number")
    return toString(value)
  if value is string:
    return jsonStringEscape(normalizeNFC(value))
  if value is array:
    return "[" + join(map(value, canonicalize), ",") + "]"
  if value is object:
    keys = sortLexicographically(objectKeys(value))
    pairs = map(keys, k => jsonStringEscape(k) + ":" + canonicalize(value[k]))
    return "{" + join(pairs, ",") + "}"
```

---

## 3. Hash Derivation

### 3.1 Request Hash

The `requestHash` is computed over the canonicalized ProofRequest.

**Included Fields:**
- `requestId`
- `audience`
- `nonce`
- `requiredPermissions`
- `issuedAt`
- `expiresAt`
- `protocolVersion`

**Excluded Fields:**
- `metadata` (if present)

**Algorithm:**
```
requestHash = SHA256(UTF8(canonicalize(request)))
```

**Output:** 64-character lowercase hexadecimal string.

### 3.2 Consent Hash

The `consentHash` is computed over the canonicalized consent payload.

**Included Fields:**
- `consent.requestHash`
- `consent.audience`
- `consent.grantedPermissions`
- `consent.issuedAt`
- `consent.expiresAt`

**Excluded Fields:**
- `grantId`
- `signer`
- `signatureMeta`

**Algorithm:**
```
consentHash = SHA256(UTF8(canonicalize(consent)))
```

### 3.3 Example

```javascript
const request = {
  requestId: "550e8400-e29b-41d4-a716-446655440000",
  audience: "app.example.com",
  nonce: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  requiredPermissions: ["agility:kyc:age_over_18"],
  issuedAt: "2024-01-15T10:30:00.000Z",
  expiresAt: "2024-01-15T10:40:00.000Z",
  protocolVersion: "1.0"
};

// Canonicalized (keys sorted):
// {"audience":"app.example.com","expiresAt":"2024-01-15T10:40:00.000Z",...}

const requestHash = sha256(utf8Encode(canonicalize(request)));
// => "3f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c..."
```

---

## 4. Verification Pipeline (Normative)

Verification MUST proceed in the following order. If any step fails, verification MUST halt and return the corresponding error code.

### Step 1: Structural Validation

Validate that all messages conform to their schemas:
- ProofRequest has all required fields
- ProofResponse has all required fields
- ConsentGrant (if present) has all required fields
- All field types are correct

**Error Codes:** `SCHEMA_INVALID`

### Step 2: Protocol Version Validation

Check that the protocol version is supported:
- Parse `protocolVersion` as `major.minor`
- Reject if major version differs from supported major
- Accept if minor version is within supported range

**Error Codes:** `UNSUPPORTED_PROTOCOL_VERSION`

### Step 3: Timestamp Validation

Validate all timestamps:
- `issuedAt` <= `expiresAt` (time range valid)
- `expiresAt` > now - clockSkew (not expired)
- `issuedAt` < now + clockSkew (not future)
- now - `issuedAt` < MAX_PROOF_AGE_SECONDS (not too old)

**Error Codes:** `INVALID_TIME_RANGE`, `EXPIRED`, `FUTURE_ISSUED_AT`, `PROOF_TOO_OLD`

### Step 4: Binding Validation

Verify cryptographic binding:
- Compute `requestHash` from ProofRequest
- Verify `proof.binding.requestHash` matches computed hash
- Verify `proof.audience` matches `request.audience`
- Verify `proof.nonce` matches `request.nonce`
- Verify `proof.requestId` matches `request.requestId`

**Error Codes:** `BINDING_INVALID`, `AUDIENCE_MISMATCH`, `NONCE_MISMATCH`, `REQUEST_ID_MISMATCH`

### Step 5: Permission Evaluation

Verify all required permissions are satisfied:
- All `request.requiredPermissions` MUST be present in `proof.satisfiedPermissions`

**Error Codes:** `PERMISSIONS_NOT_SATISFIED`

### Step 6: Replay Protection

Check for replay attacks:
- Generate replay key: `${prover.id}:${binding.requestHash}`
- If key exists in replay store, reject
- If verification passes, add key to replay store with TTL

**Error Codes:** `REPLAY_DETECTED`

### Step 7: Chain Verification (Optional)

If chain verification is enabled and grant is present:
- For XRPL: Verify transaction exists and memo matches consent hash
- For Cardano: Verify CIP-30 signature over consent hash

**Error Codes:** `XRPL_TX_NOT_FOUND`, `XRPL_MEMO_MISMATCH`, `XRPL_ACCOUNT_MISMATCH`, `CARDANO_SIGNATURE_INVALID`

### Step 8: Success

All checks passed. Return valid result.

---

## 5. Error Codes (Normative)

| Code | Description |
|------|-------------|
| `SCHEMA_INVALID` | Message does not conform to schema |
| `UNSUPPORTED_PROTOCOL_VERSION` | Protocol version not supported |
| `INVALID_TIME_RANGE` | issuedAt > expiresAt |
| `EXPIRED` | Proof has expired |
| `FUTURE_ISSUED_AT` | issuedAt is in the future |
| `PROOF_TOO_OLD` | Proof exceeds maximum age |
| `REPLAY_DETECTED` | Proof has already been used |
| `BINDING_INVALID` | Request hash does not match |
| `AUDIENCE_MISMATCH` | Audience does not match |
| `NONCE_MISMATCH` | Nonce does not match |
| `REQUEST_ID_MISMATCH` | Request ID does not match |
| `PERMISSIONS_NOT_SATISFIED` | Required permissions not proven |
| `SIGNATURE_INVALID` | Cryptographic signature invalid |
| `XRPL_TX_NOT_FOUND` | XRPL transaction not found |
| `XRPL_MEMO_MISMATCH` | XRPL memo does not contain consent hash |
| `XRPL_ACCOUNT_MISMATCH` | XRPL account does not match signer |
| `CARDANO_SIGNATURE_INVALID` | Cardano CIP-30 signature invalid |
| `TOO_MANY_PERMISSIONS` | Permissions array exceeds limit |
| `PERMISSION_ID_TOO_LONG` | Permission ID exceeds length limit |
| `TOO_MANY_DECK_SOURCES` | Deck sources exceed limit |
| `INVALID_TIMESTAMP_FORMAT` | Timestamp is not valid ISO 8601 |
| `MALFORMED_INPUT` | Input is malformed or contains invalid data |
| `DID_RESOLUTION_FAILED` | DID could not be resolved |

---

## 6. Security Guarantees

### 6.1 Replay Resistance

Each proof is bound to a unique `(prover.id, requestHash)` pair. The replay store prevents the same proof from being accepted twice within the TTL window.

**Guarantee:** A valid proof cannot be replayed to the same verifier.

**Limitation:** Different verifiers maintain separate replay stores.

### 6.2 Time-Bound Validity

Proofs have explicit `issuedAt` and `expiresAt` timestamps. Verification enforces:
- Maximum clock skew tolerance (default: 120 seconds)
- Maximum proof age (default: 600 seconds)
- Expiration enforcement

**Guarantee:** Proofs cannot be used indefinitely.

### 6.3 Pairwise Identity Privacy

When pairwise DIDs are enabled:
- Each (master DID, audience) pair derives a unique pairwise DID
- Different applications see different DIDs for the same user
- Derivation is deterministic: `sha256(masterDid + "|" + audience)`

**Guarantee:** Applications cannot correlate users across services using DIDs alone.

**Limitation:** Other metadata (IP address, timing, etc.) may still enable correlation.

### 6.4 On-Chain Verifiability (Optional)

When chain verification is enabled:
- XRPL: Consent is anchored via transaction memo
- Cardano: Consent is signed via CIP-30 signData

**Guarantee:** Consent can be independently verified on-chain.

**Limitation:** Requires network access; not suitable for fully offline verification.

---

## 7. Non-Goals

The Agility Protocol explicitly does NOT:

1. **Enforce Global Identity:** Users may have multiple DIDs. The protocol does not mandate a single identity.

2. **Store Private Keys:** The protocol is key-agnostic. Key management is the responsibility of the wallet/prover implementation.

3. **Mandate a Specific DID Method:** Any DID method may be used. The protocol supports `did:key`, `did:xrpl`, `did:cardano`, and custom methods via the resolver registry.

4. **Provide Credential Issuance:** The protocol verifies proofs of permissions. Credential issuance is a separate concern.

5. **Guarantee Privacy Against All Adversaries:** The protocol provides privacy properties against honest-but-curious verifiers. It does not protect against:
   - Compromised wallets
   - Network-level surveillance
   - Colluding verifiers sharing metadata

---

## 8. Protocol Version

Current version: **1.0**

### Version Format

`major.minor`

- **Major:** Incompatible changes. Implementations MUST reject different major versions.
- **Minor:** Backward-compatible additions. Implementations SHOULD accept higher minor versions.

### Version Negotiation

1. Verifier includes `protocolVersion` in ProofRequest
2. Prover checks compatibility before responding
3. Verifier validates version on verification

---

## 9. Conformance

An implementation is conformant if it:

1. Correctly implements all message types
2. Uses the specified canonicalization algorithm
3. Computes hashes as specified
4. Follows the verification pipeline order
5. Returns correct error codes
6. Supports protocol version negotiation

---

## Appendix A: Test Vectors

### A.1 Canonicalization

Input:
```json
{"b": 2, "a": 1, "c": {"z": 26, "y": 25}}
```

Canonical output:
```json
{"a":1,"b":2,"c":{"y":25,"z":26}}
```

### A.2 Request Hash

Input request (canonicalized):
```json
{"audience":"test.app","expiresAt":"2024-01-15T10:40:00.000Z","issuedAt":"2024-01-15T10:30:00.000Z","nonce":"abc123","protocolVersion":"1.0","requestId":"req-001","requiredPermissions":["perm1"]}
```

SHA-256 hash: (implementation-dependent based on exact input)

---

## Appendix B: References

- [W3C Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model/)
- [DID Core Specification](https://www.w3.org/TR/did-core/)
- [RFC 8259 - JSON](https://tools.ietf.org/html/rfc8259)
- [RFC 3339 - Timestamps](https://tools.ietf.org/html/rfc3339)
- [XRPL Transaction Memos](https://xrpl.org/transaction-common-fields.html#memos-field)
- [Cardano CIP-30](https://cips.cardano.org/cips/cip30/)
