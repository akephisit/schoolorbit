import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { appUser } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { hash } from 'argon2';
import { validationError } from '$lib/server/validators/core';
import { parsePasswordChangeInput } from '$lib/server/validators/users';
import { assertFeatureEnabled } from '$lib/server/features';

export const POST: RequestHandler = async ({ locals, params, request }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) {
    return error(403, 'Forbidden');
  }
  await assertFeatureEnabled(locals, 'user-management');
  const id = params.id;
  const jsonBody = await request.json().catch(() => ({}));
  const parsed = parsePasswordChangeInput(jsonBody);
  if (!parsed.ok) {
    return validationError(parsed.error);
  }

  const passwordHash = await hash(parsed.data.password);
  await db.update(appUser).set({ passwordHash }).where(eq(appUser.id, id));
  return json({ ok: true });
};
