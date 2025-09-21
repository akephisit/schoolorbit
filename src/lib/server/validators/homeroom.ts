import { z } from 'zod';
import { parseWithSchema } from './core';
import type { ParseResult } from './core';

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);
const optionalTrimmed = (max: number) => z.string().trim().min(1).max(max).optional();

const assignmentCreateSchema = z
  .object({
    classCode: trimmed(1, 32),
    teacherEmail: z.string().trim().email({ message: 'อีเมลไม่ถูกต้อง' }).max(255)
  })
  .strict();

const assignmentUpdateSchema = z
  .object({
    classCode: optionalTrimmed(32)
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'ไม่มีข้อมูลที่จะแก้ไข'
  });

export type HomeroomAssignmentCreateInput = z.infer<typeof assignmentCreateSchema>;
export type HomeroomAssignmentUpdateInput = z.infer<typeof assignmentUpdateSchema>;

export const parseHomeroomAssignmentCreate = (input: unknown): ParseResult<HomeroomAssignmentCreateInput> =>
  parseWithSchema(assignmentCreateSchema, input);

export const parseHomeroomAssignmentUpdate = (input: unknown): ParseResult<HomeroomAssignmentUpdateInput> =>
  parseWithSchema(assignmentUpdateSchema, input);
