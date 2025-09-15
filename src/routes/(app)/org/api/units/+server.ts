import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { orgUnit } from '$lib/server/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  const rows = await db.select().from(orgUnit);
  return json({ data: rows });
};

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  const body = await request.json().catch(() => ({}));
  const code = (body.code || '').trim();
  const nameTh = (body.nameTh || '').trim();
  const type = typeof body.type === 'string' ? body.type : null;
  const parentId = typeof body.parentId === 'string' && body.parentId ? body.parentId : null;
  if (!code || !nameTh) return error(400, 'code และ nameTh ต้องระบุ');
  try {
    const ins = await db.insert(orgUnit).values({ code, nameTh, type: type || undefined, parentId: parentId || undefined }).returning({ id: orgUnit.id });
    return json({ data: { id: ins[0].id } }, { status: 201 });
  } catch {
    return error(400, 'ไม่สามารถสร้างหน่วยงานได้ (อาจซ้ำ)');
  }
};

