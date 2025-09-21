import { featureRegistry } from '$lib/features';
import type { FeatureDefinition } from '$lib/features';
import { getFeatureRuntimeSnapshot } from './feature-runtime';
import { db } from './database';
import { featureToggle, appUser } from './schema';
import { asc, eq } from 'drizzle-orm';

export interface FeatureAdminItem {
	code: string;
	name: string;
	description: string | null;
	enabled: boolean;
	updatedAt: Date | null;
	updatedBy: string | null;
	updatedByName: string | null;
}

function mapDefinitions(definitions: FeatureDefinition[]): Map<string, FeatureDefinition> {
	return new Map(definitions.map((definition) => [definition.meta.id, definition]));
}

export async function listFeatureAdminItems(locals?: App.Locals | null): Promise<FeatureAdminItem[]> {
	const [rows, snapshot, definitions] = await Promise.all([
		db
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
			.orderBy(asc(featureToggle.code)),
		getFeatureRuntimeSnapshot(locals),
		featureRegistry.listFeatures()
	]);

	const rowMap = new Map(rows.map((row) => [row.code, row]));
	const definitionMap = mapDefinitions(definitions);
	const codes = new Set<string>();

	for (const row of rows) {
		codes.add(row.code);
	}
	for (const definition of definitions) {
		codes.add(definition.meta.id);
	}
	for (const code of Object.keys(snapshot)) {
		codes.add(code);
	}

	return Array.from(codes)
		.sort((a, b) => a.localeCompare(b))
		.map((code) => {
			const row = rowMap.get(code);
			const definition = definitionMap.get(code);
			const runtime = snapshot[code];
			return {
				code,
				name: row?.name ?? definition?.meta.label ?? code,
				description: row?.description ?? definition?.meta.description ?? null,
				enabled: runtime?.enabled ?? row?.enabled ?? false,
				updatedAt: row?.updatedAt ?? null,
				updatedBy: row?.updatedBy ?? null,
				updatedByName: row?.updatedByName ?? null
			};
		});
}
