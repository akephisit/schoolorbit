import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { appUser } from '$lib/server/schema';
import { eq } from 'drizzle-orm';

export const PUT: RequestHandler = async ({ locals, params, request }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) {
    return error(403, 'Forbidden');
  }
  const id = params.id;
  const body = await request.json().catch(() => ({}));
  const patch: any = {};
  if (typeof body.email === 'string') patch.email = body.email.trim();
  if (typeof body.displayName === 'string') {
    const val = body.displayName.trim();
    if (!val) {
      return error(400, 'displayName ห้ามว่าง');
    }
    patch.displayName = val;
  }
  if (typeof body.title === 'string') {
    const val = body.title.trim();
    patch.title = val || null;
  }
  if (typeof body.firstName === 'string') {
    const val = body.firstName.trim();
    if (!val) {
      return error(400, 'ชื่อห้ามว่าง');
    }
    patch.firstName = val;
  }
  if (typeof body.lastName === 'string') {
    const val = body.lastName.trim();
    if (!val) {
      return error(400, 'นามสกุลห้ามว่าง');
    }
    patch.lastName = val;
  }
  if (typeof body.status === 'string' && ['active', 'inactive', 'suspended'].includes(body.status)) patch.status = body.status;

  if (Object.keys(patch).length === 0) {
    return error(400, 'ไม่มีข้อมูลที่จะแก้ไข');
  }

  try {
    await db.update(appUser).set(patch).where(eq(appUser.id, id));
  } catch (e) {
    return error(400, 'อัปเดตไม่สำเร็จ (อีเมลอาจซ้ำ)');
  }
  return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) {
    return error(403, 'Forbidden');
  }
  const id = params.id;
  await db.delete(appUser).where(eq(appUser.id, id));
  return new Response(null, { status: 204 });
};
