import type { VerifiableCredential } from './VerifiableCredential.js';
import type { JsonPersistence } from '../persistence/JsonPersistence.js';

export class CredentialStore {
  private persistence: JsonPersistence;

  constructor(persistence: JsonPersistence) {
    this.persistence = persistence;
  }

  saveCredential(vc: VerifiableCredential): void {
    this.persistence.saveCredential(vc.id, vc);
  }

  getCredential(id: string): VerifiableCredential | undefined {
    const record = this.persistence.getCredential(id);
    if (!record) return undefined;
    return record.data as VerifiableCredential;
  }

  getCredentialsBySubject(subjectId: string): VerifiableCredential[] {
    const all = this.persistence.getAllCredentials();
    return all
      .map((r) => r.data as VerifiableCredential)
      .filter((vc) => vc.subject === subjectId);
  }

  getCredentialsByIssuer(issuerId: string): VerifiableCredential[] {
    const all = this.persistence.getAllCredentials();
    return all
      .map((r) => r.data as VerifiableCredential)
      .filter((vc) => vc.issuer === issuerId);
  }

  getAllCredentials(): VerifiableCredential[] {
    const all = this.persistence.getAllCredentials();
    return all.map((r) => r.data as VerifiableCredential);
  }

  getValidCredentials(subjectId: string): VerifiableCredential[] {
    const now = new Date();
    return this.getCredentialsBySubject(subjectId).filter((vc) => {
      if (vc.expiresAt) {
        return new Date(vc.expiresAt) > now;
      }
      return true;
    });
  }

  findCredentialWithClaims(subjectId: string, requiredClaims: string[]): VerifiableCredential | undefined {
    const credentials = this.getValidCredentials(subjectId);
    
    for (const vc of credentials) {
      const claimKeys = Object.keys(vc.claims);
      const hasAllClaims = requiredClaims.every((claim) => {
        const value = vc.claims[claim];
        return value === true || (typeof value === 'string' && value.length > 0) || typeof value === 'number';
      });
      
      if (hasAllClaims) {
        return vc;
      }
    }
    
    return undefined;
  }
}
