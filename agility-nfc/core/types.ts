/**
 * Agility NFC - Core Types
 * 
 * Type definitions for NFC-based proof and payment exchange.
 * Supports tap-to-verify and tap-to-pay alongside QR flows.
 */

// ============================================
// NFC PAYLOAD TYPES
// ============================================

/**
 * NFC payload types matching QR payload types
 */
export type NFCPayloadType = 
  | 'proof_request'      // Verification request
  | 'proof_response'     // Verification response
  | 'payment_request'    // Payment request
  | 'payment_response'   // Payment proof
  | 'kyc_bundle'         // KYC + Payment bundle
  | 'consent_grant'      // User consent
  | 'credential';        // Verifiable credential

/**
 * NFC tag types
 */
export type NFCTagType = 
  | 'NDEF'       // NFC Data Exchange Format (most common)
  | 'ISO-DEP'    // ISO 14443-4
  | 'NFC-A'      // ISO 14443-3A
  | 'NFC-B'      // ISO 14443-3B
  | 'NFC-F'      // JIS 6319-4 (FeliCa)
  | 'NFC-V'      // ISO 15693
  | 'MIFARE';    // MIFARE Classic

/**
 * NFC operation mode
 */
export type NFCMode = 
  | 'reader'     // Read NFC tags
  | 'writer'     // Write to NFC tags
  | 'p2p'        // Peer-to-peer (Android Beam style)
  | 'hce';       // Host Card Emulation (act as NFC tag)

// ============================================
// NFC PAYLOAD
// ============================================

/**
 * NFC payload structure (mirrors QR payload)
 */
export interface NFCPayload<T = unknown> {
  /** Payload type */
  type: NFCPayloadType;
  
  /** Protocol version */
  version: string;
  
  /** Payload data */
  data: T;
  
  /** Creation timestamp */
  timestamp: number;
  
  /** Optional cryptographic signature */
  signature?: string;
  
  /** Compression used */
  compressed?: boolean;
  
  /** Encryption used */
  encrypted?: boolean;
}

/**
 * NFC payload encoding options
 */
export interface NFCEncodeOptions {
  /** Compress payload */
  compress?: boolean;
  
  /** Encrypt payload */
  encrypt?: boolean;
  
  /** Encryption key (if encrypting) */
  encryptionKey?: string;
  
  /** Sign payload */
  sign?: boolean;
  
  /** Signing key (if signing) */
  signingKey?: string;
  
  /** Maximum payload size (bytes) */
  maxSize?: number;
}

/**
 * Default NFC encoding options
 */
export const DEFAULT_NFC_ENCODE_OPTIONS: NFCEncodeOptions = {
  compress: true,
  encrypt: false,
  sign: false,
  maxSize: 32768, // 32KB typical NDEF limit
};

// ============================================
// NFC TAG INFO
// ============================================

/**
 * NFC tag information
 */
export interface NFCTagInfo {
  /** Tag unique identifier */
  id: string;
  
  /** Tag type */
  type: NFCTagType;
  
  /** Tag capacity in bytes */
  capacity: number;
  
  /** Whether tag is writable */
  isWritable: boolean;
  
  /** Whether tag is read-only */
  isReadOnly: boolean;
  
  /** Current data size on tag */
  dataSize?: number;
  
  /** Tag technology details */
  technologies?: string[];
  
  /** Manufacturer info */
  manufacturer?: string;
}

// ============================================
// NFC OPERATIONS
// ============================================

/**
 * NFC read result
 */
export interface NFCReadResult {
  /** Whether read succeeded */
  success: boolean;
  
  /** Decoded payload */
  payload?: NFCPayload;
  
  /** Raw NDEF message */
  rawData?: Uint8Array;
  
  /** Tag information */
  tagInfo?: NFCTagInfo;
  
  /** Error message if failed */
  error?: NFCError;
  
  /** Error details */
  errorMessage?: string;
}

/**
 * NFC write result
 */
export interface NFCWriteResult {
  /** Whether write succeeded */
  success: boolean;
  
  /** Bytes written */
  bytesWritten?: number;
  
  /** Tag information */
  tagInfo?: NFCTagInfo;
  
  /** Error if failed */
  error?: NFCError;
  
  /** Error details */
  errorMessage?: string;
}

/**
 * NFC error types
 */
export type NFCError = 
  | 'not_supported'       // NFC not supported on device
  | 'not_enabled'         // NFC disabled in settings
  | 'permission_denied'   // Permission not granted
  | 'tag_not_found'       // No tag in range
  | 'tag_lost'            // Tag moved out of range
  | 'tag_read_only'       // Cannot write to read-only tag
  | 'tag_too_small'       // Payload too large for tag
  | 'format_error'        // Invalid NDEF format
  | 'io_error'            // I/O error during operation
  | 'timeout'             // Operation timed out
  | 'cancelled'           // Operation cancelled by user
  | 'unknown';            // Unknown error

// ============================================
// HCE (HOST CARD EMULATION)
// ============================================

/**
 * HCE configuration for tap-to-pay
 */
export interface HCEConfig {
  /** AID (Application Identifier) */
  aid: string;
  
  /** Payload to serve when tapped */
  payload: NFCPayload;
  
  /** Timeout for HCE session (ms) */
  timeout?: number;
  
  /** Require screen on */
  requireScreenOn?: boolean;
  
