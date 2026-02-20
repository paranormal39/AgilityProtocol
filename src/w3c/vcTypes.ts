/**
 * W3C Verifiable Credentials Types (Minimal)
 * 
 * Lightweight type definitions for W3C VC interoperability.
 * Based on https://www.w3.org/TR/vc-data-model/
 */

/**
 * Issuer can be a string (DID/URL) or an object with id and optional name.
 */
export type Issuer = string | {
  id: string;
  name?: string;
  [key: string]: unknown;
};

/**
 * Credential subject contains the claims about the subject.
 */
export interface CredentialSubject {
  id?: string;
  [key: string]: unknown;
}

/**
 * Proof object for cryptographic verification.
 */
export interface VcProof {
  type: string;
  created?: string;
  verificationMethod?: string;
  proofPurpose?: string;
  proofValue?: string;
  jws?: string;
  [key: string]: unknown;
}

/**
 * W3C Verifiable Credential (minimal subset).
 */
export interface VerifiableCredential {
  '@context': string | string[];
  id?: string;
  type: string | string[];
  issuer: Issuer;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: CredentialSubject | CredentialSubject[];
  proof?: VcProof | VcProof[];
  credentialStatus?: {
    id: string;
    type: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Extract issuer ID from issuer field.
 */
export function getIssuerId(issuer: Issuer): string {
  if (typeof issuer === 'string') {
    return issuer;
  }
  return issuer.id;
}

/**
 * Extract issuer name if available.
 */
export function getIssuerName(issuer: Issuer): string | undefined {
  if (typeof issuer === 'string') {
    return undefined;
  }
  return issuer.name;
}

/**
 * Get credential types as array.
 */
export function getCredentialTypes(vc: VerifiableCredential): string[] {
  if (Array.isArray(vc.type)) {
    return vc.type;
  }
  return [vc.type];
}

/**
 * Check if credential has a specific type.
 */
export function hasCredentialType(vc: VerifiableCredential, type: string): boolean {
  return getCredentialTypes(vc).includes(type);
}

/**
 * Check if credential is expired.
 */
export function isCredentialExpired(vc: VerifiableCredential, now?: Date): boolean {
  if (!vc.expirationDate) {
    return false;
  }
  const expDate = new Date(vc.expirationDate);
  const checkDate = now || new Date();
  return expDate < checkDate;
}

/**
 * Get credential subject as array (normalizes single/array).
 */
export function getCredentialSubjects(vc: VerifiableCredential): CredentialSubject[] {
  if (Array.isArray(vc.credentialSubject)) {
    return vc.credentialSubject;
  }
  return [vc.credentialSubject];
}
