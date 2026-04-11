/**
 * Agility Payments - Order Proof Circuit
 * 
 * ZK proof circuits for order verification without revealing item details.
 * Enables split-knowledge architecture where couriers verify delivery
 * without seeing order contents.
 */

import type {
  ZKProof,
  ZKVerificationResult,
  OrderPrivateInputs,
  OrderPublicInputs,
  ZKProofSystem,
  ZKCircuitInfo,
} from './types.js';

/**
 * Order proof circuit types
 */
export type OrderProofType = 
  | 'order_placed'
  | 'order_value_range'
  | 'order_contains_type'
  | 'order_item_count';

/**
 * Order circuit configuration
 */
export interface OrderCircuitConfig {
  proofSystem: ZKProofSystem;
  proofServerUrl?: string;
  timeout?: number;
}

const DEFAULT_CONFIG: OrderCircuitConfig = {
  proofSystem: 'midnight',
  timeout: 30000,
};

/**
 * Order Proof Circuit
 * 
 * Generates ZK proofs for order verification.
 */
export class OrderProofCircuit {
  private config: OrderCircuitConfig;
  private proofServer: any = null;

  constructor(config: Partial<OrderCircuitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize proof server
   */
  async initialize(): Promise<void> {
    if (!this.proofServer) {
      this.proofServer = this.createStubProofServer();
    }
  }

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
   * Generate proof that order was placed
   * Proves order exists without revealing items
   */
  async generateOrderPlacedProof(
    privateInputs: OrderPrivateInputs,
    publicInputs: OrderPublicInputs
  ): Promise<ZKProof> {
    // Compute order hash from private inputs
    const orderHash = this.computeOrderHash(privateInputs);

    return this.generateProof('order_placed', privateInputs, {
      ...publicInputs,
      orderHash,
    });
  }

  /**
   * Generate proof that order value is in range
   * Proves value without revealing exact amount
   */
  async generateOrderValueRangeProof(
    privateInputs: OrderPrivateInputs,
    publicInputs: OrderPublicInputs & { minimumValue: number; maximumValue: number }
  ): Promise<ZKProof> {
    // Calculate total order value
    const totalValue = privateInputs.orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    if (totalValue < publicInputs.minimumValue || totalValue > publicInputs.maximumValue) {
      throw new Error('Order value is outside the specified range');
    }

    return this.generateProof('order_value_range', privateInputs, publicInputs);
  }

  /**
   * Generate proof that order contains specific item type
   * E.g., proves order contains age-restricted items without revealing what
   */
  async generateOrderContainsTypeProof(
    privateInputs: OrderPrivateInputs,
    publicInputs: OrderPublicInputs & { containsAgeRestricted: boolean }
  ): Promise<ZKProof> {
    // Check if order contains age-restricted items
    const hasAgeRestricted = privateInputs.orderItems.some(
      item => item.ageRestricted === true
    );

    if (hasAgeRestricted !== publicInputs.containsAgeRestricted) {
      throw new Error('Order age-restricted status does not match');
    }

    return this.generateProof('order_contains_type', privateInputs, publicInputs);
  }

  /**
   * Generate proof of order item count
   * Proves number of items without revealing what they are
   */
  async generateOrderItemCountProof(
    privateInputs: OrderPrivateInputs,
    publicInputs: OrderPublicInputs & { itemCount: number }
  ): Promise<ZKProof> {
    const totalItems = privateInputs.orderItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    if (totalItems !== publicInputs.itemCount) {
      throw new Error('Order item count does not match');
    }

    return this.generateProof('order_item_count', privateInputs, publicInputs);
  }

  /**
   * Generate proof for courier delivery
   * Proves order exists and delivery is valid without revealing contents
   */
  async generateCourierDeliveryProof(
    privateInputs: OrderPrivateInputs,
    publicInputs: {
      orderId: string;
      merchantId: string;
      deliveryAddressHash: string;
      timestamp: number;
    }
  ): Promise<ZKProof> {
    // Hash the shipping address
    const addressHash = this.hashAddress(privateInputs.shippingAddress || '');

    if (addressHash !== publicInputs.deliveryAddressHash) {
      throw new Error('Delivery address hash does not match');
    }

    return this.generateProof('order_placed', privateInputs, {
      orderId: publicInputs.orderId,
      merchantId: publicInputs.merchantId,
      timestamp: publicInputs.timestamp,
    });
  }

  /**
   * Generate a proof
   */
  private async generateProof(
    proofType: OrderProofType,
    privateInputs: OrderPrivateInputs,
    publicInputs: Record<string, unknown>
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

    return {
      proofType,
      proof: result.proof,
      publicInputs: result.publicInputs,
      verificationKeyHash: result.verificationKeyHash,
      circuitId,
      proofSystem: this.config.proofSystem,
      generatedAt: Date.now(),
      proofSize: result.proof.length,
      generationTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Verify an order proof
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
   * Compute order hash from items
   */
  private computeOrderHash(inputs: OrderPrivateInputs): string {
    const itemsString = inputs.orderItems
      .map(item => `${item.sku}:${item.quantity}`)
      .sort()
      .join(',');
    
    // Simple hash for demo - use proper hash in production
    let hash = 0;
    for (let i = 0; i < itemsString.length; i++) {
      const char = itemsString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `ORDER_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Hash address for privacy
   */
  private hashAddress(address: string): string {
    let hash = 0;
    for (let i = 0; i < address.length; i++) {
      const char = address.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `ADDR_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Get circuit info
   */
  getCircuitInfo(proofType: OrderProofType): ZKCircuitInfo {
    const circuits: Record<OrderProofType, ZKCircuitInfo> = {
      order_placed: {
        circuitId: 'agility_order_placed_v1',
        proofType: 'order_placed',
        proofSystem: this.config.proofSystem,
        constraintCount: 2000,
        estimatedGenerationTimeMs: 800,
        proofSizeBytes: 320,
        verificationKeyHash: 'VK_order_placed',
      },
      order_value_range: {
        circuitId: 'agility_order_value_range_v1',
        proofType: 'order_value_range',
        proofSystem: this.config.proofSystem,
        constraintCount: 2500,
        estimatedGenerationTimeMs: 1000,
        proofSizeBytes: 384,
        verificationKeyHash: 'VK_order_value_range',
      },
      order_contains_type: {
        circuitId: 'agility_order_contains_type_v1',
        proofType: 'order_contains_type',
        proofSystem: this.config.proofSystem,
        constraintCount: 1800,
        estimatedGenerationTimeMs: 700,
        proofSizeBytes: 288,
        verificationKeyHash: 'VK_order_contains_type',
      },
      order_item_count: {
        circuitId: 'agility_order_item_count_v1',
        proofType: 'order_item_count',
        proofSystem: this.config.proofSystem,
        constraintCount: 1200,
        estimatedGenerationTimeMs: 500,
        proofSizeBytes: 256,
        verificationKeyHash: 'VK_order_item_count',
      },
    };

    return circuits[proofType];
  }
}

/**
 * Create an order proof circuit instance
 */
export function createOrderProofCircuit(config?: Partial<OrderCircuitConfig>): OrderProofCircuit {
  return new OrderProofCircuit(config);
}

/**
 * Convenience function to prove order was placed
 */
export async function proveOrderPlaced(
  orderId: string,
  merchantId: string,
  orderItems: OrderPrivateInputs['orderItems'],
  timestamp?: number
): Promise<ZKProof> {
  const circuit = createOrderProofCircuit();
  await circuit.initialize();

  return circuit.generateOrderPlacedProof(
    { orderItems },
    {
      orderId,
      merchantId,
      timestamp: timestamp || Date.now(),
    }
  );
}

/**
 * Convenience function to prove order contains age-restricted items
 */
export async function proveOrderAgeRestricted(
  orderId: string,
  merchantId: string,
  orderItems: OrderPrivateInputs['orderItems'],
  timestamp?: number
): Promise<ZKProof> {
  const circuit = createOrderProofCircuit();
  await circuit.initialize();

  const hasAgeRestricted = orderItems.some(item => item.ageRestricted);

  return circuit.generateOrderContainsTypeProof(
    { orderItems },
    {
      orderId,
      merchantId,
      containsAgeRestricted: hasAgeRestricted,
      timestamp: timestamp || Date.now(),
    }
  );
}
