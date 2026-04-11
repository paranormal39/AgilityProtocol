# Merchant Demo - Split Knowledge Commerce

A web-based merchant portal that demonstrates privacy-preserving commerce using split-knowledge verification, where merchants only see order/payment information while delivery details are kept separate for couriers.

## Features

- **Split-Knowledge Architecture**: Merchants see only order and payment data
- **Age Verification**: Integrated 18+ age checking for restricted products
- **Order Management**: Complete order workflow from verification to fulfillment
- **Privacy Protection**: Customer address never exposed to merchant
- **Step-by-Step Flow**: Clear 3-step verification process
- **Real-time Status**: Live order and verification status updates

## Split-Knowledge System

### Merchant Access Only
- ✅ Order details (item, price, quantity)
- ✅ Payment status and confirmation
- ✅ Age verification results
- ❌ Customer delivery address
- ❌ Customer contact information
- ❌ Personal identification details

### Courier Access Only (Separate Demo)
- ✅ Delivery address and route
- ✅ Delivery instructions
- ✅ Customer contact for delivery
- ❌ Order contents and value
- ❌ Payment information
- ❌ Personal identity details

## Order Flow

### Step 1: Order Setup
- Display product information and pricing
- Show age restriction requirements
- Explain privacy protection features
- Initialize verification process

### Step 2: Customer Verification
- Generate QR proof request for:
  - `order_paid` - Confirm payment is complete
  - `age_over_18` - Verify customer meets age requirement
- Display QR for customer to scan
- Wait for customer response

### Step 3: Process Response
- Scan customer's QR response
- Verify permissions are satisfied
- Update order status to "Ready for Processing"
- Assign to courier (address delivered separately)

## QR Request Structure

### Merchant Request (QR 1)
```json
{
  "requestId": "order12345",
  "audience": "merchant-demo.com",
  "requiredPermissions": [
    "order_paid",
    "age_over_18"
  ],
  "metadata": {
    "orderId": "ORD-2024-001",
    "merchant": "Demo Store",
    "amount": 49.99,
    "currency": "USD"
  }
}
```

### Customer Response (QR 2)
```json
{
  "requestId": "order12345",
  "satisfiedPermissions": [
    "order_paid",
    "age_over_18"
  ],
  "grant": { "consent-data" },
  "proof": { "verification-data" }
}
```

## Privacy Benefits

### For Customers
- **Address Privacy**: Home address never shared with merchant
- **Data Minimization**: Only necessary data shared with each party
- **Consent Control**: Explicit approval for each data share
- **Security**: No central repository of all customer data

### For Merchants
- **Compliance**: Meets age verification requirements
- **Liability Reduction**: No access to sensitive personal data
- **Security**: Smaller attack surface for data breaches
- **Trust**: Enhanced customer confidence

### For Couriers
- **Focused Information**: Only delivery-relevant data
- **Efficiency**: No irrelevant order details
- **Privacy**: Not exposed to purchase history or values

## Use Cases

### Age-Restricted Commerce
- **Alcohol Delivery**: Verify age without sharing identity
- **Tobacco Products**: Age verification with privacy protection
- **Adult Entertainment**: Discreet verification process

### High-Value Items
- **Jewelry Delivery**: Separate payment and delivery logistics
- **Electronics**: Prevent theft by limiting data exposure
- **Luxury Goods**: Enhanced privacy for premium customers

### Sensitive Products
- **Pharmaceuticals**: Privacy-preserving medical deliveries
- **Adult Products**: Discreet purchasing and delivery
- **Financial Documents**: Secure document delivery

## Technical Implementation

### Permission Decks
```javascript
// Customer's deck separates different types of data
const orderDeck = {
  item: "restricted_product",
  paid: true,
  age_verified: true
};

const shippingDeck = {
  address: "123 Main St",
  route: "A12",
  instructions: "Leave at door"
};
```

### Verification Process
1. **Merchant Request**: Asks for order and age permissions
2. **Wallet Approval**: Customer consents to share specific data
3. **Proof Generation**: Wallet creates cryptographic proof
4. **Merchant Verification**: Confirms permissions are satisfied
5. **Courier Assignment**: Separate process for delivery details

## Security Features

### Request Binding
- Response cryptographically bound to original request
- Prevents QR reuse across different orders
- SHA-256 hash verification

### Replay Protection
- Unique nonce for each order
- Timestamp validation
- 5-minute expiration window

### Permission Isolation
- Strict permission separation between parties
- No cross-permission data leakage
- Minimal data principle enforced

## UI Components

### Product Card
- Professional product display
- Clear pricing and age restrictions
- Visual age requirement badges

### Order Status Panel
- Real-time status updates
- Color-coded payment verification
- Clear next-step indicators

### Privacy Notice
- Explains split-knowledge benefits
- Builds customer trust
- Transparency about data usage

### Verification Steps
- Visual progress indicator
- Clear instructions at each step
- Error handling and recovery

## Integration Examples

### E-commerce Platform
```javascript
// Generate merchant verification QR
const merchantQR = createQRProofRequest({
  audience: 'store.example.com',
  requiredPermissions: ['order_paid', 'age_over_18'],
  metadata: {
    orderId: 'ORD-12345',
    amount: 99.99
  }
});
```

### Point of Sale System
```javascript
// In-store age verification
const inStoreQR = createQRProofRequest({
  audience: 'pos-store.example.com',
  requiredPermissions: ['age_over_21'],
  metadata: {
    transactionId: 'TXN-67890',
    terminal: 'POS-01'
  }
});
```

## Business Benefits

### Regulatory Compliance
- Meets age verification laws
- GDPR-compliant data handling
- Audit trail with timestamps

### Customer Trust
- Enhanced privacy protection
- Transparent data usage
- Reduced data collection

### Operational Efficiency
- Streamlined verification process
- Automated order processing
- Reduced manual checks

### Risk Management
- Limited data exposure
- Reduced liability
- Enhanced security posture

## File Structure
```
merchant-demo/
├── index.html          # Main merchant portal
├── README.md           # This file
└── (imports from ../qr/ and ../shared/)
```

## Dependencies
- `../qr/index.js` - QR proof request/response functions
- `../shared/qr.ts` - QR encoding/decoding utilities

## Browser Compatibility
- Modern browsers with ES6 module support
- Chrome 61+, Firefox 60+, Safari 10.1+, Edge 16+

## Future Enhancements

### Advanced Features
- Multi-item order support
- Subscription verification
- Bulk order processing
- Integration with payment gateways

### Security Improvements
- Hardware security module support
- Advanced cryptographic proofs
- Biometric verification options

### Analytics
- Verification success rates
- Processing time metrics
- Customer privacy preferences

## Companion Demo

This merchant demo works with the **courier-demo** to demonstrate the complete split-knowledge flow:
1. Merchant verifies order and age
2. Courier receives delivery address separately
3. Customer maintains privacy throughout

See `../courier-demo/` for the delivery side of this transaction.
