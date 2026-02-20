/**
 * Decks Module
 * 
 * Exports deck types, registry, and store.
 */

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
} from './types.js';

export {
  DeckRegistry,
  getDeckRegistry,
  resetDeckRegistry,
} from './DeckRegistry.js';

export {
  DeckStore,
  getDeckStore,
  resetDeckStore,
} from './DeckStore.js';

export {
  canSatisfyPermission,
  satisfyRequest,
  isDeckStrict,
  validateStrictPermissions,
  type RequestContext,
  type PermissionEvalResult,
  type RequestEvalResult,
} from './DeckEvaluator.js';
