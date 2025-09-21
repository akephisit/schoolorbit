import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { assertFeatureEnabled } from '$lib/server/features';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) throw error(403, 'Forbidden');
  await assertFeatureEnabled(locals, 'homeroom');
  return {};
};
