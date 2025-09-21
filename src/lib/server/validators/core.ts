import { json } from '@sveltejs/kit';
import { z } from 'zod';

export interface ValidationErrorPayload {
  message: string;
  fieldErrors?: Record<string, string[]>;
  formErrors?: string[];
}

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ValidationErrorPayload };

const DEFAULT_VALIDATION_MESSAGE = 'ข้อมูลไม่ถูกต้อง';

const normalizeFieldErrors = (fieldErrors: Record<string, string[] | undefined>) => {
  const normalized: Record<string, string[]> = {};
  for (const [key, errors] of Object.entries(fieldErrors)) {
    if (errors && errors.length) {
      normalized[key] = errors;
    }
  }
  return normalized;
};

export const fromZodError = (error: z.ZodError, overrideMessage?: string): ValidationErrorPayload => {
  const flattened = error.flatten();
  const message = overrideMessage || flattened.formErrors[0] || DEFAULT_VALIDATION_MESSAGE;
  const fieldErrors = normalizeFieldErrors(flattened.fieldErrors);
  const payload: ValidationErrorPayload = { message };
  if (Object.keys(fieldErrors).length) {
    payload.fieldErrors = fieldErrors;
  }
  if (flattened.formErrors.length) {
    payload.formErrors = flattened.formErrors;
  }
  return payload;
};

export const parseWithSchema = <Output, Def extends z.ZodTypeDef = z.ZodTypeDef, Input = Output>(
  schema: z.ZodType<Output, Def, Input>,
  input: unknown,
  overrideMessage?: string
): ParseResult<Output> => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: fromZodError(parsed.error, overrideMessage) };
  }
  return { ok: true, data: parsed.data };
};

export const validationError = (payload: ValidationErrorPayload, status = 400) => {
  return json({ error: payload }, { status });
};

export const firstIssueMessage = (error: z.ZodError, fallback = DEFAULT_VALIDATION_MESSAGE) =>
  error.issues[0]?.message ?? fallback;