  /** Require device unlock */
  requireUnlock?: boolean;
}

/**
 * HCE event types
 */
export type HCEEventType = 
  | 'activated'     // HCE mode activated
  | 'deactivated'   // HCE mode deactivated
  | 'command'       // Received APDU command
  | 'connected'     // Reader connected
  | 'disconnected'; // Reader disconnected

/**
 * HCE event
 */
export interface HCEEvent {
  type: HCEEventType;
  timestamp: number;
  data?: Uint8Array;
}

// ============================================
// NFC ADAPTER INTERFACE
// ============================================

/**
 * NFC adapter interface
 * Implemented by platform-specific adapters
 */
export interface INFCAdapter {
  /** Check if NFC is supported on device */
  isSupported(): Promise<boolean>;
  
  /** Check if NFC is enabled */
  isEnabled(): Promise<boolean>;
  
  /** Request NFC permission */
  requestPermission(): Promise<boolean>;
  
  /** Start NFC reading session */
  startReading(options?: NFCReadOptions): Promise<void>;
  
  /** Stop NFC reading session */
  stopReading(): Promise<void>;
  
  /** Register callback for tag discovery */
  onTagDiscovered(callback: (result: NFCReadResult) => void): void;
  
  /** Remove tag discovery callback */
  offTagDiscovered(callback: (result: NFCReadResult) => void): void;
  
  /** Write payload to NFC tag */
  writeTag(payload: NFCPayload, options?: NFCEncodeOptions): Promise<NFCWriteResult>;
  
  /** Enable HCE mode (act as NFC tag) */
  enableHCE(config: HCEConfig): Promise<boolean>;
  
  /** Disable HCE mode */
  disableHCE(): Promise<void>;
  
  /** Register HCE event callback */
  onHCEEvent(callback: (event: HCEEvent) => void): void;
  
  /** Get current NFC state */
  getState(): Promise<NFCState>;
}

/**
 * NFC read options
 */
export interface NFCReadOptions {
  /** Alert message (iOS) */
  alertMessage?: string;
  
  /** Timeout in milliseconds */
  timeout?: number;
  
  /** Tag types to scan for */
  tagTypes?: NFCTagType[];
  
  /** Keep session alive after read */
  keepAlive?: boolean;
}

/**
 * NFC state
 */
export interface NFCState {
  /** Whether NFC is supported */
  supported: boolean;
  
  /** Whether NFC is enabled */
  enabled: boolean;
  
  /** Whether permission is granted */
  permissionGranted: boolean;
  
  /** Current mode */
  mode: NFCMode | null;
  
  /** Whether reading session is active */
  isReading: boolean;
  
  /** Whether HCE is active */
  isHCEActive: boolean;
}

// ============================================
// DUAL MODE (QR + NFC)
// ============================================

/**
 * Transport mode for proof/payment exchange
 */
export type TransportMode = 'qr' | 'nfc' | 'both';

/**
 * Dual mode transport options
 */
export interface DualModeOptions {
  /** Preferred transport mode */
  preferredMode: TransportMode;
  
  /** Fallback if preferred not available */
  fallbackMode?: TransportMode;
  
  /** QR code options */
  qrOptions?: {
    errorCorrection?: 'L' | 'M' | 'Q' | 'H';
    size?: number;
  };
  
  /** NFC options */
  nfcOptions?: NFCEncodeOptions;
}

/**
 * Dual mode payload result
 */
export interface DualModePayload<T = unknown> {
  /** QR code string */
  qrCode?: string;
  
  /** NFC payload */
  nfcPayload?: NFCPayload<T>;
  
  /** Available transport modes */
  availableModes: TransportMode[];
  
  /** Payload data */
  data: T;
}

// ============================================
// NDEF RECORD TYPES
// ============================================

/**
 * NDEF record type
 */
export type NDEFRecordType = 
  | 'text'
  | 'uri'
  | 'smart_poster'
  | 'mime'
  | 'external'
  | 'empty'
  | 'unknown';

/**
 * NDEF record
 */
export interface NDEFRecord {
  /** Record type */
  type: NDEFRecordType;
  
  /** Type name format */
  tnf: number;
  
  /** Record type string */
  recordType: string;
  
  /** Record ID */
  id?: string;
  
  /** Record payload */
  payload: Uint8Array;
  
  /** Decoded payload (if text/uri) */
  decoded?: string;
}

/**
 * NDEF message (collection of records)
 */
export interface NDEFMessage {
  records: NDEFRecord[];
}

// ============================================
// AGILITY-SPECIFIC PAYLOADS
// ============================================

/**
 * Agility NFC proof request payload
 */
export interface NFCProofRequestPayload {
  requestId: string;
  audience: string;
  requiredPermissions: string[];
  nonce: string;
  issuedAt: number;
  expiresAt: number;
  metadata?: Record<string, unknown>;
}

/**
 * Agility NFC payment request payload
 */
export interface NFCPaymentRequestPayload {
  paymentId: string;
  merchantId: string;
  merchantName: string;
  amount: string;
  currency: string;
  network: 'xrpl' | 'midnight' | 'cardano';
  destinationAddress: string;
  expiresAt: number;
  requiredKyc?: string[];
}

/**
 * Agility NFC response payload
 */
export interface NFCResponsePayload {
  requestId: string;
  success: boolean;
  proof?: unknown;
  txHash?: string;
  signature?: string;
  timestamp: number;
}
