/**
 * Midnight Network Health Checks
 * 
 * Provides health check functionality for Midnight RPC, Indexer, and Proof Server
 */

import { getMidnightPreset, getCanaryMatrixVersions, formatMatrixVersions, type MidnightEnvironment, type MidnightNetworkPreset } from '../../config/networkPresets.js';
import { PROTOCOL_VERSION } from '../../constants/protocol.js';
import type { Logger } from '../../utils/Logger.js';

export interface HealthCheckResult {
  service: string;
  status: 'ok' | 'error' | 'timeout';
  latencyMs?: number;
  error?: string;
  version?: string;
}

export interface MidnightHealthStatus {
  network: string;
  protocolVersion: string;
  rpc: HealthCheckResult;
  indexer: HealthCheckResult;
  proofServer: HealthCheckResult;
  matrix: ReturnType<typeof getCanaryMatrixVersions>;
  allHealthy: boolean;
}

export class MidnightHealthCheck {
  private preset: MidnightNetworkPreset;
  private logger?: Logger;
  private timeoutMs: number;

  constructor(env?: MidnightEnvironment, logger?: Logger, timeoutMs: number = 5000) {
    this.preset = getMidnightPreset(env);
    this.logger = logger;
    this.timeoutMs = timeoutMs;
  }

  async pingRpc(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(this.preset.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'system_health',
          params: [],
          id: 1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - start;

      if (response.ok) {
        this.logger?.debug('RPC health check passed', { latencyMs });
        return { service: 'RPC', status: 'ok', latencyMs };
      } else {
        return { service: 'RPC', status: 'error', latencyMs, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      const latencyMs = Date.now() - start;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMsg.includes('abort')) {
        return { service: 'RPC', status: 'timeout', latencyMs, error: 'Request timed out' };
      }
      
      this.logger?.debug('RPC health check failed', { error: errorMsg });
      return { service: 'RPC', status: 'error', latencyMs, error: errorMsg };
    }
  }

  async pingIndexer(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(this.preset.indexerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '{ __typename }',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - start;

      if (response.ok) {
        this.logger?.debug('Indexer health check passed', { latencyMs });
        return { service: 'Indexer', status: 'ok', latencyMs };
      } else {
        return { service: 'Indexer', status: 'error', latencyMs, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      const latencyMs = Date.now() - start;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMsg.includes('abort')) {
        return { service: 'Indexer', status: 'timeout', latencyMs, error: 'Request timed out' };
      }
      
      this.logger?.debug('Indexer health check failed', { error: errorMsg });
      return { service: 'Indexer', status: 'error', latencyMs, error: errorMsg };
    }
  }

  async pingProofServer(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(`${this.preset.proofServerUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - start;

      if (response.ok) {
        this.logger?.debug('ProofServer health check passed', { latencyMs });
        return { service: 'ProofServer', status: 'ok', latencyMs };
      } else {
        return { service: 'ProofServer', status: 'error', latencyMs, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      const latencyMs = Date.now() - start;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMsg.includes('abort')) {
        return { service: 'ProofServer', status: 'timeout', latencyMs, error: 'Request timed out' };
      }
      
      this.logger?.debug('ProofServer health check failed', { error: errorMsg });
      return { service: 'ProofServer', status: 'error', latencyMs, error: errorMsg };
    }
  }

  async checkAll(): Promise<MidnightHealthStatus> {
    const [rpc, indexer, proofServer] = await Promise.all([
      this.pingRpc(),
      this.pingIndexer(),
      this.pingProofServer(),
    ]);

    const allHealthy = rpc.status === 'ok' && indexer.status === 'ok' && proofServer.status === 'ok';

    return {
      network: this.preset.networkName,
      protocolVersion: PROTOCOL_VERSION,
      rpc,
      indexer,
      proofServer,
      matrix: getCanaryMatrixVersions(),
      allHealthy,
    };
  }

  formatHealthStatus(status: MidnightHealthStatus): string {
    const statusIcon = (s: HealthCheckResult) => {
      if (s.status === 'ok') return '✅ OK';
      if (s.status === 'timeout') return '⏱️ TIMEOUT';
      return `❌ ERROR: ${s.error}`;
    };

    const lines = [
      `Network: ${status.network}`,
      `Protocol: ${status.protocolVersion}`,
      '',
      `RPC: ${statusIcon(status.rpc)}${status.rpc.latencyMs ? ` (${status.rpc.latencyMs}ms)` : ''}`,
      `Indexer: ${statusIcon(status.indexer)}${status.indexer.latencyMs ? ` (${status.indexer.latencyMs}ms)` : ''}`,
      `ProofServer: ${statusIcon(status.proofServer)}${status.proofServer.latencyMs ? ` (${status.proofServer.latencyMs}ms)` : ''}`,
      '',
      'Matrix:',
      formatMatrixVersions(status.matrix),
    ];

    return lines.join('\n');
  }

  getPreset(): MidnightNetworkPreset {
    return this.preset;
  }
}

export function createMidnightHealthCheck(
  env?: MidnightEnvironment,
  logger?: Logger,
  timeoutMs?: number
): MidnightHealthCheck {
  return new MidnightHealthCheck(env, logger, timeoutMs);
}
