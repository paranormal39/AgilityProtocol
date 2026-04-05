# Agility Protocol Integration Guide

Complete guide for integrating the Agility Protocol SDK into your application.

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Identity Verification](#identity-verification)
4. [QR-Based Flows](#qr-based-flows)
5. [Payment Integration](#payment-integration)
6. [KYC + Payment Bundles](#kyc--payment-bundles)
7. [Wallet Integration](#wallet-integration)
8. [Web Integration](#web-integration)
9. [Node.js Integration](#nodejs-integration)
10. [Mobile Integration](#mobile-integration)
11. [Best Practices](#best-practices)

---

## Installation

```bash
npm install @agility-protocol/headless
```

### Dependencies

The SDK includes:
- XRPL support via `xrpl` package
- Midnight support via `@midnight-ntwrk/midnight-js-*` packages
- Cardano/Lace support via CIP-30 browser API

---

## Quick Start

### Basic Identity Verification

```typescript
import { 
  ProofProtocol, 
  LocalProver, 
  JsonPersistence 
} from '@agility-protocol/headless';

// Initialize
const persistence = new JsonPersistence('./data');
await persistence.initialize();

const protocol = new ProofProtocol(persistence);
const prover = new LocalProver(persistence);
await prover.initialize();

// Create verification request
const request = await protocol.createRequest({
  audience: 'my-app',
  requiredPermissions: ['age_over_18'],
  ttlSeconds: 300,
});

// User creates proof
const grant = prover.createConsentGrant(request);
const proof = await protocol.createProof({
  request,
  grant,
  deckPermissions: ['age_over_18'],
});

// Verify
const result = protocol.verify(request, proof, grant);
console.log(result.valid); // true
```

---

## Identity Verification

### Available Permissions

| Permission | Description | Evidence Type |
|------------|-------------|---------------|
| `age_over_18` | User is 18+ | ZK proof |
| `age_over_21` | User is 21+ | ZK proof |
| `kyc_verified` | Identity verified | VC |
| `region_us` | US resident | Attestation |
| `region_eu` | EU resident | Attestation |
| `accredited_investor` | Accredited investor | VC |

### Creating Requests

```typescript
const request = await protocol.createRequest({
  audience: 'your-app.com',
  requiredPermissions: ['age_over_21', 'kyc_verified'],
  ttlSeconds: 300, // 5 minutes
  metadata: {
    purpose: 'Wine purchase verification',
  },
});
```

### Verifying Proofs

```typescript
const result = protocol.verify(request, proof, grant);

if (result.valid) {
  console.log('✅ Verification passed');
  console.log('Checks:', result.checks);
} else {
  console.log('❌ Verification failed');
  console.log('Errors:', result.errors);
}
```

---

## QR-Based Flows

### Age Verification Flow

```typescript
import { 
  createQRProofRequest,
  decodeQRProofRequest,
  createQRProofResponse,
  verifyQRProofResponse 
} from '@agility-protocol/headless/agility-qr';

// Verifier: Create QR request
const qrRequest = createQRProofRequest({
  audience: 'bar.example.com',
  requiredPermissions: ['age_over_21'],
});

// Display QR code for customer to scan

// Customer: Scan and decode
const request = decodeQRProofRequest(qrRequest);

// Customer: Create response (after consent)
const qrResponse = createQRProofResponse({
  request,
  grant: userGrant,
  proof: userProof,
});

// Verifier: Verify response
const result = verifyQRProofResponse(request, qrResponse);
```

### Payment QR Flow

```typescript
import { 
  createPaymentQR,
  decodePaymentQR,
  createPaymentResponseQR,
  verifyPaymentQR 
} from '@agility-protocol/headless/agility-qr/payments';

// Merchant: Create payment QR
const paymentQR = createPaymentQR({
  merchantId: 'store-123',
  merchantName: 'Wine Shop',
  amount: '89.99',
  currency: 'XRP',
  network: 'xrpl',
  destinationAddress: 'rXXX...',
  requiredKyc: ['age_over_21'],
});

// Customer: Scan and pay
const request = decodePaymentQR(paymentQR);

// Customer: Create response after payment
const responseQR = createPaymentResponseQR({
  paymentRequest: request,
  txHash: 'ABC123...',
  fromAddress: 'rYYY...',
  kycPermissions: ['age_over_21'],
  kycProofHash: 'hash...',
});

// Merchant: Verify
const result = verifyPaymentQR({
  originalRequest: request,
  responseQR,
});
```

---

## Payment Integration

### XRPL Payments

```typescript
import { createXrplPaymentAdapter } from '@agility-protocol/headless/agility-payments';

const xrpl = createXrplPaymentAdapter();

// Connect to testnet
await xrpl.connect({ networkType: 'testnet' });

// Create payment request
const request = {
  paymentId: 'pay-123',
  merchantId: 'store-123',
  merchantName: 'My Store',
  amount: '10.00',
  currency: 'XRP',
  network: 'xrpl',
  destinationAddress: 'rXXX...',
  expiresAt: Date.now() + 15 * 60 * 1000,
};

// Prepare for wallet signing
const { tx, txJson } = await xrpl.preparePaymentForWallet(request, userAddress);

// After user signs with XUMM...
const result = await xrpl.submitPayment(signedTx);

// Verify on-chain
const verification = await xrpl.verifyPayment({
  request,
  proof: paymentProof,
  verifyOnChain: true,
});
```

### Midnight Payments (ZK)

```typescript
import { createMidnightPaymentAdapter } from '@agility-protocol/headless/agility-payments';

const midnight = createMidnightPaymentAdapter();
await midnight.connect({ networkType: 'testnet' });

// Generate ZK payment proof with KYC
const { paymentProof, kycProof, combined } = await midnight.createKycPaymentProof(
  request,
  fromAddress,
  {
    permissions: ['age_over_21', 'kyc_verified'],
    privateData: {
      dateOfBirth: '1990-01-01',
      country: 'US',
    },
  }
);

// Verify with ZK proof
const result = await midnight.verifyPayment({
  request,
  proof: { ...paymentProof, zkProof: combined },
  verifyOnChain: true,
});
```

### Lace Wallet (Cardano)

```typescript
import { createLacePaymentAdapter } from '@agility-protocol/headless/agility-payments';

const lace = createLacePaymentAdapter();

// Check availability (browser only)
if (!lace.isAvailable()) {
  console.log('Please install Lace wallet extension');
  return;
}

// Connect
await lace.connect();

// Get balance
const balance = await lace.getBalance();

// Create and sign payment
const tx = await lace.createPayment(request);
const signed = await lace.signPayment(tx);
const result = await lace.submitPayment(signed.signedTx);
```

---

## KYC + Payment Bundles

### Creating a Bundle

```typescript
import { 
  createKycPaymentBundle,
  verifyMerchantBundle 
} from '@agility-protocol/headless/agility-payments';

// After payment is confirmed
const bundle = await createKycPaymentBundle({
  paymentProof: {
    paymentId: 'pay-123',
    txHash: 'ABC123...',
    network: 'xrpl',
    amount: '89.99',
    currency: 'XRP',
    fromAddress: 'rYYY...',
    toAddress: 'rXXX...',
    timestamp: Date.now(),
  },
  kycPermissions: ['age_over_21', 'kyc_verified'],
  kycProofHash: 'sha256hash...',
  orderId: 'ORD-001',
});

// Merchant verifies
const result = await verifyMerchantBundle(originalRequest, bundle);

if (result.valid && result.paymentConfirmed && result.kycVerified) {
  // Process order
}
```

### Split-Knowledge Commerce

```typescript
import { 
  extractMerchantInfo,
  extractCourierInfo 
} from '@agility-protocol/headless/agility-payments';

// Merchant sees order, not address
const merchantView = extractMerchantInfo(bundle, {
  items: [{ name: 'Wine', qty: 2 }],
});
// { orderId, items, paymentConfirmed, ageVerified }

// Courier sees address, not order
const courierView = extractCourierInfo(bundle, {
  address: '123 Main St',
  instructions: 'Leave at door',
});
// { deliveryAddress, deliveryInstructions }
```

---

## Wallet Integration

### XUMM (XRPL)

```typescript
import { XummSdk } from 'xumm-sdk';

const xumm = new XummSdk('api-key', 'api-secret');

// Create payment payload
const payload = await xumm.payload.create({
  txjson: {
    TransactionType: 'Payment',
    Destination: request.destinationAddress,
    Amount: xrpToDrops(request.amount),
    Memos: [agilityMemo],
  },
});

// User signs in XUMM app
const result = await xumm.payload.get(payload.uuid);
```

### Lace (Cardano/Midnight)

```typescript
// Browser detection
if (window.cardano?.lace) {
  const api = await window.cardano.lace.enable();
  
  // Get addresses
  const addresses = await api.getUsedAddresses();
  
  // Sign transaction
  const signedTx = await api.signTx(unsignedTx);
  
  // Submit
  const txHash = await api.submitTx(signedTx);
}
```

---

## Web Integration

### React Example

```tsx
import { useState } from 'react';
import { createPaymentQR, verifyPaymentQR } from '@agility-protocol/headless/agility-qr/payments';

function PaymentPage() {
  const [qrCode, setQrCode] = useState('');
  const [verified, setVerified] = useState(false);

  const createPayment = () => {
    const qr = createPaymentQR({
      merchantId: 'store-123',
      merchantName: 'My Store',
      amount: '50.00',
      currency: 'XRP',
      network: 'xrpl',
      destinationAddress: 'rXXX...',
    });
    setQrCode(qr);
  };

  const verifyResponse = (responseQR: string) => {
    const result = verifyPaymentQR({
      originalRequest: decodePaymentQR(qrCode),
      responseQR,
    });
    setVerified(result.valid && result.paymentConfirmed);
  };

  return (
    <div>
      <button onClick={createPayment}>Create Payment</button>
      {qrCode && <QRCode value={qrCode} />}
      {verified && <p>✅ Payment Verified!</p>}
    </div>
  );
}
```

---

## Node.js Integration

### Express Server

```typescript
import express from 'express';
import { createXrplPaymentAdapter, verifyMerchantBundle } from '@agility-protocol/headless/agility-payments';

const app = express();
const xrpl = createXrplPaymentAdapter();

app.post('/api/verify-payment', async (req, res) => {
  const { originalRequest, bundle } = req.body;

  // Verify bundle
  const result = await verifyMerchantBundle(originalRequest, bundle);

  if (result.valid && result.paymentConfirmed) {
    // Verify on-chain
    await xrpl.connect({ networkType: 'mainnet' });
    const onChain = await xrpl.verifyPayment({
      request: originalRequest,
      proof: bundle.payment,
      verifyOnChain: true,
    });

    if (onChain.confirmed) {
      res.json({ success: true, txHash: bundle.payment.txHash });
    } else {
      res.json({ success: false, error: 'Payment not confirmed on-chain' });
    }
  } else {
    res.json({ success: false, errors: result.errors });
  }
});
```

---

## Mobile Integration

### React Native

```typescript
import { Camera } from 'expo-camera';
import { decodePaymentQR } from '@agility-protocol/headless/agility-qr/payments';

function QRScanner() {
  const handleBarCodeScanned = ({ data }) => {
    try {
      const request = decodePaymentQR(data);
      // Navigate to payment screen
      navigation.navigate('Payment', { request });
    } catch (e) {
      // Not a valid payment QR
    }
  };

  return (
    <Camera
      onBarCodeScanned={handleBarCodeScanned}
      barCodeScannerSettings={{
        barCodeTypes: ['qr'],
      }}
    />
  );
}
```

---

## Best Practices

### Security

1. **Always verify on-chain** for production payments
2. **Use short expiration times** (5-15 minutes)
3. **Require KYC** for regulated goods/services
4. **Implement replay protection** using nonces
5. **Log all verifications** for audit trails

### Performance

1. **Cache adapter connections** - don't reconnect for each request
2. **Use testnet** for development
3. **Batch verifications** when possible

### User Experience

1. **Show clear consent UI** before collecting data
2. **Display verification status** in real-time
3. **Handle wallet not installed** gracefully
4. **Provide fallback options** for users without wallets

### Error Handling

```typescript
try {
  const result = await verifyPayment(options);
  
  if (!result.valid) {
    // Handle specific errors
    for (const error of result.errors) {
      if (error.includes('AMOUNT_MISMATCH')) {
        // Handle amount issue
      } else if (error.includes('EXPIRED')) {
        // Handle expiration
      }
    }
  }
} catch (error) {
  // Handle network/connection errors
  console.error('Verification failed:', error);
}
```

---

## Support

- **Documentation**: https://docs.agility-protocol.com
- **GitHub**: https://github.com/agility-protocol
- **Discord**: https://discord.gg/agility

---

## License

MIT
