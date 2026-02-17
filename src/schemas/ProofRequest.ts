import { z } from 'zod';
import { PROTOCOL_VERSION } from '../constants/protocol.js';

export const ProofRequestSchema = z.object({
  requestId: z.string().uuid(),
  requiredPermissions: z.array(z.string()).min(1),
  nonce: z.string().min(32).max(64),
  audience: z.string().min(1),
  expiresAt: z.string().datetime(),
  issuedAt: z.string().datetime(),
  version: z.literal('0.1'),
  protocolVersion: z.string().default(PROTOCOL_VERSION),
});

export type ProofRequest = z.infer<typeof ProofRequestSchema>;

export function validateProofRequest(data: unknown): ProofRequest {
  return ProofRequestSchema.parse(data);
}

export function isValidProofRequest(data: unknown): data is ProofRequest {
  return ProofRequestSchema.safeParse(data).success;
}
