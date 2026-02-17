import * as fs from 'node:fs';
import * as path from 'node:path';

export interface PersistenceRecord {
  id: string;
  type: string;
  data: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface MidnightCredentialRecord {
  ref: string;
  subjectId: string;
  ciphertext: string;
  createdAt: string;
}

export interface LaceStateRecord {
  connected: boolean;
  network: string;
  addresses: string[];
  lastConnected?: string;
}

export interface PersistenceStore {
  identities: PersistenceRecord[];
  anchors: PersistenceRecord[];
  decks: PersistenceRecord[];
  grants: PersistenceRecord[];
  proofs: PersistenceRecord[];
  receipts: PersistenceRecord[];
  proofRequests: PersistenceRecord[];
  consentGrants: PersistenceRecord[];
  localKeys: PersistenceRecord[];
  rootKeyPair: PersistenceRecord | null;
  pairwiseIds: PersistenceRecord[];
  credentials: PersistenceRecord[];
  issuerKeys: PersistenceRecord[];
  midnightKey?: string;
  midnightCredentials: MidnightCredentialRecord[];
  laceState?: LaceStateRecord;
}

const EMPTY_STORE: PersistenceStore = {
  identities: [],
  anchors: [],
  decks: [],
  grants: [],
  proofs: [],
  receipts: [],
  proofRequests: [],
  consentGrants: [],
  localKeys: [],
  rootKeyPair: null,
  pairwiseIds: [],
  credentials: [],
  issuerKeys: [],
  midnightCredentials: [],
};

export class JsonPersistence {
  private storePath: string;
  private store: PersistenceStore;

  constructor(basePath: string) {
    this.storePath = path.join(basePath, 'persistence.json');
    this.store = { ...EMPTY_STORE };
  }

  async initialize(): Promise<void> {
    const dir = path.dirname(this.storePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(this.storePath)) {
      try {
        const data = fs.readFileSync(this.storePath, 'utf-8');
        const loaded = JSON.parse(data);
        this.store = {
          ...EMPTY_STORE,
          ...loaded,
        };
      } catch {
        this.store = { ...EMPTY_STORE };
      }
    }
  }

  private save(): void {
    fs.writeFileSync(this.storePath, JSON.stringify(this.store, null, 2));
  }

  private createRecord(type: string, id: string, data: unknown): PersistenceRecord {
    const now = new Date().toISOString();
    return {
      id,
      type,
      data,
      createdAt: now,
      updatedAt: now,
    };
  }

  saveIdentity(id: string, data: unknown): PersistenceRecord {
    const record = this.createRecord('identity', id, data);
    const existing = this.store.identities.findIndex((r) => r.id === id);
    if (existing >= 0) {
      record.createdAt = this.store.identities[existing]!.createdAt;
      this.store.identities[existing] = record;
    } else {
      this.store.identities.push(record);
    }
    this.save();
    return record;
  }

  saveAnchor(id: string, data: unknown): PersistenceRecord {
    const record = this.createRecord('anchor', id, data);
    this.store.anchors.push(record);
    this.save();
    return record;
  }

  saveDeck(id: string, data: unknown): PersistenceRecord {
    const record = this.createRecord('deck', id, data);
    const existing = this.store.decks.findIndex((r) => r.id === id);
    if (existing >= 0) {
      record.createdAt = this.store.decks[existing]!.createdAt;
      this.store.decks[existing] = record;
    } else {
      this.store.decks.push(record);
    }
    this.save();
    return record;
  }

  saveGrant(id: string, data: unknown): PersistenceRecord {
    const record = this.createRecord('grant', id, data);
    const existing = this.store.grants.findIndex((r) => r.id === id);
    if (existing >= 0) {
      record.createdAt = this.store.grants[existing]!.createdAt;
      this.store.grants[existing] = record;
    } else {
      this.store.grants.push(record);
    }
    this.save();
    return record;
  }

  saveProof(id: string, data: unknown): PersistenceRecord {
    const record = this.createRecord('proof', id, data);
    this.store.proofs.push(record);
    this.save();
    return record;
  }

