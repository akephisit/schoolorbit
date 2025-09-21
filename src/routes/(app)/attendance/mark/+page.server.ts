import type { PageServerLoad } from './$types';
import { authorize } from '$lib/server/authorization';
import { assertFeatureEnabled } from '$lib/server/features';

export const load: PageServerLoad = async ({ locals }) => {
  await authorize(locals, 'attend:write');
  await assertFeatureEnabled(locals, 'attendance-mark');
  return {};
};
