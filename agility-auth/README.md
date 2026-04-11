# Agility Auth Module

Biometric authentication for privacy-preserving identity verification.

## Features

- **Face ID / Touch ID** (iOS)
- **Fingerprint / Face Unlock** (Android)
- **WebAuthn** (Browser)
- **Secure Storage** (Keychain/Keystore)
- **Consent Signing** (Biometric-protected signatures)

## Installation

```bash
npm install @agility-protocol/headless

# For React Native (optional)
npm install expo-local-authentication
```

## Quick Start

### Browser (WebAuthn)

```typescript
import { createBiometricManager } from '@agility-protocol/headless/agility-auth';

const biometric = createBiometricManager();
await biometric.initialize();

// Check capabilities
const caps = await biometric.getCapabilities();
console.log('Available:', caps.available);
console.log('Types:', caps.types); // ['faceId', 'touchId'] or ['fingerprint']

// Authenticate
const result = await biometric.authenticate({
  reason: 'Approve payment of 50 XRP',
  requireConfirmation: true,
});

if (result.success) {
  console.log('Authenticated with:', result.method);
  console.log('Signature:', result.attestation?.signature);
}
```

### Consent Approval

```typescript
// Approve a proof request with biometrics
const consent = await biometric.authenticateConsent({
  type: 'proof_request',
  description: 'Share age verification',
  requestor: 'Wine Shop',
  consentData: {
    permissions: ['age_over_21'],
  },
});

if (consent.success) {
  // Consent approved with biometric signature
  console.log('Approved at:', consent.consent?.approvedAt);
}
```

### Payment Approval

```typescript
const payment = await biometric.authenticateConsent({
  type: 'payment',
  description: 'Approve payment',
  requestor: 'Merchant',
  consentData: {
    amount: '50.00',
    currency: 'XRP',
    recipient: 'rMerchant...',
  },
  requireBiometric: true, // No passcode fallback
});
```

### Secure Storage

```typescript
// Store sensitive data (biometric protected)
await biometric.secureStore('wallet_key', privateKey, {
  requireBiometric: true,
  invalidateOnBiometricChange: true,
});

// Retrieve with biometric auth
const result = await biometric.secureRetrieve('wallet_key', {
  requireBiometric: true,
});

if (result.success) {
  const privateKey = result.data;
}
```

## Platform Support

| Platform | API | Biometric Types |
|----------|-----|-----------------|
| iOS | LocalAuthentication | Face ID, Touch ID |
| Android | BiometricPrompt | Fingerprint, Face, Iris |
| Web | WebAuthn | Platform authenticator |
| React Native | expo-local-authentication | All native types |

## Security

- Uses native platform APIs (no raw biometric data)
- Secure Enclave / Keystore integration
- Biometric-protected key generation
- Attestation signatures for proof of authentication

## App Store Compliance

This module uses only official platform APIs:
- ✅ iOS: LocalAuthentication framework
- ✅ Android: BiometricPrompt API
- ✅ Web: WebAuthn standard

No biometric data is ever stored or transmitted.
