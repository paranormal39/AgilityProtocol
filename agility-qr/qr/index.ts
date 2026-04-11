/**
 * QR Proof Request/Response System
 * 
 * Core functions for creating and processing QR-based proof requests
 * and responses for the Agility Protocol.
 */

import { v4 as uuidv4 } from 'uuid';
import { sha256Hex } from '../../src/utils/canonical.js';
import { encodeToQR, decodeFromQR, QRPayload } from '../shared/qr.js';

export interface QRProofRequestOptions {
  audience: string;
  requiredPermissions: string[];
  expiresAt?: Date;
  protocolVersion?: string;
  metadata?: Record<string, any>;
}

export interface QRProofRequest {
  requestId: string;
  audience: string;
  requiredPermissions: string[];
  nonce: string;
  issuedAt: number;
  expiresAt: number;
  protocolVersion: string;
  metadata?: Record<string, any>;
}

export interface QRProofResponseOptions {
  request: QRProofRequest;
  grant: any; // ConsentGrant type from main protocol
  proof: any; // ProofResponse type from main protocol
}

export interface QRProofResponse {
  requestId: string;
  audience: string;
  nonce: string;
  satisfiedPermissions: string[];
  requestHash: string;
  issuedAt: number;
  expiresAt: number;
  grant: any;
  proof: any;
  signature?: string;
}

/**
 * Create a QR-safe proof request
 */
export function createQRProofRequest(options: QRProofRequestOptions): string {
  const now = Date.now();
  const expiresAt = options.expiresAt?.getTime() || now + (5 * 60 * 1000); // 5 minutes default
  
  const request: QRProofRequest = {
    requestId: uuidv4(),
    audience: options.audience,
    requiredPermissions: options.requiredPermissions,
    nonce: uuidv4(),
    issuedAt: now,
    expiresAt,
    protocolVersion: options.protocolVersion || '1.0.0',
    metadata: options.metadata
  };

  const payload: QRPayload = {
    type: 'request',
    data: request,
    timestamp: now,
    version: '1.0.0'
  };

  return encodeToQR(payload, { compress: true });
}

/**
 * Create a QR-safe proof response
 */
export function createQRProofResponse(options: QRProofResponseOptions): string {
  const now = Date.now();
  const expiresAt = now + (5 * 60 * 1000); // 5 minutes default
  
  // Calculate request hash for binding
  const requestHash = sha256Hex(JSON.stringify(options.request));
  
  const response: QRProofResponse = {
    requestId: options.request.requestId,
    audience: options.request.audience,
    nonce: options.request.nonce,
    satisfiedPermissions: options.request.requiredPermissions, // Simplified - would check actual satisfaction
    requestHash,
    issuedAt: now,
    expiresAt,
    grant: options.grant,
    proof: options.proof
  };

  const payload: QRPayload = {
    type: 'response',
    data: response,
    timestamp: now,
    version: '1.0.0'
  };

  return encodeToQR(payload, { compress: true });
}

/**
 * Decode and validate QR proof request
 */
export function decodeQRProofRequest(qrString: string): QRProofRequest {
  const payload = decodeFromQR(qrString);
  
  if (payload.type !== 'request') {
    throw new Error('Invalid QR type: expected request');
  }
  
  const request = payload.data as QRProofRequest;
  
  // Validate required fields
  if (!request.requestId || !request.audience || !request.requiredPermissions || !request.nonce) {
    throw new Error('Invalid proof request: missing required fields');
  }
  
  // Check expiry
  if (Date.now() > request.expiresAt) {
    throw new Error('Proof request has expired');
  }
  
  return request;
}

/**
 * Decode and validate QR proof response
 */
export function decodeQRProofResponse(qrString: string): QRProofResponse {
  const payload = decodeFromQR(qrString);
  
  if (payload.type !== 'response') {
    throw new Error('Invalid QR type: expected response');
  }
  
  const response = payload.data as QRProofResponse;
  
  // Validate required fields
  if (!response.requestId || !response.audience || !response.nonce || !response.requestHash) {
    throw new Error('Invalid proof response: missing required fields');
  }
  
  // Check expiry
  if (Date.now() > response.expiresAt) {
    throw new Error('Proof response has expired');
  }
  
  return response;
}

