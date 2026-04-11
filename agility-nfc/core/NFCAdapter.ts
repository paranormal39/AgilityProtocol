/**
 * Agility NFC - Abstract NFC Adapter
 * 
 * Base class for platform-specific NFC implementations.
 */

import type {
  INFCAdapter,
  NFCState,
  NFCReadOptions,
  NFCReadResult,
  NFCWriteResult,
  NFCPayload,
  NFCEncodeOptions,
  HCEConfig,
  HCEEvent,
} from './types.js';

/**
 * Abstract NFC Adapter
 * 
 * Base implementation with common logic.
 * Platform-specific adapters extend this class.
 */
export abstract class NFCAdapterBase implements INFCAdapter {
  protected state: NFCState = {
    supported: false,
    enabled: false,
    permissionGranted: false,
    mode: null,
    isReading: false,
    isHCEActive: false,
  };

  protected tagCallbacks: Set<(result: NFCReadResult) => void> = new Set();
  protected hceCallbacks: Set<(event: HCEEvent) => void> = new Set();

  abstract isSupported(): Promise<boolean>;
  abstract isEnabled(): Promise<boolean>;
  abstract requestPermission(): Promise<boolean>;
  abstract startReading(options?: NFCReadOptions): Promise<void>;
  abstract stopReading(): Promise<void>;
  abstract writeTag(payload: NFCPayload, options?: NFCEncodeOptions): Promise<NFCWriteResult>;
  abstract enableHCE(config: HCEConfig): Promise<boolean>;
  abstract disableHCE(): Promise<void>;

  /**
   * Register callback for tag discovery
   */
  onTagDiscovered(callback: (result: NFCReadResult) => void): void {
    this.tagCallbacks.add(callback);
  }

  /**
   * Remove tag discovery callback
   */
  offTagDiscovered(callback: (result: NFCReadResult) => void): void {
    this.tagCallbacks.delete(callback);
  }

  /**
   * Register HCE event callback
   */
  onHCEEvent(callback: (event: HCEEvent) => void): void {
    this.hceCallbacks.add(callback);
  }

  /**
   * Get current NFC state
   */
  async getState(): Promise<NFCState> {
    return { ...this.state };
  }

  /**
   * Emit tag discovered event to all callbacks
   */
  protected emitTagDiscovered(result: NFCReadResult): void {
    for (const callback of this.tagCallbacks) {
      try {
        callback(result);
      } catch (error) {
        console.error('Error in NFC tag callback:', error);
      }
    }
  }

  /**
   * Emit HCE event to all callbacks
   */
  protected emitHCEEvent(event: HCEEvent): void {
    for (const callback of this.hceCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in HCE callback:', error);
      }
    }
  }
}

/**
 * Stub NFC Adapter for unsupported platforms
 */
export class StubNFCAdapter extends NFCAdapterBase {
  async isSupported(): Promise<boolean> {
    return false;
  }

  async isEnabled(): Promise<boolean> {
    return false;
  }

  async requestPermission(): Promise<boolean> {
    return false;
  }

  async startReading(): Promise<void> {
    throw new Error('NFC not supported on this platform');
  }

  async stopReading(): Promise<void> {
    // No-op
  }

  async writeTag(): Promise<NFCWriteResult> {
    return {
      success: false,
      error: 'not_supported',
      errorMessage: 'NFC not supported on this platform',
    };
  }

  async enableHCE(): Promise<boolean> {
    return false;
  }

  async disableHCE(): Promise<void> {
    // No-op
  }
}
