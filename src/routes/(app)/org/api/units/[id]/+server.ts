import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { orgUnit } from '$lib/server/schema';
import { eq } from 'drizzle-orm';

export const PUT: RequestHandler = async ({ locals, params, request }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  const id = params.id;
  const body = await request.json().catch(() => ({}));
  const patch: any = {};
  if (typeof body.nameTh === 'string') patch.nameTh = body.nameTh.trim();
  if (typeof body.type === 'string' || body.type === null) patch.type = body.type ?? null;
  if (typeof body.parentId === 'string' || body.parentId === null) patch.parentId = body.parentId ?? null;
  if (!Object.keys(patch).length) return json({ ok: true });
  await db.update(orgUnit).set(patch).where(eq(orgUnit.id, id));
  return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  const id = params.id;
  await db.delete(orgUnit).where(eq(orgUnit.id, id));
  return json({ ok: true });
};

