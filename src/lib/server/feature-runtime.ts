import type { FeatureRuntimeSnapshot } from '$lib/features';
import { featureRegistry } from '$lib/features';
import { db } from './database';
import { featureToggle, featureState } from './schema';

async function fetchFeatureToggleSnapshot(): Promise<Map<string, boolean>> {
	const rows = await db.select({ code: featureToggle.code, enabled: featureToggle.enabled }).from(featureToggle);
	const map = new Map<string, boolean>();
	for (const row of rows) {
		map.set(row.code, row.enabled ?? true);
	}
	return map;
}

async function fetchFeatureStateSnapshot(): Promise<Map<string, Map<string, boolean>>> {
	try {
		const rows = await db
			.select({
				featureCode: featureState.featureCode,
				stateCode: featureState.stateCode,
				value: featureState.value
			})
			.from(featureState);

		const map = new Map<string, Map<string, boolean>>();
		for (const row of rows) {
			const states = map.get(row.featureCode) ?? new Map<string, boolean>();
			states.set(row.stateCode, row.value ?? false);
			map.set(row.featureCode, states);
		}
		return map;
	} catch (err) {
		if (isMissingRelationError(err, 'feature_state')) {
			return new Map();
		}
		throw err;
	}
}

function hydrateRuntimeSnapshot(
	toggleMap: Map<string, boolean>,
	stateMap: Map<string, Map<string, boolean>>
): FeatureRuntimeSnapshot {
	const snapshot: FeatureRuntimeSnapshot = {};

	for (const [code, enabled] of toggleMap.entries()) {
		snapshot[code] = {
			enabled,
			states: {}
		};
	}

	for (const feature of featureRegistry.listFeatures()) {
		const code = feature.meta.id;
		if (!snapshot[code]) {
			snapshot[code] = {
				enabled: toggleMap.get(code) ?? true,
				states: {}
			};
		}

		if (feature.states) {
			const entry = snapshot[code];
			for (const state of feature.states) {
				if (entry.states[state.code] === undefined) {
					entry.states[state.code] = state.defaultValue;
				}
			}
		}
	}

	for (const [featureCode, states] of stateMap.entries()) {
		const entry = (snapshot[featureCode] ??= {
			enabled: toggleMap.get(featureCode) ?? true,
			states: {}
		});
		for (const [stateCode, value] of states.entries()) {
			entry.states[stateCode] = value;
		}
	}

	return snapshot;
}

export async function loadFeatureRuntime(): Promise<FeatureRuntimeSnapshot> {
	const [toggleMap, stateMap] = await Promise.all([
		fetchFeatureToggleSnapshot(),
		fetchFeatureStateSnapshot()
	]);
	return hydrateRuntimeSnapshot(toggleMap, stateMap);
}

export async function getFeatureRuntimeSnapshot(locals?: App.Locals | null): Promise<FeatureRuntimeSnapshot> {
  if (locals?.featureRuntime) {
    return locals.featureRuntime;
  }

  const snapshot = await loadFeatureRuntime();

  if (locals) {
    locals.featureRuntime = snapshot;
    locals.features = Object.entries(snapshot)
      .filter(([, value]) => value.enabled)
      .map(([key]) => key);
  }

  return snapshot;
}

function invalidateRuntimeCache(locals?: App.Locals | null) {
	if (locals) {
		locals.featureRuntime = null;
		locals.features = null;
	}
}

export async function setFeatureEnabled(code: string, enabled: boolean, locals?: App.Locals | null) {
	const actorId = locals?.me?.data?.user?.id ?? null;
	const definition = featureRegistry.getFeature(code);
	const now = new Date();

	await db
		.insert(featureToggle)
		.values({
			code,
			name: definition?.meta.label ?? code,
			description: definition?.meta.description ?? null,
			enabled,
			updatedBy: actorId,
			updatedAt: now
		})
		.onConflictDoUpdate({
			target: featureToggle.code,
			set: {
				enabled,
				updatedBy: actorId,
				updatedAt: now
			}
		});

	invalidateRuntimeCache(locals);
}

export async function setFeatureStateValue(
	featureCode: string,
	stateCode: string,
	value: boolean,
	locals?: App.Locals | null
) {
	const actorId = locals?.me?.data?.user?.id ?? null;
	const now = new Date();

	try {
		await db
			.insert(featureState)
			.values({
				featureCode,
				stateCode,
				value,
				updatedBy: actorId,
				updatedAt: now
			})
			.onConflictDoUpdate({
				target: [featureState.featureCode, featureState.stateCode],
				set: {
					value,
					updatedBy: actorId,
					updatedAt: now
				}
			});
	} catch (err) {
		if (isMissingRelationError(err, 'feature_state')) {
			throw new Error('ตาราง feature_state ยังไม่ถูกสร้าง กรุณารัน migration ล่าสุด');
		}
		throw err;
	}

	invalidateRuntimeCache(locals);
}

function isMissingRelationError(err: unknown, relation: string): boolean {
	if (!(err instanceof Error)) {
		return false;
	}
	const message = err.message.toLowerCase();
	return message.includes('does not exist') && message.includes(relation.toLowerCase());
}
