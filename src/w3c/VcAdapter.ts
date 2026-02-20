/**
 * W3C VC Adapter
 * 
 * Converts between W3C Verifiable Credentials and SourceRef format.
 */

import type { SourceRef } from '../decks/types.js';
import type { VerifiableCredential, Issuer } from './vcTypes.js';
import { getIssuerId, getCredentialTypes, getIssuerName } from './vcTypes.js';

/**
 * Convert a W3C Verifiable Credential to a SourceRef.
 * 
 * @param vc - The verifiable credential
 * @returns SourceRef for use in deck instances
 */
export function vcToSourceRef(vc: VerifiableCredential): SourceRef {
  const issuerId = getIssuerId(vc.issuer);
  const issuerName = getIssuerName(vc.issuer);
  const types = getCredentialTypes(vc);
  
  // Parse issuanceDate to epoch seconds
  let issuedAt: number | undefined;
  try {
    const date = new Date(vc.issuanceDate);
    if (!isNaN(date.getTime())) {
      issuedAt = Math.floor(date.getTime() / 1000);
    }
  } catch {
    // Ignore parse errors
  }

  // Generate a safe summary for debug output
  const summary = generateVcSummary(vc);

  return {
    type: 'vc',
    ref: vc.id || `vc:${issuerId}:${Date.now()}`,
    metadata: {
      issuer: issuerId,
      issuerName,
      issuedAt,
      credentialTypes: types,
      summary,
      // Include expiration if present
      ...(vc.expirationDate && { expiresAt: vc.expirationDate }),
    },
  };
}

/**
 * Convert a SourceRef back to a minimal VerifiableCredential (best effort).
 * 
 * Note: This is lossy - we can only reconstruct basic structure.
 * 
 * @param ref - The source reference
 * @returns VerifiableCredential or null if not a VC type
 */
export function sourceRefToVc(ref: SourceRef): VerifiableCredential | null {
  if (ref.type !== 'vc') {
    return null;
  }

  const metadata = ref.metadata || {};
  const issuer = metadata.issuer as string | undefined;
  const issuerName = metadata.issuerName as string | undefined;
  const issuedAt = metadata.issuedAt as number | undefined;
  const credentialTypes = metadata.credentialTypes as string[] | undefined;
  const expiresAt = metadata.expiresAt as string | undefined;

  if (!issuer) {
    return null;
  }

  // Reconstruct issuanceDate from epoch
  let issuanceDate: string;
  if (issuedAt) {
    issuanceDate = new Date(issuedAt * 1000).toISOString();
  } else {
    issuanceDate = new Date().toISOString();
  }

  // Build issuer object
  const issuerObj: Issuer = issuerName 
    ? { id: issuer, name: issuerName }
    : issuer;

  return {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: ref.ref,
    type: credentialTypes || ['VerifiableCredential'],
    issuer: issuerObj,
    issuanceDate,
    ...(expiresAt && { expirationDate: expiresAt }),
    credentialSubject: {
      // Subject details are not preserved in SourceRef
    },
  };
}

/**
 * Generate a safe, non-sensitive summary string for debug output.
 */
function generateVcSummary(vc: VerifiableCredential): string {
  const types = getCredentialTypes(vc);
  const mainType = types.find(t => t !== 'VerifiableCredential') || types[0];
  const issuerId = getIssuerId(vc.issuer);
  const issuerShort = issuerId.length > 24 ? issuerId.slice(0, 24) + '...' : issuerId;
  
  return `${mainType} from ${issuerShort}`;
}

/**
 * Check if a SourceRef represents a VC.
 */
export function isVcSourceRef(ref: SourceRef): boolean {
  return ref.type === 'vc' || ref.type === 'credential';
}

/**
 * Validate that a SourceRef has required VC metadata.
 */
export function validateVcSourceRef(ref: SourceRef): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!isVcSourceRef(ref)) {
    errors.push('SourceRef type is not vc');
  }

  if (!ref.ref) {
    errors.push('SourceRef.ref is required');
  }

  if (!ref.metadata?.issuer) {
    errors.push('SourceRef.metadata.issuer is required for VC');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
