import { error } from '@sveltejs/kit';
import { getFeatureRuntimeSnapshot } from './feature-runtime';

export async function getEnabledFeatures(locals?: App.Locals | null): Promise<string[]> {
  if (locals?.features) {
    return locals.features;
  }

  const snapshot = await getFeatureRuntimeSnapshot(locals);
  const enabled = Object.entries(snapshot)
    .filter(([, value]) => value.enabled)
    .map(([key]) => key);

  if (locals) {
    locals.features = enabled;
  }

  return enabled;
}

export async function assertFeatureEnabled(locals: App.Locals | null, code: string) {
  const snapshot = await getFeatureRuntimeSnapshot(locals);
  if (!snapshot[code]?.enabled) {
    throw error(403, 'ฟีเจอร์นี้ถูกปิดใช้งาน');
  }
}
