/**
 * Deck Evaluator
 * 
 * Evaluates deck instances against proof requests to determine
 * which permissions can be satisfied based on policies.
 */

import type {
  DeckInstance,
  DeckDefinition,
  PermissionDefinition,
  SourceRef,
  IssuerPolicy,
} from './types.js';
import { getDeckRegistry } from './DeckRegistry.js';

/**
 * Request context for permission evaluation.
 */
export interface RequestContext {
  /** Current timestamp (ISO string or epoch seconds) */
  now?: string | number;
  /** Audience for the request */
  audience?: string;
  /** Additional context */
  metadata?: Record<string, unknown>;
}

/**
 * Result of evaluating a single permission.
 */
export interface PermissionEvalResult {
  ok: boolean;
  reason?: string;
  evidenceSummary?: string;
}

/**
 * Result of evaluating a request against a deck instance.
 */
export interface RequestEvalResult {
  satisfiedPermissions: string[];
  unsatisfiedPermissions: string[];
  mapping: Record<string, SourceRef>;
  summaries: Record<string, string>;
  errors: Record<string, string>;
}

/**
 * Get current epoch seconds.
 */
function getNowSeconds(context?: RequestContext): number {
  if (!context?.now) {
    return Math.floor(Date.now() / 1000);
  }
  if (typeof context.now === 'number') {
    return context.now;
  }
  return Math.floor(new Date(context.now).getTime() / 1000);
}

/**
 * Parse issuedAt from source metadata.
 */
function getSourceIssuedAt(source: SourceRef): number | null {
  const issuedAt = source.metadata?.issuedAt;
  if (!issuedAt) return null;
  
  if (typeof issuedAt === 'number') {
    return issuedAt;
  }
  if (typeof issuedAt === 'string') {
    const parsed = new Date(issuedAt).getTime();
    if (!isNaN(parsed)) {
      return Math.floor(parsed / 1000);
    }
  }
  return null;
}

/**
 * Get issuer from source metadata.
 */
function getSourceIssuer(source: SourceRef): string | null {
  const issuer = source.metadata?.issuer;
  if (typeof issuer === 'string') {
    return issuer;
  }
  return null;
}

/**
 * Get trust level from source metadata.
 */
function getSourceTrust(source: SourceRef): number | null {
  const trust = source.metadata?.trust;
  if (typeof trust === 'number') {
    return trust;
  }
  return null;
}

/**
 * Check if source passes issuer policy.
 */
function checkIssuerPolicy(source: SourceRef, policy: IssuerPolicy): { ok: boolean; reason?: string } {
  const issuer = getSourceIssuer(source);
  
  // Check deny list
  if (policy.deny && policy.deny.length > 0) {
    if (issuer && policy.deny.includes(issuer)) {
      return { ok: false, reason: `Issuer ${issuer} is denied` };
    }
  }
  
  // Check allow list
  if (policy.allow && policy.allow.length > 0) {
    if (!issuer) {
      return { ok: false, reason: 'Source has no issuer but allow list is specified' };
    }
    if (!policy.allow.includes(issuer)) {
      return { ok: false, reason: `Issuer ${issuer} is not in allow list` };
    }
  }
  
  // Check minimum trust
  if (policy.minTrust !== undefined) {
    const trust = getSourceTrust(source);
    if (trust === null) {
      return { ok: false, reason: 'Source has no trust level but minTrust is required' };
    }
    if (trust < policy.minTrust) {
      return { ok: false, reason: `Trust level ${trust} is below minimum ${policy.minTrust}` };
    }
  }
  
  return { ok: true };
}

/**
 * Check if source passes freshness requirement.
 */
function checkFreshness(source: SourceRef, freshnessSeconds: number, nowSeconds: number): { ok: boolean; reason?: string } {
  const issuedAt = getSourceIssuedAt(source);
  
  if (issuedAt === null) {
    // No issuedAt means we can't verify freshness - allow by default
    return { ok: true };
  }
  
  const age = nowSeconds - issuedAt;
  if (age > freshnessSeconds) {
    return { ok: false, reason: `Evidence is ${age}s old, max allowed is ${freshnessSeconds}s` };
  }
  
  return { ok: true };
}

/**
 * Check if source evidence type matches required type.
 */