  saveReceipt(id: string, data: unknown): PersistenceRecord {
    const record = this.createRecord('receipt', id, data);
    this.store.receipts.push(record);
    this.save();
    return record;
  }

  getIdentity(id: string): PersistenceRecord | undefined {
    return this.store.identities.find((r) => r.id === id);
  }

  getAnchor(id: string): PersistenceRecord | undefined {
    return this.store.anchors.find((r) => r.id === id);
  }

  getAnchorByTxHash(txHash: string): PersistenceRecord | undefined {
    return this.store.anchors.find((r) => {
      const data = r.data as { txHash?: string };
      return data.txHash === txHash;
    });
  }

  getDeck(id: string): PersistenceRecord | undefined {
    return this.store.decks.find((r) => r.id === id);
  }

  getGrant(id: string): PersistenceRecord | undefined {
    return this.store.grants.find((r) => r.id === id);
  }

  getProof(id: string): PersistenceRecord | undefined {
    return this.store.proofs.find((r) => r.id === id);
  }

  getReceipt(id: string): PersistenceRecord | undefined {
    return this.store.receipts.find((r) => r.id === id);
  }

  getReceiptByTxHash(txHash: string): PersistenceRecord | undefined {
    return this.store.receipts.find((r) => {
      const data = r.data as { txHash?: string };
      return data.txHash === txHash;
    });
  }

  getAllIdentities(): PersistenceRecord[] {
    return [...this.store.identities];
  }

  getAllAnchors(): PersistenceRecord[] {
    return [...this.store.anchors];
  }

  getAllDecks(): PersistenceRecord[] {
    return [...this.store.decks];
  }

  getAllGrants(): PersistenceRecord[] {
    return [...this.store.grants];
  }

  getAllProofs(): PersistenceRecord[] {
    return [...this.store.proofs];
  }

  getAllReceipts(): PersistenceRecord[] {
    return [...this.store.receipts];
  }

  saveProofRequest(id: string, data: unknown): PersistenceRecord {
    const record = this.createRecord('proofRequest', id, data);
    const existing = this.store.proofRequests.findIndex((r) => r.id === id);
    if (existing >= 0) {
      record.createdAt = this.store.proofRequests[existing]!.createdAt;
      this.store.proofRequests[existing] = record;
    } else {
      this.store.proofRequests.push(record);
    }
    this.save();
    return record;
  }

  getProofRequest(id: string): PersistenceRecord | undefined {
    return this.store.proofRequests.find((r) => r.id === id);
  }

  getAllProofRequests(): PersistenceRecord[] {
    return [...this.store.proofRequests];
  }

  saveConsentGrant(id: string, data: unknown): PersistenceRecord {
    const record = this.createRecord('consentGrant', id, data);
    const existing = this.store.consentGrants.findIndex((r) => r.id === id);
    if (existing >= 0) {
      record.createdAt = this.store.consentGrants[existing]!.createdAt;
      this.store.consentGrants[existing] = record;
    } else {
      this.store.consentGrants.push(record);
    }
    this.save();
    return record;
  }

  getConsentGrant(id: string): PersistenceRecord | undefined {
    return this.store.consentGrants.find((r) => r.id === id);
  }

  getConsentGrantByRequestId(requestId: string): PersistenceRecord | undefined {
    return this.store.consentGrants.find((r) => {
      const data = r.data as { requestId?: string };
      return data.requestId === requestId;
    });
  }

  getAllConsentGrants(): PersistenceRecord[] {
    return [...this.store.consentGrants];
  }

  saveLocalKey(id: string, data: unknown): PersistenceRecord {
    const record = this.createRecord('localKey', id, data);
    const existing = this.store.localKeys.findIndex((r) => r.id === id);
    if (existing >= 0) {
      record.createdAt = this.store.localKeys[existing]!.createdAt;
      this.store.localKeys[existing] = record;
    } else {
      this.store.localKeys.push(record);
    }
    this.save();
    return record;
  }

  getLocalKey(id: string): PersistenceRecord | undefined {
    return this.store.localKeys.find((r) => r.id === id);
  }

  getDefaultLocalKey(): PersistenceRecord | undefined {
    return this.store.localKeys.find((r) => r.id === 'default');
  }

