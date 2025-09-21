import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { orgMembership } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { validationError } from '$lib/server/validators/core';
import { parseMembershipUpdateInput } from '$lib/server/validators/org';

export const PUT: RequestHandler = async ({ locals, params, request }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  const id = params.id;
  const body = await request.json().catch(() => ({}));
  const parsed = parseMembershipUpdateInput(body);
  if (!parsed.ok) {
    return validationError(parsed.error);
  }
  await db.update(orgMembership).set(parsed.data).where(eq(orgMembership.id, id));
  return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  await db.delete(orgMembership).where(eq(orgMembership.id, params.id));
  return json({ ok: true });
};
