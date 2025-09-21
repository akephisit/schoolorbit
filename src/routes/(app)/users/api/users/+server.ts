import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { appUser, userRole, role } from '$lib/server/schema';
import { eq, ilike, inArray, or } from 'drizzle-orm';
import { hash } from 'argon2';
import { hashNationalId, encryptPII } from '$lib/server/crypto';
import { validationError } from '$lib/server/validators/core';
import {
  buildDisplayName,
  parseCreateUserInput,
  parseListUsersQuery,
  validateRoleCodes
} from '$lib/server/validators/users';
import { assertFeatureEnabled } from '$lib/server/features';

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) {
    return error(403, 'Forbidden');
  }
  await assertFeatureEnabled(locals, 'user-management');

  const { q, page, limit } = parseListUsersQuery(url.searchParams);
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
  await assertFeatureEnabled(locals, 'user-management');
  const jsonBody = await request.json().catch(() => ({}));
  const parsed = parseCreateUserInput(jsonBody);
  if (!parsed.ok) {
    return validationError(parsed.error);
  }

  const { email, displayName, title, firstName, lastName, password, nationalId, roles, status } = parsed.data;

  const resolvedDisplayName = displayName ?? buildDisplayName({ title, firstName, lastName });
  if (!resolvedDisplayName) {
    return validationError({
      message: 'กรุณาระบุชื่อที่จะแสดงผลหรือใส่คำนำหน้า/ชื่อ/นามสกุลให้ครบ',
      fieldErrors: { displayName: ['ต้องมีชื่อแสดงผล'] }
    });
  }

  const passwordHash = password ? await hash(password) : null;
  const nationalIdHash = hashNationalId(nationalId);
  const nationalIdEnc = encryptPII(nationalId);

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
        status,
        nationalIdHash,
        nationalIdEnc
      })
      .returning({ id: appUser.id });
    inserted = ins[0];
  } catch (e) {
    return error(400, 'ไม่สามารถสร้างผู้ใช้ได้ (อีเมลหรือเลขบัตรอาจซ้ำ)');
  }

  // map role codes -> ids
  const roleCodes = validateRoleCodes(roles);
  if (roleCodes.length) {
    const rws = await db.select().from(role).where(inArray(role.code, roleCodes));
    const roleIdByCode = new Map(rws.map(r => [r.code, r.id] as const));
    const vals = roleCodes
      .filter(c => roleIdByCode.has(c))
      .map(c => ({ userId: inserted.id, roleId: roleIdByCode.get(c)! }));
    if (vals.length) await db.insert(userRole).values(vals);
  }

  return json({ data: { id: inserted.id } }, { status: 201 });
};
