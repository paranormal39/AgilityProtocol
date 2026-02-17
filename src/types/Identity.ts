export interface Identity {
  id: string;
  xrplAddress: string;
  midnightAddress: string;
  identityHash: string;
  createdAt: Date;
  updatedAt: Date;
  anchored: boolean;
  anchorTxHash?: string;
  midnightContractId?: string;
}

export interface IdentityCreateParams {
  xrplAddress: string;
  midnightAddress: string;
}

export interface IdentityState {
  identity: Identity | null;
  initialized: boolean;
}
