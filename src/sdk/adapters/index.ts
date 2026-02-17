/**
 * Agility SDK - Adapters Module
 * 
 * Provides factory functions for creating Midnight and Lace adapters.
 */

import { LocalEncryptedMidnightAdapter } from '../../adapters/midnight/LocalEncryptedMidnightAdapter.js';
import { StubLaceAdapter } from '../../adapters/lace/StubLaceAdapter.js';
import { LaceAdapter } from '../../adapters/lace/LaceAdapter.js';
import type { IMidnightStorageAdapter, MidnightStorageConfig } from '../../adapters/midnight/IMidnightAdapter.js';
import type { ILaceAdapter, LaceConfig } from '../../adapters/lace/ILaceAdapter.js';
import type { JsonPersistence } from '../../persistence/JsonPersistence.js';
import type { Logger } from '../../utils/Logger.js';
import { PROTOCOL_VERSION } from '../../constants/protocol.js';

export interface CreateMidnightAdapterOptions {
  persistence: JsonPersistence;
  logger?: Logger;
  config?: MidnightStorageConfig;
}

export interface CreateLaceAdapterOptions {
  logger?: Logger;
  config?: LaceConfig;
}

export async function createMidnightAdapter(
  options: CreateMidnightAdapterOptions
): Promise<IMidnightStorageAdapter> {
  const config = options.config ?? { mode: 'local', network: 'testnet' };
  
  const adapter = new LocalEncryptedMidnightAdapter(options.persistence, options.logger);
  await adapter.init(config);
  
  return adapter;
}

export async function createLaceAdapter(
  options: CreateLaceAdapterOptions
): Promise<ILaceAdapter> {
  const config = options.config ?? { mode: 'stub', network: 'preprod' };
  
  let adapter: ILaceAdapter;
  
  if (config.mode === 'browser') {
    adapter = new LaceAdapter(options.logger);
  } else {
    adapter = new StubLaceAdapter(options.logger);
  }
  
  await adapter.init(config);
  
  return adapter;
}

export function getProtocolVersion(): string {
  return PROTOCOL_VERSION;
}

export type {
  IMidnightStorageAdapter,
  ILaceAdapter,
  MidnightStorageConfig,
  LaceConfig,
};

export { PROTOCOL_VERSION };
