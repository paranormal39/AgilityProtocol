/**
 * DID Module
 * 
 * Exports pairwise DID derivation, management, and resolution functions.
 */

export {
  derivePairwiseDid,
  isPairwiseDid,
  extractPairwiseHash,
  PairwiseDidManager,
  getPairwiseDidManager,
  resetPairwiseDidManager,
} from './PairwiseDid.js';

export {
  extractDidMethod,
  getDidResolverRegistry,
  resetDidResolverRegistry,
  resolveDid,
} from './DidResolverRegistry.js';

export type {
  DidDocument,
  DidResolutionResult,
  DidResolver,
} from './DidResolverRegistry.js';
