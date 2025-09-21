import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { orgUnit } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { validationError } from '$lib/server/validators/core';
import { parseCreateUnitInput } from '$lib/server/validators/org';
import { assertFeatureEnabled } from '$lib/server/features';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  await assertFeatureEnabled(locals, 'org-management');
  const rows = await db.select().from(orgUnit);
  return json({ data: rows });
};

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  await assertFeatureEnabled(locals, 'org-management');
  const body = await request.json().catch(() => ({}));
  const parsed = parseCreateUnitInput(body);
  if (!parsed.ok) {
    return validationError(parsed.error);
  }
  const { code, nameTh, type, parentId } = parsed.data;
  try {
    const ins = await db
      .insert(orgUnit)
      .values({
        code,
        nameTh,
        type: type ?? undefined,
        parentId: parentId ?? undefined
      })
      .returning({ id: orgUnit.id });
    return json({ data: { id: ins[0].id } }, { status: 201 });
  } catch {
    return error(400, 'ไม่สามารถสร้างหน่วยงานได้ (อาจซ้ำ)');
  }
};
