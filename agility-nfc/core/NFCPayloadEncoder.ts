/**
 * Agility NFC - Payload Encoder
 * 
 * Encodes and decodes NFC payloads for Agility Protocol.
 * Shares encoding logic with QR module for consistency.
 */

import {
  DEFAULT_NFC_ENCODE_OPTIONS,
  type NFCPayload,
  type NFCPayloadType,
  type NFCEncodeOptions,
  type NFCProofRequestPayload,
  type NFCPaymentRequestPayload,
  type NFCResponsePayload,
} from './types.js';

/**
 * Agility NFC payload prefix
 */
export const NFC_PAYLOAD_PREFIX = 'ANFC1:';

/**
 * Maximum NDEF payload size (bytes)
 */
export const MAX_NDEF_SIZE = 32768;

/**
 * Encode payload to NFC-safe format
 */
export function encodeNFCPayload<T>(
  payload: NFCPayload<T>,
  options: NFCEncodeOptions = {}
): Uint8Array {
  const opts = { ...DEFAULT_NFC_ENCODE_OPTIONS, ...options };

  // Serialize payload to JSON
  let jsonString = JSON.stringify(payload);

  // Compress if enabled
  if (opts.compress) {
    jsonString = compressPayload(jsonString);
  }

  // Encrypt if enabled
  if (opts.encrypt && opts.encryptionKey) {
    jsonString = encryptPayload(jsonString, opts.encryptionKey);
  }

  // Add prefix and convert to bytes
  const prefixedString = NFC_PAYLOAD_PREFIX + jsonString;
  const bytes = new TextEncoder().encode(prefixedString);

  // Check size limit
  const maxSize = opts.maxSize || MAX_NDEF_SIZE;
  if (bytes.length > maxSize) {
    throw new Error(`Payload too large: ${bytes.length} bytes exceeds ${maxSize} byte limit`);
  }

  return bytes;
}

/**
 * Decode NFC payload from bytes
 */
export function decodeNFCPayload<T>(data: Uint8Array): NFCPayload<T> {
  const text = new TextDecoder().decode(data);

  // Check prefix
  if (!text.startsWith(NFC_PAYLOAD_PREFIX)) {
    throw new Error('Invalid NFC payload: missing Agility prefix');
  }

  // Remove prefix
  let jsonString = text.substring(NFC_PAYLOAD_PREFIX.length);

  // Detect and decrypt if encrypted
  if (jsonString.startsWith('ENC:')) {
    throw new Error('Encrypted payload requires decryption key');
  }

  // Detect and decompress if compressed
  if (jsonString.startsWith('CMP:')) {
    jsonString = decompressPayload(jsonString);
  }

  // Parse JSON
  try {
    return JSON.parse(jsonString) as NFCPayload<T>;
  } catch {
    throw new Error('Invalid NFC payload: malformed JSON');
  }
}

/**
 * Decode NFC payload with decryption
 */
export function decodeNFCPayloadEncrypted<T>(
  data: Uint8Array,
  decryptionKey: string
): NFCPayload<T> {
  const text = new TextDecoder().decode(data);

  if (!text.startsWith(NFC_PAYLOAD_PREFIX)) {
    throw new Error('Invalid NFC payload: missing Agility prefix');
  }

  let jsonString = text.substring(NFC_PAYLOAD_PREFIX.length);

  // Decrypt if encrypted
  if (jsonString.startsWith('ENC:')) {
    jsonString = decryptPayload(jsonString, decryptionKey);
  }

  // Decompress if compressed
  if (jsonString.startsWith('CMP:')) {
    jsonString = decompressPayload(jsonString);
  }

  return JSON.parse(jsonString) as NFCPayload<T>;
}

/**
 * Simple compression (placeholder - use pako/lz-string in production)
 */
function compressPayload(data: string): string {
  // For now, just base64 encode
  // In production, use actual compression
  const base64 = btoa(unescape(encodeURIComponent(data)));
  return 'CMP:' + base64;
}

/**
 * Decompress payload
 */
function decompressPayload(data: string): string {
  if (!data.startsWith('CMP:')) {
    return data;
  }
  const base64 = data.substring(4);
  return decodeURIComponent(escape(atob(base64)));
}

/**
 * Simple encryption (placeholder - use proper crypto in production)
 */
