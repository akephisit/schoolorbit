import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  const perms = locals.me?.data?.perms ?? [] as string[];
  if (!perms.includes('grade:read')) {
    throw error(403, 'Forbidden');
  }
  return {};
};

