import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) throw error(403, 'Forbidden');
  return {};
};

