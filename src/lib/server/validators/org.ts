import { z } from 'zod';
import { parseWithSchema } from './core';
import type { ParseResult } from './core';

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);
const optionalTrimmed = (max: number) => z.string().trim().min(1).max(max).optional();
const optionalNullableTrimmed = (max: number) => z.union([z.string().trim().min(1).max(max), z.null()]).optional();

const uuidString = z.string().uuid({ message: 'ต้องเป็นรหัสหน่วยงานที่ถูกต้อง' });

const createUnitSchema = z
  .object({
    code: trimmed(1, 64),
    nameTh: trimmed(1, 255),
    type: z.string().trim().max(64).optional(),
    parentId: z.union([uuidString, z.null()]).optional()
  })
  .strict();

const updateUnitSchema = z
  .object({
    nameTh: optionalTrimmed(255),
    type: optionalNullableTrimmed(64),
    parentId: z.union([uuidString, z.null()]).optional()
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'ไม่มีข้อมูลที่จะแก้ไข'
  });

const membershipCreateSchema = z
  .object({
    unitId: uuidString,
    userEmail: z.string().trim().email({ message: 'อีเมลไม่ถูกต้อง' }).max(255),
    roleInUnit: z.enum(['head', 'deputy', 'member']).default('member')
  })
  .strict();

const membershipUpdateSchema = z
  .object({
    roleInUnit: z.enum(['head', 'deputy', 'member'])
  })
  .strict();

const membershipListQuerySchema = z.object({
  unitId: uuidString
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
export type MembershipCreateInput = z.infer<typeof membershipCreateSchema>;
export type MembershipUpdateInput = z.infer<typeof membershipUpdateSchema>;
export type MembershipListQuery = z.infer<typeof membershipListQuerySchema>;

export const parseCreateUnitInput = (input: unknown): ParseResult<CreateUnitInput> =>
  parseWithSchema(createUnitSchema, input);

export const parseUpdateUnitInput = (input: unknown): ParseResult<UpdateUnitInput> =>
  parseWithSchema(updateUnitSchema, input);

export const parseMembershipCreateInput = (input: unknown): ParseResult<MembershipCreateInput> =>
  parseWithSchema(membershipCreateSchema, input);

export const parseMembershipUpdateInput = (input: unknown): ParseResult<MembershipUpdateInput> =>
  parseWithSchema(membershipUpdateSchema, input);

export const parseMembershipListQuery = (params: URLSearchParams): MembershipListQuery | null => {
  const result = membershipListQuerySchema.safeParse({ unitId: params.get('unitId') });
  if (!result.success) {
    return null;
  }
  return result.data;
};
