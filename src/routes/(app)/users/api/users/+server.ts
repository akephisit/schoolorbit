import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { appUser, userRole, role } from '$lib/server/schema';
import { and, eq, ilike, inArray, sql } from 'drizzle-orm';
import { hash } from 'argon2';

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) {
    return error(403, 'Forbidden');
  }

  const q = url.searchParams.get('q')?.trim();
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || '50')));
  const offset = (page - 1) * limit;

  const where = q
    ? ilike(appUser.displayName, `%${q}%`)
    : undefined;

  const users = await db
    .select({ id: appUser.id, email: appUser.email, displayName: appUser.displayName, status: appUser.status })
    .from(appUser)
    .where(where as any)
    .offset(offset)
    .limit(limit);

  if (users.length === 0) {
    return json({ data: [], page, limit, total: 0 });
  }

  const ids = users.map(u => u.id);
  const roleRows = await db
    .select({ userId: userRole.userId, code: role.code })
    .from(userRole)
    .innerJoin(role, eq(userRole.roleId, role.id))
    .where(inArray(userRole.userId, ids));

  const byUser: Record<string, string[]> = {};
  for (const r of roleRows) {
    (byUser[r.userId] ||= []).push(r.code);
  }

  const data = users.map(u => ({ ...u, roles: byUser[u.id] || [] }));
  return json({ data, page, limit });
};

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) {
    return error(403, 'Forbidden');
  }
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim() : null;
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : null;
  const password = typeof body.password === 'string' ? body.password : null;
  const rolesInput: string[] = Array.isArray(body.roles) ? body.roles : [];
  const status = (['active', 'inactive', 'suspended'] as const).includes(body.status)
    ? body.status
    : 'active';

  if (!email || !displayName) {
    return error(400, 'email และ displayName ต้องระบุ');
  }

  let passwordHash: string | null = null;
  if (password && password.length >= 8) {
    passwordHash = await hash(password);
  }

  // insert user
  let inserted;
  try {
    const ins = await db
      .insert(appUser)
      .values({ email, displayName, passwordHash, status: status as any })
      .returning({ id: appUser.id });
    inserted = ins[0];
  } catch (e) {
    return error(400, 'ไม่สามารถสร้างผู้ใช้ได้ (อีเมลอาจซ้ำ)');
  }

  // map role codes -> ids
  if (rolesInput.length) {
    const rws = await db.select().from(role).where(inArray(role.code, rolesInput));
    const roleIdByCode = new Map(rws.map(r => [r.code, r.id] as const));
    const vals = rolesInput
      .filter(c => roleIdByCode.has(c))
      .map(c => ({ userId: inserted.id, roleId: roleIdByCode.get(c)! }));
    if (vals.length) await db.insert(userRole).values(vals);
  }

  return json({ data: { id: inserted.id } }, { status: 201 });
};

