/**
 * Agility Payments - ZK Proof Types
 * 
 * Type definitions for zero-knowledge proofs used in payment
 * and order verification without revealing sensitive data.
 */

// ============================================
// ZK PROOF TYPES
// ============================================

/**
 * Available ZK proof circuit types
 */
export type ZKProofType = 
  // Payment proofs
  | 'payment_made'           // Prove payment occurred without revealing amount
  | 'payment_sufficient'     // Prove payment >= required amount
  | 'payment_exact'          // Prove payment == exact amount (rare use case)
  | 'payment_range'          // Prove payment in range [min, max]
  
  // Order proofs
  | 'order_placed'           // Prove order exists without revealing items
  | 'order_value_range'      // Prove order value in range
  | 'order_contains_type'    // Prove order contains item type (e.g., age-restricted)
  | 'order_item_count'       // Prove order has N items
  
  // Balance proofs
  | 'balance_sufficient'     // Prove balance >= X
  | 'balance_range'          // Prove balance in range
  | 'balance_positive'       // Prove balance > 0
  
  // Identity proofs
  | 'age_over'               // Prove age > X without revealing DOB
  | 'age_range'              // Prove age in range
  | 'identity_verified'      // Prove KYC without revealing PII
  | 'country_residence'      // Prove residence without revealing address
  | 'accredited_investor'    // Prove accreditation status
  
  // Membership proofs
  | 'set_membership'         // Prove membership in set without revealing identity
  | 'merkle_inclusion'       // Prove inclusion in merkle tree
  | 'credential_valid'       // Prove credential validity
  
  // Transaction proofs
  | 'transaction_count'      // Prove transaction count without details
  | 'transaction_history'    // Prove transaction pattern
  | 'no_sanctions'           // Prove not on sanctions list
  
  // Custom
  | 'custom';                // Custom circuit

/**
 * ZK proof security level
 */
export type ZKSecurityLevel = 
  | 'standard'    // 128-bit security
  | 'high'        // 192-bit security
  | 'maximum';    // 256-bit security

/**
 * ZK proof system type
 */
export type ZKProofSystem = 
  | 'groth16'     // Fast verification, trusted setup
  | 'plonk'       // Universal setup
  | 'stark'       // No trusted setup, larger proofs
  | 'bulletproof' // No trusted setup, good for range proofs
  | 'midnight';   // Midnight network native

// ============================================
// ZK PROOF REQUEST
// ============================================

/**
 * ZK proof generation request
 */
export interface ZKProofRequest<T extends ZKProofType = ZKProofType> {
  /** Proof type to generate */
  proofType: T;
  
  /** Circuit identifier */
  circuitId?: string;
  
  /** Private inputs (never revealed) */
  privateInputs: ZKPrivateInputs<T>;
  
  /** Public inputs (revealed in proof) */
  publicInputs: ZKPublicInputs<T>;
  
  /** Proof system to use */
  proofSystem?: ZKProofSystem;
  
  /** Security level */
  securityLevel?: ZKSecurityLevel;
  
  /** Additional constraints */
  constraints?: Record<string, unknown>;
}

// ============================================
// PRIVATE INPUTS (BY PROOF TYPE)
// ============================================

/**
 * Private inputs for payment proofs
 */
export interface PaymentPrivateInputs {
  /** Actual payment amount */
  actualAmount: string;
  
  /** Sender's balance */
  senderBalance?: string;
  
  /** Full transaction details */
  transactionDetails?: string;
  
  /** Sender's address */
  senderAddress?: string;
}

/**
 * Private inputs for order proofs
 */
export interface OrderPrivateInputs {
  /** Order items with details */
  orderItems: Array<{
    sku: string;
    name: string;
    price: number;
    quantity: number;
    category?: string;
    ageRestricted?: boolean;
  }>;
  
  /** Customer shipping address */
  shippingAddress?: string;
  
  /** Customer billing address */
  billingAddress?: string;
  
  /** Payment method details */
  paymentMethod?: string;
  
  /** Customer PII */
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

/**
 * Private inputs for balance proofs
 */
export interface BalancePrivateInputs {
  /** Actual balance */
  actualBalance: string;
  
  /** Account address */
  accountAddress?: string;
  
