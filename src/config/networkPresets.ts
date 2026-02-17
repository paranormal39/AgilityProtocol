/**
 * Midnight Network Presets
 * 
 * Aligned with Midnight Canary Compatibility Matrix
 */

import { PROTOCOL_VERSION } from '../constants/protocol.js';

export interface MidnightMatrixVersions {
  ledger: string;
  node: string;
  proofServer: string;
  onChainRuntime: string;
  indexer: string;
  dappConnectorApi: string;
  walletSdk: string;
  midnightJs: string;
  compactJs: string;
}

export interface MidnightNetworkPreset {
  networkName: string;
  rpcUrl: string;
  indexerUrl: string;
  proofServerUrl: string;
  matrixVersions: MidnightMatrixVersions;
  protocolVersion: string;
}

export type MidnightEnvironment = 'preprod' | 'preview' | 'local';

const CANARY_MATRIX_VERSIONS: MidnightMatrixVersions = {
  ledger: '7.0.0',
  node: '0.20.1',
  proofServer: '7.0.0',
  onChainRuntime: '2.0.0',
  indexer: '3.0.0',
  dappConnectorApi: '4.0.0',
  walletSdk: '1.0.0',
  midnightJs: '3.0.0',
  compactJs: '2.4.0',
};

const NETWORK_PRESETS: Record<MidnightEnvironment, MidnightNetworkPreset> = {
  preprod: {
    networkName: 'Midnight Preprod',
    rpcUrl: 'https://rpc.preprod.midnight.network',
    indexerUrl: 'https://indexer.preprod.midnight.network/api/v3/graphql',
    proofServerUrl: 'https://lace-proof-pub.preprod.midnight.network',
    matrixVersions: CANARY_MATRIX_VERSIONS,
    protocolVersion: PROTOCOL_VERSION,
  },
  preview: {
    networkName: 'Midnight Preview',
    rpcUrl: 'https://rpc.preview.midnight.network',
    indexerUrl: 'https://indexer.preview.midnight.network/api/v3/graphql',
    proofServerUrl: 'https://lace-proof-pub.preview.midnight.network',
    matrixVersions: CANARY_MATRIX_VERSIONS,
    protocolVersion: PROTOCOL_VERSION,
  },
  local: {
    networkName: 'Midnight Local',
    rpcUrl: 'http://localhost:8545',
    indexerUrl: 'http://localhost:4000/graphql',
    proofServerUrl: 'http://localhost:6300',
    matrixVersions: {
      ...CANARY_MATRIX_VERSIONS,
      node: 'local',
      indexer: 'local',
      proofServer: 'local',
    },
    protocolVersion: PROTOCOL_VERSION,
  },
};

export function getMidnightPreset(env?: MidnightEnvironment): MidnightNetworkPreset {
  const environment = env ?? (process.env.MIDNIGHT_ENV as MidnightEnvironment) ?? 'preprod';
  
  const preset = NETWORK_PRESETS[environment];
  if (!preset) {
    throw new Error(`Unknown Midnight environment: ${environment}. Valid: preprod, preview, local`);
  }
  
  return preset;
}

export function getCanaryMatrixVersions(): MidnightMatrixVersions {
  return { ...CANARY_MATRIX_VERSIONS };
}

export function getAllPresets(): Record<MidnightEnvironment, MidnightNetworkPreset> {
  return { ...NETWORK_PRESETS };
}

export function formatMatrixVersions(versions: MidnightMatrixVersions): string {
  return [
    `  Ledger: ${versions.ledger}`,
    `  Node: ${versions.node}`,
    `  ProofServer: ${versions.proofServer}`,
    `  OnChainRuntime: ${versions.onChainRuntime}`,
    `  Indexer: ${versions.indexer}`,
    `  DAppConnectorAPI: ${versions.dappConnectorApi}`,
    `  WalletSDK: ${versions.walletSdk}`,
    `  Midnight.js: ${versions.midnightJs}`,
    `  Compact.js: ${versions.compactJs}`,
  ].join('\n');
}

export { PROTOCOL_VERSION };
