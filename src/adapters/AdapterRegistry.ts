/**
 * Adapter Registry
 * 
 * Provides dynamic registration of chain verifiers, DID resolvers, and evidence handlers.
 * This enables extensibility without modifying core verification logic.
 */

import type { ConsentGrant } from '../schemas/ConsentGrant.js';
import type { SourceRef } from '../decks/types.js';

/**
 * Result from a chain verifier.
 */
export interface ChainVerifyResult {
  valid: boolean;
  errorCode?: string;
  errorMessage?: string;
  meta?: Record<string, unknown>;
}

/**
 * Chain verifier adapter interface.
 * Implementations verify consent grants against on-chain data.
 */
export interface ChainVerifierAdapter {
  /**
   * Verify a consent grant on-chain.
   * @param grant The consent grant to verify
   * @param consentHash The expected consent hash
   * @returns Verification result
   */
  verify(grant: ConsentGrant, consentHash: string): Promise<ChainVerifyResult>;
}

/**
 * Minimal DID Document structure.
 */
export interface DidDocument {
  id: string;
  verificationMethod?: Array<{
    id: string;
    type: string;
    controller: string;
    publicKeyMultibase?: string;
    publicKeyJwk?: Record<string, unknown>;
  }>;
  authentication?: string[];
  [key: string]: unknown;
}

/**
 * DID resolver adapter interface.
 * Implementations resolve DIDs to DID Documents.
 */
export interface DidResolverAdapter {
  /**
   * Resolve a DID to its DID Document.
   * @param did The DID to resolve
   * @returns DID Document or null if not found
   */
  resolve(did: string): Promise<DidDocument | null>;
  
  /**
   * Check if this resolver supports the given DID method.
   * @param method The DID method (e.g., "key", "xrpl")
   */
  supportsMethod(method: string): boolean;
}

/**
 * Evidence evaluation result.
 */
export interface EvidenceEvalResult {
  valid: boolean;
  errorCode?: string;
  errorMessage?: string;
  summary?: string;
}

/**
 * Evidence handler adapter interface.
 * Implementations evaluate evidence sources.
 */
export interface EvidenceHandlerAdapter {
  /**
   * Evaluate an evidence source.
   * @param source The source reference to evaluate
   * @param context Optional evaluation context
   * @returns Evaluation result
   */
  evaluate(source: SourceRef, context?: Record<string, unknown>): Promise<EvidenceEvalResult>;
}

/**
 * Adapter Registry singleton.
 * Manages registration and lookup of adapters.
 */
class AdapterRegistryImpl {
  private chainVerifiers: Map<string, ChainVerifierAdapter> = new Map();
  private didResolvers: Map<string, DidResolverAdapter> = new Map();
  private evidenceHandlers: Map<string, EvidenceHandlerAdapter> = new Map();

  /**
   * Register a chain verifier adapter.
   * @param type Chain type (e.g., "xrpl", "cardano")
   * @param adapter The adapter implementation
   */
  registerChainVerifier(type: string, adapter: ChainVerifierAdapter): void {
    this.chainVerifiers.set(type.toLowerCase(), adapter);
  }

  /**
   * Get a chain verifier adapter.
   * @param type Chain type
   * @returns Adapter or undefined if not registered
   */
  getChainVerifier(type: string): ChainVerifierAdapter | undefined {
    return this.chainVerifiers.get(type.toLowerCase());
  }

  /**
   * Check if a chain verifier is registered.
   * @param type Chain type
   */
  hasChainVerifier(type: string): boolean {
    return this.chainVerifiers.has(type.toLowerCase());
  }

  /**
   * Register a DID resolver adapter.
   * @param method DID method (e.g., "key", "xrpl")
   * @param adapter The adapter implementation
   */
  registerDidResolver(method: string, adapter: DidResolverAdapter): void {
    this.didResolvers.set(method.toLowerCase(), adapter);
  }

  /**
   * Get a DID resolver adapter.
   * @param method DID method
   * @returns Adapter or undefined if not registered
   */
  getDidResolver(method: string): DidResolverAdapter | undefined {
    return this.didResolvers.get(method.toLowerCase());
  }

