/**
 * DID Resolver Registry
 * 
 * Provides extensible DID resolution with support for multiple DID methods.
 */

import { isPairwiseDid, extractPairwiseHash } from './PairwiseDid.js';

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
  assertionMethod?: string[];
  keyAgreement?: string[];
  capabilityInvocation?: string[];
  capabilityDelegation?: string[];
  service?: Array<{
    id: string;
    type: string;
    serviceEndpoint: string | string[] | Record<string, unknown>;
  }>;
  [key: string]: unknown;
}

/**
 * DID resolution result.
 */
export interface DidResolutionResult {
  didDocument: DidDocument | null;
  didResolutionMetadata: {
    error?: string;
    errorMessage?: string;
    contentType?: string;
  };
  didDocumentMetadata: {
    created?: string;
    updated?: string;
    deactivated?: boolean;
  };
}

/**
 * DID resolver interface.
 */
export interface DidResolver {
  /**
   * Resolve a DID to its DID Document.
   * @param did The DID to resolve
   * @returns Resolution result
   */
  resolve(did: string): Promise<DidResolutionResult>;
  
  /**
   * Get the DID method this resolver handles.
   */
  getMethod(): string;
}

/**
 * DID Resolver Registry implementation.
 */
class DidResolverRegistryImpl {
  private resolvers: Map<string, DidResolver> = new Map();

  /**
   * Register a DID resolver for a specific method.
   * @param method DID method (e.g., "key", "xrpl")
   * @param resolver The resolver implementation
   */
  register(method: string, resolver: DidResolver): void {
    this.resolvers.set(method.toLowerCase(), resolver);
  }

  /**
   * Get a resolver for a specific method.
   * @param method DID method
   * @returns Resolver or undefined
   */
  getResolver(method: string): DidResolver | undefined {
    return this.resolvers.get(method.toLowerCase());
  }

  /**
   * Check if a resolver is registered for a method.
   * @param method DID method
   */
  hasResolver(method: string): boolean {
    return this.resolvers.has(method.toLowerCase());
  }

  /**
   * List all registered methods.
   */
  listMethods(): string[] {
    return Array.from(this.resolvers.keys());
  }

  /**
   * Resolve a DID using the appropriate resolver.
   * @param did The DID to resolve
   * @returns Resolution result
   */
  async resolve(did: string): Promise<DidResolutionResult> {
    // Extract method from DID
    const method = extractDidMethod(did);
    if (!method) {
      return {
        didDocument: null,
        didResolutionMetadata: {
          error: 'invalidDid',
          errorMessage: `Invalid DID format: ${did}`,
        },
        didDocumentMetadata: {},
      };
    }

    const resolver = this.getResolver(method);
    if (!resolver) {
      return {
        didDocument: null,
        didResolutionMetadata: {
          error: 'methodNotSupported',
          errorMessage: `No resolver registered for method: ${method}`,
        },
        didDocumentMetadata: {},
      };
    }

    try {
      return await resolver.resolve(did);
    } catch (error) {
      return {
        didDocument: null,
        didResolutionMetadata: {
          error: 'internalError',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
        didDocumentMetadata: {},
      };
    }
  }

  /**
   * Clear all registrations. Useful for testing.
   */
  clear(): void {
    this.resolvers.clear();
  }
}

/**
 * Extract the method from a DID string.
 * @param did The DID (e.g., "did:key:z6Mk...")
 * @returns The method (e.g., "key") or null if invalid
 */
export function extractDidMethod(did: string): string | null {
  if (!did || typeof did !== 'string') {
    return null;
  }
  if (!did.startsWith('did:')) {
    return null;
  }
  const parts = did.split(':');
  if (parts.length < 3) {
    return null;
  }
  return parts[1];
}

// Singleton instance
let registryInstance: DidResolverRegistryImpl | null = null;

/**
 * Get the DID resolver registry singleton.
 */
export function getDidResolverRegistry(): DidResolverRegistryImpl {
  if (!registryInstance) {
    registryInstance = new DidResolverRegistryImpl();
    registerDefaultResolvers(registryInstance);
  }
  return registryInstance;
}

/**
 * Reset the DID resolver registry. Useful for testing.
 */
export function resetDidResolverRegistry(): void {
  if (registryInstance) {
    registryInstance.clear();
  }
  registryInstance = null;
}

/**
 * Resolve a DID using the global registry.
 * @param did The DID to resolve
 * @returns Resolution result
 */
export async function resolveDid(did: string): Promise<DidResolutionResult> {
  return getDidResolverRegistry().resolve(did);
}

/**
 * Register default resolvers.
 */
function registerDefaultResolvers(registry: DidResolverRegistryImpl): void {
  registry.register('key', createDidKeyResolver());
  registry.register('agility', createPairwiseDidResolver());
}

/**
 * Create a did:key resolver.
 */
function createDidKeyResolver(): DidResolver {
  return {
    getMethod(): string {
      return 'key';
    },
    async resolve(did: string): Promise<DidResolutionResult> {
      if (!did.startsWith('did:key:')) {
        return {
          didDocument: null,
          didResolutionMetadata: {
            error: 'invalidDid',
            errorMessage: 'Not a did:key DID',
          },
          didDocumentMetadata: {},
        };
      }

      const keyPart = did.substring('did:key:'.length);
      
      // Basic did:key resolution
      const didDocument: DidDocument = {
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
        assertionMethod: [`${did}#${keyPart}`],
      };

      return {
        didDocument,
        didResolutionMetadata: {
          contentType: 'application/did+json',
        },
        didDocumentMetadata: {},
      };
    },
  };
}

/**
 * Create a pairwise DID resolver (did:agility:pairwise:...).
 */
function createPairwiseDidResolver(): DidResolver {
  return {
    getMethod(): string {
      return 'agility';
    },
    async resolve(did: string): Promise<DidResolutionResult> {
      // Handle pairwise DIDs
      if (isPairwiseDid(did)) {
        const hash = extractPairwiseHash(did);
        
        const didDocument: DidDocument = {
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
          _localOnly: true,
        };

        return {
          didDocument,
          didResolutionMetadata: {
            contentType: 'application/did+json',
          },
          didDocumentMetadata: {},
        };
      }

      // Handle other did:agility DIDs
      if (!did.startsWith('did:agility:')) {
        return {
          didDocument: null,
          didResolutionMetadata: {
            error: 'invalidDid',
            errorMessage: 'Not a did:agility DID',
          },
          didDocumentMetadata: {},
        };
      }

      // Generic did:agility resolution (local-only)
      const didDocument: DidDocument = {
        id: did,
        verificationMethod: [],
        authentication: [],
      };

      return {
        didDocument,
        didResolutionMetadata: {
          contentType: 'application/did+json',
        },
        didDocumentMetadata: {},
      };
    },
  };
}
