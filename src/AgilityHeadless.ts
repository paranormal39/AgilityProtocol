import type { Identity } from './types/Identity.js';
import type { PermissionDeck } from './types/PermissionDeck.js';
import type { Grant } from './types/Grant.js';
import type { ProofRequest, ProofResult } from './types/ProofRequest.js';
import type { StorageAdapter } from './storage/StorageAdapter.js';
import type { IXRPLAdapter } from './adapters/xrpl/XRPLAdapter.js';
import type { IMidnightAdapter } from './adapters/midnight/MidnightAdapter.js';
import type { Logger } from './utils/Logger.js';

import { FileSystemStorage } from './storage/FileSystemStorage.js';
import { XRPLAdapter } from './adapters/xrpl/XRPLAdapter.js';
import { MidnightAdapter } from './adapters/midnight/MidnightAdapter.js';
import { StateManager } from './core/StateManager.js';
import { IdentityManager } from './core/IdentityManager.js';
import { PermissionDeckEngine } from './core/PermissionDeckEngine.js';
import { GrantManager } from './core/GrantManager.js';
import { ProofEngine } from './core/ProofEngine.js';
import { ConsoleLogger } from './utils/ConsoleLogger.js';

export interface AgilityConfig {
  storagePath?: string;
  encryptStorage?: boolean;
  encryptionKey?: string;
  xrplNetwork?: 'mainnet' | 'testnet' | 'devnet';
  midnightNetwork?: 'mainnet' | 'testnet' | 'devnet';
  logger?: Logger;
  debug?: boolean;
}

type NetworkType = 'mainnet' | 'testnet' | 'devnet';

interface ResolvedConfig {
  storagePath: string;
  encryptStorage: boolean;
  encryptionKey: string;
  xrplNetwork: NetworkType;
  midnightNetwork: NetworkType;
  debug: boolean;
  logger?: Logger;
}

const DEFAULT_CONFIG: ResolvedConfig = {
  storagePath: './.agility-data',
  encryptStorage: false,
  encryptionKey: '',
  xrplNetwork: 'testnet',
  midnightNetwork: 'testnet',
  debug: false,
};

export class AgilityHeadless {
  private config: ResolvedConfig;
  private storage: StorageAdapter;
  private xrplAdapter: XRPLAdapter;
  private midnightAdapter: MidnightAdapter;
  private stateManager: StateManager;
  private identityManager: IdentityManager;
  private deckEngine: PermissionDeckEngine;
  private grantManager: GrantManager;
  private proofEngine: ProofEngine;
  private initialized = false;
  private logger: Logger;

  constructor(config: AgilityConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.logger = config.logger ?? new ConsoleLogger(config.debug ? 'debug' : 'info');

    const fileStorage = new FileSystemStorage({
      basePath: this.config.storagePath,
      encrypt: this.config.encryptStorage,
    });

    if (this.config.encryptStorage && this.config.encryptionKey) {
      fileStorage.setEncryptionKey(this.config.encryptionKey);
    }

    this.storage = fileStorage;
    this.xrplAdapter = new XRPLAdapter(this.logger);
    this.midnightAdapter = new MidnightAdapter(this.logger);
    this.stateManager = new StateManager(this.storage);
    this.identityManager = new IdentityManager(
      this.stateManager,
      this.xrplAdapter,
      this.midnightAdapter
    );
    this.deckEngine = new PermissionDeckEngine(this.stateManager);
    this.grantManager = new GrantManager(
      this.stateManager,
      this.deckEngine,
      this.midnightAdapter
    );
    this.proofEngine = new ProofEngine(
      this.deckEngine,
      this.grantManager,
      this.midnightAdapter,
      this.xrplAdapter
    );
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.debug('Already initialized');
      return;
    }

    this.logger.debug('Initializing...');

    await this.stateManager.initialize();

    this.initialized = true;

