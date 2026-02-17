import { AgilityHeadless } from '../AgilityHeadless.js';
import { XRPLAdapter } from '../adapters/xrpl/XRPLAdapter.js';
import { RealXRPLAdapter } from '../adapters/xrpl/RealXRPLAdapter.js';
import { JsonPersistence } from '../persistence/JsonPersistence.js';
import type { Logger } from '../utils/Logger.js';
import type { ProofRequest } from '../types/ProofRequest.js';
import type { AgilityMode } from '../config/env.js';

export interface CheckResult {
  name: string;
  success: boolean;
  message: string;
  duration: number;
  data?: unknown;
}

export interface XRPLRealConfig {
  endpoint: string;
  seed: string;
}

export interface ChecksConfig {
  xrplAddress: string;
  midnightAddress: string;
  debug: boolean;
  storagePath?: string;
  mode?: AgilityMode;
  xrplConfig?: XRPLRealConfig;
}

export class ChecksPipeline {
  private agility: AgilityHeadless;
  private logger: Logger;
  private results: CheckResult[] = [];
  private persistence: JsonPersistence;
  private mode: AgilityMode;
  private xrplConfig?: XRPLRealConfig;

  constructor(config: ChecksConfig) {
    this.mode = config.mode ?? 'mock';
    this.xrplConfig = config.xrplConfig;
    const storagePath = config.storagePath ?? './.agility-cli-test';
    
    this.agility = new AgilityHeadless({
      storagePath,
      debug: config.debug,
    });
    this.logger = this.agility.getLogger();
    this.persistence = new JsonPersistence(storagePath);

    if (this.mode === 'real' && this.xrplConfig) {
      const realAdapter = new RealXRPLAdapter(this.xrplConfig, this.logger);
      this.agility.setXRPLAdapter(realAdapter as unknown as XRPLAdapter);
    }
  }

