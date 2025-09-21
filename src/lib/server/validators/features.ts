import { z } from 'zod';
import { parseWithSchema } from './core';
import type { ParseResult } from './core';

const updateFeatureSchema = z
	.object({
		enabled: z.boolean().optional(),
		states: z.record(z.string(), z.boolean()).optional()
	})
	.strict()
	.refine((value) => value.enabled !== undefined || (value.states && Object.keys(value.states).length > 0), {
		message: 'ต้องระบุค่าที่ต้องการอัปเดต'
	});

export type UpdateFeatureInput = z.infer<typeof updateFeatureSchema>;

export const parseFeatureUpdateInput = (input: unknown): ParseResult<UpdateFeatureInput> =>
  parseWithSchema(updateFeatureSchema, input);
