import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { appUser, userRole, role } from '$lib/server/schema';
import { eq, ilike, inArray, or } from 'drizzle-orm';
import { hash } from 'argon2';
import { hashNationalId, encryptPII } from '$lib/server/crypto';

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) {
    return error(403, 'Forbidden');
  }

  const q = url.searchParams.get('q')?.trim();
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || '50')));
  const offset = (page - 1) * limit;

  const where = q
    ? or(
        ilike(appUser.displayName, `%${q}%`),
        ilike(appUser.firstName, `%${q}%`),
        ilike(appUser.lastName, `%${q}%`),
        ilike(appUser.title, `%${q}%`)
      )
    : undefined;

  const baseQuery = db
    .select({
      id: appUser.id,
      email: appUser.email,
      displayName: appUser.displayName,
      title: appUser.title,
      firstName: appUser.firstName,
      lastName: appUser.lastName,
      status: appUser.status
    })
    .from(appUser);

  const users = await (where ? baseQuery.where(where) : baseQuery)
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
  const title = typeof body.title === 'string' ? body.title.trim() : null;
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : null;
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : null;
  const password = typeof body.password === 'string' ? body.password : null;
  const nationalIdRaw = typeof body.nationalId === 'string' ? body.nationalId.trim() : null;
  let rolesInput: string[] = Array.isArray(body.roles) ? body.roles : [];
  // Enforce fixed roles set
  const allowed = new Set(['staff', 'student', 'parent']);
  rolesInput = rolesInput.filter((r) => allowed.has(r));
  const status = (['active', 'inactive', 'suspended'] as const).includes(body.status)
    ? body.status
    : 'active';

  const resolvedDisplayName = displayName || [title, firstName, lastName].filter(Boolean).join(' ').trim();

  if (!email || !resolvedDisplayName) {
    return error(400, 'ต้องระบุ email และชื่อที่จะแสดงผล');
  }
  if (!firstName || !lastName) {
    return error(400, 'ต้องระบุชื่อและนามสกุล');
  }
  if (!nationalIdRaw) {
    return error(400, 'ต้องระบุเลขบัตรประชาชน');
  }

  const digits = nationalIdRaw.replace(/\D/g, '');
  if (digits.length !== 13) {
    return error(400, 'เลขบัตรประชาชนไม่ถูกต้อง');
  }

  let passwordHash: string | null = null;
  if (password && password.length >= 8) {
    passwordHash = await hash(password);
  }

  // prepare national id fields
  const nationalIdHash = hashNationalId(digits);
  const nationalIdEnc = encryptPII(digits);

  // insert user
  let inserted;
  try {
    const ins = await db
      .insert(appUser)
      .values({
        email,
        displayName: resolvedDisplayName,
        title,
        firstName,
        lastName,
        passwordHash,
        status: status as any,
        nationalIdHash,
        nationalIdEnc
      })
      .returning({ id: appUser.id });
    inserted = ins[0];
  } catch (e) {
    return error(400, 'ไม่สามารถสร้างผู้ใช้ได้ (อีเมลหรือเลขบัตรอาจซ้ำ)');
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
