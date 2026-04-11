# Agility QR - QR-Based Proof Exchange System

A comprehensive QR-based proof exchange system for the AgilityProtocol SDK that enables privacy-preserving identity verification and selective disclosure for various use cases.

## 🚀 Features

### Core System
- **QR Proof Requests**: Generate compact, QR-safe proof requests
- **QR Proof Responses**: Create cryptographic proof responses
- **Encoding/Decoding**: Optimized QR payload encoding with compression
- **Security**: Request binding, replay protection, expiration handling

### Demo Applications
- **📱 Passport Wallet**: Customer wallet for scanning and responding to QR requests
- **🔞 Age Verifier**: Age verification system (18+/21+)
- **🛒 Merchant Portal**: Split-knowledge commerce with order verification
- **🚚 Courier Portal**: Delivery system with address-only access

### Use Cases
- **Age Verification**: Bars, venues, online age gates
- **KYC Services**: Financial services, account opening
- **Split-Knowledge Commerce**: Privacy-preserving e-commerce
- **Multi-Permission Bundles**: Travel, healthcare, education

## 📁 Structure

```
agility-qr/
├── qr/                    # Core QR proof system
│   └── index.ts          # Main QR functions
├── shared/               # Shared utilities
│   └── qr.ts            # Encoding/decoding, compression
├── wallet-demo/          # Customer wallet demo
├── verifier-demo/        # Age verifier demo
├── merchant-demo/        # Merchant portal demo
├── courier-demo/         # Courier portal demo
├── examples/             # Use case examples
│   ├── age-verification.ts
│   ├── merchant-flow.ts
│   ├── courier-flow.ts
│   └── multi-proof.ts
├── IMPLEMENTATION_GUIDE.md
└── README.md
```

## 🎯 Quick Start

### 1. Basic Age Verification

```typescript
import { createQRProofRequest, verifyQRProofResponse } from './qr/index.js';

// Create age verification request
const requestQR = createQRProofRequest({
  audience: 'bar-example.com',
  requiredPermissions: ['age_over_18'],
  metadata: { purpose: 'Bar entry verification' }
});

// Customer scans and responds (in wallet)
const responseQR = generateCustomerResponse(requestQR);

// Bar verifies response
const verification = verifyQRProofResponse(request, responseQR);
console.log('Customer verified:', verification.valid);
```

### 2. Split-Knowledge Commerce

```typescript
// Merchant verifies order (no address)
const merchantQR = createQRProofRequest({
  audience: 'store.com',
  requiredPermissions: ['order_paid', 'age_over_18']
});

// Courier gets address only
const courierQR = createQRProofRequest({
  audience: 'delivery.com',
  requiredPermissions: ['shipping_address']
});
```

### 3. Running Demos

```bash
# Start wallet demo
npx serve agility-qr/wallet-demo/
# Open http://localhost:3000

# Start verifier demo
npx serve agility-qr/verifier-demo/
# Open http://localhost:3000
```

## 🔧 Core Functions

### QR Request Creation
```typescript
const requestQR = createQRProofRequest({
  audience: 'your-service.com',
  requiredPermissions: ['age_over_18', 'kyc_verified'],
  expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
  metadata: { purpose: 'Identity verification' }
});
```

### QR Response Creation
```typescript
const responseQR = createQRProofResponse({
  request: decodedRequest,
  grant: consentGrant,
  proof: proofResponse
});
```

### QR Verification
```typescript
const verification = verifyQRProofResponse(originalRequest, responseQR);
if (verification.valid) {
  console.log('✅ Verification successful');
} else {
  console.log('❌ Failed:', verification.errors);
}
```

## 📋 Supported Permissions

| Permission | Description | Use Case |
|------------|-------------|----------|
| `age_over_18` | User is 18+ years old | General age restriction |
| `age_over_21` | User is 21+ years old | Alcohol, gambling |
| `kyc_verified` | Identity verified | Financial services |
| `order_paid` | Payment confirmed | E-commerce |
| `shipping_address` | Delivery address | Delivery services |
| `premium_member` | Premium status | VIP access |
| `student_status` | Student enrollment | Education discounts |
| `veteran_status` | Military veteran | Veterans benefits |
| `region_us` | US resident | Geographical restrictions |

## 🛡️ Security Features

### Request Binding
- SHA-256 hash binding between request and response
- Prevents QR reuse across different requests
- Cryptographic proof of authenticity

### Replay Protection
- Unique nonce for each request
- Timestamp validation with expiration
- Prevents old QR codes from being reused

### Privacy Protection
- Minimal data disclosure (only requested permissions)
- No personal information in QR codes
- Short expiration times (5 minutes default)
- User consent required for all data sharing

## 🎨 Demo Applications

