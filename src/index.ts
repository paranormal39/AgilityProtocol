/**
 * Agility Headless SDK
 * 
 * Main entrypoint for the Agility Protocol library.
 * Exports all public APIs for protocol, decks, DID, security, and adapters.
 */

// Protocol
export { ProofProtocol } from './protocol/ProofProtocol.js';
export type { VerifyResult, CreateProofOptions } from './protocol/ProofProtocol.js';

// Schemas
export { ProofRequestSchema, validateProofRequest } from './schemas/ProofRequest.js';
export type { ProofRequest } from './schemas/ProofRequest.js';
export { ProofResponseSchema, validateProofResponse } from './schemas/ProofResponse.js';
export type { ProofResponse } from './schemas/ProofResponse.js';
export { ConsentGrantSchema, validateConsentGrant } from './schemas/ConsentGrant.js';
export type { ConsentGrant } from './schemas/ConsentGrant.js';

// Decks
export {
  DeckRegistry,
  getDeckRegistry,
  resetDeckRegistry,
  DeckStore,
  getDeckStore,
  resetDeckStore,
  canSatisfyPermission,
  satisfyRequest,
  isDeckStrict,
  validateStrictPermissions,
} from './decks/index.js';
export type {
  EvidenceType,
  RequiredEvidenceType,
  PrivacyLevel,
  IssuerPolicy,
  PermissionDefinition,
  DeckDefinition,
  SourceRef,
  DeckInstance,
  DeckRegistryEntry,
  DeckStoreData,
  RequestContext,
  PermissionEvalResult,
  RequestEvalResult,
} from './decks/index.js';

// DID
export {
  derivePairwiseDid,
  isPairwiseDid,
  extractPairwiseHash,
  PairwiseDidManager,
  getPairwiseDidManager,
  resetPairwiseDidManager,
  extractDidMethod,
  getDidResolverRegistry,
  resetDidResolverRegistry,
  resolveDid,
} from './did/index.js';
export type {
  DidDocument,
  DidResolutionResult,
  DidResolver,
} from './did/index.js';

// Security Config
export {
  MAX_CLOCK_SKEW_SECONDS,
  MAX_PROOF_AGE_SECONDS,
  ENABLE_REPLAY_PROTECTION,
  ENABLE_XRPL_CONSENT_TX_VERIFY,
  ENABLE_CARDANO_SIGNDATA_VERIFY,
  ENABLE_STRICT_DECK_PERMISSIONS,
  ENABLE_PAIRWISE_DID,
  MAX_PERMISSIONS,
  MAX_PERMISSION_ID_LENGTH,
  MAX_DECK_SOURCES,
  PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_MAJOR,
  SUPPORTED_PROTOCOL_MINOR_MIN,
  SUPPORTED_PROTOCOL_MINOR_MAX,
  parseProtocolVersion,
  isProtocolVersionSupported,
  VerificationErrorCode,
  validateTimeRange,
} from './security/config.js';
export type { TimeValidationResult, ParsedProtocolVersion } from './security/config.js';

// Security - Replay Protection
export { InMemoryReplayStore } from './security/InMemoryReplayStore.js';
export { createReplayStore } from './security/ReplayStoreFactory.js';
export { TimestampAdapter } from './security/TimestampAdapter.js';

// Security - XRPL
export {
  verifyXrplConsentTx,
  computeConsentHash,
} from './security/xrpl/verifyXrplConsentTx.js';
export type { XrplVerifyResult, XrplVerifyMeta } from './security/xrpl/verifyXrplConsentTx.js';
export type { IXrplClient } from './security/xrpl/XrplClient.js';
export { XrplJsonRpcClient, MockXrplClient } from './security/xrpl/XrplClient.js';
export { XrplTxCache } from './security/xrpl/XrplTxCache.js';

// Security - Cardano
export {
  verifyCardanoSignData,
  verifyCardanoSignatureRaw,
  verifyEd25519Signature,
  MockCardanoVerifier,
} from './security/cardano/verifyCardanoSignData.js';
export type { CardanoVerifyResult, CardanoVerifyMeta } from './security/cardano/verifyCardanoSignData.js';

// W3C VC Adapter
export {
  vcToSourceRef,
  sourceRefToVc,
  isVcSourceRef,
  validateVcSourceRef,
  getIssuerId,
  getIssuerName,
  getCredentialTypes,
  hasCredentialType,
  isCredentialExpired,
  getCredentialSubjects,
} from './w3c/index.js';
export type {
  Issuer,
  CredentialSubject,
  VcProof,
  VerifiableCredential,
} from './w3c/index.js';

// Utilities
export { canonicalJson, sha256Hex } from './utils/canonical.js';

// Persistence
export { JsonPersistence } from './persistence/JsonPersistence.js';

// Prover
export { LocalProver } from './prover/LocalProver.js';

// Adapter Registry (Phase 6)
export {
  getAdapterRegistry,
  resetAdapterRegistry,
} from './adapters/AdapterRegistry.js';
export type {
  ChainVerifyResult,
  ChainVerifierAdapter,
  DidResolverAdapter,
  EvidenceEvalResult,
  EvidenceHandlerAdapter,
} from './adapters/AdapterRegistry.js';