  /**
   * Check if a DID resolver is registered.
   * @param method DID method
   */
  hasDidResolver(method: string): boolean {
    return this.didResolvers.has(method.toLowerCase());
  }

  /**
   * Register an evidence handler adapter.
   * @param type Evidence type (e.g., "vc", "zk", "onchain")
   * @param adapter The adapter implementation
   */
  registerEvidenceHandler(type: string, adapter: EvidenceHandlerAdapter): void {
    this.evidenceHandlers.set(type.toLowerCase(), adapter);
  }

  /**
   * Get an evidence handler adapter.
   * @param type Evidence type
   * @returns Adapter or undefined if not registered
   */
  getEvidenceHandler(type: string): EvidenceHandlerAdapter | undefined {
    return this.evidenceHandlers.get(type.toLowerCase());
  }

  /**
   * Check if an evidence handler is registered.
   * @param type Evidence type
   */
  hasEvidenceHandler(type: string): boolean {
    return this.evidenceHandlers.has(type.toLowerCase());
  }

  /**
   * List all registered chain verifier types.
   */
  listChainVerifiers(): string[] {
    return Array.from(this.chainVerifiers.keys());
  }

  /**
   * List all registered DID resolver methods.
   */
  listDidResolvers(): string[] {
    return Array.from(this.didResolvers.keys());
  }

  /**
   * List all registered evidence handler types.
   */
  listEvidenceHandlers(): string[] {
    return Array.from(this.evidenceHandlers.keys());
  }

  /**
   * Clear all registrations. Useful for testing.
   */
  clear(): void {
    this.chainVerifiers.clear();
    this.didResolvers.clear();
    this.evidenceHandlers.clear();
  }
}

// Singleton instance
let registryInstance: AdapterRegistryImpl | null = null;

/**
 * Get the adapter registry singleton.
 */
export function getAdapterRegistry(): AdapterRegistryImpl {
  if (!registryInstance) {
    registryInstance = new AdapterRegistryImpl();
    registerDefaultAdapters(registryInstance);
  }
  return registryInstance;
}

/**
 * Reset the adapter registry. Useful for testing.
 */
export function resetAdapterRegistry(): void {
  if (registryInstance) {
    registryInstance.clear();
  }
  registryInstance = null;
}

/**
 * Register default adapters.
 */
function registerDefaultAdapters(registry: AdapterRegistryImpl): void {
  // Register default chain verifiers
  registry.registerChainVerifier('xrpl', createXrplVerifierAdapter());
  registry.registerChainVerifier('cardano', createCardanoVerifierAdapter());
  
  // Register default DID resolvers
  registry.registerDidResolver('key', createDidKeyResolverAdapter());
  registry.registerDidResolver('agility', createPairwiseDidResolverAdapter());
  
  // Register default evidence handlers
  registry.registerEvidenceHandler('vc', createVcEvidenceHandler());
  registry.registerEvidenceHandler('credential', createVcEvidenceHandler());
  registry.registerEvidenceHandler('zk', createZkEvidenceHandler());
  registry.registerEvidenceHandler('onchain', createOnchainEvidenceHandler());
  registry.registerEvidenceHandler('attestation', createAttestationEvidenceHandler());
}

// Default adapter implementations

function createXrplVerifierAdapter(): ChainVerifierAdapter {
  return {
    async verify(grant: ConsentGrant, consentHash: string): Promise<ChainVerifyResult> {
      // Delegate to existing XRPL verification
      const { verifyXrplConsentTx } = await import('../security/xrpl/verifyXrplConsentTx.js');
      const { ENABLE_XRPL_CONSENT_TX_VERIFY } = await import('../security/config.js');
      
      if (!ENABLE_XRPL_CONSENT_TX_VERIFY) {
        return { valid: true, meta: { skipped: true, reason: 'disabled' } };
      }
      
      const result = await verifyXrplConsentTx(grant, consentHash);
      return {
        valid: result.ok,
        errorCode: result.code,
        errorMessage: result.message,
        meta: result.meta ? { ...result.meta } : undefined,
      };
    },
  };
}

