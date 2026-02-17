export interface XRPLConnectionConfig {
  network: 'mainnet' | 'testnet' | 'devnet';
  serverUrl?: string;
}

export interface XRPLAnchorResult {
  success: boolean;
  txHash?: string;
  ledgerIndex?: number;
  error?: string;
}

export interface XRPLReceiptResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface XRPLWalletState {
  connected: boolean;
  address: string | null;
  network: string | null;
}
