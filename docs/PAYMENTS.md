# Agility Payments Specification

**Version:** 1.0  
**Status:** Stable  
**Last Updated:** 2026-04-05

This document specifies the Agility Payments module for multi-chain payment verification with KYC bundling.

---

## 1. Overview

The Agility Payments module extends the core protocol with payment capabilities across multiple blockchain networks while maintaining privacy-preserving properties.

### Supported Networks

| Network | Native Currency | Wallet Integration | ZK Proofs |
|---------|-----------------|-------------------|-----------|
| XRPL | XRP | XUMM | No |
| Midnight | DUST | Lace | Yes |
| Cardano | ADA | Lace | Limited |

### Key Features

- **Multi-chain payments**: XRPL, Midnight, Cardano
- **KYC + Payment bundling**: Combined verification
- **Split-knowledge**: Privacy-preserving data separation
- **Chain bridge**: Extensible for future networks
- **QR integration**: Works with agility-qr module

---

## 2. Payment Request

A PaymentRequest is created by a merchant to request payment with optional KYC requirements.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `paymentId` | `string` | Unique payment identifier (UUID v4) |
| `merchantId` | `string` | Merchant identifier |
| `merchantName` | `string` | Human-readable merchant name |
| `amount` | `string` | Payment amount (string for precision) |
| `currency` | `string` | Currency code (XRP, ADA, DUST) |
| `network` | `PaymentNetwork` | Target blockchain network |
| `destinationAddress` | `string` | Recipient address |
| `expiresAt` | `number` | Expiration timestamp (ms) |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `memo` | `string` | Payment reference/memo |
| `orderId` | `string` | Associated order ID |
| `requiredKyc` | `string[]` | Required KYC permissions |
| `metadata` | `object` | Additional metadata |

### Example

```json
{
  "paymentId": "550e8400-e29b-41d4-a716-446655440000",
  "merchantId": "store-123",
  "merchantName": "Premium Wine Shop",
  "amount": "89.99",
  "currency": "XRP",
  "network": "xrpl",
  "destinationAddress": "rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "expiresAt": 1712345678000,
  "orderId": "ORD-2024-001",
  "requiredKyc": ["age_over_21", "kyc_verified"]
}
```

---

## 3. Payment Proof

A PaymentProof is created after a payment transaction is confirmed on-chain.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `paymentId` | `string` | Payment ID from request |
| `txHash` | `string` | On-chain transaction hash |
| `network` | `PaymentNetwork` | Blockchain network |
| `amount` | `string` | Amount paid |
| `currency` | `string` | Currency used |
| `fromAddress` | `string` | Sender address |
| `toAddress` | `string` | Recipient address |
| `timestamp` | `number` | Payment timestamp (ms) |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `blockHeight` | `number` | Block height |
| `ledgerIndex` | `number` | XRPL ledger index |
| `signature` | `string` | Cryptographic signature |
| `zkProof` | `string` | Midnight ZK proof data |

---

## 4. KYC + Payment Bundle

Combines payment proof with KYC verification for complete merchant verification.

### Structure

```typescript
interface KycPaymentBundle {
  payment: PaymentProof;
  kyc: {
    permissions: string[];
    proofHash: string;
    verified: boolean;
    pairwiseDid?: string;
  };
  orderId?: string;
  bundleHash: string;
  createdAt: number;
}
```

### Bundle Hash

The `bundleHash` is computed as SHA-256 of:
```json
{
  "payment": <PaymentProof>,
  "kyc": <permissions array>,
  "orderId": <string or null>
}
```

This ensures bundle integrity and prevents tampering.

---

## 5. Verification Pipeline

### Payment Verification

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     PAYMENT VERIFICATION PIPELINE                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │  AMOUNT  │───►│ ADDRESS  │───►│ NETWORK  │───►│  EXPIRY  │          │
│  │  MATCH   │    │  MATCH   │    │  MATCH   │    │  CHECK   │          │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘          │
│       │               │               │               │                  │
│       ▼               ▼               ▼               ▼                  │
│  Amount OK?      Address OK?     Network OK?     Not expired?           │
│                                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │    TX    │───►│  ON-CHAIN│───►│   KYC    │───►│ SUCCESS  │          │
│  │  EXISTS  │    │  VERIFY  │    │  CHECK   │    │          │          │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘          │
│       │               │               │               │                  │
│       ▼               ▼               ▼               ▼                  │
│  Has txHash?     TX confirmed?   KYC satisfied?  All checks pass        │
│                  (optional)                                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Verification Result

```typescript
interface PaymentVerificationResult {
  valid: boolean;
  confirmed: boolean;
  status: PaymentStatus;
  errors: string[];
  checks: {
    amountMatch: boolean;
    addressMatch: boolean;
    networkMatch: boolean;
    notExpired: boolean;
    txExists: boolean;
    txFinalized: boolean;
  };
  meta?: {
    verifiedAt: number;
    blockHeight?: number;
    confirmations?: number;
  };
}
```

---

## 6. Chain Bridge Interface

