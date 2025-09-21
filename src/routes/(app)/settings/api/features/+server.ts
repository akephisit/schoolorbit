import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { FeatureAdminItem } from '$lib/server/features-admin';
import { listFeatureAdminItems } from '$lib/server/features-admin';

interface FeatureResponse {
	data: FeatureAdminItem[];
}

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.me?.data?.perms?.includes('feature:manage')) {
		return error(403, 'Forbidden');
	}

	const items = await listFeatureAdminItems(locals);

	return json({ data: items } satisfies FeatureResponse);
};