/**
 * Verify QR proof response against original request
 */
export function verifyQRProofResponse(
  originalRequest: QRProofRequest,
  responseQR: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    const response = decodeQRProofResponse(responseQR);
    
    // Check request ID match
    if (response.requestId !== originalRequest.requestId) {
      errors.push('Request ID does not match');
    }
    
    // Check audience match
    if (response.audience !== originalRequest.audience) {
      errors.push('Audience does not match');
    }
    
    // Check nonce match
    if (response.nonce !== originalRequest.nonce) {
      errors.push('Nonce does not match');
    }
    
    // Verify request hash binding
    const expectedHash = sha256Hex(JSON.stringify(originalRequest));
    if (response.requestHash !== expectedHash) {
      errors.push('Request hash does not match');
    }
    
    // Check permissions (simplified)
    const missingPerms = originalRequest.requiredPermissions.filter(
      perm => !response.satisfiedPermissions.includes(perm)
    );
    if (missingPerms.length > 0) {
      errors.push(`Missing permissions: ${missingPerms.join(', ')}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
    
  } catch (error) {
    errors.push(`Response verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { valid: false, errors };
  }
}

/**
 * Generate mock consent grant for demo purposes
 */
export function generateMockConsentGrant(request: QRProofRequest): any {
  return {
    id: uuidv4(),
    requestId: request.requestId,
    audience: request.audience,
    permissions: request.requiredPermissions,
    issuedAt: Date.now(),
    expiresAt: request.expiresAt,
    status: 'active'
  };
}

/**
 * Generate mock proof response for demo purposes
 */
export function generateMockProof(request: QRProofRequest, deck: Record<string, boolean>): any {
  const satisfiedPermissions = request.requiredPermissions.filter(perm => deck[perm] === true);
  
  return {
    proofId: uuidv4(),
    requestId: request.requestId,
    satisfiedPermissions,
    evidence: satisfiedPermissions.map(perm => ({
      permission: perm,
      type: 'mock',
      valid: true,
      source: 'demo-deck'
    })),
    issuedAt: Date.now(),
    expiresAt: request.expiresAt
  };
}

/**
 * Check if request can be satisfied by deck
 */
export function canSatisfyRequest(request: QRProofRequest, deck: Record<string, boolean>): boolean {
  return request.requiredPermissions.every(perm => deck[perm] === true);
}

/**
 * Extract request metadata for UI display
 */
export function extractRequestMetadata(request: QRProofRequest): {
  title: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  permissions: Array<{ name: string; description: string }>;
} {
  const permissionDescriptions: Record<string, string> = {
    'age_over_18': 'Confirm you are 18 years or older',
    'age_over_21': 'Confirm you are 21 years or older',
    'order_paid': 'Confirm your order is paid',
    'shipping_address': 'Share your delivery address',
    'kyc_verified': 'Confirm your identity is verified',
    'region_us': 'Confirm you are located in the US'
  };
  
  const permissions = request.requiredPermissions.map(perm => ({
    name: perm,
    description: permissionDescriptions[perm] || `Access to ${perm}`
  }));
  
  // Determine risk level based on permissions
  const highRiskPerms = ['shipping_address', 'kyc_verified'];
  const mediumRiskPerms = ['age_over_18', 'age_over_21'];
  
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (request.requiredPermissions.some(perm => highRiskPerms.includes(perm))) {
    riskLevel = 'high';
  } else if (request.requiredPermissions.some(perm => mediumRiskPerms.includes(perm))) {
    riskLevel = 'medium';
  }
  
  return {
    title: `Identity Verification Request`,
    description: `${request.audience} is requesting access to ${request.requiredPermissions.length} permission(s)`,
    riskLevel,
    permissions
  };
}
