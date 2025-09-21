import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.me?.data?.user?.id) {
    return error(401, 'Unauthorized');
  }

  return json({
    data: [
      {
        label: 'แดชบอร์ด',
        href: '/dashboard',
        icon: 'i-lucide-home'
      }
    ]
  });
};
