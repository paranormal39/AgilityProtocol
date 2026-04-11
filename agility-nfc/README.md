# Agility NFC Module

NFC support for tap-to-verify and tap-to-pay flows.

## Features

- **Tap-to-Verify** - NFC-based proof requests
- **Tap-to-Pay** - NFC payment initiation
- **Dual Mode** - QR + NFC fallback
- **HCE Support** - Host Card Emulation (Android)
- **Cross-Platform** - Web, React Native, iOS, Android

## Installation

```bash
npm install @agility-protocol/headless

# For React Native (optional)
npm install react-native-nfc-manager
```

## Quick Start

### Web (Chrome Android)

```typescript
import { createWebNFCAdapter } from '@agility-protocol/headless/agility-nfc';

const nfc = createWebNFCAdapter();

// Check support
if (await nfc.isSupported()) {
  // Start reading
  nfc.onTagDiscovered((result) => {
    if (result.success && result.payload) {
      console.log('Received:', result.payload.type);
      console.log('Data:', result.payload.data);
    }
  });

  await nfc.startReading({
    alertMessage: 'Hold your phone near the NFC tag',
  });
}
```

### Write Payment Request to NFC Tag

```typescript
import { 
  createWebNFCAdapter,
  createPaymentRequestPayload,
  encodeNFCPayload,
} from '@agility-protocol/headless/agility-nfc';

const nfc = createWebNFCAdapter();

// Create payment request
const payload = createPaymentRequestPayload({
  paymentId: 'pay-123',
  merchantId: 'merchant-456',
  merchantName: 'Coffee Shop',
  amount: '5.00',
  currency: 'XRP',
  network: 'xrpl',
  destinationAddress: 'rMerchant...',
  expiresAt: Date.now() + 5 * 60 * 1000,
});

// Write to NFC tag
const result = await nfc.writeTag(payload);
if (result.success) {
  console.log('Written:', result.bytesWritten, 'bytes');
}
```

### React Native

```typescript
import { createReactNativeNFCAdapter } from '@agility-protocol/headless/agility-nfc';

const nfc = createReactNativeNFCAdapter();

// Read NFC tag
nfc.onTagDiscovered((result) => {
  if (result.success) {
    const { payload, tagInfo } = result;
    console.log('Tag ID:', tagInfo?.id);
    console.log('Payload:', payload);
  }
});

await nfc.startReading({
  alertMessage: 'Tap your card',
  timeout: 30000,
});
```

### Dual Mode (QR + NFC)

```typescript
import { 
  encodeNFCPayload,
  createPaymentRequestPayload,
} from '@agility-protocol/headless/agility-nfc';
import { createPaymentQR } from '@agility-protocol/headless/agility-qr/payments';

// Create payment request
const paymentRequest = {
  paymentId: 'pay-123',
  merchantId: 'shop-456',
  amount: '50.00',
  currency: 'XRP',
  // ...
};

// Generate both QR and NFC
const qrCode = createPaymentQR(paymentRequest);
const nfcPayload = createPaymentRequestPayload(paymentRequest);

// Display QR code
// Also enable NFC reading for tap-to-pay
```

## Platform Support

| Platform | API | Features |
|----------|-----|----------|
| Chrome Android | Web NFC | Read, Write |
| React Native | react-native-nfc-manager | Read, Write, HCE |
| iOS | Core NFC (via RN) | Read only |
| Android | Android NFC | Read, Write, HCE |

## NFC Tag Types

| Type | Capacity | Use Case |
|------|----------|----------|
| NTAG213 | 144 bytes | Simple requests |
| NTAG215 | 504 bytes | Standard payloads |
| NTAG216 | 888 bytes | Full bundles |
| MIFARE Classic | 1KB-4KB | Large payloads |

## Payload Format

```typescript
interface NFCPayload {
  type: 'proof_request' | 'payment_request' | 'proof_response' | ...;
  version: '1.0.0';
  data: { ... };
  timestamp: number;
  signature?: string;
}
```

## Security

- Payloads are compressed and optionally encrypted
- Short expiration times (5 minutes default)
- Signature verification for responses
- No sensitive data stored on tags
