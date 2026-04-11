/**
 * QR Code Encoding/Decoding Utilities
 * 
 * Provides compact, QR-safe payload encoding with optional compression
 * and encryption support for Agility Protocol QR flows.
 */

import { Buffer } from 'buffer';

export interface QRPayload {
  type: 'request' | 'response';
  data: any;
  timestamp: number;
  version: string;
}

export interface QROptions {
  compress?: boolean;
  encrypt?: boolean;
  publicKey?: string;
}

/**
 * Encode payload to QR-safe string
 */
export function encodeToQR(payload: QRPayload, options: QROptions = {}): string {
  try {
    let jsonString = JSON.stringify(payload);
    
    // Apply compression if enabled
    if (options.compress) {
      jsonString = compressPayload(jsonString);
    }
    
    // Apply encryption if enabled and public key provided
    if (options.encrypt && options.publicKey) {
      jsonString = encryptQRPayload(jsonString, options.publicKey);
    }
    
    // Convert to base64 for QR safety
    const base64 = Buffer.from(jsonString, 'utf8').toString('base64');
    
    // Add version prefix for identification
    return `AQR1:${base64}`;
  } catch (error) {
    throw new Error(`QR encoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decode QR-safe string to payload
 */
export function decodeFromQR(qrString: string, options: QROptions = {}): QRPayload {
  try {
    // Check and remove version prefix
    if (!qrString.startsWith('AQR1:')) {
      throw new Error('Invalid QR format - missing version prefix');
    }
    
    const base64 = qrString.substring(5);
    let jsonString = Buffer.from(base64, 'base64').toString('utf8');
    
    // Apply decryption if needed
    if (options.encrypt && options.publicKey) {
      // Note: In real implementation, you'd use private key here
      // For demo purposes, we'll skip actual decryption
      console.warn('Decryption not implemented in demo mode');
    }
    
    // Apply decompression if needed
    if (options.compress) {
      jsonString = decompressPayload(jsonString);
    }
    
    return JSON.parse(jsonString) as QRPayload;
  } catch (error) {
    throw new Error(`QR decoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Compress payload using simple gzip-like algorithm
 * For demo purposes - in production use proper compression
 */
export function compressPayload(payload: string): string {
  // Simple placeholder compression
  // In production, use zlib.gzip or similar
  return payload;
}

/**
 * Decompress payload
 */
export function decompressPayload(compressed: string): string {
  // Simple placeholder decompression
  // In production, use zlib.gunzip or similar
  return compressed;
}

/**
 * Encrypt QR payload (placeholder implementation)
 */
export function encryptQRPayload(payload: string, publicKey: string): string {
  // Placeholder encryption
  // In production, use proper encryption like RSA-OAEP or ECIES
  console.warn('Encryption not implemented - using placeholder');
  return payload;
}

/**
 * Decrypt QR payload (placeholder implementation)
 */
export function decryptQRPayload(encryptedPayload: string, privateKey: string): string {
  // Placeholder decryption
  // In production, use proper decryption
  console.warn('Decryption not implemented - using placeholder');
  return encryptedPayload;
}

/**
 * Validate QR payload structure
 */
export function validateQRPayload(payload: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!payload || typeof payload !== 'object') {
    errors.push('Payload must be an object');
    return { valid: false, errors };
  }
  
  if (!payload.type || !['request', 'response'].includes(payload.type)) {
    errors.push('Payload must have valid type: request or response');
  }
  
  if (!payload.data) {
    errors.push('Payload must have data field');
  }
  
  if (!payload.timestamp || typeof payload.timestamp !== 'number') {
    errors.push('Payload must have valid timestamp');
  }
  
  if (!payload.version || typeof payload.version !== 'string') {
    errors.push('Payload must have version string');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generate QR code data URL for display
 */
export function generateQRDataURL(qrString: string, size: number = 256): string {
  // This would typically use a QR code library like qrcode
  // For demo purposes, return a placeholder
  return `data:image/svg+xml;base64,${Buffer.from(`
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="monospace" font-size="8">
        QR: ${qrString.substring(0, 20)}...
      </text>
    </svg>
  `).toString('base64')}`;
}

/**
 * Check if QR string is expired
 */
export function isQRExpired(qrString: string, maxAgeMinutes: number = 5): boolean {
  try {
    const payload = decodeFromQR(qrString);
    const ageMinutes = (Date.now() - payload.timestamp) / (1000 * 60);
    return ageMinutes > maxAgeMinutes;
  } catch {
    return true; // Treat invalid QR as expired
  }
}

/**
 * Extract QR metadata without full decoding
 */
export function extractQRMetadata(qrString: string): { type: string; version: string; timestamp: number } | null {
  try {
    const payload = decodeFromQR(qrString);
    return {
      type: payload.type,
      version: payload.version,
      timestamp: payload.timestamp
    };
  } catch {
    return null;
  }
}
