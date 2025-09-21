import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { role } from '$lib/server/schema';
import { authorize } from '$lib/server/authorization';

export const GET: RequestHandler = async ({ locals }) => {
  await authorize(locals, 'user:manage');
  const roles = await db.select().from(role);
  return json({ data: roles.map(r => ({ id: r.id, code: r.code, name: r.name })) });
};
