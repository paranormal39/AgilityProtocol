# Agility Tools – Private Commerce Demo

A visual demonstration of **Selective Disclosure** in privacy-preserving commerce using the Agility Protocol.

## What This Demo Shows

This single-page application demonstrates how different roles in a commerce flow only see the data they need:

| Role | Sees | Hidden |
|------|------|--------|
| **Buyer** | Everything (their own data) | - |
| **Merchant** | Order token, item, quantity, payment status | Buyer identity, address, wallet |
| **Courier** | GPS coordinates, route, instructions | Order items, buyer name, price |
| **Return** | Return authorization, destination | Original transaction, identities |

## Quick Start

**One-line command from project root:**

```bash
npm run demo:commerce
```

Or manually:

```bash
cd apps/agility-tools-demo
npm install
npm run dev
```

Open http://localhost:3000

## Flow

```
[ Buyer ]  →  [ Merchant ]  →  [ Courier ]  →  [ Return ]
   │              │               │              │
   │ Creates      │ Verifies      │ Scans QR     │ Generates
   │ Order        │ Order         │ Unlocks      │ Return QR
   │              │ Generates     │ Route        │
   │              │ Courier QR    │              │
   ▼              ▼               ▼              ▼
  QR Code       QR Code        Route Map      QR Code
```

## Tech Stack

- **React + Vite** - Fast development
- **Tailwind CSS** - Dark theme styling
- **qrcode** - QR code generation
- **Simulated ZK** - Visual proof generation

## Midnight Compact Contract

The `contracts/selective_disclosure.compact` file shows the structure of a real Midnight ZK contract that would power this selective disclosure:

```compact
// Merchant only sees what they need
export circuit merchant_view(
  witness buyer_identity: Bytes32,  // HIDDEN
  witness full_address: Address,     // HIDDEN
  instance order_token: String,      // VISIBLE
  instance payment_valid: Bool       // VISIBLE
) -> MerchantProof { ... }
```

## Key Concepts

### Selective Disclosure
Each role receives a **proof** that reveals only specific data. The ZK circuit ensures:
- Hidden data is never exposed
- Proofs are cryptographically verifiable
- No party can access more than they need

### Split-Knowledge Architecture
- **Merchant** knows what was ordered but not who ordered it
- **Courier** knows where to deliver but not what's in the package
- **Return** can authorize returns without seeing original transaction

## Files

```
apps/agility-tools-demo/
├── src/
│   ├── App.jsx              # Main layout with 4 panels
│   ├── components/
│   │   ├── BuyerPanel.jsx   # Creates orders
│   │   ├── MerchantPanel.jsx # Verifies orders
│   │   ├── CourierPanel.jsx  # Delivers packages
│   │   ├── ReturnPanel.jsx   # Handles returns
│   │   ├── DataView.jsx      # Visible/Hidden display
│   │   └── QRDisplay.jsx     # QR code renderer
│   └── utils/
│       ├── mockFlow.js       # Simulated data flow
│       └── proofSimulator.js # Simulated ZK proofs
└── contracts/
    └── selective_disclosure.compact  # Midnight contract
```

## Privacy Labels

Each panel shows:
- 🟢 **VISIBLE DATA** - What this role can see
- 🔴 **HIDDEN DATA** - What's protected from this role

## Next Steps

To use real ZK proofs instead of simulated ones:

1. Deploy `selective_disclosure.compact` to Midnight testnet
2. Connect via `@midnight-ntwrk/midnight-js-contracts`
3. Replace `proofSimulator.js` with real circuit calls

## License

MIT - Part of Agility Protocol
