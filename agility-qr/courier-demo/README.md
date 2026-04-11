# Courier Demo - Split Knowledge Delivery

A web-based courier portal that demonstrates privacy-preserving delivery using split-knowledge verification, where couriers only see delivery address and instructions while order details remain with the merchant.

## Features

- **Split-Knowledge Architecture**: Couriers see only delivery information
- **Address Verification**: Secure delivery address collection from customers
- **Delivery Management**: Complete delivery workflow with status tracking
- **Privacy Protection**: Order value and contents never exposed to couriers
- **Step-by-Step Flow**: Clear 3-step address collection process
- **Real-time Updates**: Live delivery status and route information

## Split-Knowledge System

### Courier Access Only
- ✅ Delivery address and route information
- ✅ Delivery instructions and preferences
- ✅ Customer contact for delivery coordination
- ❌ Order contents and product details
- ❌ Payment information and order value
- ❌ Personal identity and age verification details

### Merchant Access Only (Separate Demo)
- ✅ Order details (item, price, quantity)
- ✅ Payment status and confirmation
- ✅ Age verification results
- ❌ Customer delivery address
- ❌ Customer contact information

## Delivery Flow

### Step 1: Delivery Assignment
- Receive delivery assignment from merchant
- See that order and age are verified (but no details)
- Understand privacy protection features
- Request delivery address from customer

### Step 2: Address Collection
- Generate QR proof request for:
  - `shipping_address` - Get delivery location
- Display QR for customer to scan
- Wait for customer to share address

### Step 3: Process Delivery
- Scan customer's address QR response
- Verify address permission is satisfied
- Display complete delivery information
- Start delivery with route navigation

## QR Request Structure

### Courier Request (QR 1)
```json
{
  "requestId": "delivery12345",
  "audience": "courier-demo.com",
  "requiredPermissions": [
    "shipping_address"
  ],
  "metadata": {
    "deliveryId": "DEL-2024-001",
    "courier": "Demo Courier Service",
    "merchant": "Demo Store"
  }
}
```

### Customer Response (QR 2)
```json
{
  "requestId": "delivery12345",
  "satisfiedPermissions": [
    "shipping_address"
  ],
  "grant": { "consent-data" },
  "proof": { "verification-data" }
}
```

## Privacy Benefits

### For Customers
- **Order Privacy**: Couriers don't know what you purchased
- **Value Privacy**: Delivery staff unaware of order value
- **Security**: Reduced theft risk for high-value items
- **Control**: Granular control over shared information

### For Couriers
- **Focused Information**: Only delivery-relevant data
- **Reduced Liability**: No knowledge of valuable contents
- **Efficiency**: Streamlined delivery process
- **Security**: Not targeted for specific high-value items

### For Merchants
- **Enhanced Security**: Delivery staff can't target valuable orders
- **Customer Trust**: Privacy-preserving delivery process
- **Risk Management**: Separation of sensitive data
- **Compliance**: Meets privacy regulations

## Use Cases

### High-Value Deliveries
- **Jewelry**: Prevent theft by hiding item value
- **Electronics**: Secure delivery of expensive devices
- **Luxury Goods**: Discreet delivery of premium items

### Sensitive Products
- **Pharmaceuticals**: Privacy for medical deliveries
- **Adult Products**: Discreet delivery service
- **Financial Documents**: Secure document delivery

### Age-Restricted Items
- **Alcohol**: Separate age verification from delivery
- **Tobacco**: Privacy-preserving delivery
- **Adult Entertainment**: Discreet delivery process

## Technical Implementation

### Permission Decks
```javascript
// Customer's deck separates different types of data
const shippingDeck = {
  address: "123 Main St, Apt 4B",
  city: "San Francisco",
  state: "CA",
  zip: "94102",
  instructions: "Leave at door",
  contact: "+1-555-0123"
};

// Order deck (merchant only)
const orderDeck = {
  item: "premium_product",
  price: 299.99,
  paid: true,
  age_verified: true
};
```

### Verification Process
1. **Courier Request**: Asks for delivery address permission
2. **Wallet Approval**: Customer consents to share address
3. **Proof Generation**: Wallet creates cryptographic proof
4. **Courier Verification**: Confirms address permission
5. **Route Planning**: Start delivery with navigation

## Security Features

### Request Binding
- Response cryptographically bound to original request
- Prevents QR reuse across different deliveries
- SHA-256 hash verification

### Replay Protection
- Unique nonce for each delivery request
- Timestamp validation
- 5-minute expiration window

### Permission Isolation
- Strict separation of address and order data
- No cross-permission data leakage
- Minimal data principle enforced

## UI Components

### Delivery Card
- Professional delivery assignment display
- Clear status indicators
- Verification confirmation from merchant

### Address Display
- Complete delivery address information
- Route planning details
- Delivery instructions panel

### Privacy Notice
- Explains split-knowledge benefits
- Builds trust with couriers
- Clear data usage transparency

### Delivery Instructions
- Customer-specific delivery preferences
- Contactless delivery options
- Special handling requirements

## Integration Examples

### Delivery Service Integration
```javascript
// Generate courier address request
const courierQR = createQRProofRequest({
  audience: 'courier-service.example.com',
  requiredPermissions: ['shipping_address'],
  metadata: {
    deliveryId: 'DEL-12345',
    courierId: 'COURIER-789'
  }
});
```

### Route Optimization
```javascript
// After receiving address
const route = planRoute(address);
const eta = calculateETA(route);
updateDeliveryTracking(deliveryId, route, eta);
```

## Business Benefits

### Security Enhancement
- Reduced theft risk for high-value deliveries
- Courier staff unaware of valuable contents
- Enhanced overall delivery security

### Customer Privacy
- Discreet delivery for sensitive items
- No judgment from delivery staff
- Enhanced customer confidence

### Operational Efficiency
- Streamlined address collection
- Automated verification process
- Reduced manual coordination

### Compliance
- Privacy regulation compliance
- Data minimization principles
- Audit trail with timestamps

## File Structure
```
courier-demo/
├── index.html          # Main courier portal
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
- Real-time GPS tracking integration
- Customer communication portal
- Photo confirmation of delivery
- Multi-stop route optimization

### Security Improvements
- Biometric verification for special deliveries
- Secure messaging with customers
- Advanced cryptographic proofs

### Analytics
- Delivery success rates
- Address verification times
- Customer privacy preferences

## Companion Demo

This courier demo works with the **merchant-demo** to demonstrate the complete split-knowledge flow:
1. Merchant verifies order and age (no address)
2. Courier receives delivery address separately
3. Customer maintains privacy throughout

See `../merchant-demo/` for the merchant side of this transaction.

## Complete Workflow

### Customer Experience
1. **Purchase**: Buy item from merchant (age verified if needed)
2. **Address Share**: Show address QR to courier
3. **Delivery**: Receive package without revealing purchase details

### Merchant Experience
1. **Order Processing**: Verify payment and age requirements
2. **Courier Assignment**: Send delivery without customer address
3. **Fulfillment**: Complete order without delivery logistics

### Courier Experience
1. **Assignment**: Receive delivery request (no order details)
2. **Address Collection**: Get delivery address from customer
3. **Delivery**: Complete delivery with route optimization

This split-knowledge approach ensures that no single party has access to all customer information, significantly enhancing privacy and security throughout the commerce ecosystem.
