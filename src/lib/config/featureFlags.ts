export interface FeatureFlags {
  cloudAi: boolean;
  p2pSync: boolean;
}

export function getRuntimeFeatureFlags(): FeatureFlags {
  const environment = (import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  }).env || {};
  return getFeatureFlags(environment);
}

const isEnabled = (value: string | undefined): boolean => value === 'true';

export function getFeatureFlags(environment: Record<string, string | undefined>): FeatureFlags {
  return {
    cloudAi: isEnabled(environment.VITE_FEATURE_CLOUD_AI),
    p2pSync: isEnabled(environment.VITE_FEATURE_P2P_SYNC),
  };
}