    this.logger.info('Agility initialized');
  }

  async createIdentity(xrplAddress: string, midnightAddress: string): Promise<Identity> {
    this.ensureInitialized();

    const identity = await this.identityManager.createIdentity({
      xrplAddress,
      midnightAddress,
    });

    await this.xrplAdapter.connect(xrplAddress, { network: this.config.xrplNetwork });
    await this.midnightAdapter.connect(midnightAddress, { network: this.config.midnightNetwork });

    return identity;
  }

  async getIdentity(): Promise<Identity | null> {
    this.ensureInitialized();
    return this.identityManager.getIdentity();
  }

  async anchorIdentity(): Promise<void> {
    this.ensureInitialized();
    await this.identityManager.anchorIdentity();
  }

  async createDeck(name: string, permissions: string[]): Promise<PermissionDeck> {
    this.ensureInitialized();
    return this.deckEngine.createDeck({ name, permissions });
  }

  async getDecks(): Promise<PermissionDeck[]> {
    this.ensureInitialized();
    return this.deckEngine.getDecks();
  }

  async getDeck(deckId: string): Promise<PermissionDeck | null> {
    this.ensureInitialized();
    return this.deckEngine.getDeck(deckId);
  }

  async updateDeck(
    deckId: string,
    updates: Partial<Pick<PermissionDeck, 'name' | 'permissions' | 'active'>>
  ): Promise<PermissionDeck> {
    this.ensureInitialized();
    return this.deckEngine.updateDeck(deckId, updates);
  }

  async deleteDeck(deckId: string): Promise<void> {
    this.ensureInitialized();
    await this.deckEngine.deleteDeck(deckId);
  }

  async grantPermission(deckId: string, targetApp: string, expiresAt?: Date): Promise<Grant> {
    this.ensureInitialized();
    return this.grantManager.grantPermission({ deckId, targetApp, expiresAt });
  }

  async revokeGrant(grantId: string): Promise<void> {
    this.ensureInitialized();
    await this.grantManager.revokeGrant(grantId);
  }

  async getActiveGrants(): Promise<Grant[]> {
    this.ensureInitialized();
    return this.grantManager.getActiveGrants();
  }

  async getGrantsForApp(targetApp: string): Promise<Grant[]> {
    this.ensureInitialized();
    return this.grantManager.getGrantsForApp(targetApp);
  }

  async revokeAllGrantsForApp(targetApp: string): Promise<void> {
    this.ensureInitialized();
    await this.grantManager.revokeAllGrantsForApp(targetApp);
  }

  async handleProofRequest(request: ProofRequest): Promise<ProofResult> {
    this.ensureInitialized();
    return this.proofEngine.handleProofRequest(request);
  }

  async canFulfillProofRequest(request: ProofRequest): Promise<boolean> {
    this.ensureInitialized();
    return this.proofEngine.canFulfillRequest(request);
  }

  async validateProofRequest(request: ProofRequest): Promise<{ valid: boolean; errors: string[] }> {
    this.ensureInitialized();
    return this.proofEngine.validateProofRequest(request);
  }

  async connectXRPL(address: string): Promise<void> {
    await this.xrplAdapter.connect(address, { network: this.config.xrplNetwork });
  }

  async connectMidnight(address: string): Promise<void> {
    await this.midnightAdapter.connect(address, { network: this.config.midnightNetwork });
  }

  async disconnect(): Promise<void> {
    await this.xrplAdapter.disconnect();
    await this.midnightAdapter.disconnect();
  }

  async reset(): Promise<void> {
    this.ensureInitialized();
    await this.stateManager.reset();
    await this.disconnect();
    this.initialized = false;
    this.logger.info('State reset complete');
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isXRPLConnected(): boolean {
    return this.xrplAdapter.isConnected();
  }

  isMidnightConnected(): boolean {
    return this.midnightAdapter.isConnected();
  }

  getXRPLAdapter(): XRPLAdapter {
    return this.xrplAdapter;
  }

  getMidnightAdapter(): MidnightAdapter {
    return this.midnightAdapter;
  }

  getLogger(): Logger {
    return this.logger;
  }

  getStorage(): StorageAdapter {
    return this.storage;
  }

  setXRPLAdapter(adapter: XRPLAdapter): void {
    this.xrplAdapter = adapter;
    this.xrplAdapter.setLogger(this.logger);
    this.identityManager = new IdentityManager(
      this.stateManager,
      this.xrplAdapter,
      this.midnightAdapter
    );
    this.proofEngine = new ProofEngine(
      this.deckEngine,
      this.grantManager,
      this.midnightAdapter,
      this.xrplAdapter
    );
  }

  setMidnightAdapter(adapter: MidnightAdapter): void {
    this.midnightAdapter = adapter;
    this.midnightAdapter.setLogger(this.logger);
    this.identityManager = new IdentityManager(
      this.stateManager,
      this.xrplAdapter,
      this.midnightAdapter
    );
    this.grantManager = new GrantManager(
      this.stateManager,
      this.deckEngine,
      this.midnightAdapter
    );
    this.proofEngine = new ProofEngine(
      this.deckEngine,
      this.grantManager,
      this.midnightAdapter,
      this.xrplAdapter
    );
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('AgilityHeadless not initialized. Call initialize() first.');
    }
  }
}

export * from './types/index.js';
export * from './storage/index.js';
export * from './adapters/index.js';
export * from './core/index.js';
export * from './utils/index.js';
