import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/database';
import { featureToggle } from '$lib/server/schema';

export async function getEnabledFeatures(locals?: App.Locals | null): Promise<string[]> {
  if (locals?.features) {
    return locals.features;
  }

  const rows = await db
    .select({ code: featureToggle.code })
    .from(featureToggle)
    .where(eq(featureToggle.enabled, true));

  const codes = rows.map((row) => row.code);
  if (locals) {
    locals.features = codes;
  }
  return codes;
}

export async function assertFeatureEnabled(locals: App.Locals | null, code: string) {
  const features = await getEnabledFeatures(locals);
  if (!features.includes(code)) {
    throw error(403, 'ฟีเจอร์นี้ถูกปิดใช้งาน');
  }
}
