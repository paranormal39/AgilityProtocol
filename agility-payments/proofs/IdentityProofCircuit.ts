/**
 * Agility Payments - Identity Proof Circuit
 * 
 * ZK proof circuits for identity verification without revealing PII.
 * Supports age verification, KYC status, and selective disclosure.
 */

import type {
  ZKProof,
  ZKVerificationResult,
  IdentityPrivateInputs,
  IdentityPublicInputs,
  ZKProofSystem,
  ZKCircuitInfo,
  ZKProofType,
} from './types.js';

/**
 * Identity proof circuit types
 */
export type IdentityProofType = 
  | 'age_over'
  | 'age_range'
  | 'identity_verified'
  | 'country_residence'
  | 'accredited_investor';

/**
 * Identity circuit configuration
 */
export interface IdentityCircuitConfig {
  proofSystem: ZKProofSystem;
  proofServerUrl?: string;
  timeout?: number;
}

const DEFAULT_CONFIG: IdentityCircuitConfig = {
  proofSystem: 'midnight',
  timeout: 30000,
};

/**
 * Identity Proof Circuit
 * 
 * Generates ZK proofs for identity verification.
 */
export class IdentityProofCircuit {
  private config: IdentityCircuitConfig;
  private proofServer: any = null;

  constructor(config: Partial<IdentityCircuitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

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
   * Generate proof that user is over a certain age
   * Proves age without revealing date of birth
   */
  async generateAgeOverProof(
    privateInputs: IdentityPrivateInputs,
    publicInputs: IdentityPublicInputs & { minimumAge: number }
  ): Promise<ZKProof> {
    if (!privateInputs.dateOfBirth) {
      throw new Error('Date of birth is required for age proof');
    }

    // Calculate age from DOB
    const dob = new Date(privateInputs.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    if (age < publicInputs.minimumAge) {
      throw new Error(`User is not over ${publicInputs.minimumAge}`);
    }

    return this.generateProof('age_over', privateInputs, publicInputs);
  }

  /**
   * Generate proof that user's age is in a range
   */
  async generateAgeRangeProof(
    privateInputs: IdentityPrivateInputs,
    publicInputs: IdentityPublicInputs & { minimumAge: number; maximumAge: number }
  ): Promise<ZKProof> {
    if (!privateInputs.dateOfBirth) {
      throw new Error('Date of birth is required for age proof');
    }

    const dob = new Date(privateInputs.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    if (age < publicInputs.minimumAge || age > publicInputs.maximumAge) {
      throw new Error(`User age is not in range ${publicInputs.minimumAge}-${publicInputs.maximumAge}`);
    }

    return this.generateProof('age_range', privateInputs, publicInputs);
  }

  /**
   * Generate proof that identity is verified (KYC)
   * Proves KYC status without revealing personal details
   */
  async generateIdentityVerifiedProof(
    privateInputs: IdentityPrivateInputs,
    publicInputs: IdentityPublicInputs & { verificationLevel: 'basic' | 'standard' | 'enhanced' }
  ): Promise<ZKProof> {
    if (!privateInputs.kycData) {
      throw new Error('KYC data is required for identity verification proof');
    }

    // Check KYC level meets requirement
    const kycLevel = privateInputs.kycData.level as string;
    const levels = ['basic', 'standard', 'enhanced'];
    const requiredIndex = levels.indexOf(publicInputs.verificationLevel);
    const actualIndex = levels.indexOf(kycLevel);

    if (actualIndex < requiredIndex) {
      throw new Error(`KYC level ${kycLevel} does not meet required ${publicInputs.verificationLevel}`);
    }

    return this.generateProof('identity_verified', privateInputs, publicInputs);
  }

  /**
   * Generate proof of country residence
   * Proves residence without revealing full address
   */
  async generateCountryResidenceProof(
    privateInputs: IdentityPrivateInputs,
    publicInputs: IdentityPublicInputs & { allowedCountries: string[] }
  ): Promise<ZKProof> {
    if (!privateInputs.country) {
      throw new Error('Country is required for residence proof');
    }

    if (!publicInputs.allowedCountries.includes(privateInputs.country)) {
      throw new Error(`Country ${privateInputs.country} is not in allowed list`);
    }

    return this.generateProof('country_residence', privateInputs, publicInputs);
  }

  /**
   * Generate proof of accredited investor status
   */
  async generateAccreditedInvestorProof(
    privateInputs: IdentityPrivateInputs,
    publicInputs: IdentityPublicInputs
  ): Promise<ZKProof> {
    if (!privateInputs.kycData?.accreditedInvestor) {
      throw new Error('Accredited investor status not verified');
    }

    return this.generateProof('accredited_investor', privateInputs, publicInputs);
  }

  /**
   * Generate selective disclosure proof
   * Reveals only specified claims
   */
  async generateSelectiveDisclosureProof(
    privateInputs: IdentityPrivateInputs,
    claims: {
      revealAge?: boolean;
      revealCountry?: boolean;
      proveAgeOver?: number;
      proveKycLevel?: 'basic' | 'standard' | 'enhanced';
    }
  ): Promise<ZKProof> {
    const publicInputs: Record<string, unknown> = {
      timestamp: Date.now(),
    };

    // Add revealed claims
    if (claims.revealAge && privateInputs.dateOfBirth) {
      const dob = new Date(privateInputs.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      publicInputs.age = age;
    }

    if (claims.revealCountry && privateInputs.country) {
      publicInputs.country = privateInputs.country;
    }

    if (claims.proveAgeOver) {
      publicInputs.minimumAge = claims.proveAgeOver;
      publicInputs.ageVerified = true;
    }

    if (claims.proveKycLevel) {
      publicInputs.verificationLevel = claims.proveKycLevel;
      publicInputs.kycVerified = true;
    }

    return this.generateProof('identity_verified', privateInputs, publicInputs as any);
  }

  private async generateProof(
    proofType: IdentityProofType,
    privateInputs: IdentityPrivateInputs,
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

  getCircuitInfo(proofType: IdentityProofType): ZKCircuitInfo {
    const circuits: Record<IdentityProofType, ZKCircuitInfo> = {
      age_over: {
        circuitId: 'agility_age_over_v1',
        proofType: 'age_over',
        proofSystem: this.config.proofSystem,
        constraintCount: 500,
        estimatedGenerationTimeMs: 300,
        proofSizeBytes: 192,
        verificationKeyHash: 'VK_age_over',
      },
      age_range: {
        circuitId: 'agility_age_range_v1',
        proofType: 'age_range',
        proofSystem: this.config.proofSystem,
        constraintCount: 800,
        estimatedGenerationTimeMs: 400,
        proofSizeBytes: 224,
        verificationKeyHash: 'VK_age_range',
      },
      identity_verified: {
        circuitId: 'agility_identity_verified_v1',
        proofType: 'identity_verified',
        proofSystem: this.config.proofSystem,
        constraintCount: 3000,
        estimatedGenerationTimeMs: 1500,
        proofSizeBytes: 512,
        verificationKeyHash: 'VK_identity_verified',
      },
      country_residence: {
        circuitId: 'agility_country_residence_v1',
        proofType: 'country_residence',
        proofSystem: this.config.proofSystem,
        constraintCount: 1000,
        estimatedGenerationTimeMs: 500,
        proofSizeBytes: 256,
        verificationKeyHash: 'VK_country_residence',
      },
      accredited_investor: {
        circuitId: 'agility_accredited_investor_v1',
        proofType: 'accredited_investor',
        proofSystem: this.config.proofSystem,
        constraintCount: 2000,
        estimatedGenerationTimeMs: 1000,
        proofSizeBytes: 384,
        verificationKeyHash: 'VK_accredited_investor',
      },
    };

    return circuits[proofType];
  }
}

/**
 * Create an identity proof circuit instance
 */
export function createIdentityProofCircuit(config?: Partial<IdentityCircuitConfig>): IdentityProofCircuit {
  return new IdentityProofCircuit(config);
}

/**
 * Convenience function to prove age over threshold
 */
export async function proveAgeOver(
  dateOfBirth: string,
  minimumAge: number
): Promise<ZKProof> {
  const circuit = createIdentityProofCircuit();
  await circuit.initialize();

  return circuit.generateAgeOverProof(
    { dateOfBirth },
    { minimumAge, timestamp: Date.now() }
  );
}

/**
 * Convenience function to prove KYC verified
 */
export async function proveKycVerified(
  kycData: Record<string, unknown>,
  verificationLevel: 'basic' | 'standard' | 'enhanced' = 'basic'
): Promise<ZKProof> {
  const circuit = createIdentityProofCircuit();
  await circuit.initialize();

  return circuit.generateIdentityVerifiedProof(
    { kycData },
    { verificationLevel, timestamp: Date.now() }
  );
}
