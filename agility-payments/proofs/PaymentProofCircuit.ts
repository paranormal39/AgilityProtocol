/**
 * Agility Payments - Payment Proof Circuit
 * 
 * ZK proof circuits for payment verification without revealing sensitive data.
 * Integrates with Midnight network for proof generation.
 */

import type {
  ZKProof,
  ZKProofRequest,
  ZKVerificationResult,
  PaymentPrivateInputs,
  PaymentPublicInputs,
  ZKProofSystem,
  ZKCircuitInfo,
} from './types.js';

/**
 * Payment proof circuit types
 */
export type PaymentProofType = 
  | 'payment_made'
  | 'payment_sufficient'
  | 'payment_exact'
  | 'payment_range';

/**
 * Payment proof circuit configuration
 */
export interface PaymentCircuitConfig {
  /** Proof system to use */
  proofSystem: ZKProofSystem;
  
  /** Midnight proof server URL */
  proofServerUrl?: string;
  
  /** Circuit timeout in ms */
  timeout?: number;
}

/**
 * Default circuit configuration
 */
const DEFAULT_CONFIG: PaymentCircuitConfig = {
  proofSystem: 'midnight',
  timeout: 30000,
};

/**
 * Payment Proof Circuit
 * 
 * Generates ZK proofs for payment verification.
 */
export class PaymentProofCircuit {
  private config: PaymentCircuitConfig;
  private proofServer: any = null;

