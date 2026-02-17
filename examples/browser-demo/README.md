# Agility Protocol - Browser Demo

A minimal browser-based demo showing the Agility Protocol verification flow with Lace wallet integration.

## Features

- Connect to Lace wallet (or demo mode without extension)
- Generate ProofRequest
- Sign consent and generate proof
- Verify proof with visual feedback

## Usage

### Option 1: Open directly

Simply open `index.html` in a browser.

### Option 2: Serve with a local server

```bash
# Using Python
python -m http.server 8080

# Using Node.js
npx serve .
```

Then open `http://localhost:8080`

## Demo Flow

1. **Connect Lace** - Connects to Lace wallet extension (or runs in demo mode)
2. **Generate Request** - Creates a ProofRequest with required permissions
3. **Sign & Prove** - User signs consent, proof is generated
4. **Verify** - Proof is verified against the original request

## Lace Integration

When Lace extension is installed, the demo uses the CIP-30 API:

```javascript
// Check for Lace
if (window.cardano?.lace) {
  const api = await window.cardano.lace.enable();
  const addresses = await api.getUsedAddresses();
  const signature = await api.signData(address, payload);
}
```

## Demo Mode

If Lace is not installed, the demo runs in simulation mode with mock data.
This allows testing the UI flow without a real wallet.

## Protocol Version

This demo implements Agility Protocol v0.1.0
