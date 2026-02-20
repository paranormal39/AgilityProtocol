/**
 * Proof Deck Types
 * 
 * Defines the structure for deck definitions, permission definitions,
 * and deck instances for selective disclosure.
 */

/**
 * Evidence type for a permission.
 */
export type EvidenceType = 'zk' | 'vc' | 'onchain' | 'attestation';

/**
 * Required evidence type (includes 'any' for flexible matching).
 */
export type RequiredEvidenceType = EvidenceType | 'any';

/**
 * Privacy level for a permission.
 */
export type PrivacyLevel = 'boolean-only' | 'range' | 'fields';

/**
 * Issuer policy for permission evaluation.
 */
export interface IssuerPolicy {
  /** Allowed issuer DIDs (if set, only these issuers are accepted) */
  allow?: string[];
  /** Denied issuer DIDs (if set, these issuers are rejected) */
  deny?: string[];
  /** Minimum trust level (0-100) */
  minTrust?: number;
}

/**
 * Permission definition within a deck.
 */
export interface PermissionDefinition {
  /** Namespaced permission ID (e.g., "agility:kyc:age_over_18") */
  id: string;
  /** Human-readable description */
  description: string;
  /** Type of evidence required */
  evidenceType: EvidenceType;
  /** Privacy level for disclosure */
  privacyLevel: PrivacyLevel;
  /** Issuer policy for evaluating sources */
  issuerPolicy?: IssuerPolicy;
  /** Maximum age of evidence in seconds */
  freshnessSeconds?: number;
  /** Required evidence type for satisfaction (defaults to evidenceType) */
  requiredEvidence?: RequiredEvidenceType;
}

/**
 * Deck definition - a template for a set of permissions.
 */
export interface DeckDefinition {
  /** Unique deck ID (e.g., "agility:kyc:v1") */
  deckId: string;
  /** Human-readable name */
  name: string;
  /** Version string */
  version: string;
  /** Issuer DID or identifier */
  issuer: string;
  /** Permissions defined in this deck */
  permissions: PermissionDefinition[];
  /** Optional description */
  description?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Source reference for a permission in a deck instance.
 */
export interface SourceRef {
  /** Type of source (e.g., "credential", "attestation", "onchain") */
  type: string;
  /** Reference to the source (e.g., credential ID, tx hash) */
  ref: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Deck instance - a user's instantiation of a deck with sources.
 */
export interface DeckInstance {
  /** Unique instance ID */
  instanceId: string;
  /** Reference to the deck definition */
  deckId: string;
  /** Owner's DID */
  ownerDid: string;
  /** Creation timestamp (ISO string) */
  createdAt: string;
  /** Sources for each permission (keyed by permission ID) */
  sources: Record<string, SourceRef>;
  /** Optional display name */
  name?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Deck registry entry (for well-known decks).
 */
export interface DeckRegistryEntry {
  deck: DeckDefinition;
  addedAt: string;
  updatedAt?: string;
}

/**
 * Deck store data structure.
 */
export interface DeckStoreData {
  instances: DeckInstance[];
  lastUpdated: string;
}