function encryptPayload(data: string, key: string): string {
  // XOR encryption placeholder - use AES-GCM in production
  const keyBytes = new TextEncoder().encode(key);
  const dataBytes = new TextEncoder().encode(data);
  const encrypted = new Uint8Array(dataBytes.length);
  
  for (let i = 0; i < dataBytes.length; i++) {
    encrypted[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  
  const base64 = btoa(String.fromCharCode(...encrypted));
  return 'ENC:' + base64;
}

/**
 * Decrypt payload
 */
function decryptPayload(data: string, key: string): string {
  if (!data.startsWith('ENC:')) {
    return data;
  }
  
  const base64 = data.substring(4);
  const encrypted = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const keyBytes = new TextEncoder().encode(key);
  const decrypted = new Uint8Array(encrypted.length);
  
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
  }
  
  return new TextDecoder().decode(decrypted);
}

// ============================================
// PAYLOAD BUILDERS
// ============================================

/**
 * Create a proof request NFC payload
 */
export function createProofRequestPayload(
  request: NFCProofRequestPayload
): NFCPayload<NFCProofRequestPayload> {
  return {
    type: 'proof_request',
    version: '1.0.0',
    data: request,
    timestamp: Date.now(),
  };
}

/**
 * Create a payment request NFC payload
 */
export function createPaymentRequestPayload(
  request: NFCPaymentRequestPayload
): NFCPayload<NFCPaymentRequestPayload> {
  return {
    type: 'payment_request',
    version: '1.0.0',
    data: request,
    timestamp: Date.now(),
  };
}

/**
 * Create a response NFC payload
 */
export function createResponsePayload(
  response: NFCResponsePayload,
  type: 'proof_response' | 'payment_response' = 'proof_response'
): NFCPayload<NFCResponsePayload> {
  return {
    type,
    version: '1.0.0',
    data: response,
    timestamp: Date.now(),
  };
}

// ============================================
// NDEF HELPERS
// ============================================

/**
 * Create NDEF text record bytes
 */
export function createNDEFTextRecord(text: string, languageCode = 'en'): Uint8Array {
  const langBytes = new TextEncoder().encode(languageCode);
  const textBytes = new TextEncoder().encode(text);
  
  // NDEF text record format:
  // [status byte] [language code] [text]
  const statusByte = langBytes.length; // UTF-8, language code length
  
  const record = new Uint8Array(1 + langBytes.length + textBytes.length);
  record[0] = statusByte;
  record.set(langBytes, 1);
  record.set(textBytes, 1 + langBytes.length);
  
  return record;
}

/**
 * Create NDEF URI record bytes
 */
export function createNDEFURIRecord(uri: string): Uint8Array {
  // URI identifier codes
  const uriPrefixes: Record<string, number> = {
    '': 0x00,
    'http://www.': 0x01,
    'https://www.': 0x02,
    'http://': 0x03,
    'https://': 0x04,
    'tel:': 0x05,
    'mailto:': 0x06,
  };

  let prefixCode = 0x00;
  let uriBody = uri;

  for (const [prefix, code] of Object.entries(uriPrefixes)) {
    if (prefix && uri.startsWith(prefix)) {
      prefixCode = code;
      uriBody = uri.substring(prefix.length);
      break;
    }
  }

  const bodyBytes = new TextEncoder().encode(uriBody);
  const record = new Uint8Array(1 + bodyBytes.length);
  record[0] = prefixCode;
  record.set(bodyBytes, 1);

  return record;
}

/**
 * Create NDEF external type record for Agility
 */
export function createNDEFAgilityRecord(payload: Uint8Array): {
  tnf: number;
  type: string;
  payload: Uint8Array;
} {
  return {
    tnf: 0x04, // External type
    type: 'agility.protocol:payload',
    payload,
  };
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate NFC payload structure
 */
export function validateNFCPayload(payload: unknown): payload is NFCPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const p = payload as Record<string, unknown>;

  return (
    typeof p.type === 'string' &&
    typeof p.version === 'string' &&
    typeof p.timestamp === 'number' &&
    p.data !== undefined
  );
}

/**
 * Check if payload type is valid
 */
export function isValidPayloadType(type: string): type is NFCPayloadType {
  const validTypes: NFCPayloadType[] = [
    'proof_request',
    'proof_response',
    'payment_request',
    'payment_response',
    'kyc_bundle',
    'consent_grant',
    'credential',
  ];
  return validTypes.includes(type as NFCPayloadType);
}

/**
 * Get payload size in bytes
 */
export function getPayloadSize(payload: NFCPayload, options?: NFCEncodeOptions): number {
  const encoded = encodeNFCPayload(payload, options);
  return encoded.length;
}

/**
 * Check if payload fits in NFC tag
 */
export function fitsInNFCTag(payload: NFCPayload, tagCapacity: number, options?: NFCEncodeOptions): boolean {
  return getPayloadSize(payload, options) <= tagCapacity;
}
