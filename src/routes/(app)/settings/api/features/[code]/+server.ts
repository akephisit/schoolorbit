import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validationError } from '$lib/server/validators/core';
import { parseFeatureUpdateInput } from '$lib/server/validators/features';
import { setFeatureEnabled, setFeatureStateValue } from '$lib/server/feature-runtime';
import { listFeatureAdminItems } from '$lib/server/features-admin';
import { featureRegistry } from '$lib/features';
import { authorize } from '$lib/server/authorization';

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	await authorize(locals, 'feature:manage');

	const code = params.code;
	if (!code) {
		return error(400, 'Invalid feature code');
	}

	const body = await request.json().catch(() => ({}));
	const parsed = parseFeatureUpdateInput(body);
	if (!parsed.ok) {
		return validationError(parsed.error);
	}

	const definition = featureRegistry.getFeature(code);

	if (parsed.data.states) {
		if (!definition) {
			return error(400, 'Feature states not supported');
		}
		if (!definition.states?.length) {
			return error(400, 'Feature states not defined');
		}
		const stateDefs = new Map(definition.states.map((state) => [state.code, state] as const));
		for (const [stateCode] of Object.entries(parsed.data.states)) {
			const stateDef = stateDefs.get(stateCode);
			if (!stateDef) {
				return error(400, `Invalid state code: ${stateCode}`);
			}
			if (stateDef.kind !== 'toggle') {
				return error(400, `State ${stateCode} cannot be updated`);
			}
		}
	}

	if (parsed.data.enabled !== undefined) {
		await setFeatureEnabled(code, parsed.data.enabled, locals);
	}

	if (parsed.data.states) {
		await Promise.all(
			Object.entries(parsed.data.states).map(([stateCode, value]) =>
				setFeatureStateValue(code, stateCode, value, locals)
			)
		);
	}

	const features = await listFeatureAdminItems(locals);
	const updated = features.find((item) => item.code === code);
	if (!updated) {
		return error(404, 'Feature not found');
	}

	return json({ data: updated });
};
