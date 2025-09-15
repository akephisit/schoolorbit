import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { appUser } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { hash } from 'argon2';

export const POST: RequestHandler = async ({ locals, params, request }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) {
    return error(403, 'Forbidden');
  }
  const id = params.id;
  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === 'string' ? body.password : '';
  if (password.length < 8) {
    return error(400, 'รหัสผ่านต้องอย่างน้อย 8 ตัวอักษร');
  }
  const passwordHash = await hash(password);
  await db.update(appUser).set({ passwordHash }).where(eq(appUser.id, id));
  return json({ ok: true });
};

