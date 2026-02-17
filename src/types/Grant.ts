export interface Grant {
  id: string;
  deckId: string;
  targetApp: string;
  permissions: string[];
  createdAt: Date;
  expiresAt?: Date;
  revoked: boolean;
  revokedAt?: Date;
  midnightGrantId?: string;
}

export interface GrantCreateParams {
  deckId: string;
  targetApp: string;
  expiresAt?: Date;
}

export interface GrantState {
  grants: Grant[];
}
