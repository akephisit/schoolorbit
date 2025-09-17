import { z } from 'zod';

export const allowedRoleCodes = ['staff', 'student', 'parent'] as const;
export const allowedStatusCodes = ['active', 'inactive', 'suspended'] as const;

type RoleCode = (typeof allowedRoleCodes)[number];

type ParseSuccess<T> = { ok: true; data: T };
type ParseFailure = { ok: false; message: string };

export type ParseResult<T> = ParseSuccess<T> | ParseFailure;

const firstIssueMessage = (error: z.ZodError): string => error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง';

const trimmedString = (min: number, max: number) => z.string().trim().min(min).max(max);

const requiredEmail = z.preprocess(
  (val) => (typeof val === 'string' ? val.trim() : val),
  trimmedString(1, 255).email({ message: 'อีเมลไม่ถูกต้อง' })
);

const optionalEmail = z.preprocess(
  (val) => {
    if (typeof val === 'string') {
      const trimmed = val.trim();
      return trimmed.length ? trimmed : undefined;
    }
    if (val === null || val === undefined) return undefined;
    return val;
  },
  trimmedString(1, 255).email({ message: 'อีเมลไม่ถูกต้อง' }).optional()
);

const requiredName = (max: number) =>
  z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    trimmedString(1, max)
  );

const optionalName = (max: number) =>
  z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed.length ? trimmed : null;
      }
      if (val === null) return null;
      if (val === undefined) return undefined;
      return val;
    },
    z.union([trimmedString(1, max), z.null()]).optional()
  );

const optionalString = (min: number, max: number) =>
  z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed.length ? trimmed : undefined;
      }
      if (val === null || val === undefined) return undefined;
      return val;
    },
    trimmedString(min, max).optional()
  );

const nationalIdSchema = z.preprocess(
  (val) => (typeof val === 'string' ? val.replace(/\D/g, '') : val),
  z.string().regex(/^\d{13}$/u, 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก')
);

const rolesArray = z
  .array(z.enum(allowedRoleCodes))
  .default([])
  .transform((vals) => Array.from(new Set<RoleCode>(vals as RoleCode[])));

const createUserSchema = z
  .object({
    email: requiredEmail,
    displayName: optionalString(1, 255),
    title: optionalName(32),
    firstName: requiredName(100),
    lastName: requiredName(100),
    password: optionalString(8, 255),
    nationalId: nationalIdSchema,
    roles: rolesArray,
    status: z.enum(allowedStatusCodes).default('active')
  })
  .strict();

export type CreateUserInput = z.infer<typeof createUserSchema>;

const updateUserSchema = z
  .object({
    email: optionalEmail,
    displayName: optionalString(1, 255),
    title: optionalName(32),
    firstName: optionalName(100),
    lastName: optionalName(100),
    status: z.enum(allowedStatusCodes).optional()
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'ไม่มีข้อมูลที่จะแก้ไข'
  });

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

const listUsersQuerySchema = z.object({
  q: optionalString(1, 255),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

const roleAssignmentSchema = z
  .object({
    roles: rolesArray.optional()
  })
  .strict();

export type RoleAssignmentInput = z.infer<typeof roleAssignmentSchema>;

const passwordChangeSchema = z
  .object({
    password: z
      .string()
      .transform((val) => val.trim())
      .pipe(z.string().min(8, 'รหัสผ่านต้องอย่างน้อย 8 ตัวอักษร').max(255))
  })
  .strict();

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

export const parseCreateUserInput = (input: unknown): ParseResult<CreateUserInput> => {
  const result = createUserSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, message: firstIssueMessage(result.error) };
  }
  return { ok: true, data: result.data };
};

export const parseUpdateUserInput = (input: unknown): ParseResult<UpdateUserInput> => {
  const result = updateUserSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, message: firstIssueMessage(result.error) };
  }
  return { ok: true, data: result.data };
};

export const parseListUsersQuery = (params: URLSearchParams): ListUsersQuery => {
  const raw = {
    q: params.get('q') ?? undefined,
    page: params.get('page') ?? undefined,
    limit: params.get('limit') ?? undefined
  };
  const result = listUsersQuerySchema.safeParse(raw);
  if (!result.success) {
    return { q: undefined, page: 1, limit: 50 } satisfies ListUsersQuery;
  }
  return result.data;
};

export const parseRoleAssignmentInput = (input: unknown): ParseResult<RoleAssignmentInput> => {
  const result = roleAssignmentSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, message: firstIssueMessage(result.error) };
  }
  return { ok: true, data: result.data };
};

export const parsePasswordChangeInput = (input: unknown): ParseResult<PasswordChangeInput> => {
  const result = passwordChangeSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, message: firstIssueMessage(result.error) };
  }
  return { ok: true, data: result.data };
};

export const buildDisplayName = ({
  title,
  firstName,
  lastName
}: {
  title?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): string | null => {
  const parts = [title, firstName, lastName]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean);
  const joined = parts.join(' ').trim();
  return joined.length ? joined : null;
};

export const validateRoleCodes = (codes: string[]): RoleCode[] => {
  const allowed = new Set<RoleCode>(allowedRoleCodes);
  const deduped: RoleCode[] = [];
  for (const code of codes) {
    if (allowed.has(code as RoleCode) && !deduped.includes(code as RoleCode)) {
      deduped.push(code as RoleCode);
    }
  }
  return deduped;
};
