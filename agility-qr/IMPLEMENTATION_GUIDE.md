# Agility QR Implementation Guide

## Overview

The Agility QR system extends the AgilityProtocol SDK with QR-based proof exchange capabilities, enabling privacy-preserving identity verification and selective disclosure for various use cases including age verification, KYC, and split-knowledge commerce.

## Architecture

### Core Components

```
agility-qr/
├── qr/                    # QR proof request/response system
│   └── index.ts          # Core QR functions
├── shared/               # Shared utilities
│   └── qr.ts            # Encoding/decoding, compression
├── wallet-demo/          # Passport wallet demo
│   ├── index.html       # Wallet web interface
│   └── README.md        # Wallet documentation
├── verifier-demo/        # Age verifier demo
│   ├── index.html       # Verifier web interface
│   └── README.md        # Verifier documentation
├── merchant-demo/        # Merchant portal demo
│   ├── index.html       # Merchant web interface
│   └── README.md        # Merchant documentation
├── courier-demo/         # Courier portal demo
│   ├── index.html       # Courier web interface
│   └── README.md        # Courier documentation
├── examples/             # Use case examples
│   ├── age-verification.ts
│   ├── merchant-flow.ts
│   ├── courier-flow.ts
│   └── multi-proof.ts
└── IMPLEMENTATION_GUIDE.md
```

### System Flow

1. **QR 1 (Request)**: Verifier creates proof request QR
2. **Wallet Scan**: Customer scans QR with wallet app
3. **Consent**: Customer reviews and approves request
4. **QR 2 (Response)**: Wallet generates proof response QR
5. **Verification**: Verifier scans response and validates proof

## QR Protocol

### QR 1 - Proof Request

```json
{
  "type": "request",
  "data": {
    "requestId": "unique-id",
    "audience": "verifier-domain.com",
    "requiredPermissions": ["age_over_18"],
    "nonce": "random-nonce",
    "issuedAt": 1722856000000,
    "expiresAt": 1722856300000,
    "protocolVersion": "1.0.0",
    "metadata": { "purpose": "Age verification" }
  },
  "timestamp": 1722856000000,
  "version": "1.0.0"
}
```

### QR 2 - Proof Response

```json
{
  "type": "response",
  "data": {
    "requestId": "matching-id",
    "audience": "verifier-domain.com",
    "nonce": "matching-nonce",
    "satisfiedPermissions": ["age_over_18"],
    "requestHash": "sha256-binding",
    "issuedAt": 1722856010000,
    "expiresAt": 1722856310000,
    "grant": { "consent-data" },
    "proof": { "verification-data" }
  },
  "timestamp": 1722856010000,
  "version": "1.0.0"
}
```

## Core Functions

### QR Proof Request Creation

```typescript
import { createQRProofRequest } from './qr/index.js';

const requestQR = createQRProofRequest({
  audience: 'example-verifier.com',
  requiredPermissions: ['age_over_18'],
  protocolVersion: '1.0.0',
  metadata: {
    purpose: 'Age verification for restricted access'
  }
});
```

### QR Proof Response Creation

```typescript
import { createQRProofResponse } from './qr/index.js';

const responseQR = createQRProofResponse({
  request: decodedRequest,
  grant: consentGrant,
  proof: proofResponse
});
```

### QR Verification

```typescript
import { verifyQRProofResponse } from './qr/index.js';

const verification = verifyQRProofResponse(originalRequest, responseQR);
if (verification.valid) {
  console.log('✅ Verification successful');
} else {
  console.log('❌ Verification failed:', verification.errors);
}
```

## Permission System

### Standard Permissions

| Permission | Description | Use Case |
|------------|-------------|----------|
| `age_over_18` | User is 18 years or older | General age restriction |
| `age_over_21` | User is 21 years or older | Alcohol, gambling |
| `kyc_verified` | Identity verification completed | Financial services |
| `order_paid` | Order payment confirmed | E-commerce |
| `shipping_address` | Delivery address available | Delivery services |
| `premium_member` | Premium subscription status | VIP access |
| `student_status` | Student enrollment active | Education discounts |
| `veteran_status` | Military veteran status | Veterans benefits |
| `region_us` | US resident confirmed | Geographical restrictions |

### Custom Permissions

Implement custom permissions by extending the permission deck:

```typescript
const customDeck = {
  ...standardDeck,
  professional_license: true,
  insurance_active: true,
  vaccination_status: true
};
```

## Security Features

### Request Binding

- **SHA-256 Hash**: Response bound to original request
- **Nonce Validation**: Prevents replay attacks
- **Timestamp Verification**: Enforces expiration

### Replay Protection

```typescript
// Nonce validation in verification
if (response.nonce !== request.nonce) {
  errors.push('Nonce mismatch - possible replay attack');
}

// Expiration check
if (Date.now() > response.expiresAt) {
  errors.push('Response has expired');
}
```

