export type FeatureId = string;

export type FeatureActionCode = `${string}:${string}`;

export interface FeatureMeta {
  id: FeatureId;
  label: string;
  description?: string;
  icon?: string;
}

export type FeatureStateKind = 'toggle';

export interface FeatureStateDefinition {
  code: string;
  kind: FeatureStateKind;
  label: string;
  description?: string;
  defaultValue: boolean;
}

export type FeatureCondition =
  | {
      type: 'feature-enabled';
      feature?: FeatureId;
    }
  | {
      type: 'feature-state';
      feature?: FeatureId;
      state: string;
      expected: boolean;
    };

export interface FeatureActionDefinition {
  code: FeatureActionCode;
  label: string;
  description?: string;
  implies?: FeatureActionCode[];
  conditions?: FeatureCondition[];
}

export interface FeatureMenuDefinition {
  id: string;
  label: string;
  href: string;
  icon: string;
  order?: number;
  requires?: FeatureActionCode[];
  requiresFeatures?: FeatureId[];
}

export interface FeatureDefinition {
  meta: FeatureMeta;
  actions: FeatureActionDefinition[];
  states?: FeatureStateDefinition[];
  menu?: FeatureMenuDefinition[];
}

export type FeatureModule = {
  feature: FeatureDefinition;
};

export interface FeatureRuntimeState {
  enabled: boolean;
  states: Record<string, boolean>;
}

export type FeatureRuntimeSnapshot = Record<FeatureId, FeatureRuntimeState>;
