import { z } from 'zod';
import { parseWithSchema } from './core';
import type { ParseResult } from './core';

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);
const optionalTrimmed = (max: number) => z.string().trim().min(1).max(max).optional();
const nullableTrimmed = (max: number) => z.union([z.string().trim().min(1).max(max), z.null()]).optional();

const uuidString = z.string().uuid({ message: 'รหัสไม่ถูกต้อง' });

const createPositionSchema = z
  .object({
    code: trimmed(1, 64),
    titleTh: trimmed(1, 255),
    category: z.string().trim().max(64).optional()
  })
  .strict();

const updatePositionSchema = z
  .object({
    titleTh: optionalTrimmed(255),
    category: nullableTrimmed(64)
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'ไม่มีข้อมูลที่จะแก้ไข'
  });

const assignmentCreateSchema = z
  .object({
    positionId: uuidString,
    userEmail: z.string().trim().email({ message: 'อีเมลไม่ถูกต้อง' }).max(255)
  })
  .strict();

const assignmentListQuerySchema = z.object({
  positionId: z.union([uuidString, z.undefined()]).optional()
});

export type CreatePositionInput = z.infer<typeof createPositionSchema>;
export type UpdatePositionInput = z.infer<typeof updatePositionSchema>;
export type AssignmentCreateInput = z.infer<typeof assignmentCreateSchema>;
export type AssignmentListQuery = z.infer<typeof assignmentListQuerySchema>;

export const parseCreatePositionInput = (input: unknown): ParseResult<CreatePositionInput> =>
  parseWithSchema(createPositionSchema, input);

export const parseUpdatePositionInput = (input: unknown): ParseResult<UpdatePositionInput> =>
  parseWithSchema(updatePositionSchema, input);

export const parseAssignmentCreateInput = (input: unknown): ParseResult<AssignmentCreateInput> =>
  parseWithSchema(assignmentCreateSchema, input);

export const parseAssignmentListQuery = (params: URLSearchParams): AssignmentListQuery | null => {
  const raw: Record<string, string | undefined> = {
    positionId: params.get('positionId') ?? undefined
  };
  const result = assignmentListQuerySchema.safeParse(raw);
  if (!result.success) {
    return null;
  }
  return result.data;
};
