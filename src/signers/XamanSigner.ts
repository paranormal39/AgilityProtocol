import type { SignerProvider, ConsentPayload, SignatureBundle, SignerType } from './SignerProvider.js';
import { canonicalJson, sha256Hex } from '../utils/canonical.js';
import type { Logger } from '../utils/Logger.js';

export interface XamanConfig {
  apiKey: string;
  apiSecret: string;
  network?: 'mainnet' | 'testnet' | 'devnet';
}

export interface XamanPayloadResponse {
  uuid: string;
  next: {
    always: string;
    no_push_msg_received?: string;
  };
  refs: {
    qr_png: string;
    qr_matrix: string;
    qr_uri_quality_opts: string[];
    websocket_status: string;
  };
  pushed: boolean;
}

export interface XamanPayloadResult {
  signed: boolean;
  user_token?: boolean;
  return_url?: {
    app?: string;
    web?: string;
  };
  txid?: string;
  resolved_at?: string;
  dispatched_to?: string;
  dispatched_nodetype?: string;
  dispatched_result?: string;
  dispatched_to_node?: string;
  multisign_account?: string;
  account?: string;
  signer?: string;
  environment_nodeuri?: string;
  environment_nodetype?: string;
  opened_by_deeplink?: boolean;
  payload_uuidv4?: string;
  signed_blob?: string;
  tx_id?: string;
  hex?: string;
}

export class XamanSigner implements SignerProvider {
  private config: XamanConfig;
  private logger?: Logger;
  private baseUrl = 'https://xumm.app/api/v1/platform';

  constructor(config: XamanConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger;
  }

  getType(): SignerType {
    return 'xaman';
  }

  async signConsent(consentPayload: ConsentPayload): Promise<SignatureBundle> {
    const canonicalPayload = canonicalJson(consentPayload);
    const consentHash = sha256Hex(canonicalPayload);

    this.logger?.info('Creating Xaman consent signing request...');

    const payload = await this.createPayload(consentPayload, consentHash);

    console.log('');
    console.log('═'.repeat(60));
    console.log('  XAMAN CONSENT SIGNING REQUIRED');
    console.log('═'.repeat(60));
    console.log('');
    console.log('Please approve this consent request in your Xaman wallet:');
    console.log('');
    console.log(`  📱 Open Xaman and scan QR or use deep link:`);
    console.log(`     ${payload.next.always}`);
    console.log('');
    console.log(`  🔗 QR Code: ${payload.refs.qr_png}`);
    console.log('');
    console.log('  Consent Details:');
    console.log(`     Request ID: ${consentPayload.requestId}`);
    console.log(`     Audience:   ${consentPayload.audience}`);
    console.log(`     Permissions: ${consentPayload.permissions.join(', ')}`);
    console.log(`     Expires:    ${consentPayload.expiresAt}`);
    console.log('');
    console.log('  Waiting for approval...');
    console.log('');

    const result = await this.waitForSignature(payload.uuid);

    if (!result.signed) {
      throw new Error('Xaman consent signing was rejected or expired');
    }

    this.logger?.info('Xaman consent signed successfully', {
      account: result.account,
      txid: result.txid || result.tx_id,
    });

    console.log('  ✅ Consent approved!');
    console.log(`     Signer: ${result.account}`);
    if (result.txid || result.tx_id) {
      console.log(`     TX ID:  ${result.txid || result.tx_id}`);
    }
    console.log('');

    return {
      signer: {
        type: 'xrpl',
        id: result.account || result.signer || 'unknown',
      },
      signature: result.signed_blob || result.txid || result.tx_id || `xaman_${payload.uuid}`,
      method: 'xaman_payload',
      meta: {
        payloadUuid: payload.uuid,
        txid: result.txid || result.tx_id,
        signedBlob: result.signed_blob,
        consentHash,
        resolvedAt: result.resolved_at,
        network: this.config.network || 'testnet',
      },
    };
  }

  private async createPayload(
    consentPayload: ConsentPayload,
    consentHash: string
  ): Promise<XamanPayloadResponse> {
    const memoType = Buffer.from('agility', 'utf8').toString('hex').toUpperCase();
    const memoData = Buffer.from(consentHash.slice(0, 32), 'utf8').toString('hex').toUpperCase();

    const txJson = {
      TransactionType: 'AccountSet',
      Memos: [
        {
          Memo: {
            MemoType: memoType,
            MemoData: memoData,
          },
        },
      ],
    };

    const payloadRequest = {
      txjson: txJson,
      options: {
        submit: false,
        expire: 300,
      },
      custom_meta: {
        identifier: `agility_${consentPayload.requestId.slice(0, 8)}`,
        instruction: `Approve: ${consentPayload.audience} (${consentPayload.permissions.join(', ')})`,
      },
    };

    const response = await fetch(`${this.baseUrl}/payload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
        'X-API-Secret': this.config.apiSecret,
      },
      body: JSON.stringify(payloadRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Xaman API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as XamanPayloadResponse;
    return data;
  }

  private async waitForSignature(uuid: string, timeoutMs = 300000): Promise<XamanPayloadResult> {
    const startTime = Date.now();
    const pollInterval = 2000;

    while (Date.now() - startTime < timeoutMs) {
      const result = await this.getPayloadResult(uuid);

      if (result.resolved_at !== undefined && result.resolved_at !== null) {
        return result;
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      process.stdout.write('.');
    }

    throw new Error('Xaman signing request timed out');
  }

  private async getPayloadResult(uuid: string): Promise<XamanPayloadResult> {
    const response = await fetch(`${this.baseUrl}/payload/${uuid}`, {
      method: 'GET',
      headers: {
        'X-API-Key': this.config.apiKey,
        'X-API-Secret': this.config.apiSecret,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Xaman API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as { meta: { resolved: boolean; signed: boolean; cancelled: boolean; expired: boolean; resolved_at?: string }; response: XamanPayloadResult };
    
    const meta = data.meta;
    const payloadResponse = data.response || {};

    return {
      signed: meta.signed,
      resolved_at: meta.resolved_at,
      account: payloadResponse.account,
      signer: payloadResponse.signer,
      txid: payloadResponse.txid,
      tx_id: payloadResponse.txid,
      signed_blob: payloadResponse.hex,
    };
  }
}