function checkEvidenceType(source: SourceRef, requiredType: string): { ok: boolean; reason?: string } {
  if (requiredType === 'any') {
    return { ok: true };
  }
  
  // Map source type to evidence type
  const typeMap: Record<string, string> = {
    'credential': 'vc',
    'vc': 'vc',
    'zk': 'zk',
    'zk-proof': 'zk',
    'onchain': 'onchain',
    'attestation': 'attestation',
  };
  
  const sourceEvidenceType = typeMap[source.type.toLowerCase()] || source.type.toLowerCase();
  
  if (sourceEvidenceType !== requiredType) {
    return { ok: false, reason: `Evidence type ${source.type} does not match required ${requiredType}` };
  }
  
  return { ok: true };
}

/**
 * Generate evidence summary for a source.
 */
function generateEvidenceSummary(source: SourceRef, permission: PermissionDefinition): string {
  const parts: string[] = [];
  parts.push(`type=${source.type}`);
  parts.push(`ref=${source.ref.slice(0, 16)}...`);
  
  const issuer = getSourceIssuer(source);
  if (issuer) {
    parts.push(`issuer=${issuer.slice(0, 20)}...`);
  }
  
  const issuedAt = getSourceIssuedAt(source);
  if (issuedAt) {
    parts.push(`issued=${new Date(issuedAt * 1000).toISOString().slice(0, 10)}`);
  }
  
  return parts.join(', ');
}

/**
 * Evaluate if a permission can be satisfied by a deck instance.
 */
export function canSatisfyPermission(
  deckInstance: DeckInstance,
  permissionId: string,
  requestContext?: RequestContext
): PermissionEvalResult {
  const registry = getDeckRegistry();
  const deck = registry.get(deckInstance.deckId);
  
  if (!deck) {
    return { ok: false, reason: `Deck definition not found: ${deckInstance.deckId}` };
  }
  
  const permission = deck.permissions.find(p => p.id === permissionId);
  if (!permission) {
    return { ok: false, reason: `Permission not defined in deck: ${permissionId}` };
  }
  
  const source = deckInstance.sources[permissionId];
  if (!source) {
    return { ok: false, reason: `No source for permission: ${permissionId}` };
  }
  
  const nowSeconds = getNowSeconds(requestContext);
  
  // Check evidence type
  const requiredEvidence = permission.requiredEvidence || permission.evidenceType;
  const evidenceCheck = checkEvidenceType(source, requiredEvidence);
  if (!evidenceCheck.ok) {
    return { ok: false, reason: evidenceCheck.reason };
  }
  
  // Check freshness
  if (permission.freshnessSeconds !== undefined) {
    const freshnessCheck = checkFreshness(source, permission.freshnessSeconds, nowSeconds);
    if (!freshnessCheck.ok) {
      return { ok: false, reason: freshnessCheck.reason };
    }
  }
  
  // Check issuer policy
  if (permission.issuerPolicy) {
    const policyCheck = checkIssuerPolicy(source, permission.issuerPolicy);
    if (!policyCheck.ok) {
      return { ok: false, reason: policyCheck.reason };
    }
  }
  
  return {
    ok: true,
    evidenceSummary: generateEvidenceSummary(source, permission),
  };
}

/**
 * Evaluate a proof request against a deck instance.
 */
export function satisfyRequest(
  deckInstance: DeckInstance,
  requiredPermissions: string[],
  requestContext?: RequestContext
): RequestEvalResult {
  const result: RequestEvalResult = {
    satisfiedPermissions: [],
    unsatisfiedPermissions: [],
    mapping: {},
    summaries: {},
    errors: {},
  };
  
  for (const permissionId of requiredPermissions) {
    const evalResult = canSatisfyPermission(deckInstance, permissionId, requestContext);
    
    if (evalResult.ok) {
      result.satisfiedPermissions.push(permissionId);
      result.mapping[permissionId] = deckInstance.sources[permissionId]!;
      if (evalResult.evidenceSummary) {
        result.summaries[permissionId] = evalResult.evidenceSummary;
      }
    } else {
      result.unsatisfiedPermissions.push(permissionId);
      result.errors[permissionId] = evalResult.reason || 'Unknown error';
    }
  }
  
  return result;
}

/**
 * Check if a deck is in strict mode.
 */
export function isDeckStrict(deck: DeckDefinition): boolean {
  return deck.metadata?.strict === true;
}

/**
 * Validate that all permission IDs in a request are known in the deck.
 */
export function validateStrictPermissions(
  deck: DeckDefinition,
  requiredPermissions: string[]
): { valid: boolean; unknownPermissions: string[] } {
  const knownIds = new Set(deck.permissions.map(p => p.id));
  const unknownPermissions = requiredPermissions.filter(p => !knownIds.has(p));
  
  return {
    valid: unknownPermissions.length === 0,
    unknownPermissions,
  };
}
