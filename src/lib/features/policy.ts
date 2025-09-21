import type { FeatureActionCode, FeatureRuntimeSnapshot, FeatureCondition } from './types';
import { featureRegistry, type FeatureRegistry, type RegisteredFeatureAction } from './registry';

export interface PolicyContext {
  granted: Iterable<FeatureActionCode>;
  featureState: FeatureRuntimeSnapshot;
}

export class PolicyEngine {
  private readonly registry: FeatureRegistry;

  constructor(registry: FeatureRegistry = featureRegistry) {
    this.registry = registry;
  }

  can(actionCode: FeatureActionCode, context: PolicyContext): boolean {
    const action = this.registry.getAction(actionCode);
    if (!action) {
      return false;
    }

    const capabilities = this.expandCapabilities(context.granted);
    if (!capabilities.has(action.code)) {
      return false;
    }

    if (!action.conditions?.length) {
      return true;
    }

    return action.conditions.every((condition) => this.evaluateCondition(condition, context.featureState, action));
  }

  private expandCapabilities(granted: Iterable<FeatureActionCode>): Set<FeatureActionCode> {
    const resolved = new Set<FeatureActionCode>(granted);
    let changed = true;
    while (changed) {
      changed = false;
      for (const action of this.registry.listActions()) {
        if (!resolved.has(action.code)) {
          continue;
        }
        if (!action.implies?.length) {
          continue;
        }
        for (const implied of action.implies) {
          if (!resolved.has(implied)) {
            resolved.add(implied);
            changed = true;
          }
        }
      }
    }
    return resolved;
  }

  private evaluateCondition(
    condition: FeatureCondition,
    snapshot: FeatureRuntimeSnapshot,
    action: RegisteredFeatureAction
  ): boolean {
    const targetFeatureId = condition.feature ?? action.featureId;
    const featureState = snapshot[targetFeatureId];
    if (!featureState) {
      return false;
    }

    if (condition.type === 'feature-enabled') {
      return featureState.enabled === true;
    }

    if (condition.type === 'feature-state') {
      const value = featureState.states?.[condition.state];
      return value === condition.expected;
    }

    return false;
  }
}

export const policyEngine = new PolicyEngine();
