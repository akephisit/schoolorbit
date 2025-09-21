import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { FeatureAdminItem } from '$lib/server/features-admin';
import { listFeatureAdminItems } from '$lib/server/features-admin';
import { authorize } from '$lib/server/authorization';

interface FeatureResponse {
	data: FeatureAdminItem[];
}

export const GET: RequestHandler = async ({ locals }) => {
	await authorize(locals, 'feature:manage');

	const items = await listFeatureAdminItems(locals);

	return json({ data: items } satisfies FeatureResponse);
};
