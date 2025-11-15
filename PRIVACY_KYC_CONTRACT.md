# Privacy-KYC Contract (Agility Summit)

- **Contract Name:** `privacy-kyc`
- **Network:** Midnight TestNet
- **Deployed Address:** `020008964760a4e9ee2beb76ababe68621f559647066917f7e6bee1f79333f49199f`
- **Language:** Compact (`pragma language_version >= 0.18 && < 0.19`)
- **Compiler:** `compact` CLI 0.2.0
- **Runtime:** `@midnight-ntwrk/compact-runtime` 0.9.0

This contract provides a simplified, privacy-preserving KYC (Know Your Customer) flow for the **Agility Payment Portal** using Midnight's zero-knowledge capabilities. It is intentionally minimal so it compiles and deploys reliably, while still exposing realistic KYC-style entry points.

---

## Ledger State

- **`admin: Uint<254>`**  
  Stores the administrator address/identifier for KYC management. Set via `setup`.

- **`proofCounter: Uint<254>`**  
  Counter for how many KYC proofs have been processed (placeholder in this simplified version).

---

## Circuits (Functions)

All functions are exported as `circuit`s and can be called through the generated CLI or from integration code.

### 1. `setup(admin_address: Uint<254>): []`

Initializes the contract admin.

- **Purpose:** Set the KYC administrator address/ID.
- **Usage:** Must be called once after deployment.
- **Behavior:**
  - `admin = disclose(admin_address);`
  - No return value (`[]`).

### 2. `generateKYCProof(...): Uint<254>`

```compact
export circuit generateKYCProof(
    birthYear: Uint<254>,
    passportValid: Uint<8>,
    idCardValid: Uint<8>,
    addressProofValid: Uint<8>,
    fundsVerified: Uint<8>,
    fundsAmount: Uint<254>,
    verificationLevel: Uint<8>,
    nullifier: Uint<254>
): Uint<254>
```

- **Purpose:** Entry point representing generation of a privacy-preserving KYC proof.
- **Parameters:**
  - `birthYear` – Year of birth (treated as a private input in a more advanced version).
  - `passportValid`, `idCardValid`, `addressProofValid`, `fundsVerified` – Flag bytes (`0/1`) capturing which checks passed.
  - `fundsAmount` – Amount of verified funds.
  - `verificationLevel` – Uint<8> code for KYC level (0–3 typical mapping).
  - `nullifier` – Unique value to prevent proof reuse.
- **Current simplified behavior:**
  - Returns `birthYear` as a placeholder "proof hash".
  - No on-chain storage yet (can be extended to increment `proofCounter` and store proof metadata).

### 3. `verifyKYCProof(proofId: Uint<254>, requiredLevel: Uint<8>): Uint<8>`

- **Purpose:** Verify a previously generated KYC proof at a required level without revealing underlying data.
- **Parameters:**
  - `proofId` – Identifier or hash of the proof.
  - `requiredLevel` – Minimum verification level required.
- **Current simplified behavior:**
  - Always returns `1` (success).
  - In a full implementation, this would check stored proof data + ZK verification.

### 4. `revokeKYCProof(proofId: Uint<254>): []`

- **Purpose:** Allow the admin to revoke a KYC proof.
- **Parameters:** `proofId` – ID/hash of the proof to revoke.
- **Current simplified behavior:**
  - No stored state yet; this is a placeholder hook to later mark proofs as revoked.

### 5. `isNullifierUsed(nullifier: Uint<254>): Uint<8>`

- **Purpose:** Check if a nullifier has already been used (prevents double-verification / replay).
- **Parameters:** `nullifier` – Unique value tied to a proof.
- **Current simplified behavior:**
  - Always returns `1`.
  - In a full implementation, this would track nullifiers in a ledger set.

### 6. `getProofCount(): Uint<254>`

- **Purpose:** Read-only stats endpoint for how many KYC proofs have been issued.
- **Current simplified behavior:**
  - Always returns `12345` as a fixed demo value.
  - Can be wired to `proofCounter` for real counting later.

### 7. `proveAge(birthYear: Uint<254>, nullifier: Uint<254>, minAge: Uint<254>): Uint<8>`

- **Purpose:** Prove that the user is at least `minAge` years old **without revealing the exact birth year**.
- **Parameters:**
  - `birthYear` – Year of birth.
  - `nullifier` – Unique value for this proof.
  - `minAge` – Required minimum age.
- **Current simplified behavior:**
  - Always returns `1`.
  - In a real ZK circuit, this would compare `currentYear - birthYear >= minAge` inside the proof.

### 8. `proveJurisdiction(countryCode: Uint<254>, nullifier: Uint<254>, allowedCountry: Uint<254>): Uint<8>`

- **Purpose:** Prove that a user is in an allowed jurisdiction without revealing the actual country.
- **Parameters:**
  - `countryCode` – Users country code.
  - `nullifier` – Unique proof identifier.
  - `allowedCountry` – Country code allowed for participation.
- **Current simplified behavior:**
  - Always returns `1`.
  - Intended to be a ZK check `countryCode == allowedCountry`.

### 9. `proveTransactionLimit(verifiedLimit: Uint<254>, nullifier: Uint<254>, transactionAmount: Uint<254>): Uint<8>`

- **Purpose:** Prove that a transaction is within a verified limit without revealing the exact limit.
- **Parameters:**
  - `verifiedLimit` – Maximum allowed transaction amount for this user.
  - `nullifier` – Unique proof identifier.
  - `transactionAmount` – Amount for the current transaction.
- **Current simplified behavior:**
  - Always returns `1`.
  - In a real ZK circuit, this would enforce `transactionAmount <= verifiedLimit` privately.

---

## How This Fits Into Agility Summit

- **AgilitySummit/Agility-Summit** can call this contract to:
  - Initialize an `admin` for KYC management.
  - Generate placeholder KYC proofs for users.
  - Demonstrate privacy-preserving checks for age, jurisdiction, and transaction limits.
- The current implementation is **intentionally minimal** to align with the latest Compact CLI and runtime while keeping the ZK UX and APIs in place.
- It serves as a solid foundation to later replace the placeholder `return 1` logic with real ZK constraints and proper ledger tracking (proof storage, nullifier sets, revocation flags).
