import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/database';
import { featureToggle, appUser } from '$lib/server/schema';
import { asc, eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.me?.data?.perms?.includes('feature:manage')) {
		throw error(403, 'Forbidden');
	}

	const features = await db
		.select({
			code: featureToggle.code,
			name: featureToggle.name,
			description: featureToggle.description,
			enabled: featureToggle.enabled,
			updatedAt: featureToggle.updatedAt,
			updatedBy: featureToggle.updatedBy,
			updatedByName: appUser.displayName
		})
		.from(featureToggle)
		.leftJoin(appUser, eq(featureToggle.updatedBy, appUser.id))
		.orderBy(asc(featureToggle.code));

	return {
		features
	};
};
