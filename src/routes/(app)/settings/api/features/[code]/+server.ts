import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { featureToggle, appUser } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { validationError } from '$lib/server/validators/core';
import { parseFeatureUpdateInput } from '$lib/server/validators/features';

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.me?.data?.perms?.includes('feature:manage')) {
		return error(403, 'Forbidden');
	}

	const code = params.code;
	if (!code) {
		return error(400, 'Invalid feature code');
	}

	const body = await request.json().catch(() => ({}));
	const parsed = parseFeatureUpdateInput(body);
	if (!parsed.ok) {
		return validationError(parsed.error);
	}

  const result = await db
		.update(featureToggle)
		.set({
			enabled: parsed.data.enabled,
			updatedBy: locals.me?.data?.user?.id ?? null,
			updatedAt: new Date()
		})
		.where(eq(featureToggle.code, code))
		.returning({ code: featureToggle.code });

	if (!result.length) {
		return error(404, 'Feature not found');
	}

	locals.features = null;

  const [row] = await db
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
		.where(eq(featureToggle.code, code))
		.limit(1);

	return json({ data: row });
};
