import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { personnelProfile, guardianProfile } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { decryptPII, maskNationalId } from '$lib/server/crypto';

export const GET: RequestHandler = async ({ locals, params, url }) => {
  const requesterPerms = locals.me?.data?.perms || [] as string[];
  if (!locals.me?.data?.user?.id) return error(401, 'Unauthorized');

  const userId = params.userId;
  const wantFull = url.searchParams.get('full') === '1';

  // Load from personnel first, then guardian
  const p = await db.select({ enc: personnelProfile.nationalIdEnc }).from(personnelProfile).where(eq(personnelProfile.userId, userId)).limit(1);
  let enc: string | null = p[0]?.enc ?? null;
  if (!enc) {
    const g = await db.select({ enc: guardianProfile.nationalIdEnc }).from(guardianProfile).where(eq(guardianProfile.userId, userId)).limit(1);
    enc = g[0]?.enc ?? null;
  }

  if (!enc) return json({ data: { masked: null, full: null } });

  try {
    const nid = decryptPII(enc);
    if (wantFull) {
      if (!requesterPerms.includes('pii:view')) return error(403, 'Forbidden');
      return json({ data: { masked: maskNationalId(nid), full: nid } });
    }
    return json({ data: { masked: maskNationalId(nid), full: null } });
  } catch (e) {
    console.error('PII decrypt error', e);
    return error(500, 'ไม่สามารถถอดรหัสข้อมูลได้');
  }
};

