import type {
  FeatureActionCode,
  FeatureDefinition,
  FeatureId,
  FeatureMenuDefinition,
  FeatureModule
} from './types';

export type RegisteredFeatureAction = FeatureDefinition['actions'][number] & {
  featureId: FeatureId;
};

export type RegisteredMenuItem = FeatureMenuDefinition & {
  featureId: FeatureId;
};

export class FeatureRegistry {
  private readonly features = new Map<FeatureId, FeatureDefinition>();
  private readonly actions = new Map<FeatureActionCode, RegisteredFeatureAction>();
  private readonly menu: RegisteredMenuItem[] = [];

  register(definition: FeatureDefinition) {
    const id = definition.meta.id;
    if (this.features.has(id)) {
      throw new Error(`Feature with id "${id}" already registered`);
    }

    this.features.set(id, definition);

    for (const action of definition.actions) {
      if (this.actions.has(action.code)) {
        throw new Error(`Action "${action.code}" already registered`);
      }
      this.actions.set(action.code, { ...action, featureId: id });
    }

    if (definition.menu) {
      for (const menuItem of definition.menu) {
        this.menu.push({ ...menuItem, featureId: id });
      }
    }
  }

  listFeatures(): FeatureDefinition[] {
    return Array.from(this.features.values());
  }

  getFeature(id: FeatureId): FeatureDefinition | undefined {
    return this.features.get(id);
  }

  listActions(): RegisteredFeatureAction[] {
    return Array.from(this.actions.values());
  }

  getAction(code: FeatureActionCode): RegisteredFeatureAction | undefined {
    return this.actions.get(code);
  }

  listMenuItems(): RegisteredMenuItem[] {
    return [...this.menu].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
}

function loadFeatureModules(): FeatureModule[] {
  const modules = import.meta.glob('./*/feature.meta.ts', { eager: true });
  return Object.values(modules).map((mod: unknown) => {
    if (!mod || typeof mod !== 'object' || !('feature' in mod)) {
      throw new Error('Invalid feature module export. Expected { feature } export.');
    }
    return mod as FeatureModule;
  });
}

export function createFeatureRegistry(): FeatureRegistry {
  const registry = new FeatureRegistry();
  const modules = loadFeatureModules();
  for (const module of modules) {
    registry.register(module.feature);
  }
  return registry;
}

export const featureRegistry = createFeatureRegistry();
