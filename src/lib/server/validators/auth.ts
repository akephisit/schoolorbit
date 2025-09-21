import { z } from 'zod';
import { parseWithSchema } from './core';
import type { ParseResult } from './core';

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);

const optionalTrimmed = (max: number) => z.string().trim().min(1).max(max).optional();

const loginSchema = z
  .object({
    id: trimmed(1, 64),
    password: optionalTrimmed(255),
    otp: optionalTrimmed(10)
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;

export const parseLoginInput = (input: unknown): ParseResult<LoginInput> =>
  parseWithSchema(loginSchema, input);
