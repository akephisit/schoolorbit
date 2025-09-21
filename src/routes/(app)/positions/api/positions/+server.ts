import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { position } from '$lib/server/schema';
import { validationError } from '$lib/server/validators/core';
import { parseCreatePositionInput } from '$lib/server/validators/positions';
import { assertFeatureEnabled } from '$lib/server/features';
import { authorize } from '$lib/server/authorization';

export const GET: RequestHandler = async ({ locals }) => {
  await authorize(locals, 'user:manage');
  await assertFeatureEnabled(locals, 'position-management');
  const rows = await db.select().from(position);
  return json({ data: rows });
};

export const POST: RequestHandler = async ({ locals, request }) => {
  await authorize(locals, 'user:manage');
  await assertFeatureEnabled(locals, 'position-management');
  const body = await request.json().catch(() => ({}));
  const parsed = parseCreatePositionInput(body);
  if (!parsed.ok) {
    return validationError(parsed.error);
  }
  const { code, titleTh, category } = parsed.data;
  try {
    const ins = await db
      .insert(position)
      .values({ code, titleTh, category: category ?? undefined })
      .returning({ id: position.id });
    return json({ data: { id: ins[0].id } }, { status: 201 });
  } catch {
    return error(400, 'ไม่สามารถสร้างตำแหน่งได้ (อาจซ้ำ)');
  }
};
