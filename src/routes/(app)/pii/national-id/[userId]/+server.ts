import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { appUser } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { decryptPII, maskNationalId } from '$lib/server/crypto';
import { authorize } from '$lib/server/authorization';

export const GET: RequestHandler = async ({ locals, params, url }) => {
  if (!locals.me?.data?.user?.id) return error(401, 'Unauthorized');

  const userId = params.userId;
  const wantFull = url.searchParams.get('full') === '1';

  // Read centralized PII from app_user
  const rows = await db.select({ enc: appUser.nationalIdEnc }).from(appUser).where(eq(appUser.id, userId)).limit(1);
  const enc: string | null = rows[0]?.enc ?? null;

  if (!enc) return json({ data: { masked: null, full: null } });

  try {
    const nid = decryptPII(enc);
    if (wantFull) {
      await authorize(locals, 'pii:view');
      return json({ data: { masked: maskNationalId(nid), full: nid } });
    }
    return json({ data: { masked: maskNationalId(nid), full: null } });
  } catch (e) {
    console.error('PII decrypt error', e);
    return error(500, 'ไม่สามารถถอดรหัสข้อมูลได้');
  }
};
