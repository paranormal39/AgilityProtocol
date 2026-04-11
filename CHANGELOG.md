# Changelog

All notable changes to the Agility Protocol will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-04-11

### Added

#### Biometric Authentication (`agility-auth/`)
- Face ID / Touch ID support (iOS)
- Fingerprint / Face Unlock support (Android)
- WebAuthn support (Browser)
- Secure storage with biometric protection
- Consent signing with biometric attestation

#### NFC Support (`agility-nfc/`)
- Web NFC adapter (Chrome Android)
- React Native NFC adapter
- Tap-to-verify and tap-to-pay flows
- NFC payload encoding/decoding
- Dual mode (QR + NFC) transport

#### ZK Proof Circuits (`agility-payments/proofs/`)
- Payment proof circuits (payment_made, payment_sufficient, payment_range)
- Order proof circuits (order_placed, order_value_range, order_contains_type)
- Identity proof circuits (age_over, age_range, identity_verified, country_residence)
- Selective disclosure proofs
- Proof composition support

### Changed
- Updated README with biometrics, NFC, and ZK proofs documentation
- Added optional peer dependencies for React Native (react-native-nfc-manager, expo-local-authentication)
- Enhanced project structure documentation

---

## [1.0.0] - 2026-02-20

### Initial Formal Release

This is the first stable release of the Agility Protocol, completing Phases 1-6.

### Added

#### Phase 1: Security Hardening
- Time validation with clock skew tolerance (±120 seconds)
- Proof age validation (max 600 seconds)
- Replay attack protection with persistent cache
- Structured error codes (`EXPIRED`, `REPLAY_DETECTED`, `PROOF_TOO_OLD`, etc.)

#### Phase 2: Verifiable Consent
- XRPL on-chain consent transaction verification
- Cardano CIP-30 signData verification (ed25519)
- Feature flags for optional chain verification

#### Phase 3: Permission Decks
- Deck definition and registration system
- Deck instance storage with evidence sources
- Permission evaluation with privacy levels
- W3C Verifiable Credentials adapter

#### Phase 4: Protocol Integration
- Complete ProofRequest → ConsentGrant → ProofResponse flow
- Offline verification demo
- CLI with demo commands

#### Phase 5: Credentials
- Verifiable Credential issuing and storage
- Credential-based proof generation
- Credential anchoring

#### Phase 6: Protocol Formalization
- Formal protocol specification (`docs/PROTOCOL.md`)
- Protocol version negotiation (v1.0)
- Adapter registry for extensibility
- DID resolver registry with did:key and pairwise DID support
- Forward compatibility tests
- Privacy properties documentation (`docs/PRIVACY_PROPERTIES.md`)

### Documentation
- `PROTOCOL.md` - Formal protocol specification
- `PRIVACY_PROPERTIES.md` - Privacy guarantees and threat model
- `DECKS.md` - Permission deck system
- `DEMO.md` - Demo walkthroughs with real consent testing tutorial
- `ARCHITECTURE.md` - System architecture

### Security
- Pairwise DIDs enabled by default (anti-correlation)
- Replay protection enabled by default
- All chain verification disabled by default (opt-in)

---

## [0.1.0] - 2026-01-15

### Added
- Initial protocol implementation
- Basic ProofRequest/ProofResponse schemas
- Local prover and signer
- JSON persistence

---

## Future Roadmap

### [1.2.0] - Planned
- XRPL-Midnight cross-chain bridge
- Cross-chain transaction hash anchoring
- XRPL escrow and multi-sig support
- Enhanced credential revocation

### [2.0.0] - Planned
- Breaking schema changes (if needed)
- Advanced privacy features
- Production hardening
- Mobile app templates
