# Agility Passport Wallet Demo

A lightweight web-based wallet application that demonstrates QR-based proof exchange for identity verification.

## Features

- **QR Code Scanning**: Upload or drag-and-drop QR code images
- **Consent UI**: Clear display of who is requesting what permissions
- **Risk Assessment**: Visual indicators for permission sensitivity
- **Proof Generation**: Creates QR responses with consent grants and proofs
- **Timer Display**: Shows expiration time for generated proofs
- **Mock Data**: Pre-configured demo deck with common permissions

## Permissions Supported

- `age_over_18` - Confirm user is 18+ years old
- `age_over_21` - Confirm user is 21+ years old  
- `order_paid` - Confirm order payment status
- `shipping_address` - Share delivery address
- `kyc_verified` - Confirm identity verification
- `region_us` - Confirm US residence

## How to Use

1. **Open the Wallet**: Load `index.html` in a modern web browser
2. **Scan QR Code**: 
   - Click the upload area to select a QR image
   - Drag and drop a QR image
   - Or use "Use Demo QR Code" for testing
3. **Review Request**: 
   - See who is requesting access
   - Review each permission and its description
   - Check the risk level indicator
4. **Make Decision**:
   - Click "Approve" to generate proof QR
   - Click "Deny" to reject the request
5. **Share Proof**: 
   - Show the generated QR to the verifier
   - Watch the expiration timer
   - QR automatically expires after 5 minutes

## Technical Details

### Mock Deck Configuration

The wallet uses a mock deck with all permissions set to `true` for demo purposes:

```javascript
const mockDeck = {
    age_over_18: true,
    age_over_21: true,
    order_paid: true,
    shipping_address: true,
    kyc_verified: true,
    region_us: true
};
```

### QR Flow

1. **QR 1 (Request)**: Contains proof request with required permissions
2. **Consent Screen**: User reviews and approves/denies
3. **QR 2 (Response)**: Contains consent grant + proof response

### Security Features

- **Request Binding**: Response is cryptographically bound to original request
- **Nonce Validation**: Prevents replay attacks
- **Expiration**: QR codes expire after 5 minutes
- **Permission Filtering**: Only shares requested permissions

## File Structure

```
wallet-demo/
├── index.html          # Main wallet application
├── README.md           # This file
└── (imports from ../qr/ and ../shared/)
```

## Dependencies

The wallet demo imports modules from:
- `../qr/index.js` - QR proof request/response functions
- `../shared/qr.js` - QR encoding/decoding utilities

## Browser Compatibility

- Modern browsers with ES6 module support
- Chrome 61+, Firefox 60+, Safari 10.1+, Edge 16+

## Demo QR Code Format

The demo uses this mock QR string for testing:

```
AQR1:eyJ0eXBlIjoicmVxdWVzdCIsImRhdGEiOnsicmVxdWVzdElkIjoiZGVtbzEyMzQ1IiwiYXVkaWVuY2UiOiJkZW1vLXZlcmlmaWVyLmNvbSIsInJlcXVpcmVkUGVybWlzc2lvbnMiOlsiYWdlX292ZXJfMTgiXSwibm9uY2UiOiJub25jZTEyMyIsImlzc3VlZEF0IjoxNzIyODU2MDAwMDAwLCJleHBpcmVzQXQiOjE3MjI4NTYzMDAwMDAsInByb3RvY29sVmVyc2lvbiI6IjEuMC4wIn0sInRpbWVzdGFtcCI6MTcyMjg1NjAwMDAwMCwidmVyc2lvbiI6IjEuMC4wIn0=
```

This represents a request for age verification (18+) from "demo-verifier.com".

## Integration Notes

To integrate with a real Agility Protocol implementation:

1. Replace mock deck with actual permission deck
2. Connect to real identity provider
3. Implement actual QR code scanning (camera API)
4. Add proper cryptographic signatures
5. Connect to real blockchain adapters (XRPL, Midnight)

## Privacy Features

- **Minimal Data**: Only shares requested permissions
- **No PII**: Personal information never exposed in QR
- **User Control**: Wallet controls all consent decisions
- **Short Lifespan**: QR codes expire quickly
- **Request Binding**: Prevents QR reuse for different requests
