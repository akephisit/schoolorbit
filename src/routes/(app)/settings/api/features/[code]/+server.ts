import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validationError } from '$lib/server/validators/core';
import { parseFeatureUpdateInput } from '$lib/server/validators/features';
import { setFeatureEnabled } from '$lib/server/feature-runtime';
import { listFeatureAdminItems } from '$lib/server/features-admin';

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

	await setFeatureEnabled(code, parsed.data.enabled, locals);

	const features = await listFeatureAdminItems(locals);
	const updated = features.find((item) => item.code === code);
	if (!updated) {
		return error(404, 'Feature not found');
	}

	return json({ data: updated });
};
