import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { appUser } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { buildDisplayName, parseUpdateUserInput } from '$lib/server/validators/users';

export const PUT: RequestHandler = async ({ locals, params, request }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) {
    return error(403, 'Forbidden');
  }
  const id = params.id;
  const jsonBody = await request.json().catch(() => ({}));
  const parsed = parseUpdateUserInput(jsonBody);
  if (!parsed.ok) {
    return error(400, parsed.message);
  }

  const update = parsed.data;

  const existingRows = await db
    .select({
      id: appUser.id,
      email: appUser.email,
      displayName: appUser.displayName,
      title: appUser.title,
      firstName: appUser.firstName,
      lastName: appUser.lastName,
      status: appUser.status
    })
    .from(appUser)
    .where(eq(appUser.id, id))
    .limit(1);

  if (!existingRows.length) {
    return error(404, 'ไม่พบผู้ใช้');
  }

  const current = existingRows[0];
  const has = (key: keyof typeof update) => Object.prototype.hasOwnProperty.call(update, key);

  const nextTitle = has('title') ? (update.title ?? null) : current.title;
  const nextFirst = has('firstName') ? (update.firstName ?? null) : current.firstName;
  const nextLast = has('lastName') ? (update.lastName ?? null) : current.lastName;

  const computedDisplayName = buildDisplayName({ title: nextTitle, firstName: nextFirst, lastName: nextLast }) ?? current.displayName;
  const nextDisplayName = has('displayName')
    ? update.displayName ?? computedDisplayName
    : computedDisplayName;

  if (!nextDisplayName) {
    return error(400, 'ไม่สามารถกำหนดชื่อแสดงผลได้');
  }

  const patch: Record<string, unknown> = { displayName: nextDisplayName };
  if (has('email') && update.email !== undefined) patch.email = update.email;
  if (has('status') && update.status) patch.status = update.status;
  if (has('title')) patch.title = nextTitle;
  if (has('firstName')) patch.firstName = nextFirst;
  if (has('lastName')) patch.lastName = nextLast;

  try {
    await db.update(appUser).set(patch).where(eq(appUser.id, id));
  } catch {
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