function createCardanoVerifierAdapter(): ChainVerifierAdapter {
  return {
    async verify(grant: ConsentGrant, consentHash: string): Promise<ChainVerifyResult> {
      // Delegate to existing Cardano verification
      const { verifyCardanoSignData } = await import('../security/cardano/verifyCardanoSignData.js');
      const { ENABLE_CARDANO_SIGNDATA_VERIFY } = await import('../security/config.js');
      
      if (!ENABLE_CARDANO_SIGNDATA_VERIFY) {
        return { valid: true, meta: { skipped: true, reason: 'disabled' } };
      }
      
      const result = await verifyCardanoSignData(grant, consentHash);
      return {
        valid: result.ok,
        errorCode: result.code,
        errorMessage: result.message,
        meta: result.meta ? { ...result.meta } : undefined,
      };
    },
  };
}

function createDidKeyResolverAdapter(): DidResolverAdapter {
  return {
    async resolve(did: string): Promise<DidDocument | null> {
      if (!did.startsWith('did:key:')) {
        return null;
      }
      
      // Basic did:key resolution - extract the multibase-encoded public key
      const keyPart = did.substring('did:key:'.length);
      
      return {
        id: did,
        verificationMethod: [
          {
            id: `${did}#${keyPart}`,
            type: 'Multikey',
            controller: did,
            publicKeyMultibase: keyPart,
          },
        ],
        authentication: [`${did}#${keyPart}`],
      };
    },
    supportsMethod(method: string): boolean {
      return method.toLowerCase() === 'key';
    },
  };
}

function createPairwiseDidResolverAdapter(): DidResolverAdapter {
  return {
    async resolve(did: string): Promise<DidDocument | null> {
      if (!did.startsWith('did:agility:pairwise:')) {
        return null;
      }
      
      // Pairwise DIDs are local-only, no external resolution needed
      const hash = did.substring('did:agility:pairwise:'.length);
      
      return {
        id: did,
        verificationMethod: [
          {
            id: `${did}#pairwise`,
            type: 'PairwiseKey',
            controller: did,
          },
        ],
        authentication: [`${did}#pairwise`],
        _pairwiseHash: hash,
      };
    },
    supportsMethod(method: string): boolean {
      return method.toLowerCase() === 'agility';
    },
  };
}

function createVcEvidenceHandler(): EvidenceHandlerAdapter {
  return {
    async evaluate(source: SourceRef): Promise<EvidenceEvalResult> {
      if (source.type !== 'vc' && source.type !== 'credential') {
        return { valid: false, errorCode: 'TYPE_MISMATCH', errorMessage: 'Not a VC source' };
      }
      
      const issuer = source.metadata?.issuer as string | undefined;
      const summary = issuer 
        ? `vc from ${issuer.substring(0, 24)}...`
        : `vc (${source.ref})`;
      
      return { valid: true, summary };
    },
  };
}

function createZkEvidenceHandler(): EvidenceHandlerAdapter {
  return {
    async evaluate(source: SourceRef): Promise<EvidenceEvalResult> {
      if (source.type !== 'zk' && source.type !== 'zk-proof') {
        return { valid: false, errorCode: 'TYPE_MISMATCH', errorMessage: 'Not a ZK source' };
      }
      
      return { valid: true, summary: `zk-proof (${source.ref})` };
    },
  };
}

function createOnchainEvidenceHandler(): EvidenceHandlerAdapter {
  return {
    async evaluate(source: SourceRef): Promise<EvidenceEvalResult> {
      if (source.type !== 'onchain') {
        return { valid: false, errorCode: 'TYPE_MISMATCH', errorMessage: 'Not an onchain source' };
      }
      
      return { valid: true, summary: `onchain (${source.ref})` };
    },
  };
}

function createAttestationEvidenceHandler(): EvidenceHandlerAdapter {
  return {
    async evaluate(source: SourceRef): Promise<EvidenceEvalResult> {
      if (source.type !== 'attestation') {
        return { valid: false, errorCode: 'TYPE_MISMATCH', errorMessage: 'Not an attestation source' };
      }
      
      const issuer = source.metadata?.issuer as string | undefined;
      const summary = issuer 
        ? `attestation from ${issuer.substring(0, 24)}...`
        : `attestation (${source.ref})`;
      
      return { valid: true, summary };
    },
  };
}
