# Age Verification Demo

A web-based verifier application that demonstrates QR-based age verification for businesses and services.

## Features

- **Dual Age Verification**: Support for 18+ and 21+ age checks
- **Step-by-Step Flow**: Clear 3-step verification process
- **QR Generation**: Creates proof requests for age verification
- **Response Scanning**: Accepts and validates wallet QR responses
- **Visual Feedback**: Clear success/failure indicators
- **Verification Details**: Shows proof metadata and permissions

## Verification Types

### 18+ Verification
- **Use Case**: Standard age-restricted venues, products, or services
- **Icon**: 🍺 (Beer mug)
- **Permission**: `age_over_18`

### 21+ Verification  
- **Use Case**: Highly restricted venues, alcohol sales, casinos
- **Icon**: 🍷 (Wine glass)
- **Permission**: `age_over_21`

## How to Use

### Step 1: Select Verification Type
1. Choose between 18+ or 21+ verification
2. Each type is optimized for specific use cases
3. Selection determines the required permission

### Step 2: Show QR Code
1. System generates a QR proof request
2. Display this QR to the customer/user
3. QR contains the specific age requirement
4. QR expires after 5 minutes for security

### Step 3: Scan Response
1. Customer shows their wallet QR response
2. Upload or drag-and-drop the response QR image
3. System automatically verifies the proof
4. Receive instant verification result

## Verification Process

### QR 1 (Request) Contains:
```json
{
  "requestId": "unique-id",
  "audience": "age-verifier-demo.com", 
  "requiredPermissions": ["age_over_18"],
  "nonce": "random-nonce",
  "issuedAt": 1722856000000,
  "expiresAt": 1722856300000,
  "protocolVersion": "1.0.0"
}
```

### QR 2 (Response) Contains:
```json
{
  "requestId": "matching-id",
  "audience": "age-verifier-demo.com",
  "nonce": "matching-nonce", 
  "satisfiedPermissions": ["age_over_18"],
  "requestHash": "sha256-binding",
  "grant": { "consent-data" },
  "proof": { "proof-data" }
}
```

## Security Features

### Request Binding
- Response is cryptographically bound to original request
- Prevents QR reuse across different requests
- Uses SHA-256 hash binding

### Replay Protection
- Unique nonce for each request
- Timestamp validation
- Expiration enforcement (5 minutes)

### Permission Validation
- Only requested permissions are satisfied
- Wallet must have required permissions in deck
- Clear success/failure feedback

## UI Components

### Step Indicator
- Visual 3-step progress indicator
- Shows current step and completion status
- Helps users understand the flow

### Verification Type Selection
- Large, touch-friendly buttons
- Clear icons and descriptions
- Visual feedback on selection

### QR Display
- Large, readable QR code placeholder
- Clear instructions for users
- Professional appearance

### Result Display
- Color-coded results (green/red/yellow)
- Detailed verification information
- Permission badges for clarity

## Demo Mode

The verifier includes a "Use Demo Response" button that simulates a successful verification with:
- Valid response QR
- Proper request binding
- Satisfied permissions
- Realistic metadata

## Integration Examples

### Bar/Restaurant Integration
```javascript
// 21+ verification for alcohol service
selectVerification('over_21');
```

### Event Venue Integration
```javascript
// 18+ verification for concert entry
selectVerification('over_18');
```

### Online Age Gates
```javascript
// Web-based age verification
generateQRRequest('over_18');
```

## Technical Details

### File Structure
```
verifier-demo/
├── index.html          # Main verifier application
├── README.md           # This file
└── (imports from ../qr/ and ../shared/)
```

### Dependencies
- `../qr/index.js` - QR proof request/response functions
- `../shared/qr.ts` - QR encoding/decoding utilities

### Browser Compatibility
- Modern browsers with ES6 module support
- Chrome 61+, Firefox 60+, Safari 10.1+, Edge 16+

## Error Handling

### Common Errors
- **Invalid QR Format**: "Invalid response QR: Missing version prefix"
- **Expired Request**: "Proof request has expired"
- **Permission Mismatch**: "Missing permissions: age_over_18"
- **Request Binding**: "Request hash does not match"

### Error Display
- Clear red error messages
- Specific error descriptions
- Guidance for retry attempts

## Business Benefits

### Compliance
- Meets age verification requirements
- Audit trail with request IDs
- Time-stamped verification records

### Customer Experience
- Fast verification (under 30 seconds)
- No personal data collection
- Privacy-preserving approach

### Operational Efficiency
- Reduced manual ID checking
- Automated verification process
- Minimal training required

## Future Enhancements

### Advanced Features
- Batch verification for multiple users
- Integration with POS systems
- Real-time compliance reporting
- Custom verification workflows

### Security Improvements
- Hardware security module integration
- Advanced cryptographic proofs
- Biometric verification options

## Privacy Compliance

- **No PII Collection**: Only verifies age, not identity
- **Minimal Data**: Shares only required permissions
- **User Consent**: Explicit wallet approval required
- **Data Minimization**: No unnecessary data exposure

## Support

For integration support or custom verification flows, refer to the main implementation guide in the parent directory.