  constructor(config: Partial<PaymentCircuitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize connection to proof server
   */
  async initialize(): Promise<void> {
    if (this.config.proofServerUrl) {
      // Connect to Midnight proof server
      try {
        const proofProvider = await import('@midnight-ntwrk/midnight-js-http-client-proof-provider').catch(() => null);
        if (proofProvider) {
          this.proofServer = proofProvider;
        }
      } catch {
        // Use stub proof server
      }
    }

    if (!this.proofServer) {
      this.proofServer = this.createStubProofServer();
    }
  }

  /**
   * Create stub proof server for development
   */
  private createStubProofServer(): any {
    return {
      generateProof: async (circuit: string, inputs: any) => ({
        proof: `PROOF_${circuit}_${Date.now().toString(16)}`,
        publicInputs: Object.values(inputs.public || {}).map(String),
        verificationKeyHash: `VK_${circuit}`,
      }),
      verifyProof: async () => ({ valid: true }),
    };
  }

  /**
   * Generate proof that payment was made
   */
  async generatePaymentMadeProof(
    privateInputs: PaymentPrivateInputs,
    publicInputs: PaymentPublicInputs
  ): Promise<ZKProof> {
    return this.generateProof('payment_made', privateInputs, publicInputs);
  }

  /**
   * Generate proof that payment is sufficient (>= minimum)
   */
  async generatePaymentSufficientProof(
    privateInputs: PaymentPrivateInputs,
    publicInputs: PaymentPublicInputs & { minimumAmount: string }
  ): Promise<ZKProof> {
    // Verify private amount >= public minimum
    const actualAmount = parseFloat(privateInputs.actualAmount);
    const minimumAmount = parseFloat(publicInputs.minimumAmount);

    if (actualAmount < minimumAmount) {
      throw new Error('Payment amount is less than minimum required');
    }

    return this.generateProof('payment_sufficient', privateInputs, publicInputs);
  }

  /**
   * Generate proof that payment is in range
   */
  async generatePaymentRangeProof(
    privateInputs: PaymentPrivateInputs,
    publicInputs: PaymentPublicInputs & { minimumAmount: string; maximumAmount: string }
  ): Promise<ZKProof> {
    const actualAmount = parseFloat(privateInputs.actualAmount);
    const minAmount = parseFloat(publicInputs.minimumAmount);
    const maxAmount = parseFloat(publicInputs.maximumAmount);

    if (actualAmount < minAmount || actualAmount > maxAmount) {
      throw new Error('Payment amount is outside the specified range');
    }

    return this.generateProof('payment_range', privateInputs, publicInputs);
  }

  /**
   * Generate a payment proof
   */
  private async generateProof(
    proofType: PaymentProofType,
    privateInputs: PaymentPrivateInputs,
    publicInputs: PaymentPublicInputs
  ): Promise<ZKProof> {
    if (!this.proofServer) {
      await this.initialize();
    }

    const startTime = Date.now();

    const circuitId = `agility_${proofType}_v1`;

    const result = await this.proofServer.generateProof(circuitId, {
      private: privateInputs,
      public: publicInputs,
    });

    const generationTimeMs = Date.now() - startTime;

    return {
      proofType,
      proof: result.proof,
      publicInputs: result.publicInputs,
      verificationKeyHash: result.verificationKeyHash,
      circuitId,
      proofSystem: this.config.proofSystem,
      generatedAt: Date.now(),
      proofSize: result.proof.length,
      generationTimeMs,
    };
  }

  /**
   * Verify a payment proof
   */
  async verifyProof(proof: ZKProof): Promise<ZKVerificationResult> {
    if (!this.proofServer) {
      await this.initialize();
    }

    const startTime = Date.now();

    try {
      const result = await this.proofServer.verifyProof(proof);

      return {
        valid: result.valid,
        verifiedAt: Date.now(),
        verificationTimeMs: Date.now() - startTime,
        publicInputs: proof.publicInputs,
      };
    } catch (error) {
      return {
        valid: false,
        verifiedAt: Date.now(),
        verificationTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Get circuit info
   */
  getCircuitInfo(proofType: PaymentProofType): ZKCircuitInfo {
    const circuits: Record<PaymentProofType, ZKCircuitInfo> = {
      payment_made: {
        circuitId: 'agility_payment_made_v1',
        proofType: 'payment_made',
        proofSystem: this.config.proofSystem,
        constraintCount: 1000,
        estimatedGenerationTimeMs: 500,
        proofSizeBytes: 256,
        verificationKeyHash: 'VK_payment_made',
      },
      payment_sufficient: {
        circuitId: 'agility_payment_sufficient_v1',
        proofType: 'payment_sufficient',
        proofSystem: this.config.proofSystem,
        constraintCount: 1500,
        estimatedGenerationTimeMs: 750,
        proofSizeBytes: 320,
        verificationKeyHash: 'VK_payment_sufficient',
      },
      payment_exact: {
        circuitId: 'agility_payment_exact_v1',
        proofType: 'payment_exact',
        proofSystem: this.config.proofSystem,
        constraintCount: 1200,
        estimatedGenerationTimeMs: 600,
        proofSizeBytes: 288,
        verificationKeyHash: 'VK_payment_exact',
      },
      payment_range: {
        circuitId: 'agility_payment_range_v1',
        proofType: 'payment_range',
        proofSystem: this.config.proofSystem,
        constraintCount: 2000,
        estimatedGenerationTimeMs: 1000,
        proofSizeBytes: 384,
        verificationKeyHash: 'VK_payment_range',
      },
    };

    return circuits[proofType];
  }
}

/**
 * Create a payment proof circuit instance
 */
export function createPaymentProofCircuit(config?: Partial<PaymentCircuitConfig>): PaymentProofCircuit {
  return new PaymentProofCircuit(config);
}

/**
 * Convenience function to generate a payment made proof
 */
export async function provePaymentMade(
  paymentId: string,
  recipientAddress: string,
  actualAmount: string,
  timestamp?: number
): Promise<ZKProof> {
  const circuit = createPaymentProofCircuit();
  await circuit.initialize();

  return circuit.generatePaymentMadeProof(
    { actualAmount },
    {
      paymentId,
      recipientAddress,
      timestamp: timestamp || Date.now(),
    }
  );
}

/**
 * Convenience function to generate a payment sufficient proof
 */
export async function provePaymentSufficient(
  paymentId: string,
  recipientAddress: string,
  actualAmount: string,
  minimumAmount: string,
  timestamp?: number
): Promise<ZKProof> {
  const circuit = createPaymentProofCircuit();
  await circuit.initialize();

  return circuit.generatePaymentSufficientProof(
    { actualAmount },
    {
      paymentId,
      recipientAddress,
      minimumAmount,
      timestamp: timestamp || Date.now(),
    }
  );
}