  /** Balance breakdown */
  balanceBreakdown?: {
    available: string;
    pending: string;
    reserved: string;
  };
}

/**
 * Private inputs for identity proofs
 */
export interface IdentityPrivateInputs {
  /** Date of birth */
  dateOfBirth?: string;
  
  /** Full name */
  fullName?: string;
  
  /** Address */
  address?: string;
  
  /** Government ID number */
  idNumber?: string;
  
  /** Country of residence */
  country?: string;
  
  /** KYC verification data */
  kycData?: Record<string, unknown>;
}

/**
 * Private inputs for membership proofs
 */
export interface MembershipPrivateInputs {
  /** Member identifier */
  memberId: string;
  
  /** Membership secret */
  membershipSecret?: string;
  
  /** Merkle path for inclusion proof */
  merklePath?: string[];
  
  /** Credential data */
  credential?: Record<string, unknown>;
}

/**
 * Map proof types to their private inputs
 */
export type ZKPrivateInputs<T extends ZKProofType> = 
  T extends 'payment_made' | 'payment_sufficient' | 'payment_exact' | 'payment_range' 
    ? PaymentPrivateInputs :
  T extends 'order_placed' | 'order_value_range' | 'order_contains_type' | 'order_item_count'
    ? OrderPrivateInputs :
  T extends 'balance_sufficient' | 'balance_range' | 'balance_positive'
    ? BalancePrivateInputs :
  T extends 'age_over' | 'age_range' | 'identity_verified' | 'country_residence' | 'accredited_investor'
    ? IdentityPrivateInputs :
  T extends 'set_membership' | 'merkle_inclusion' | 'credential_valid'
    ? MembershipPrivateInputs :
  Record<string, unknown>;

// ============================================
// PUBLIC INPUTS (BY PROOF TYPE)
// ============================================

/**
 * Public inputs for payment proofs
 */
export interface PaymentPublicInputs {
  /** Payment identifier */
  paymentId: string;
  
  /** Recipient address */
  recipientAddress: string;
  
  /** Minimum amount (for sufficient proofs) */
  minimumAmount?: string;
  
  /** Maximum amount (for range proofs) */
  maximumAmount?: string;
  
  /** Currency */
  currency?: string;
  
  /** Network */
  network?: string;
  
  /** Timestamp */
  timestamp: number;
}

/**
 * Public inputs for order proofs
 */
export interface OrderPublicInputs {
  /** Order identifier */
  orderId: string;
  
  /** Merchant identifier */
  merchantId: string;
  
  /** Minimum order value (for range proofs) */
  minimumValue?: number;
  
  /** Maximum order value (for range proofs) */
  maximumValue?: number;
  
  /** Whether order contains age-restricted items */
  containsAgeRestricted?: boolean;
  
  /** Item count (for count proofs) */
  itemCount?: number;
  
  /** Timestamp */
  timestamp: number;
}

/**
 * Public inputs for balance proofs
 */
export interface BalancePublicInputs {
  /** Account identifier (can be commitment) */
  accountCommitment: string;
  
  /** Minimum balance required */
  minimumBalance?: string;
  
  /** Maximum balance (for range proofs) */
  maximumBalance?: string;
  
  /** Currency */
  currency?: string;
  
  /** Timestamp */
  timestamp: number;
}

/**
 * Public inputs for identity proofs
 */
export interface IdentityPublicInputs {
  /** Minimum age (for age proofs) */
  minimumAge?: number;
  
  /** Maximum age (for range proofs) */
  maximumAge?: number;
  
  /** Allowed countries (for residence proofs) */
  allowedCountries?: string[];
  
  /** Required verification level */
  verificationLevel?: 'basic' | 'standard' | 'enhanced';
  
  /** Timestamp */
  timestamp: number;
}

/**
 * Public inputs for membership proofs
 */
export interface MembershipPublicInputs {
  /** Set/group identifier */
  setId: string;
  
  /** Merkle root (for inclusion proofs) */
  merkleRoot?: string;
  
  /** Credential issuer */
  issuer?: string;
  