### Passport Wallet
- **Features**: QR scanning, consent UI, proof generation
- **Use**: Customer wallet for responding to verification requests
- **Path**: `wallet-demo/index.html`

### Age Verifier
- **Features**: 18+/21+ verification, QR generation, validation
- **Use**: Bars, venues, age-restricted services
- **Path**: `verifier-demo/index.html`

### Merchant Portal
- **Features**: Order verification, payment confirmation, age check
- **Use**: E-commerce with privacy protection
- **Path**: `merchant-demo/index.html`

### Courier Portal
- **Features**: Address collection, delivery management
- **Use**: Delivery services with split-knowledge
- **Path**: `courier-demo/index.html`

## 📖 Examples

### Running Examples
```bash
# Run all examples
npx ts-node agility-qr/examples/multi-proof.ts

# Run specific category
npx ts-node agility-qr/examples/age-verification.ts
npx ts-node agility-qr/examples/merchant-flow.ts
npx ts-node agility-qr/examples/courier-flow.ts
```

### Example Categories
- **Age Verification**: Bars, casinos, online gates
- **Merchant Flow**: E-commerce, subscriptions, high-value items
- **Courier Flow**: Standard, express, secure delivery
- **Multi-Proof**: Travel bundles, financial services, healthcare

## 🔌 Integration

### Web Integration
```html
<script type="module">
  import { createQRProofRequest } from './agility-qr/qr/index.js';
  
  // Generate QR for your service
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
  const qr = createQRProofRequest(req.body);
  res.json({ qr });
});

// Server-side verification
app.post('/verify-qr', (req, res) => {
  const verification = verifyQRProofResponse(req.body.request, req.body.response);
  res.json(verification);
});
```

## 🎯 Use Cases

### Age Verification
- **Bars & Venues**: Fast, privacy-preserving age checks
- **Online Services**: Age gates without personal data collection
- **Events**: Multi-tier access (18+, 21+, VIP)

### Split-Knowledge Commerce
- **E-commerce**: Merchants see orders, couriers see addresses
- **High-Value Items**: Reduced theft risk through data separation
- **Sensitive Products**: Discreet delivery for privacy-sensitive items

### Financial Services
- **Account Opening**: KYC verification without document storage
- **Loan Applications**: Identity and income verification
- **Trading Platforms**: Age and residency verification

### Healthcare
- **Patient Verification**: Insurance and age verification
- **Pharmacy Access: Age-restricted medication verification
- **Telemedicine**: Patient identity confirmation

## 🚀 Future Enhancements

### Planned Features
- **Encryption Support**: End-to-end encrypted QR payloads
- **Biometric Integration**: Fingerprint/face verification
- **Blockchain Integration**: On-chain verification records
- **Advanced Compression**: Smaller QR codes for dense data
- **Midnight ZK Integration**: Zero-knowledge proof support

### ZK Proof Integration (Future)
```typescript
// Future zero-knowledge proof integration
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

## 📚 Documentation

- **[Implementation Guide](./IMPLEMENTATION_GUIDE.md)**: Detailed technical documentation
- **[Demo READMEs](./wallet-demo/README.md)**: Individual demo documentation
- **[Examples](./examples/)**: Code examples and use cases

## 🛠️ Development

### Setup
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

### Testing
```bash
# Run all tests
npm test

# Run specific test category
npm test -- --grep "QR"
```

## 🔐 Security Considerations

### Production Deployment
1. **HTTPS Only**: Always serve over HTTPS
2. **Input Validation**: Validate all QR inputs
3. **Rate Limiting**: Prevent brute force attacks
4. **Audit Logs**: Log all verification attempts
5. **Short Expiration**: Use 5-minute QR expiration

### Privacy Best Practices
1. **Minimal Data**: Only request necessary permissions
2. **Clear Consent**: Explain what data is shared
3. **Data Retention**: Don't store QR data longer than needed
4. **User Control**: Allow users to revoke permissions

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../CONTRIBUTING.md) for details.

### Development Guidelines
- Use TypeScript for all new code
- Follow ESLint configuration
- Add JSDoc comments for public functions
- Include unit tests for new features
- Update documentation for API changes

## 📄 License

This project follows the same license as the main AgilityProtocol project.

## 🆘 Support

For questions, issues, or contributions:
- **GitHub Issues**: [Report bugs or request features](https://github.com/paranormal39/AgilityProtocol/issues)
- **Documentation**: See [Implementation Guide](./IMPLEMENTATION_GUIDE.md)
- **Community**: Join the Agility Protocol community discussions

## 🙏 Acknowledgments

Built as an extension to the [AgilityProtocol](https://github.com/paranormal39/AgilityProtocol) SDK for privacy-preserving identity verification.

---

**Note**: This is a demonstration implementation. For production use, ensure proper security review, compliance checking, and integration with your existing systems.