### Minimal Data Disclosure

- **Permission-Based**: Only share requested permissions
- **No PII**: Personal information never in QR
- **Short Lifespan**: QR codes expire in 5 minutes
- **User Consent**: Explicit wallet approval required

## Use Cases

### 1. Age Verification

**Scenario**: Bar or venue needs to verify customer age

**Flow**:
1. Venue generates QR with `age_over_18` or `age_over_21` permission
2. Customer scans QR and approves age verification
3. Venue receives confirmation without seeing ID details

**Benefits**:
- Privacy-preserving age check
- No personal data collection
- Fast verification (under 30 seconds)

### 2. Split-Knowledge Commerce

**Scenario**: E-commerce with separate merchant and delivery

**Merchant Flow**:
1. Merchant requests `order_paid` and `age_over_18` permissions
2. Customer confirms order and age
3. Merchant sees payment status, not delivery address

**Courier Flow**:
1. Courier requests `shipping_address` permission
2. Customer shares delivery address
3. Courier sees address, not order contents

**Benefits**:
- Enhanced privacy for customers
- Reduced theft risk for high-value items
- Compliance with privacy regulations

### 3. KYC Verification

**Scenario**: Financial services need identity verification

**Flow**:
1. Bank requests `kyc_verified` and `age_over_18` permissions
2. Customer shares verification status
3. Bank confirms KYC without collecting documents

**Benefits**:
- Streamlined onboarding
- Reduced document handling
- Privacy-compliant verification

### 4. Multi-Permission Bundles

**Scenario**: Complex verification requirements

**Travel Bundle Example**:
```typescript
const travelQR = createQRProofRequest({
  audience: 'airline.com',
  requiredPermissions: [
    'age_over_18',      // Adult passenger
    'kyc_verified',     // Identity verification
    'vaccination_status', // Health requirements
    'region_us'         // Residency for customs
  ],
  metadata: {
    purpose: 'International travel verification'
  }
});
```

## Integration Guide

### Web Integration

```html
<!-- Include QR module -->
<script type="module">
  import { createQRProofRequest } from './agility-qr/qr/index.js';
  
  // Generate QR for age verification
  const qr = createQRProofRequest({
    audience: 'your-site.com',
    requiredPermissions: ['age_over_18']
  });
  
  // Display QR (use QR code library)
  const qrImage = await generateQRCode(qr);
  document.getElementById('qr-display').src = qrImage;
</script>
```

### Node.js Integration

```javascript
import { createQRProofRequest, verifyQRProofResponse } from './agility-qr/qr/index.js';

// Server-side QR generation
app.post('/generate-qr', (req, res) => {
  const { permissions, metadata } = req.body;
  
  const qr = createQRProofRequest({
    audience: 'your-service.com',
    requiredPermissions: permissions,
    metadata
  });
  
  res.json({ qr });
});

// Server-side verification
app.post('/verify-qr', (req, res) => {
  const { requestQR, responseQR } = req.body;
  
  const request = decodeQRProofRequest(requestQR);
  const verification = verifyQRProofResponse(request, responseQR);
  
  res.json(verification);
});
```

### Mobile App Integration

```typescript
// React Native example
import { decodeQRProofRequest, createQRProofResponse } from './agility-qr/qr/index.js';

// Scan QR and display consent
const handleQRScan = async (qrData: string) => {
  try {
    const request = decodeQRProofRequest(qrData);
    
    // Show consent UI
    const approved = await showConsentUI(request);
    
    if (approved) {
      const responseQR = createQRProofResponse({
        request,
        grant: await createConsentGrant(request),
        proof: await createProof(request, userDeck)
      });
      
      // Display response QR
      await displayResponseQR(responseQR);
    }
  } catch (error) {
    console.error('Invalid QR:', error);
  }
};
```

## Demo Applications

### Running the Demos

1. **Wallet Demo**:
   ```bash
   # Serve the wallet demo
   npx serve agility-qr/wallet-demo/
   # Open http://localhost:3000
   ```

2. **Verifier Demo**:
   ```bash
   # Serve the verifier demo
   npx serve agility-qr/verifier-demo/
   # Open http://localhost:3000
   ```

3. **Merchant/Courier Demos**:
   ```bash
   # Serve merchant demo
   npx serve agility-qr/merchant-demo/
   
   # Serve courier demo (separate terminal)
   npx serve agility-qr/courier-demo/
   ```

### Demo QR Codes

