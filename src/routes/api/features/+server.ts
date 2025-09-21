import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { featureRegistry } from '$lib/features';
import { getFeatureRuntimeSnapshot } from '$lib/server/feature-runtime';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.me?.data?.user?.id) {
    throw error(401, 'Unauthorized');
  }

  const snapshot = await getFeatureRuntimeSnapshot(locals);
  const definitions = featureRegistry.listFeatures();
  const registeredIds = new Set(definitions.map((feature) => feature.meta.id));

  const features = definitions.map((definition) => ({
    definition,
    runtime: snapshot[definition.meta.id] ?? { enabled: false, states: {} }
  }));

  const orphaned = Object.entries(snapshot)
    .filter(([id]) => !registeredIds.has(id))
    .map(([id, runtime]) => ({ id, runtime }));

  return json({
    data: {
      features,
      actions: featureRegistry.listActions(),
      orphaned
    }
  });
};