  /** Timestamp */
  timestamp: number;
}

/**
 * Map proof types to their public inputs
 */
export type ZKPublicInputs<T extends ZKProofType> = 
  T extends 'payment_made' | 'payment_sufficient' | 'payment_exact' | 'payment_range' 
    ? PaymentPublicInputs :
  T extends 'order_placed' | 'order_value_range' | 'order_contains_type' | 'order_item_count'
    ? OrderPublicInputs :
  T extends 'balance_sufficient' | 'balance_range' | 'balance_positive'
    ? BalancePublicInputs :
  T extends 'age_over' | 'age_range' | 'identity_verified' | 'country_residence' | 'accredited_investor'
    ? IdentityPublicInputs :
  T extends 'set_membership' | 'merkle_inclusion' | 'credential_valid'
    ? MembershipPublicInputs :
  Record<string, unknown>;

// ============================================
// ZK PROOF RESULT
// ============================================

/**
 * Generated ZK proof
 */
export interface ZKProof {
  /** Proof type */
  proofType: ZKProofType;
  
  /** Serialized proof data */
  proof: string;
  
  /** Public inputs used */
  publicInputs: string[];
  
  /** Verification key hash */
  verificationKeyHash: string;
  
  /** Circuit identifier */
  circuitId: string;
  
  /** Proof system used */
  proofSystem: ZKProofSystem;
  
  /** Generation timestamp */
  generatedAt: number;
  
  /** Proof size in bytes */
  proofSize: number;
  
  /** Generation time in ms */
  generationTimeMs?: number;
}

/**
 * ZK proof verification result
 */
export interface ZKVerificationResult {
  /** Whether proof is valid */
  valid: boolean;
  
  /** Verification timestamp */
  verifiedAt: number;
  
  /** Verification time in ms */
  verificationTimeMs?: number;
  
  /** Error if invalid */
  error?: string;
  
  /** Public inputs verified */
  publicInputs?: string[];
}

// ============================================
// ZK PROOF GENERATOR INTERFACE
// ============================================

/**
 * ZK proof generator interface
 */
export interface IZKProofGenerator {
  /** Generate a ZK proof */
  generateProof<T extends ZKProofType>(request: ZKProofRequest<T>): Promise<ZKProof>;
  
  /** Verify a ZK proof */
  verifyProof(proof: ZKProof): Promise<ZKVerificationResult>;
  
  /** Get available proof types */
  getAvailableProofTypes(): ZKProofType[];
  
  /** Check if proof type is supported */
  isProofTypeSupported(proofType: ZKProofType): boolean;
  
  /** Get circuit info */
  getCircuitInfo(proofType: ZKProofType): Promise<ZKCircuitInfo | null>;
}

/**
 * ZK circuit information
 */
export interface ZKCircuitInfo {
  /** Circuit identifier */
  circuitId: string;
  
  /** Proof type */
  proofType: ZKProofType;
  
  /** Proof system */
  proofSystem: ZKProofSystem;
  
  /** Number of constraints */
  constraintCount: number;
  
  /** Estimated proof generation time (ms) */
  estimatedGenerationTimeMs: number;
  
  /** Proof size (bytes) */
  proofSizeBytes: number;
  
  /** Verification key hash */
  verificationKeyHash: string;
}

// ============================================
// COMBINED PROOF TYPES
// ============================================

/**
 * Combined payment + KYC proof
 */
export interface PaymentKYCProof {
  /** Payment proof */
  paymentProof: ZKProof;
  
  /** KYC/identity proof */
  kycProof: ZKProof;
  
  /** Combined proof (if supported) */
  combinedProof?: ZKProof;
  
  /** Binding between proofs */
  binding: {
    paymentId: string;
    kycCommitment: string;
    timestamp: number;
    signature: string;
  };
}

/**
 * Combined order + payment proof
 */
export interface OrderPaymentProof {
  /** Order proof */
  orderProof: ZKProof;
  
  /** Payment proof */
  paymentProof: ZKProof;
  
  /** Binding between proofs */
  binding: {
    orderId: string;
    paymentId: string;
    timestamp: number;
    signature: string;
  };
}

// ============================================
// PROOF COMPOSITION
// ============================================

/**
 * Proof composition request
 */
export interface ProofCompositionRequest {
  /** Proofs to compose */
  proofs: ZKProof[];
  
  /** Composition type */
  compositionType: 'and' | 'or' | 'recursive';
  
  /** Additional constraints */
  constraints?: Record<string, unknown>;
}

/**
 * Composed proof result
 */
export interface ComposedProof extends ZKProof {
  /** Original proofs */
  originalProofs: string[];
  
  /** Composition type used */
  compositionType: 'and' | 'or' | 'recursive';
}
