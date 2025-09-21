import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { featureToggle, appUser } from '$lib/server/schema';
import { asc, eq } from 'drizzle-orm';

interface FeatureItem {
	code: string;
	name: string;
	description: string | null;
	enabled: boolean;
	updatedAt: Date | null;
	updatedBy: string | null;
	updatedByName: string | null;
}

interface FeatureResponse {
	data: FeatureItem[];
}

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.me?.data?.perms?.includes('feature:manage')) {
		return error(403, 'Forbidden');
	}

	const rows = await db
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

	return json({ data: rows } satisfies FeatureResponse);
};
