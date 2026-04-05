# Agility Payments Module

Modular payment system supporting XRPL, Midnight, and Cardano/Lace with KYC + Payment bundling for complete merchant verification.

## Features

- **Multi-Chain Support**: XRPL, Midnight (ZK proofs), Cardano via Lace
- **KYC + Payment Bundles**: Combine identity verification with payments
- **Split-Knowledge**: Merchants see orders, couriers see addresses only
- **Chain Bridge**: Generic interface for future chain additions
- **QR Integration**: Works seamlessly with agility-qr module

## Installation

```bash
npm install @agility-protocol/headless
```

## Quick Start

### XRPL Payment

```typescript
import { 
  createXrplPaymentAdapter,
  createPaymentRequest,
  createPaymentProof 
} from '@agility-protocol/headless/agility-payments';

// Create adapter
const xrpl = createXrplPaymentAdapter();
await xrpl.connect({ networkType: 'testnet' });

// Create payment request
const request = createPaymentRequest({
  merchantId: 'store-123',
  merchantName: 'My Store',
  amount: '10.00',
  currency: 'XRP',
  network: 'xrpl',
  destinationAddress: 'rXXX...',
  requiredKyc: ['age_over_18'],
});

// Verify payment
const result = await xrpl.verifyPayment({
  request,
  proof: paymentProof,
  verifyOnChain: true,
});
```

### Midnight Payment (ZK Proofs)

```typescript
import { createMidnightPaymentAdapter } from '@agility-protocol/headless/agility-payments';

const midnight = createMidnightPaymentAdapter();
await midnight.connect({ networkType: 'testnet' });

// Generate ZK payment proof
const { paymentProof, kycProof } = await midnight.createKycPaymentProof(
  request,
  fromAddress,
  {
    permissions: ['age_over_21', 'kyc_verified'],
    privateData: { dateOfBirth: '1990-01-01' },
  }
);
```

### Lace Wallet (Cardano)

```typescript
import { createLacePaymentAdapter } from '@agility-protocol/headless/agility-payments';

const lace = createLacePaymentAdapter();

// Check if Lace is available
if (lace.isAvailable()) {
  await lace.connect();
  
  // Sign payment
  const signed = await lace.signPayment(paymentTx);
  const result = await lace.submitPayment(signed.signedTx);
}
```

### KYC + Payment Bundle

```typescript
import { 
  createKycPaymentBundle,
  verifyMerchantBundle,
  createMerchantCheckout 
} from '@agility-protocol/headless/agility-payments';

// Create checkout with KYC requirements
const checkout = createMerchantCheckout({
  merchantId: 'wine-shop',
  merchantName: 'Premium Wine Shop',
  orderId: 'ORD-001',
  items: [{ name: 'Vintage Red', price: 89.99, quantity: 2 }],
  currency: 'XRP',
  network: 'xrpl',
  destinationAddress: 'rXXX...',
  requireAge: 21,
  requireKyc: true,
});

// Verify complete bundle
const result = await verifyMerchantBundle(
  checkout.paymentRequest,
  customerBundle
);

if (result.valid && result.paymentConfirmed && result.kycVerified) {
  console.log('✅ Payment and KYC verified');
}
```

## Module Structure

```
agility-payments/
├── core/
│   ├── types.ts          # Core type definitions
│   ├── ChainBridge.ts    # Generic chain bridge interface
│   └── index.ts
├── xrpl/
│   ├── types.ts          # XRPL-specific types
│   ├── XrplPaymentAdapter.ts
│   └── index.ts
├── midnight/
│   ├── types.ts          # Midnight-specific types
│   ├── MidnightPaymentAdapter.ts
│   └── index.ts
├── lace/
│   ├── types.ts          # Lace/Cardano types
│   ├── LacePaymentAdapter.ts
│   └── index.ts
├── bundle/
│   ├── KycPaymentBundle.ts
│   └── index.ts
└── index.ts
```

## Supported Networks

| Network | Currency | Wallet | ZK Proofs |
|---------|----------|--------|-----------|
| XRPL | XRP | XUMM | ❌ |
| Midnight | DUST | Lace | ✅ |
| Cardano | ADA | Lace | ⚠️ Limited |

## Chain Bridge Interface

Add support for new chains by implementing `IPaymentAdapter`:

```typescript
import { PaymentAdapterBase } from '@agility-protocol/headless/agility-payments';

class MyChainAdapter extends PaymentAdapterBase {
  readonly network = 'mychain';
  
  async connect(config) { /* ... */ }
  async createPayment(request) { /* ... */ }
  async verifyPayment(options) { /* ... */ }
  // ... implement other methods
}

// Register adapter
registerPaymentAdapter('mychain', new MyChainAdapter());
```

## Split-Knowledge Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Customer     │     │    Merchant     │     │    Courier      │
│                 │     │                 │     │                 │
│  Full Bundle    │────►│  Order + Pay    │     │  Address Only   │
│  - Payment      │     │  - Items        │     │  - Street       │
│  - KYC          │     │  - Amount       │     │  - City         │
│  - Address      │     │  - Age ✓        │     │  - Instructions │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │                        ▲
                              │   Split Knowledge      │
                              └────────────────────────┘
```

## Midnight.js Packages

This module integrates with official Midnight.js packages (v4.0.2):

- `@midnight-ntwrk/midnight-js-types`
- `@midnight-ntwrk/midnight-js-contracts`
- `@midnight-ntwrk/midnight-js-http-client-proof-provider`
- `@midnight-ntwrk/midnight-js-indexer-public-data-provider`
- `@midnight-ntwrk/midnight-js-network-id`

## License

MIT
