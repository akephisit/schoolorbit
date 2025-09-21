import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { orgMembership } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { validationError } from '$lib/server/validators/core';
import { parseMembershipUpdateInput } from '$lib/server/validators/org';
import { assertFeatureEnabled } from '$lib/server/features';
import { authorize } from '$lib/server/authorization';

export const PUT: RequestHandler = async ({ locals, params, request }) => {
  await authorize(locals, 'user:manage');
  await assertFeatureEnabled(locals, 'org-management');
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
  await authorize(locals, 'user:manage');
  await assertFeatureEnabled(locals, 'org-management');
  await db.delete(orgMembership).where(eq(orgMembership.id, params.id));
  return json({ ok: true });
};
