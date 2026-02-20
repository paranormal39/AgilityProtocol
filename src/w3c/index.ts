/**
 * W3C VC Module
 * 
 * Exports W3C Verifiable Credential types and adapter functions.
 */

export type {
  Issuer,
  CredentialSubject,
  VcProof,
  VerifiableCredential,
} from './vcTypes.js';

export {
  getIssuerId,
  getIssuerName,
  getCredentialTypes,
  hasCredentialType,
  isCredentialExpired,
  getCredentialSubjects,
} from './vcTypes.js';

export {
  vcToSourceRef,
  sourceRefToVc,
  isVcSourceRef,
  validateVcSourceRef,
} from './VcAdapter.js';
