import type { PageServerLoad } from './$types';
import { authorize } from '$lib/server/authorization';

export const load: PageServerLoad = async ({ locals }) => {
  await authorize(locals, 'grade:read');
  return {};
};
