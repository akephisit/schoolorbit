import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { permission } from '$lib/server/schema';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  const rows = await db.select().from(permission);
  return json({ data: rows.map(p => ({ id: p.id, code: p.code, name: p.name })) });
};

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!code || !name) return error(400, 'code และ name ต้องระบุ');
  if (!/^[a-z0-9:_-]+$/i.test(code)) return error(400, 'รูปแบบ code ไม่ถูกต้อง');
  try {
    const ins = await db.insert(permission).values({ code, name }).returning({ id: permission.id });
    return json({ data: { id: ins[0].id } }, { status: 201 });
  } catch (e) {
    return error(400, 'ไม่สามารถสร้างสิทธิ์ได้ (อาจซ้ำ)');
  }
};

