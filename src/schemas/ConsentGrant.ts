import { z } from 'zod';
import { PROTOCOL_VERSION } from '../constants/protocol.js';

export const SignerSchema = z.object({
  type: z.enum(['did', 'xrpl']),
  id: z.string().min(1),
});

export type Signer = z.infer<typeof SignerSchema>;

export const ConsentPayloadSchema = z.object({
  version: z.literal('0.1'),
  requestId: z.string().uuid(),
  audience: z.string().min(1),
  nonce: z.string().min(32).max(64),
  expiresAt: z.string().datetime(),
  issuedAt: z.string().datetime(),
  permissions: z.array(z.string()).min(1),
  requestHash: z.string().length(64),
});

export type ConsentPayloadType = z.infer<typeof ConsentPayloadSchema>;

export const ConsentGrantSchema = z.object({
  grantId: z.string().uuid(),
  requestId: z.string().uuid(),
  audience: z.string().min(1),
  nonce: z.string().min(32).max(64),
  permissions: z.array(z.string()).min(1),
  expiresAt: z.string().datetime(),
  issuedAt: z.string().datetime(),
  signer: SignerSchema,
  signature: z.string().min(1),
  version: z.literal('0.1'),
  protocolVersion: z.string().default(PROTOCOL_VERSION),
  consent: ConsentPayloadSchema.optional(),
  signatureMeta: z.record(z.unknown()).optional(),
});

export type ConsentGrant = z.infer<typeof ConsentGrantSchema>;

export function validateConsentGrant(data: unknown): ConsentGrant {
  return ConsentGrantSchema.parse(data);
}

export function isValidConsentGrant(data: unknown): data is ConsentGrant {
  return ConsentGrantSchema.safeParse(data).success;
}
