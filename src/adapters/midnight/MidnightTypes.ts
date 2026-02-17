export interface MidnightConnectionConfig {
  network: 'mainnet' | 'testnet' | 'devnet';
  serverUrl?: string;
}

export interface MidnightContractResult {
  success: boolean;
  contractId?: string;
  error?: string;
}

export interface MidnightGrantResult {
  success: boolean;
  grantId?: string;
  error?: string;
}

export interface MidnightProofResult {
  success: boolean;
  proof?: string;
  verified?: boolean;
  error?: string;
}

export interface MidnightWalletState {
  connected: boolean;
  address: string | null;
  network: string | null;
}
