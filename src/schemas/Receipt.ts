import { z } from 'zod';

export const ReceiptSchema = z.object({
  txHash: z.string().min(1),
  requestId: z.string().uuid(),
  proofId: z.string().uuid(),
  requestHash: z.string().min(64).max(64),
  timestamp: z.string().datetime(),
  type: z.literal('proof_generated'),
});

export type Receipt = z.infer<typeof ReceiptSchema>;

export function validateReceipt(data: unknown): Receipt {
  return ReceiptSchema.parse(data);
}

export function isValidReceipt(data: unknown): data is Receipt {
  return ReceiptSchema.safeParse(data).success;
}
