import type { SignerProvider, ConsentPayload, SignatureBundle, SignerType } from './SignerProvider.js';
import { canonicalJson, sha256Hex } from '../utils/canonical.js';

export interface LocalSignerConfig {
  rootPublicKey: string;
  pairwiseId: string;
}

export class LocalSigner implements SignerProvider {
  private config: LocalSignerConfig;

  constructor(config: LocalSignerConfig) {
    this.config = config;
  }

  getType(): SignerType {
    return 'local';
  }

  async signConsent(consentPayload: ConsentPayload): Promise<SignatureBundle> {
    const canonicalPayload = canonicalJson(consentPayload);
    const payloadHash = sha256Hex(canonicalPayload);

    const signatureData = `${this.config.rootPublicKey}:${payloadHash}`;
    const signature = `agility_sig_${sha256Hex(signatureData).slice(0, 48)}`;

    return {
      signer: {
        type: 'did',
        id: `did:agility:${this.config.pairwiseId.slice(0, 32)}`,
      },
      signature,
      method: 'ed25519_mock',
      meta: {
        payloadHash,
        signedAt: new Date().toISOString(),
      },
    };
  }
}
