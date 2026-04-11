# Agility Protocol

**Protocol Version: 1.0** | **127+ Tests** | **TypeScript** | **Multi-Chain** | **Biometrics** | **NFC**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## What is Agility Protocol?

Agility is a **privacy-preserving identity verification and payment protocol** that enables applications to verify user eligibility and process payments without exposing wallet history, balances, or personal data.

### Supported Networks

| Network | Payments | ZK Proofs | Wallet |
|---------|----------|-----------|--------|
| **XRPL** | ✅ | ✅ (via Midnight) | XUMM |
| **Midnight** | ✅ | ✅ | Lace |
| **Cardano** | ✅ | ✅ (via Midnight) | Lace |

### Platform Support

| Feature | Web | iOS | Android |
|---------|-----|-----|--------|
| **Biometrics** | WebAuthn | Face ID / Touch ID | Fingerprint / Face |
| **NFC** | Chrome Android | Core NFC | Full NFC |
| **QR Codes** | ✅ | ✅ | ✅ |

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
- **Biometric Auth** — Face ID, Touch ID, Fingerprint for secure consent
- **NFC Support** — Tap-to-verify and tap-to-pay alongside QR

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
| [PAYMENTS.md](docs/PAYMENTS.md) | Payment module specification |
| [INTEGRATION.md](docs/INTEGRATION.md) | Complete integration guide |
| [CHAINS.md](docs/CHAINS.md) | Chain-specific documentation |
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
├── src/                    # Core SDK
│   ├── protocol/           # Core protocol logic (ProofProtocol)
│   ├── schemas/            # Zod schemas (ProofRequest, ConsentGrant, ProofResponse)
│   ├── decks/              # Permission deck system
│   ├── did/                # DID resolution and pairwise DIDs
│   ├── adapters/           # Chain adapters (XRPL, Cardano, Midnight, Lace)
│   ├── security/           # Replay protection, time validation
│   ├── w3c/                # W3C Verifiable Credentials adapter
│   └── credentials/        # Credential issuing and storage
│
├── agility-qr/             # QR-based proof exchange
│   ├── qr/                 # Core QR functions
│   ├── shared/             # Encoding/decoding utilities
│   ├── payments/           # Payment QR integration
│   ├── wallet-demo/        # Customer wallet demo
│   ├── verifier-demo/      # Age verification demo
│   ├── merchant-demo/      # Merchant portal demo
│   └── courier-demo/       # Courier portal demo
│
├── agility-payments/       # Multi-chain payment module
│   ├── core/               # Types and chain bridge interface
│   ├── xrpl/               # XRPL payment adapter
│   ├── midnight/           # Midnight ZK payment adapter
│   ├── lace/               # Lace wallet adapter
│   ├── bundle/             # KYC + Payment bundling
│   └── proofs/             # ZK proof circuits (payment, order, identity)
│
├── agility-auth/           # Authentication module
│   └── biometrics/         # Face ID, Touch ID, WebAuthn
│
├── agility-nfc/            # NFC module
│   ├── core/               # Types and payload encoding
│   ├── web/                # Web NFC adapter (Chrome Android)
│   └── native/             # React Native adapter
│
└── docs/                   # Documentation
```

## Payment Integration

```typescript
import { 
  createXrplPaymentAdapter,
  createMerchantCheckout,
  verifyMerchantBundle 
} from '@agility-protocol/headless/agility-payments';

// Create payment with KYC requirements
const checkout = createMerchantCheckout({
  merchantId: 'wine-shop',
  merchantName: 'Premium Wine Shop',
  orderId: 'ORD-001',
  items: [{ name: 'Vintage Red', price: 89.99, quantity: 2 }],
  currency: 'XRP',
  network: 'xrpl',
  destinationAddress: 'rXXX...',
  requireAge: 21,        // Age verification
  requireKyc: true,      // Identity verification
});

// Verify complete bundle (payment + KYC)
const result = await verifyMerchantBundle(checkout.paymentRequest, customerBundle);

if (result.valid && result.paymentConfirmed && result.kycVerified) {
  console.log('✅ Payment and KYC verified');
}
```

## QR-Based Flows

```typescript
import { createPaymentQR, verifyPaymentQR } from '@agility-protocol/headless/agility-qr/payments';

// Merchant creates payment QR
const qr = createPaymentQR({
  merchantId: 'store-123',
  amount: '50.00',
  currency: 'XRP',
  network: 'xrpl',
  destinationAddress: 'rXXX...',
  requiredKyc: ['age_over_18'],
});

// Customer scans, pays, creates response QR
// Merchant verifies
const result = verifyPaymentQR({ originalRequest, responseQR });
```

## Test Coverage

```bash
npm run test:all    # Run all tests (127+)
npm run test:phase1 # Security hardening tests
npm run test:phase6 # Forward compatibility tests
```

## Biometric Authentication

```typescript
import { createBiometricManager } from '@agility-protocol/headless/agility-auth';

const biometric = createBiometricManager();
await biometric.initialize();

// Authenticate for payment approval
const result = await biometric.authenticate({
  reason: 'Approve payment of 50 XRP',
  requireConfirmation: true,
});

if (result.success) {
  console.log('Authenticated with:', result.method); // 'faceId', 'touchId', 'fingerprint'
}
```

## NFC Support

```typescript
import { createWebNFCAdapter, createPaymentRequestPayload } from '@agility-protocol/headless/agility-nfc';

const nfc = createWebNFCAdapter();

// Read NFC tag
nfc.onTagDiscovered((result) => {
  if (result.success) {
    console.log('Payload:', result.payload);
  }
});
await nfc.startReading();

// Write payment request to NFC tag
const payload = createPaymentRequestPayload({
  paymentId: 'pay-123',
  merchantId: 'shop-456',
  amount: '50.00',
  currency: 'XRP',
  network: 'xrpl',
  destinationAddress: 'rMerchant...',
  expiresAt: Date.now() + 5 * 60 * 1000,
});
await nfc.writeTag(payload);
```

## ZK Proof Circuits

```typescript
import { 
  provePaymentMade,
  proveAgeOver,
  proveOrderPlaced 
} from '@agility-protocol/headless/agility-payments';

// Prove payment without revealing amount
const paymentProof = await provePaymentMade(
  'pay-123',
  'rMerchant...',
  '150.00'  // Actual amount (private)
);

// Prove age > 21 without revealing DOB
const ageProof = await proveAgeOver('1990-05-15', 21);

// Prove order exists without revealing items
const orderProof = await proveOrderPlaced(
  'ORD-123',
  'merchant-456',
  [{ sku: 'WINE-001', name: 'Red Wine', price: 45.99, quantity: 2 }]
);
```

## Midnight.js Integration

This SDK integrates with official Midnight.js packages (v4.0.2):

- `@midnight-ntwrk/midnight-js-types`
- `@midnight-ntwrk/midnight-js-contracts`
- `@midnight-ntwrk/midnight-js-http-client-proof-provider`
- `@midnight-ntwrk/midnight-js-indexer-public-data-provider`
- `@midnight-ntwrk/midnight-js-network-id`

## Optional Peer Dependencies

For React Native mobile apps:

```bash
# NFC support
npm install react-native-nfc-manager

# Biometric authentication
npm install expo-local-authentication
```

## License

MIT