  saveRootKeyPair(data: unknown): PersistenceRecord {
    const record = this.createRecord('rootKeyPair', 'root', data);
    if (this.store.rootKeyPair) {
      record.createdAt = this.store.rootKeyPair.createdAt;
    }
    this.store.rootKeyPair = record;
    this.save();
    return record;
  }

  getRootKeyPair(): unknown | null {
    return this.store.rootKeyPair?.data ?? null;
  }

  savePairwiseId(audience: string, data: unknown): PersistenceRecord {
    const record = this.createRecord('pairwiseId', audience, data);
    const existing = this.store.pairwiseIds.findIndex((r) => r.id === audience);
    if (existing >= 0) {
      record.createdAt = this.store.pairwiseIds[existing]!.createdAt;
      this.store.pairwiseIds[existing] = record;
    } else {
      this.store.pairwiseIds.push(record);
    }
    this.save();
    return record;
  }

  getPairwiseId(audience: string): PersistenceRecord | undefined {
    return this.store.pairwiseIds.find((r) => r.id === audience);
  }

  getAllPairwiseIds(): PersistenceRecord[] {
    return [...this.store.pairwiseIds];
  }

  saveCredential(id: string, data: unknown): PersistenceRecord {
    const record = this.createRecord('credential', id, data);
    const existing = this.store.credentials.findIndex((r) => r.id === id);
    if (existing >= 0) {
      record.createdAt = this.store.credentials[existing]!.createdAt;
      this.store.credentials[existing] = record;
    } else {
      this.store.credentials.push(record);
    }
    this.save();
    return record;
  }

  getCredential(id: string): PersistenceRecord | undefined {
    return this.store.credentials.find((r) => r.id === id);
  }

  getAllCredentials(): PersistenceRecord[] {
    return [...this.store.credentials];
  }

  saveIssuerKey(id: string, data: unknown): PersistenceRecord {
    const record = this.createRecord('issuerKey', id, data);
    const existing = this.store.issuerKeys.findIndex((r) => r.id === id);
    if (existing >= 0) {
      record.createdAt = this.store.issuerKeys[existing]!.createdAt;
      this.store.issuerKeys[existing] = record;
    } else {
      this.store.issuerKeys.push(record);
    }
    this.save();
    return record;
  }

  getIssuerKey(id: string): PersistenceRecord | undefined {
    return this.store.issuerKeys.find((r) => r.id === id);
  }

  getDefaultIssuerKey(): PersistenceRecord | undefined {
    return this.store.issuerKeys.find((r) => r.id === 'default');
  }

  clear(): void {
    this.store = { ...EMPTY_STORE };
    this.save();
  }

  getStore(): PersistenceStore {
    return JSON.parse(JSON.stringify(this.store));
  }

  saveMidnightKey(key: string): void {
    this.store.midnightKey = key;
    this.save();
  }

  getMidnightKey(): string | undefined {
    return this.store.midnightKey;
  }

  saveMidnightCredential(ref: string, record: MidnightCredentialRecord): void {
    const existing = this.store.midnightCredentials.findIndex((r) => r.ref === ref);
    if (existing >= 0) {
      this.store.midnightCredentials[existing] = record;
    } else {
      this.store.midnightCredentials.push(record);
    }
    this.save();
  }

  getMidnightCredential(ref: string): MidnightCredentialRecord | undefined {
    return this.store.midnightCredentials.find((r) => r.ref === ref);
  }

  listMidnightCredentialRefs(subjectId: string): string[] {
    return this.store.midnightCredentials
      .filter((r) => r.subjectId === subjectId)
      .map((r) => r.ref);
  }

  getAllMidnightCredentials(): MidnightCredentialRecord[] {
    return [...this.store.midnightCredentials];
  }

  deleteMidnightCredential(ref: string): void {
    this.store.midnightCredentials = this.store.midnightCredentials.filter((r) => r.ref !== ref);
    this.save();
  }

  saveLaceState(state: LaceStateRecord): void {
    this.store.laceState = state;
    this.save();
  }

  getLaceState(): LaceStateRecord | undefined {
    return this.store.laceState;
  }
}
