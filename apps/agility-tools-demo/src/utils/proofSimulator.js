/**
 * Proof Simulator - Simulates ZK proof generation
 * 
 * This creates realistic-looking proof outputs without
 * actually running ZK circuits.
 */

// Generate a random hex string
const randomHex = (length) => {
  return Array(length).fill(0).map(() => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
};

// Simulate proof generation with delay
export const generateProof = async (proofType, inputs) => {
  // Simulate computation time
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
  
  const timestamp = Date.now();
  
  return {
    proofType,
    proof: {
      pi_a: [randomHex(64), randomHex(64)],
      pi_b: [[randomHex(64), randomHex(64)], [randomHex(64), randomHex(64)]],
      pi_c: [randomHex(64), randomHex(64)],
    },
    publicInputs: Object.keys(inputs.public || {}).map(k => inputs.public[k]),
    privateInputsHash: randomHex(64),
    circuitId: `agility_${proofType}_v1`,
    verificationKey: `vk_${randomHex(16)}`,
    generatedAt: timestamp,
    proofSize: 256,
    generationTimeMs: Math.floor(800 + Math.random() * 400),
  };
};

// Simulate proof verification
export const verifyProof = async (proof) => {
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 100));
  
  return {
    valid: true,
    verifiedAt: Date.now(),
    verificationTimeMs: Math.floor(200 + Math.random() * 100),
    circuit: proof.circuitId,
  };
};

// Create a visual proof summary
export const createProofSummary = (proof) => ({
  status: 'VERIFIED',
  circuit: proof.circuitId,
  hash: proof.privateInputsHash.substring(0, 16) + '...',
  timestamp: new Date(proof.generatedAt).toISOString(),
  size: `${proof.proofSize} bytes`,
});

// Proof types for the demo
export const PROOF_TYPES = {
  PURCHASE: 'purchase_proof',
  PAYMENT: 'payment_verified',
  ORDER: 'order_placed',
  COURIER: 'courier_route',
  RETURN: 'return_authorized',
  AGE: 'age_verified',
};

// Circuit descriptions
export const CIRCUIT_INFO = {
  [PROOF_TYPES.PURCHASE]: {
    name: 'Private Purchase Proof',
    description: 'Proves purchase without revealing buyer identity',
    inputs: ['item', 'quantity', 'paymentValid'],
    hidden: ['buyerName', 'address', 'walletAddress'],
  },
  [PROOF_TYPES.PAYMENT]: {
    name: 'Payment Verification',
    description: 'Proves payment was made without revealing amount or wallet',
    inputs: ['paymentValid', 'timestamp'],
    hidden: ['amount', 'walletAddress', 'transactionHash'],
  },
  [PROOF_TYPES.ORDER]: {
    name: 'Order Verification',
    description: 'Proves order exists without revealing contents',
    inputs: ['orderToken', 'merchantId'],
    hidden: ['items', 'price', 'buyerInfo'],
  },
  [PROOF_TYPES.COURIER]: {
    name: 'Courier Route Proof',
    description: 'Provides delivery info without revealing order details',
    inputs: ['destination', 'routeToken'],
    hidden: ['item', 'buyer', 'merchant', 'price'],
  },
  [PROOF_TYPES.RETURN]: {
    name: 'Return Authorization',
    description: 'Authorizes return without revealing original transaction',
    inputs: ['returnAuthorized', 'returnToken'],
    hidden: ['merchantAddress', 'buyerIdentity', 'paymentDetails'],
  },
  [PROOF_TYPES.AGE]: {
    name: 'Age Verification',
    description: 'Proves age > 21 without revealing date of birth',
    inputs: ['ageVerified'],
    hidden: ['dateOfBirth', 'fullName', 'idNumber'],
  },
};
