import type { PageServerLoad } from './$types';
import { listFeatureAdminItems } from '$lib/server/features-admin';
import { authorize } from '$lib/server/authorization';

export const load: PageServerLoad = async ({ locals }) => {
	await authorize(locals, 'feature:manage');

	const features = await listFeatureAdminItems(locals);

	return {
		features
	};
};
