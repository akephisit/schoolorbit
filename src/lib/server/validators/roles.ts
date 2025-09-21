import { z } from 'zod';
import { parseWithSchema } from './core';
import type { ParseResult } from './core';

const trimmedString = (min: number, max: number) => z.string().trim().min(min).max(max);

const codeSchema = trimmedString(1, 64).regex(/^[a-z0-9:_-]+$/i, {
  message: 'โค้ดต้องเป็นตัวอักษร หรือตัวเลข และอาจมี _ - :'
});

const nameSchema = trimmedString(1, 100);

const permissionCreateSchema = z
  .object({
    code: codeSchema,
    name: nameSchema
  })
  .strict();

const permissionUpdateSchema = z
  .object({
    name: nameSchema
  })
  .strict();

const roleUpdateSchema = z
  .object({
    name: nameSchema
  })
  .strict();

const rolePermissionsSchema = z
  .object({
    permissions: z.array(codeSchema).default([])
  })
  .strict();

export type PermissionCreateInput = z.infer<typeof permissionCreateSchema>;
export type PermissionUpdateInput = z.infer<typeof permissionUpdateSchema>;
export type RolePermissionsInput = z.infer<typeof rolePermissionsSchema>;
export type RoleUpdateInput = z.infer<typeof roleUpdateSchema>;

export const parsePermissionCreateInput = (input: unknown): ParseResult<PermissionCreateInput> =>
  parseWithSchema(permissionCreateSchema, input);

export const parsePermissionUpdateInput = (input: unknown): ParseResult<PermissionUpdateInput> =>
  parseWithSchema(permissionUpdateSchema, input);

export const parseRolePermissionsInput = (input: unknown): ParseResult<RolePermissionsInput> =>
  parseWithSchema(rolePermissionsSchema, input);

export const parseRoleUpdateInput = (input: unknown): ParseResult<RoleUpdateInput> =>
  parseWithSchema(roleUpdateSchema, input);
