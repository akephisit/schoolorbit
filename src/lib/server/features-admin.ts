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
	states: FeatureAdminState[];
}

export interface FeatureAdminState {
	code: string;
	label: string;
	description: string | null;
	kind: 'toggle';
	value: boolean;
	defaultValue: boolean;
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
				updatedByName: row?.updatedByName ?? null,
				states: buildAdminStates(runtime?.states ?? {}, definition)
			};
		});
}

function buildAdminStates(
	runtimeStates: Record<string, boolean>,
	definition: FeatureDefinition | undefined
): FeatureAdminState[] {
	const definedStates = definition?.states ?? [];
	const codes = new Set<string>([...Object.keys(runtimeStates), ...definedStates.map((state) => state.code)]);
	if (!codes.size) {
		return [];
	}

	const orderedCodes = [
		...definedStates.map((state) => state.code),
		...Array.from(codes).filter((code) => !definedStates.some((state) => state.code === code)).sort((a, b) =>
			a.localeCompare(b)
		)
	];

	return orderedCodes
		.filter((code, index, arr) => arr.indexOf(code) === index)
		.map((stateCode) => {
			const def = definedStates.find((state) => state.code === stateCode);
			const defaultValue = def?.defaultValue ?? false;
			return {
				code: stateCode,
				label: def?.label ?? stateCode,
				description: def?.description ?? null,
				kind: def?.kind ?? 'toggle',
				value: runtimeStates[stateCode] ?? defaultValue,
				defaultValue
			};
		});
}
