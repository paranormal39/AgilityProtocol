import * as dotenv from 'dotenv';
import * as path from 'node:path';
import * as fs from 'node:fs';

export type AgilityMode = 'mock' | 'real';
export type XRPLNetwork = 'mainnet' | 'testnet' | 'devnet';

export interface EnvConfig {
  mode: AgilityMode;
  xrpl: {
    network: XRPLNetwork;
    endpoint?: string;
    seed?: string;
  };
  midnight: {
    network: string;
    endpoint?: string;
  };
  xaman: {
    apiKey?: string;
    apiSecret?: string;
  };
  storagePath: string;
}

const XRPL_ENDPOINTS: Record<XRPLNetwork, string> = {
  mainnet: 'wss://xrplcluster.com',
  testnet: 'wss://s.altnet.rippletest.net:51233',
  devnet: 'wss://s.devnet.rippletest.net:51233',
};

export function loadEnvConfig(cliOverrides: Partial<EnvConfig> = {}): EnvConfig {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }

  const mode = (cliOverrides.mode ?? process.env.AGILITY_MODE ?? 'mock') as AgilityMode;
  const xrplNetwork = (process.env.XRPL_NETWORK ?? 'testnet') as XRPLNetwork;

  const config: EnvConfig = {
    mode,
    xrpl: {
      network: xrplNetwork,
      endpoint: process.env.XRPL_ENDPOINT ?? XRPL_ENDPOINTS[xrplNetwork],
      seed: process.env.XRPL_SEED,
    },
    midnight: {
      network: process.env.MIDNIGHT_NETWORK ?? 'testnet',
      endpoint: process.env.MIDNIGHT_ENDPOINT,
    },
    xaman: {
      apiKey: process.env.XAMAN_API_KEY,
      apiSecret: process.env.XAMAN_API_SECRET,
    },
    storagePath: process.env.AGILITY_STORAGE_PATH ?? './.agility-data',
  };

  return config;
}

export function validateRealModeConfig(config: EnvConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.mode === 'real') {
    if (!config.xrpl.seed) {
      errors.push('XRPL_SEED is required for real mode. Set it in .env or environment.');
    }
    if (!config.xrpl.endpoint) {
      errors.push('XRPL_ENDPOINT could not be determined. Check XRPL_NETWORK setting.');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateXamanConfig(config: EnvConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.xaman.apiKey) {
    errors.push('XAMAN_API_KEY is required for Xaman signing. Set it in .env or environment.');
  }
  if (!config.xaman.apiSecret) {
    errors.push('XAMAN_API_SECRET is required for Xaman signing. Set it in .env or environment.');
  }

  return { valid: errors.length === 0, errors };
}

export function maskSecret(secret: string | undefined): string {
  if (!secret) return '<not set>';
  if (secret.length <= 8) return '****';
  return secret.slice(0, 4) + '****' + secret.slice(-4);
}

export function printConfigSummary(config: EnvConfig, debug: boolean): void {
  console.log(`[Agility] Mode: ${config.mode}`);
  console.log(`[Agility] XRPL Network: ${config.xrpl.network}`);
  if (debug && config.mode === 'real') {
    console.log(`[Agility] XRPL Endpoint: ${config.xrpl.endpoint}`);
    console.log(`[Agility] XRPL Seed: ${maskSecret(config.xrpl.seed)}`);
  }
  console.log(`[Agility] Storage: ${config.storagePath}`);
}
