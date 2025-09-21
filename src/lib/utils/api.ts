export interface ApiErrorBody {
  message: string;
  fieldErrors: Record<string, string[]>;
  formErrors: string[];
}

export const emptyApiError = (): ApiErrorBody => ({ message: 'เกิดข้อผิดพลาด', fieldErrors: {}, formErrors: [] });

export const parseApiError = async (res: Response): Promise<ApiErrorBody> => {
  const fallback = emptyApiError();
  fallback.message = res.statusText || fallback.message;
  if (!res) {
    return fallback;
  }
  try {
    const data = await res.json();
    const error = data?.error ?? {};
    return {
      message: typeof error.message === 'string' && error.message.length ? error.message : fallback.message,
      fieldErrors: typeof error.fieldErrors === 'object' && error.fieldErrors ? error.fieldErrors : {},
      formErrors: Array.isArray(error.formErrors) ? error.formErrors : []
    };
  } catch {
    return fallback;
  }
};

export const firstFieldErrorMap = (fieldErrors: Record<string, string[]>): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const [field, errors] of Object.entries(fieldErrors)) {
    if (errors && errors.length) {
      map[field] = errors[0];
    }
  }
  return map;
};