  async run(config: ChecksConfig): Promise<boolean> {
    this.logger.info(`Starting checks pipeline (mode=${this.mode})...`);
    console.log('');

    try {
      await this.persistence.initialize();
      await this.agility.initialize();

      const checks = [
        () => this.checkStorage(),
        () => this.checkIdentity(config.xrplAddress, config.midnightAddress),
        () => this.checkAnchor(),
        () => this.checkDeck(),
        () => this.checkMatching(),
        () => this.checkGrant(),
        () => this.checkProof(),
        () => this.checkReceipt(),
      ];

      for (const check of checks) {
        const result = await check();
        this.results.push(result);
        this.printResult(result);

        if (!result.success) {
          console.log('');
          this.logger.error(`Pipeline stopped at: ${result.name}`);
          return false;
        }
      }

      console.log('');
      this.logger.info('All checks passed!');
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Pipeline failed: ${errorMsg}`);
      return false;
    } finally {
      await this.cleanup();
    }
  }

  private printResult(result: CheckResult): void {
    const icon = result.success ? '✅' : '❌';
    const timing = result.duration > 0 ? ` (${result.duration}ms)` : '';
    console.log(`[Agility] ${icon} ${result.name}${timing}`);
    if (result.message) {
      console.log(`          ${result.message}`);
    }
  }

  private async checkStorage(): Promise<CheckResult> {
    const start = Date.now();
    const testKey = '__test__';
    const testValue = { test: true, timestamp: Date.now() };

    try {
      const storage = this.agility.getStorage();
      await storage.save(testKey, testValue);
      const loaded = await storage.load<typeof testValue>(testKey);
      await storage.delete(testKey);

      if (!loaded || loaded.test !== testValue.test) {
        return {
          name: 'Storage round-trip',
          success: false,
          message: 'Loaded value does not match saved value',
          duration: Date.now() - start,
        };
      }

      return {
        name: 'Storage round-trip',
        success: true,
        message: `key=${testKey}`,
        duration: Date.now() - start,
        data: loaded,
      };
    } catch (error) {
      return {
        name: 'Storage round-trip',
        success: false,
        message: error instanceof Error ? error.message : String(error),
        duration: Date.now() - start,
      };
    }
  }

  private async checkIdentity(xrplAddress: string, midnightAddress: string): Promise<CheckResult> {
    const start = Date.now();

    try {
      const identity = await this.agility.createIdentity(xrplAddress, midnightAddress);

      if (!identity.id || !identity.xrplAddress || !identity.midnightAddress) {
        return {
          name: 'Identity created',
          success: false,
          message: 'Identity missing required fields',
          duration: Date.now() - start,
        };
      }

      this.persistence.saveIdentity(identity.id, identity);

      return {
        name: 'Identity created',
        success: true,
        message: `id=${identity.id.slice(0, 20)}..., xrpl=${identity.xrplAddress}, midnight=${midnightAddress}`,
        duration: Date.now() - start,
        data: identity,
      };
    } catch (error) {
      return {
        name: 'Identity created',
        success: false,
        message: error instanceof Error ? error.message : String(error),
        duration: Date.now() - start,
      };
    }
  }

  private async checkAnchor(): Promise<CheckResult> {
    const start = Date.now();

    try {
      await this.agility.anchorIdentity();
      const txId = this.agility.getXRPLAdapter().getLastTxId();

      if (!txId) {
        return {
          name: 'Identity anchored',
          success: false,
          message: 'No txId returned from XRPL adapter',
          duration: Date.now() - start,
        };
      }

      this.persistence.saveAnchor(txId, { txId, type: 'identity_anchor' });

      return {
        name: 'Identity anchored',
        success: true,
        message: `txId=${txId}`,
        duration: Date.now() - start,
        data: { txId },
      };
    } catch (error) {
      return {
        name: 'Identity anchored',
        success: false,
        message: error instanceof Error ? error.message : String(error),
        duration: Date.now() - start,
      };
    }
  }

  private async checkDeck(): Promise<CheckResult> {
    const start = Date.now();

    try {
      const deck = await this.agility.createDeck('Test Deck', ['age_over_18', 'email_verified']);
      const decks = await this.agility.getDecks();

      if (!deck.id || decks.length === 0) {
        return {
          name: 'Deck created',
          success: false,
          message: 'Deck not saved properly',
          duration: Date.now() - start,
        };
      }

      this.persistence.saveDeck(deck.id, deck);

      return {
        name: 'Deck created',
        success: true,
        message: `id=${deck.id.slice(0, 15)}..., name="${deck.name}", permissions=[${deck.permissions.join(', ')}]`,
        duration: Date.now() - start,
        data: deck,
      };
    } catch (error) {
      return {
        name: 'Deck created',
        success: false,
        message: error instanceof Error ? error.message : String(error),
        duration: Date.now() - start,
      };
    }
  }

  private async checkMatching(): Promise<CheckResult> {
    const start = Date.now();

    try {
      const decks = await this.agility.getDecks();
      if (decks.length === 0) {
        return {
          name: 'Deck matching',
          success: false,
          message: 'No decks available for matching',
          duration: Date.now() - start,
        };
      }

      const request: ProofRequest = {
        id: 'test_request_001',
        requesterId: 'test_verifier',
        requesterApp: 'test_app',
        requiredPermissions: ['age_over_18'],
        createdAt: new Date(),
      };

      const canFulfill = await this.agility.canFulfillProofRequest(request);

      return {
        name: 'Deck matching',
        success: canFulfill,
        message: canFulfill 
          ? `Matched deck for permissions=[${request.requiredPermissions.join(', ')}]`
          : 'No matching deck found',
        duration: Date.now() - start,
        data: { canFulfill, request },
      };
    } catch (error) {
      return {
        name: 'Deck matching',
        success: false,
        message: error instanceof Error ? error.message : String(error),
        duration: Date.now() - start,
      };
    }
  }

  private async checkGrant(): Promise<CheckResult> {
    const start = Date.now();

    try {
      const decks = await this.agility.getDecks();
      if (decks.length === 0) {
        return {
          name: 'Grant created',
          success: false,
          message: 'No decks available for granting',
          duration: Date.now() - start,
        };
      }

      const deck = decks[0]!;
      const grant = await this.agility.grantPermission(deck.id, 'test_app');
      const grants = await this.agility.getActiveGrants();

      if (!grant.id || grants.length === 0) {
        return {
          name: 'Grant created',
          success: false,
          message: 'Grant not saved properly',
          duration: Date.now() - start,
        };
      }

      this.persistence.saveGrant(grant.id, grant);

      return {
        name: 'Grant created',
        success: true,
        message: `id=${grant.id.slice(0, 15)}..., app="${grant.targetApp}", permissions=[${grant.permissions.join(', ')}]`,
        duration: Date.now() - start,
        data: grant,
      };
    } catch (error) {
      return {
        name: 'Grant created',
        success: false,
        message: error instanceof Error ? error.message : String(error),
        duration: Date.now() - start,
      };
    }
  }

  private async checkProof(): Promise<CheckResult> {
    const start = Date.now();

    try {
      const request: ProofRequest = {
        id: 'test_request_002',
        requesterId: 'test_verifier',
        requesterApp: 'test_app',
        requiredPermissions: ['age_over_18'],
        createdAt: new Date(),
      };

      const result = await this.agility.handleProofRequest(request);

      if (!result.success) {
        return {
          name: 'Proof generated',
          success: false,
          message: result.error ?? 'Unknown error',
          duration: Date.now() - start,
        };
      }

      const proofId = this.agility.getMidnightAdapter().getLastProofId();

      if (proofId) {
        this.persistence.saveProof(proofId, { proofId, request, result });
      }

      return {
        name: 'Proof generated',
        success: true,
        message: `verified=${result.response?.verified}, proofId=${proofId}`,
        duration: Date.now() - start,
        data: result,
      };
    } catch (error) {
      return {
        name: 'Proof generated',
        success: false,
        message: error instanceof Error ? error.message : String(error),
        duration: Date.now() - start,
      };
    }
  }

  private async checkReceipt(): Promise<CheckResult> {
    const start = Date.now();

    try {
      const receiptId = this.agility.getXRPLAdapter().getLastReceiptId();

      if (!receiptId) {
        return {
          name: 'Receipt submitted',
          success: false,
          message: 'No receipt submitted to XRPL',
          duration: Date.now() - start,
        };
      }

      this.persistence.saveReceipt(receiptId, { receiptId, type: 'proof_receipt' });

      return {
        name: 'Receipt submitted',
        success: true,
        message: `receiptId=${receiptId}`,
        duration: Date.now() - start,
        data: { receiptId },
      };
    } catch (error) {
      return {
        name: 'Receipt submitted',
        success: false,
        message: error instanceof Error ? error.message : String(error),
        duration: Date.now() - start,
      };
    }
  }

  private async cleanup(): Promise<void> {
    try {
      await this.agility.reset();
    } catch {
      // Ignore cleanup errors
    }
  }

  getResults(): CheckResult[] {
    return [...this.results];
  }
}
