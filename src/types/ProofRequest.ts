export interface ProofRequest {
  id: string;
  requesterId: string;
  requesterApp: string;
  requiredPermissions: string[];
  challenge?: string;
  createdAt: Date;
  expiresAt?: Date;
}

export interface ProofResponse {
  requestId: string;
  proof: string;
  verified: boolean;
  grantId?: string;
  timestamp: Date;
}

export interface ProofResult {
  success: boolean;
  response?: ProofResponse;
  error?: string;
}
