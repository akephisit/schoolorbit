import type { FeatureRuntimeSnapshot } from '$lib/features';
import { featureRegistry } from '$lib/features';
import { db } from './database';
import { featureToggle } from './schema';

async function fetchFeatureToggleSnapshot(): Promise<Map<string, boolean>> {
  const rows = await db.select({ code: featureToggle.code, enabled: featureToggle.enabled }).from(featureToggle);
  const map = new Map<string, boolean>();
  for (const row of rows) {
    map.set(row.code, row.enabled ?? true);
  }
  return map;
}

function hydrateRuntimeSnapshot(toggleMap: Map<string, boolean>): FeatureRuntimeSnapshot {
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

  return snapshot;
}

export async function loadFeatureRuntime(): Promise<FeatureRuntimeSnapshot> {
  const toggleMap = await fetchFeatureToggleSnapshot();
  return hydrateRuntimeSnapshot(toggleMap);
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

	if (locals) {
		locals.featureRuntime = null;
		locals.features = null;
	}
}
