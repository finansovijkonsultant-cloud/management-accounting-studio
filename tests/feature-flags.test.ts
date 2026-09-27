import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getFeatureFlags } from '../src/lib/config/featureFlags.ts';

describe('feature flags', () => {
  test('keeps experimental capabilities disabled by default', () => {
    assert.deepEqual(getFeatureFlags({}), { cloudAi: false, p2pSync: false });
  });

  test('enables capabilities only with explicit true values', () => {
    assert.deepEqual(getFeatureFlags({ VITE_FEATURE_CLOUD_AI: 'true', VITE_FEATURE_P2P_SYNC: 'false' }), {
      cloudAi: true,
      p2pSync: false,
    });
  });
});