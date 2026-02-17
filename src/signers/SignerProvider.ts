export type SignerType = 'local' | 'xaman';

export interface ConsentPayload {
  version: '0.1';
  requestId: string;
  audience: string;
  nonce: string;
  expiresAt: string;
  issuedAt: string;
  permissions: string[];
  requestHash: string;
}

export interface Signer {
  type: 'did' | 'xrpl';
  id: string;
}

export interface SignatureBundle {
  signer: Signer;
  signature: string;
  method: string;
  meta: Record<string, unknown>;
}

export interface SignerProvider {
  getType(): SignerType;
  signConsent(consentPayload: ConsentPayload): Promise<SignatureBundle>;
}
