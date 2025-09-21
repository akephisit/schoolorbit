import { z } from 'zod';
import { parseWithSchema } from './core';
import type { ParseResult } from './core';

const updateFeatureSchema = z
  .object({
    enabled: z.boolean()
  })
  .strict();

export type UpdateFeatureInput = z.infer<typeof updateFeatureSchema>;

export const parseFeatureUpdateInput = (input: unknown): ParseResult<UpdateFeatureInput> =>
  parseWithSchema(updateFeatureSchema, input);