**Age Verification (18+)**:
```
AQR1:eyJ0eXBlIjoicmVxdWVzdCIsImRhdGEiOnsicmVxdWVzdElkIjoiZGVtbzEyMzQ1IiwiYXVkaWVuY2UiOiJkZW1vLXZlcmlmaWVyLmNvbSIsInJlcXVpcmVkUGVybWlzc2lvbnMiOlsiYWdlX292ZXJfMTgiXSwibm9uY2UiOiJub25jZTEyMyIsImlzc3VlZEF0IjoxNzIyODU2MDAwMDAwLCJleHBpcmVzQXQiOjE3MjI4NTYzMDAwMDAsInByb3RvY29sVmVyc2lvbiI6IjEuMC4wIn0sInRpbWVzdGFtcCI6MTcyMjg1NjAwMDAwMCwidmVyc2lvbiI6IjEuMC4wIn0=
```

**Merchant Order Verification**:
```
AQR1:eyJ0eXBlIjoicmVxdWVzdCIsImRhdGEiOnsicmVxdWVzdElkIjoib3JkZXIxMjM0NSIsImF1ZGllbmNlIjoibWVyY2hhbnQtZGVtby5jb20iLCJyZXF1aXJlZFBlcm1pc3Npb25zIjpbIm9yZGVyX3BhaWQiLCJhZ2Vfb3Zlcl8xOCJdLCJub25jZSI6Im9yZGVybm9uY2UiLCJpc3N1ZWRBdCI6MTcyMjg1NjAyMDAwMCwiZXhwaXJlc0F0IjoxNzIyODU2MzIwMDAwLCJwcm90b2NvbFZlcnNpb24iOiIxLjAuMCJ9LCJ0aW1lc3RhbXAiOjE3MjI4NTYwMjAwMDAsInZlcnNpb24iOiIxLjAuMCJ9
```

## Examples

### Running Examples

```bash
# Run all examples
npx ts-node agility-qr/examples/multi-proof.ts

# Run specific example
npx ts-node agility-qr/examples/age-verification.ts
```

### Example Categories

1. **Age Verification**: Bar, casino, online age gates
2. **Merchant Flow**: E-commerce, subscription services
3. **Courier Flow**: Standard, express, secure delivery
4. **Multi-Proof**: Travel, finance, healthcare bundles

## Best Practices

### Security

1. **Short Expiration**: Use 5-minute QR expiration
2. **HTTPS Only**: Always serve over HTTPS
3. **Input Validation**: Validate all QR inputs
4. **Rate Limiting**: Prevent brute force attacks
5. **Audit Logs**: Log all verification attempts

### Privacy

1. **Minimal Data**: Only request necessary permissions
2. **Clear Consent**: Explain what data is shared
3. **Data Retention**: Don't store QR data longer than needed
4. **User Control**: Allow users to revoke permissions

### UX

1. **Clear Instructions**: Guide users through the process
2. **Error Handling**: Provide helpful error messages
3. **Progress Indicators**: Show verification status
4. **Mobile Optimized**: Design for mobile scanning

## Future Enhancements

### Planned Features

1. **Encryption Support**: End-to-end encrypted QR payloads
2. **Biometric Integration**: Fingerprint/face verification
3. **Blockchain Integration**: On-chain verification records
4. **Advanced Compression**: Smaller QR codes for dense data
5. **Multi-Language Support**: International verification

### Midnight ZK Integration

```typescript
// Future ZK proof integration
const zkProof = await generateZKProof({
  request,
  witness: customerSecretData,
  circuit: 'ageVerification'
});

const zkResponse = createQRProofResponse({
  request,
  proof: zkProof,
  zkVerified: true
});
```

## Troubleshooting

### Common Issues

1. **QR Too Large**: Reduce metadata or enable compression
2. **Verification Fails**: Check nonce and request hash binding
3. **Expired QR**: Regenerate with fresh timestamp
4. **Invalid Format**: Ensure proper AQR1: prefix

### Debug Mode

```typescript
// Enable debug logging
const qr = createQRProofRequest({
  audience: 'debug.com',
  requiredPermissions: ['age_over_18'],
  debug: true // Enable debug information
});
```

### Testing

```typescript
// Mock verification for testing
const mockVerification = {
  valid: true,
  errors: [],
  debug: {
    processingTime: 150,
    permissionsChecked: 1,
    timestamp: Date.now()
  }
};
```

## Contributing

### Development Setup

```bash
# Clone repository
git clone https://github.com/paranormal39/AgilityProtocol.git
cd AgilityProtocol/agility-qr

# Install dependencies
npm install

# Run tests
npm test

# Build for production
npm run build
```

### Code Style

- Use TypeScript for all new code
- Follow ESLint configuration
- Add JSDoc comments for public functions
- Include unit tests for new features

## License

This implementation follows the same license as the main AgilityProtocol project.

## Support

For questions, issues, or contributions:
- GitHub Issues: https://github.com/paranormal39/AgilityProtocol/issues
- Documentation: See main AgilityProtocol documentation
- Community: Join the Agility Protocol community discussions

---

**Note**: This is a demonstration implementation. For production use, ensure proper security review, compliance checking, and integration with your existing systems.