Generic interface for adding new blockchain support.

```typescript
interface IPaymentAdapter extends IChainBridge {
  createPayment(request: PaymentRequest): Promise<PaymentTransaction>;
  submitPayment(signedTx: string): Promise<SubmitResult>;
  getPaymentStatus(txHash: string): Promise<PaymentStatus>;
  verifyPayment(options: VerifyPaymentOptions): Promise<PaymentVerificationResult>;
  getTransaction(txHash: string): Promise<TransactionDetails | null>;
}
```

### Implementing a New Chain

1. Extend `PaymentAdapterBase`
2. Implement required methods
3. Register with `registerPaymentAdapter()`

```typescript
class MyChainAdapter extends PaymentAdapterBase {
  readonly network: PaymentNetwork = 'mychain';
  
  async connect(config?: ChainConfig): Promise<void> {
    // Connect to chain
  }
  
  async createPayment(request: PaymentRequest): Promise<PaymentTransaction> {
    // Create unsigned transaction
  }
  
  async verifyPayment(options: VerifyPaymentOptions): Promise<PaymentVerificationResult> {
    // Verify payment on-chain
  }
  
  // ... other methods
}
```

---

## 7. Split-Knowledge Architecture

Implements privacy-preserving data separation for commerce.

### Merchant View
- Order items and quantities
- Payment confirmation
- Age verification status
- **NO** delivery address

### Courier View
- Delivery address
- Delivery instructions
- Recipient name
- **NO** order contents or payment details

### Implementation

```typescript
// Merchant extraction
const merchantInfo = extractMerchantInfo(bundle, orderData);
// Returns: { orderId, items, paymentConfirmed, ageVerified }

// Courier extraction
const courierInfo = extractCourierInfo(bundle, shippingData);
// Returns: { deliveryAddress, instructions, recipientName }
```

---

## 8. Network-Specific Details

### XRPL

- Uses memo field for payment tracking
- Fast finality (~4 seconds)
- Minimum confirmations: 1

```typescript
// XRPL memo structure
{
  Memo: {
    MemoType: "agility/payment",
    MemoData: {
      type: "agility_payment",
      paymentId: "...",
      orderId: "...",
      timestamp: 1712345678000,
      version: "1.0.0"
    }
  }
}
```

### Midnight

- Full ZK proof support
- Privacy-preserving payments
- Shielded transfers available

```typescript
// Midnight ZK proof structure
{
  proofType: "payment",
  proofData: "...",
  publicInputs: ["paymentId", "recipient", "amount"],
  vkHash: "...",
  circuitId: "payment",
  generatedAt: 1712345678000
}
```

### Cardano (via Lace)

- CIP-30 wallet integration
- Metadata for payment tracking
- Native token support

```typescript
// Cardano metadata
{
  674: { msg: ["Agility Payment", "..."] },
  1: {
    agility: {
      paymentId: "...",
      orderId: "...",
      version: "1.0.0"
    }
  }
}
```

---

## 9. Security Considerations

### Payment Security

- **Amount verification**: Exact match required
- **Address verification**: Destination must match
- **Expiration**: Requests expire (default 15 minutes)
- **On-chain verification**: Optional but recommended

### Bundle Security

- **Hash integrity**: Bundle hash prevents tampering
- **KYC binding**: Permissions tied to payment
- **Split-knowledge**: Data separation enforced

### Best Practices

1. Always verify on-chain for production
2. Use short expiration times
3. Require KYC for regulated goods
4. Implement replay protection
5. Log verification results for audit

---

## 10. Integration with agility-qr

The payments module integrates with agility-qr for QR-based flows.

```typescript
import { createPaymentQR, verifyPaymentQR } from '@agility-protocol/headless/agility-qr/payments';

// Create payment QR
const qr = createPaymentQR({
  merchantId: 'store-123',
  amount: '50.00',
  currency: 'XRP',
  network: 'xrpl',
  destinationAddress: 'rXXX...',
  requiredKyc: ['age_over_18'],
});

// Verify response QR
const result = verifyPaymentQR({
  originalRequest: request,
  responseQR: customerQR,
});
```

---

## 11. Error Codes

| Code | Description |
|------|-------------|
| `AMOUNT_MISMATCH` | Payment amount doesn't match request |
| `ADDRESS_MISMATCH` | Destination address doesn't match |
| `NETWORK_MISMATCH` | Wrong blockchain network |
| `EXPIRED` | Payment request has expired |
| `TX_NOT_FOUND` | Transaction not found on-chain |
| `TX_FAILED` | Transaction failed on-chain |
| `KYC_MISSING` | Required KYC permissions not provided |
| `BUNDLE_TAMPERED` | Bundle hash verification failed |
| `NOT_CONNECTED` | Adapter not connected to network |

---

## 12. Future Enhancements

- **EVM chains**: Ethereum, Polygon, Arbitrum
- **Solana**: SPL token support
- **Cross-chain**: Atomic swaps
- **Subscriptions**: Recurring payments
- **Escrow**: Smart contract escrow

---

## License

MIT
