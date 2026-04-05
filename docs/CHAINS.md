# Agility Protocol - Chain Support

Documentation for blockchain-specific integrations in the Agility Protocol SDK.

---

## Supported Chains

| Chain | Status | Payments | ZK Proofs | Wallet |
|-------|--------|----------|-----------|--------|
| XRPL | ✅ Production | ✅ | ❌ | XUMM |
| Midnight | ✅ Production | ✅ | ✅ | Lace |
| Cardano | ✅ Production | ✅ | ⚠️ Limited | Lace |

---

## XRPL (XRP Ledger)

### Overview

XRPL provides fast, low-cost payments with ~4 second finality. The Agility SDK uses XRPL for payment verification and consent anchoring.

### Configuration

```typescript
import { createXrplPaymentAdapter } from '@agility-protocol/headless/agility-payments';

const xrpl = createXrplPaymentAdapter();

// Testnet
await xrpl.connect({ networkType: 'testnet' });

// Mainnet
await xrpl.connect({ 
  networkType: 'mainnet',
  wsUrl: 'wss://xrplcluster.com' // Optional custom endpoint
});
```

### Endpoints

| Network | WebSocket URL |
|---------|---------------|
| Mainnet | `wss://xrplcluster.com` |
| Testnet | `wss://s.altnet.rippletest.net:51233` |
| Devnet | `wss://s.devnet.rippletest.net:51233` |

### Payment Memo Format

Agility uses XRPL memos to track payments:

```json
{
  "Memo": {
    "MemoType": "agility/payment",
    "MemoData": {
      "type": "agility_payment",
      "paymentId": "uuid-v4",
      "orderId": "optional-order-id",
      "timestamp": 1712345678000,
      "version": "1.0.0"
    },
    "MemoFormat": "application/json"
  }
}
```

### XUMM Integration

```typescript
import { XummSdk } from 'xumm-sdk';

const xumm = new XummSdk('api-key', 'api-secret');

// Create payment request
const { tx } = await xrpl.preparePaymentForWallet(request, userAddress);

const payload = await xumm.payload.create({
  txjson: tx,
});

// User signs in XUMM app
// Poll for result
const result = await xumm.payload.get(payload.uuid);

if (result.meta.signed) {
  // Payment signed, verify on-chain
  const verification = await xrpl.verifyPayment({
    request,
    proof: { txHash: result.response.txid, ... },
    verifyOnChain: true,
  });
}
```

### Environment Variables

```bash
XRPL_RPC_URL=wss://xrplcluster.com
ENABLE_XRPL_CONSENT_TX_VERIFY=true
```

---

## Midnight

### Overview

Midnight is a privacy-focused blockchain with native ZK proof support. It enables fully private payments and identity verification without revealing underlying data.

### Midnight.js Packages

The SDK uses official Midnight.js packages (v4.0.2):

| Package | Purpose |
|---------|---------|
| `@midnight-ntwrk/midnight-js-types` | Type definitions |
| `@midnight-ntwrk/midnight-js-contracts` | Smart contract interaction |
| `@midnight-ntwrk/midnight-js-http-client-proof-provider` | ZK proof generation |
| `@midnight-ntwrk/midnight-js-indexer-public-data-provider` | Blockchain data |
| `@midnight-ntwrk/midnight-js-network-id` | Network identification |

### Configuration

```typescript
import { createMidnightPaymentAdapter } from '@agility-protocol/headless/agility-payments';

const midnight = createMidnightPaymentAdapter();

await midnight.connect({ 
  networkType: 'testnet',
  rpcUrl: 'https://rpc.testnet.midnight.network', // Optional
});
```

### Endpoints

| Network | Node URL | Indexer URL |
|---------|----------|-------------|
| Mainnet | `https://rpc.midnight.network` | `https://indexer.midnight.network` |
| Testnet | `https://rpc.testnet.midnight.network` | `https://indexer.testnet.midnight.network` |

### ZK Proof Generation

```typescript
// Generate payment proof
const paymentProof = await midnight.generatePaymentProof(request, fromAddress);

// Generate KYC proof
const kycProof = await midnight.generateKycProof(
  ['age_over_21', 'kyc_verified'],
  { dateOfBirth: '1990-01-01' } // Private data - never revealed
);

// Combined proof
const { paymentProof, kycProof, combined } = await midnight.createKycPaymentProof(
  request,
  fromAddress,
  {
    permissions: ['age_over_21'],
    privateData: { dateOfBirth: '1990-01-01' },
  }
);
```

### ZK Proof Structure

```typescript
interface MidnightZkProof {
  proofType: 'payment' | 'identity' | 'custom';
  proofData: string;           // Serialized proof
  publicInputs: string[];      // Public values
  vkHash: string;              // Verification key hash
  circuitId: string;           // Circuit identifier
  generatedAt: number;         // Timestamp
}
```

