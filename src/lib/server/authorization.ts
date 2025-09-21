import { error } from '@sveltejs/kit';
import { policyEngine } from '$lib/features';
import type { FeatureActionCode, FeatureRuntimeSnapshot } from '$lib/features';
import { getFeatureRuntimeSnapshot } from './feature-runtime';

export interface PolicyEvaluationResult {
  snapshot: FeatureRuntimeSnapshot;
  can: (action: FeatureActionCode) => boolean;
}

export async function buildPolicyContext(locals: App.Locals | null): Promise<PolicyEvaluationResult> {
	const granted = (locals?.me?.data?.perms ?? []) as FeatureActionCode[];
	const snapshot = await getFeatureRuntimeSnapshot(locals);
	return {
		snapshot,
		can: (action: FeatureActionCode) => policyEngine.can(action, { granted, featureState: snapshot })
	};
}

export async function authorize(locals: App.Locals | null, action: FeatureActionCode) {
	const granted = (locals?.me?.data?.perms ?? []) as FeatureActionCode[];
	if (!granted.length) {
		throw error(403, 'Forbidden');
	}

  const snapshot = await getFeatureRuntimeSnapshot(locals);
  const allowed = policyEngine.can(action, { granted, featureState: snapshot });
  if (!allowed) {
    throw error(403, 'Forbidden');
  }
}
