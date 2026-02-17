import { z } from 'zod';
import { PROTOCOL_VERSION } from '../constants/protocol.js';

export const BindingSchema = z.object({
  requestHash: z.string().min(64).max(64),
  credentialId: z.string().uuid().optional(),
  credentialHash: z.string().length(64).optional(),
});

export type Binding = z.infer<typeof BindingSchema>;

export const ProverSchema = z.object({
  type: z.enum(['local', 'wallet']),
  id: z.string().min(1),
});

export type Prover = z.infer<typeof ProverSchema>;

export const ProofResponseSchema = z.object({
  proofId: z.string().uuid(),
  requestId: z.string().uuid(),
  audience: z.string().min(1),
  nonce: z.string().min(32).max(64),
  satisfiedPermissions: z.array(z.string()),
  verified: z.boolean(),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  proof: z.union([z.object({}).passthrough(), z.string()]),
  binding: BindingSchema,
  prover: ProverSchema,
  version: z.literal('0.1'),
  protocolVersion: z.string().default(PROTOCOL_VERSION),
});

export type ProofResponse = z.infer<typeof ProofResponseSchema>;

export function validateProofResponse(data: unknown): ProofResponse {
  return ProofResponseSchema.parse(data);
}

export function isValidProofResponse(data: unknown): data is ProofResponse {
  return ProofResponseSchema.safeParse(data).success;
}
