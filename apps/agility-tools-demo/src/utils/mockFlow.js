/**
 * Mock Flow - Simulates selective disclosure data flow
 * 
 * Each role only sees what they need to see.
 * Hidden data is never exposed to unauthorized parties.
 */

// Generate unique tokens
const generateToken = (prefix) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = prefix;
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Full order data (only buyer has access to all)
export const createFullOrder = () => ({
  // Public identifiers
  orderToken: generateToken('ORD-'),
  timestamp: Date.now(),
  
  // Item details (visible to buyer & merchant)
  item: 'Handmade Ceramic Mug',
  quantity: 1,
  price: 45.00,
  
  // Payment status (visible to buyer & merchant)
  paymentValid: true,
  paymentMethod: 'XRP',
  transactionHash: '0x' + Array(64).fill(0).map(() => 
    Math.floor(Math.random() * 16).toString(16)
  ).join(''),
  
  // Shipping authorization
  shippingAuthorized: true,
  
  // Age verification (for restricted items)
  ageVerified: true,
  
  // PRIVATE: Buyer identity (hidden from merchant/courier)
  buyerName: 'Alice Johnson',
  buyerEmail: 'alice@example.com',
  buyerPhone: '+1-555-0123',
  
  // PRIVATE: Full address (hidden from merchant, partial to courier)
  fullAddress: {
    street: '123 Privacy Lane',
    apartment: 'Apt 4B',
    city: 'Cryptoville',
    state: 'CA',
    zip: '90210',
    country: 'USA',
  },
  
  // PRIVATE: Payment details
  walletAddress: 'rBuyer1234567890abcdefghijklmnop',
  
  // Delivery instructions
  deliveryInstructions: 'Leave at door, ring bell twice',
});

// What the MERCHANT can see
export const getMerchantView = (fullOrder) => ({
  // Visible
  orderToken: fullOrder.orderToken,
  item: fullOrder.item,
  quantity: fullOrder.quantity,
  price: fullOrder.price,
  paymentValid: fullOrder.paymentValid,
  shippingAuthorized: fullOrder.shippingAuthorized,
  ageVerified: fullOrder.ageVerified,
  timestamp: fullOrder.timestamp,
  
  // Proof that payment was made (without revealing wallet)
  paymentProof: {
    verified: true,
    proofHash: generateProofHash('payment'),
    circuit: 'payment_verified',
  },
  
  // Hidden (merchant doesn't need this)
  _hidden: [
    'buyerName',
    'buyerEmail', 
    'buyerPhone',
    'fullAddress',
    'walletAddress',
    'transactionHash',
  ],
});

// What the COURIER can see
export const getCourierView = (fullOrder) => ({
  // Visible - only what's needed for delivery
  routeToken: generateToken('ROUTE-'),
  destination: {
    // Only GPS coordinates, not full address
    coordinates: '34.0522° N, 118.2437° W',
    // City-level only
    area: `${fullOrder.fullAddress.city}, ${fullOrder.fullAddress.state}`,
  },
  deliveryInstructions: fullOrder.deliveryInstructions,
  packageSize: 'Small',
  requiresSignature: false,
  
  // Age verification needed for delivery?
  ageCheckRequired: fullOrder.ageVerified ? false : true,
  
  // Hidden (courier doesn't need this)
  _hidden: [
    'item',
    'price',
    'buyerName',
    'buyerEmail',
    'merchantName',
    'paymentDetails',
    'fullAddress.street',
    'fullAddress.apartment',
  ],
});

// Generate courier QR payload
export const generateCourierQR = (fullOrder) => ({
  routeToken: generateToken('ROUTE-'),
  destination: '34.0522° N, 118.2437° W',
  instructions: fullOrder.deliveryInstructions,
  timestamp: Date.now(),
  expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  proof: {
    type: 'selective_disclosure',
    circuit: 'courier_view',
    hash: generateProofHash('courier'),
  },
});

// What the RETURN flow can see
export const getReturnView = (fullOrder) => ({
  // Visible
  returnToken: generateToken('RET-'),
  returnAuthorized: true,
  returnDestination: 'WAREHOUSE_NODE_' + generateToken(''),
  originalOrderToken: fullOrder.orderToken,
  returnWindow: '30 days',
  
  // Hidden
  _hidden: [
    'merchantAddress',
    'buyerIdentity',
    'paymentDetails',
    'itemDetails',
  ],
});

// Generate return QR payload
export const generateReturnQR = (fullOrder) => ({
  returnToken: generateToken('RET-'),
  returnAuthorized: true,
  returnDestination: 'WAREHOUSE_NODE_' + generateToken(''),
  originalOrderRef: fullOrder.orderToken.substring(0, 8) + '...',
  timestamp: Date.now(),
  proof: {
    type: 'selective_disclosure',
    circuit: 'return_authorized',
    hash: generateProofHash('return'),
  },
});

// Simulate proof hash generation
function generateProofHash(type) {
  const hash = Array(32).fill(0).map(() => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  return `${type}_proof_${hash}`;
}

// Verify order proof (mock)
export const verifyOrderProof = (proof) => {
  // Simulate verification delay
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        valid: true,
        verifiedAt: Date.now(),
        circuit: 'order_verification',
        proofHash: proof?.proofHash || generateProofHash('verify'),
      });
    }, 500);
  });
};

// Decode courier QR (mock)
export const decodeCourierQR = (qrData) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: qrData,
        decodedAt: Date.now(),
      });
    }, 300);
  });
};
