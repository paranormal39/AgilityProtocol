/**
 * Agility NFC - React Native Adapter
 * 
 * NFC support for React Native using react-native-nfc-manager.
 * This adapter requires the react-native-nfc-manager package to be installed.
 * 
 * @see https://github.com/revtel/react-native-nfc-manager
 */

import { NFCAdapterBase } from '../core/NFCAdapter.js';
import {
  encodeNFCPayload,
  decodeNFCPayload,
  NFC_PAYLOAD_PREFIX,
} from '../core/NFCPayloadEncoder.js';
import type {
  NFCReadOptions,
  NFCReadResult,
  NFCWriteResult,
  NFCPayload,
  NFCEncodeOptions,
  NFCTagInfo,
  NFCTagType,
  HCEConfig,
  HCEEvent,
  NFCError,
} from '../core/types.js';

// Type definitions for react-native-nfc-manager
// These match the actual library API
interface NfcManagerModule {
  start(): Promise<void>;
  isSupported(): Promise<boolean>;
  isEnabled(): Promise<boolean>;
  requestTechnology(tech: NfcTech | NfcTech[], options?: object): Promise<NfcTech>;
  cancelTechnologyRequest(): Promise<void>;
  getTag(): Promise<TagEvent | null>;
  getNdefMessage(): Promise<NdefMessage | null>;
  writeNdefMessage(bytes: number[]): Promise<void>;
  setEventListener(event: string, callback: (tag: TagEvent) => void): void;
  registerTagEvent(options?: object): Promise<void>;
  unregisterTagEvent(): Promise<void>;
  setAlertMessageIOS(message: string): void;
}

type NfcTech = 'Ndef' | 'NfcA' | 'NfcB' | 'NfcF' | 'NfcV' | 'IsoDep' | 'MifareClassic' | 'MifareUltralight';

interface TagEvent {
  id?: string;
  techTypes?: string[];
  maxSize?: number;
  isWritable?: boolean;
  ndefMessage?: NdefRecord[];
}

interface NdefMessage {
  ndefMessage: NdefRecord[];
}

interface NdefRecord {
  tnf: number;
  type: number[];
  id?: number[];
  payload: number[];
}

// Placeholder for the actual NfcManager import
// In a real React Native app, this would be:
// import NfcManager from 'react-native-nfc-manager';
let NfcManager: NfcManagerModule | null = null;

/**
 * React Native NFC Adapter
 * 
 * Uses react-native-nfc-manager for NFC operations.
 */
export class ReactNativeNFCAdapter extends NFCAdapterBase {
  private initialized = false;

  constructor() {
    super();
    this.loadNfcManager();
  }

  /**
   * Dynamically load NfcManager
   */
  private async loadNfcManager(): Promise<void> {
    try {
      // Dynamic import for React Native environment
      const module = await import('react-native-nfc-manager').catch(() => null);
      if (module?.default) {
        NfcManager = module.default;
      }
    } catch {
      // NfcManager not available
    }
  }

  /**
   * Initialize NFC manager
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized || !NfcManager) {
      return;
    }

    await NfcManager.start();
    this.initialized = true;
  }

  /**
   * Check if NFC is supported
   */
  async isSupported(): Promise<boolean> {
    if (!NfcManager) {
      return false;
    }

    try {
      await this.ensureInitialized();
      return await NfcManager.isSupported();
    } catch {
      return false;
    }
  }

