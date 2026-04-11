/**
 * Agility NFC - Web NFC Adapter
 * 
 * NFC support for Chrome on Android using the Web NFC API.
 * https://developer.mozilla.org/en-US/docs/Web/API/Web_NFC_API
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
  HCEConfig,
  NFCError,
} from '../core/types.js';

// Web NFC API types (not in standard TypeScript lib)
declare global {
  interface Window {
    NDEFReader?: new () => NDEFReader;
  }

  interface NDEFReader {
    scan(options?: { signal?: AbortSignal }): Promise<void>;
    write(
      message: NDEFMessageInit,
      options?: { signal?: AbortSignal; overwrite?: boolean }
    ): Promise<void>;
    onreading: ((event: NDEFReadingEvent) => void) | null;
    onreadingerror: ((event: Event) => void) | null;
  }

  interface NDEFReadingEvent extends Event {
    serialNumber: string;
    message: NDEFMessage;
  }

  interface NDEFMessage {
    records: NDEFRecord[];
  }

  interface NDEFRecord {
    recordType: string;
    mediaType?: string;
    id?: string;
    data?: DataView;
    encoding?: string;
    lang?: string;
    toRecords?(): NDEFRecord[];
  }

  interface NDEFMessageInit {
    records: NDEFRecordInit[];
  }

  interface NDEFRecordInit {
    recordType: string;
    mediaType?: string;
    id?: string;
    data?: BufferSource | string;
    encoding?: string;
    lang?: string;
  }
}

/**
 * Web NFC Adapter
 * 
 * Uses the Web NFC API available in Chrome on Android.
 */
export class WebNFCAdapter extends NFCAdapterBase {
  private reader: NDEFReader | null = null;
  private abortController: AbortController | null = null;

  /**
   * Check if Web NFC is supported
   */
  async isSupported(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false;
    }
    return 'NDEFReader' in window;
  }

  /**
   * Check if NFC is enabled (Web NFC doesn't provide this)
   */
  async isEnabled(): Promise<boolean> {
    // Web NFC doesn't have a way to check if NFC is enabled
    // We assume it's enabled if supported
    return this.isSupported();
  }

  /**
   * Request NFC permission
   */
  async requestPermission(): Promise<boolean> {
    if (!(await this.isSupported())) {
      return false;
    }

    try {
      // Web NFC permission is requested on first scan
      // We do a quick scan to trigger the permission prompt
      const reader = new window.NDEFReader!();
      const controller = new AbortController();
      
      // Abort immediately after permission is granted
      setTimeout(() => controller.abort(), 100);
      
      await reader.scan({ signal: controller.signal }).catch(() => {});
      
      this.state.permissionGranted = true;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Start NFC reading session
   */
  async startReading(options?: NFCReadOptions): Promise<void> {
    if (!(await this.isSupported())) {
      throw new Error('Web NFC not supported');
    }

    if (this.state.isReading) {
      return;
    }

    this.reader = new window.NDEFReader!();
    this.abortController = new AbortController();

    // Set up timeout if specified
    if (options?.timeout) {
      setTimeout(() => {
        this.abortController?.abort();
      }, options.timeout);
    }

    // Handle tag reading
    this.reader.onreading = (event: NDEFReadingEvent) => {
      const result = this.processNDEFMessage(event);
      this.emitTagDiscovered(result);

      // Stop reading if not keeping alive
      if (!options?.keepAlive) {
        this.stopReading();
      }
    };

    // Handle reading errors
    this.reader.onreadingerror = () => {
      this.emitTagDiscovered({
        success: false,
        error: 'io_error',
        errorMessage: 'Error reading NFC tag',
      });
    };

    try {
      await this.reader.scan({ signal: this.abortController.signal });
      this.state.isReading = true;
      this.state.mode = 'reader';
    } catch (error) {
      this.state.isReading = false;
      throw this.handleWebNFCError(error);
    }
  }

  /**
   * Stop NFC reading session
   */
  async stopReading(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.reader = null;
    this.state.isReading = false;
    this.state.mode = null;
  }

  /**
   * Write payload to NFC tag
   */
  async writeTag(payload: NFCPayload, options?: NFCEncodeOptions): Promise<NFCWriteResult> {
    if (!(await this.isSupported())) {
      return {
        success: false,
        error: 'not_supported',
        errorMessage: 'Web NFC not supported',
      };
    }

    try {
      const reader = new window.NDEFReader!();
      const encoded = encodeNFCPayload(payload, options);

      // Create NDEF message with external type record
      const message: NDEFMessageInit = {
        records: [
          {
            recordType: 'mime',
            mediaType: 'application/vnd.agility.payload',
            data: encoded,
          },
        ],
      };

      await reader.write(message, { overwrite: true });

      return {
        success: true,
        bytesWritten: encoded.length,
      };
    } catch (error) {
      const nfcError = this.handleWebNFCError(error);
      return {
        success: false,
        error: nfcError.code as NFCError,
        errorMessage: nfcError.message,
      };
    }
  }

  /**
   * Enable HCE mode (not supported in Web NFC)
   */
  async enableHCE(_config: HCEConfig): Promise<boolean> {
    // Web NFC doesn't support HCE
    console.warn('HCE not supported in Web NFC');
    return false;
  }

  /**
   * Disable HCE mode
   */
  async disableHCE(): Promise<void> {
    // No-op for Web NFC
  }

  /**
   * Process NDEF message from tag
   */
  private processNDEFMessage(event: NDEFReadingEvent): NFCReadResult {
    const tagInfo: NFCTagInfo = {
      id: event.serialNumber,
      type: 'NDEF',
      capacity: 0, // Web NFC doesn't expose capacity
      isWritable: true,
      isReadOnly: false,
    };

    // Look for Agility payload in records
    for (const record of event.message.records) {
      if (
        record.mediaType === 'application/vnd.agility.payload' ||
        (record.recordType === 'text' && record.data)
      ) {
        try {
          let data: Uint8Array;

          if (record.data) {
            data = new Uint8Array(record.data.buffer);
          } else {
            continue;
          }

          // Check if it's an Agility payload
          const text = new TextDecoder().decode(data);
          if (text.startsWith(NFC_PAYLOAD_PREFIX)) {
            const payload = decodeNFCPayload(data);
            return {
              success: true,
              payload,
              tagInfo,
              rawData: data,
            };
          }
        } catch (error) {
          // Continue to next record
        }
      }
    }

    // No Agility payload found, return raw data
    return {
      success: true,
      tagInfo,
      error: 'format_error',
      errorMessage: 'No Agility payload found on tag',
    };
  }

  /**
   * Handle Web NFC errors
   */
  private handleWebNFCError(error: unknown): { code: string; message: string } {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
          return { code: 'permission_denied', message: 'NFC permission denied' };
        case 'NotSupportedError':
          return { code: 'not_supported', message: 'NFC not supported' };
        case 'NotReadableError':
          return { code: 'io_error', message: 'Cannot read NFC tag' };
        case 'NetworkError':
          return { code: 'io_error', message: 'NFC communication error' };
        case 'AbortError':
          return { code: 'cancelled', message: 'NFC operation cancelled' };
        case 'InvalidStateError':
          return { code: 'io_error', message: 'Invalid NFC state' };
        default:
          return { code: 'unknown', message: error.message };
      }
    }

    return {
      code: 'unknown',
      message: error instanceof Error ? error.message : 'Unknown NFC error',
    };
  }
}

/**
 * Create a Web NFC adapter
 */
export function createWebNFCAdapter(): WebNFCAdapter {
  return new WebNFCAdapter();
}
