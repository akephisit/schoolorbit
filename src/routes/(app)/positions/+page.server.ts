import type { PageServerLoad } from './$types';
import { assertFeatureEnabled } from '$lib/server/features';
import { authorize } from '$lib/server/authorization';

export const load: PageServerLoad = async ({ locals }) => {
  await authorize(locals, 'user:manage');
  await assertFeatureEnabled(locals, 'position-management');
  return {};
};