  /**
   * Check if NFC is enabled
   */
  async isEnabled(): Promise<boolean> {
    if (!NfcManager) {
      return false;
    }

    try {
      await this.ensureInitialized();
      return await NfcManager.isEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Request NFC permission
   */
  async requestPermission(): Promise<boolean> {
    // React Native handles permissions through the manifest/Info.plist
    // This is a no-op but returns true if NFC is supported
    return this.isSupported();
  }

  /**
   * Start NFC reading session
   */
  async startReading(options?: NFCReadOptions): Promise<void> {
    if (!NfcManager) {
      throw new Error('NfcManager not available');
    }

    await this.ensureInitialized();

    if (this.state.isReading) {
      return;
    }

    // Set iOS alert message if provided
    if (options?.alertMessage) {
      NfcManager.setAlertMessageIOS(options.alertMessage);
    }

    // Register for tag events
    NfcManager.setEventListener('NfcManagerDiscoverTag', (tag: TagEvent) => {
      const result = this.processTag(tag);
      this.emitTagDiscovered(result);

      if (!options?.keepAlive) {
        this.stopReading();
      }
    });

    try {
      await NfcManager.registerTagEvent();
      this.state.isReading = true;
      this.state.mode = 'reader';

      // Set timeout if specified
      if (options?.timeout) {
        setTimeout(() => {
          if (this.state.isReading) {
            this.stopReading();
            this.emitTagDiscovered({
              success: false,
              error: 'timeout',
              errorMessage: 'NFC read timeout',
            });
          }
        }, options.timeout);
      }
    } catch (error) {
      this.state.isReading = false;
      throw error;
    }
  }

  /**
   * Stop NFC reading session
   */
  async stopReading(): Promise<void> {
    if (!NfcManager) {
      return;
    }

    try {
      await NfcManager.unregisterTagEvent();
      await NfcManager.cancelTechnologyRequest();
    } catch {
      // Ignore errors when stopping
    }

    this.state.isReading = false;
    this.state.mode = null;
  }

  /**
   * Write payload to NFC tag
   */
  async writeTag(payload: NFCPayload, options?: NFCEncodeOptions): Promise<NFCWriteResult> {
    if (!NfcManager) {
      return {
        success: false,
        error: 'not_supported',
        errorMessage: 'NfcManager not available',
      };
    }

    await this.ensureInitialized();

    try {
      // Request NDEF technology
      await NfcManager.requestTechnology('Ndef');

      // Encode payload
      const encoded = encodeNFCPayload(payload, options);
      const bytes = Array.from(encoded);

      // Create NDEF message
      // TNF_MIME_MEDIA = 0x02
      const ndefRecord = this.createNdefRecord(
        0x02,
        'application/vnd.agility.payload',
        bytes
      );

      // Write to tag
      await NfcManager.writeNdefMessage(ndefRecord);

      // Get tag info
      const tag = await NfcManager.getTag();
      const tagInfo = tag ? this.tagEventToTagInfo(tag) : undefined;

      await NfcManager.cancelTechnologyRequest();

      return {
        success: true,
        bytesWritten: encoded.length,
        tagInfo,
      };
    } catch (error) {
      await NfcManager.cancelTechnologyRequest().catch(() => {});

      return {
        success: false,
        error: this.mapError(error),
        errorMessage: error instanceof Error ? error.message : 'Write failed',
      };
    }
  }

  /**
   * Enable HCE mode
   */
  async enableHCE(config: HCEConfig): Promise<boolean> {
    // HCE requires additional native setup
    // This is a placeholder - full HCE implementation requires
    // native Android code and react-native-hce package
    console.warn('HCE requires additional native setup');
    
    this.state.isHCEActive = true;
    this.emitHCEEvent({
      type: 'activated',
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Disable HCE mode
   */
  async disableHCE(): Promise<void> {
    this.state.isHCEActive = false;
    this.emitHCEEvent({
      type: 'deactivated',
      timestamp: Date.now(),
    });
  }

  /**
   * Process tag event
   */
  private processTag(tag: TagEvent): NFCReadResult {
    const tagInfo = this.tagEventToTagInfo(tag);

    // Check for NDEF message
    if (tag.ndefMessage && tag.ndefMessage.length > 0) {
      for (const record of tag.ndefMessage) {
        try {
          const payload = new Uint8Array(record.payload);
          const text = new TextDecoder().decode(payload);

          if (text.startsWith(NFC_PAYLOAD_PREFIX)) {
            const decoded = decodeNFCPayload(payload);
            return {
              success: true,
              payload: decoded,
              tagInfo,
              rawData: payload,
            };
          }
        } catch {
          // Continue to next record
        }
      }
    }

    return {
      success: true,
      tagInfo,
      error: 'format_error',
      errorMessage: 'No Agility payload found on tag',
    };
  }

  /**
   * Convert TagEvent to NFCTagInfo
   */
  private tagEventToTagInfo(tag: TagEvent): NFCTagInfo {
    let type: NFCTagType = 'NDEF';

    if (tag.techTypes) {
      if (tag.techTypes.includes('android.nfc.tech.IsoDep')) {
        type = 'ISO-DEP';
      } else if (tag.techTypes.includes('android.nfc.tech.NfcA')) {
        type = 'NFC-A';
      } else if (tag.techTypes.includes('android.nfc.tech.NfcB')) {
        type = 'NFC-B';
      } else if (tag.techTypes.includes('android.nfc.tech.NfcF')) {
        type = 'NFC-F';
      } else if (tag.techTypes.includes('android.nfc.tech.NfcV')) {
        type = 'NFC-V';
      } else if (tag.techTypes.includes('android.nfc.tech.MifareClassic')) {
        type = 'MIFARE';
      }
    }

    return {
      id: tag.id || '',
      type,
      capacity: tag.maxSize || 0,
      isWritable: tag.isWritable ?? true,
      isReadOnly: !(tag.isWritable ?? true),
      technologies: tag.techTypes,
    };
  }

  /**
   * Create NDEF record bytes
   */
  private createNdefRecord(tnf: number, type: string, payload: number[]): number[] {
    const typeBytes = Array.from(new TextEncoder().encode(type));
    
    // NDEF record header
    const header = 0xD1; // MB=1, ME=1, CF=0, SR=1, IL=0, TNF=tnf
    
    return [
      header | tnf,
      typeBytes.length,
      payload.length,
      ...typeBytes,
      ...payload,
    ];
  }

  /**
   * Map error to NFCError
   */
  private mapError(error: unknown): NFCError {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('cancel')) {
        return 'cancelled';
      }
      if (message.includes('timeout')) {
        return 'timeout';
      }
      if (message.includes('permission')) {
        return 'permission_denied';
      }
      if (message.includes('not supported')) {
        return 'not_supported';
      }
      if (message.includes('tag lost')) {
        return 'tag_lost';
      }
    }
    
    return 'unknown';
  }
}

/**
 * Create a React Native NFC adapter
 */
export function createReactNativeNFCAdapter(): ReactNativeNFCAdapter {
  return new ReactNativeNFCAdapter();
}
