import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { position } from '$lib/server/schema';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  const rows = await db.select().from(position);
  return json({ data: rows });
};

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  const body = await request.json().catch(() => ({}));
  const code = (body.code || '').trim();
  const titleTh = (body.titleTh || '').trim();
  const category = typeof body.category === 'string' ? body.category : null;
  if (!code || !titleTh) return error(400, 'code และ titleTh ต้องระบุ');
  try {
    const ins = await db.insert(position).values({ code, titleTh, category: category || undefined }).returning({ id: position.id });
    return json({ data: { id: ins[0].id } }, { status: 201 });
  } catch {
    return error(400, 'ไม่สามารถสร้างตำแหน่งได้ (อาจซ้ำ)');
  }
};