### Shielded Transfers

```typescript
// Request shielded (private) transfer
const request = {
  ...paymentRequest,
  metadata: { shielded: true },
};

const tx = await midnight.createPayment(request);
// Transaction details are hidden on-chain
```

---

## Cardano (via Lace)

### Overview

Cardano integration via the Lace wallet browser extension using CIP-30 standard.

### Configuration

```typescript
import { createLacePaymentAdapter } from '@agility-protocol/headless/agility-payments';

const lace = createLacePaymentAdapter();

// Check if Lace is installed
if (!lace.isAvailable()) {
  console.log('Please install Lace wallet');
  return;
}

await lace.connect();
```

### CIP-30 API

The adapter implements the CIP-30 wallet connector standard:

```typescript
interface Cip30WalletApi {
  getNetworkId(): Promise<number>;
  getUsedAddresses(): Promise<string[]>;
  getUnusedAddresses(): Promise<string[]>;
  getChangeAddress(): Promise<string>;
  getBalance(): Promise<string>;
  signTx(tx: string, partialSign?: boolean): Promise<string>;
  signData(addr: string, payload: string): Promise<{ signature: string; key: string }>;
  submitTx(tx: string): Promise<string>;
}
```

### Payment Metadata

Cardano transactions include metadata for tracking:

```typescript
// CIP-20 message + Agility data
{
  674: {
    msg: ["Agility Payment", "pay-123..."]
  },
  1: {
    agility: {
      paymentId: "uuid-v4",
      orderId: "optional",
      version: "1.0.0",
      timestamp: 1712345678000
    }
  }
}
```

### Network IDs

| Network | ID |
|---------|-----|
| Mainnet | 1 |
| Testnet/Preprod | 0 |

### Signing Data for KYC

```typescript
// Sign arbitrary data for KYC proofs
const { signature, key } = await lace.signData(JSON.stringify({
  permissions: ['age_over_21'],
  timestamp: Date.now(),
}));
```

---

## Adding New Chains

### Chain Bridge Interface

Implement `IPaymentAdapter` to add support for new chains:

```typescript
import { PaymentAdapterBase } from '@agility-protocol/headless/agility-payments';

class MyChainAdapter extends PaymentAdapterBase {
  readonly network: PaymentNetwork = 'mychain';

  async connect(config?: ChainConfig): Promise<void> {
    // Initialize connection to your chain
  }

  async disconnect(): Promise<void> {
    // Clean up connection
  }

  async getNetworkStatus(): Promise<NetworkStatus> {
    return {
      connected: this.connected,
      network: 'mychain',
      networkType: 'mainnet',
      blockHeight: await this.getBlockHeight(),
    };
  }

  async createPayment(request: PaymentRequest): Promise<PaymentTransaction> {
    // Create unsigned transaction
    return {
      network: 'mychain',
      unsignedTx: JSON.stringify(tx),
      expiresAt: request.expiresAt,
      summary: {
        to: request.destinationAddress,
        amount: request.amount,
        currency: request.currency,
      },
    };
  }

  async submitPayment(signedTx: string): Promise<SubmitResult> {
    // Submit to chain
    const txHash = await this.broadcastTx(signedTx);
    return { success: true, txHash };
  }

  async getPaymentStatus(txHash: string): Promise<PaymentStatus> {
    // Check transaction status
    const tx = await this.getTx(txHash);
    return tx.confirmed ? 'confirmed' : 'pending';
  }

  async verifyPayment(options: VerifyPaymentOptions): Promise<PaymentVerificationResult> {
    // Verify payment matches request
    const validation = this.validatePaymentProof(options.request, options.proof);
    
    if (options.verifyOnChain) {
      // Fetch and verify on-chain
    }

    return {
      valid: validation.valid,
      confirmed: true,
      status: 'confirmed',
      errors: validation.errors,
      checks: validation.checks,
    };
  }

  async getTransaction(txHash: string): Promise<TransactionDetails | null> {
    // Fetch transaction details
  }
}
```

### Registration

```typescript
import { registerPaymentAdapter } from '@agility-protocol/headless/agility-payments';

const myAdapter = new MyChainAdapter();
registerPaymentAdapter('mychain', myAdapter);

// Now available via
const adapter = getPaymentAdapter('mychain');
```

---

## Future Chain Support

### Planned

| Chain | Timeline | Notes |
|-------|----------|-------|
| Ethereum | Q3 2026 | EVM support via ethers.js |
| Polygon | Q3 2026 | Low-cost EVM |
| Solana | Q4 2026 | SPL tokens |
| Cosmos | 2027 | IBC integration |

### Contributing

To contribute a new chain adapter:

1. Fork the repository
2. Implement `PaymentAdapterBase`
3. Add tests
4. Submit PR

---

## License

MIT
