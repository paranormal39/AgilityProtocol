import { z } from 'zod';

export const CredentialProofSchema = z.object({
  type: z.string().min(1),
  created: z.string().datetime(),
  verificationMethod: z.string().min(1),
  signature: z.string().min(1),
});

export type CredentialProof = z.infer<typeof CredentialProofSchema>;

export const VerifiableCredentialSchema = z.object({
  id: z.string().uuid(),
  issuer: z.string().min(1),
  subject: z.string().min(1),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  claims: z.record(z.unknown()),
  proof: CredentialProofSchema,
  version: z.literal('0.1'),
});

export type VerifiableCredential = z.infer<typeof VerifiableCredentialSchema>;

export function validateVerifiableCredential(data: unknown): VerifiableCredential {
  return VerifiableCredentialSchema.parse(data);
}

export function isValidVerifiableCredential(data: unknown): data is VerifiableCredential {
  return VerifiableCredentialSchema.safeParse(data).success;
}

export interface CredentialClaims {
  [key: string]: boolean | string | number | null;
}

export function extractClaimPermissions(claims: CredentialClaims): string[] {
  const permissions: string[] = [];
  for (const [key, value] of Object.entries(claims)) {
    if (value === true) {
      permissions.push(key);
    } else if (typeof value === 'string' && value.length > 0) {
      permissions.push(key);
    } else if (typeof value === 'number') {
      permissions.push(key);
    }
  }
  return permissions;
}
