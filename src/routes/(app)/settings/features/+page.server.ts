import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { listFeatureAdminItems } from '$lib/server/features-admin';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.me?.data?.perms?.includes('feature:manage')) {
		throw error(403, 'Forbidden');
	}

	const features = await listFeatureAdminItems(locals);

	return {
		features
	};
};
