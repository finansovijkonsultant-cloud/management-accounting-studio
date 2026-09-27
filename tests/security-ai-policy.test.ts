import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  sanitizeSensitivePayload,
  writeAiProviderSettings,
  readAiProviderSettings,
  isCloudAiAllowed,
} from '../src/lib/security/aiPolicy.ts';

describe('security and AI policy hardening', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      store: new Map<string, string>(),
      getItem(key: string) { return this.store.get(key) ?? null; },
      setItem(key: string, value: string) { this.store.set(key, value); },
      removeItem(key: string) { this.store.delete(key); },
      clear() { this.store.clear(); },
      key(index: number) { return Array.from(this.store.keys())[index] ?? null; },
      get length() { return this.store.size; },
    } as Storage;

    globalThis.sessionStorage = {
      store: new Map<string, string>(),
      getItem(key: string) { return this.store.get(key) ?? null; },
      setItem(key: string, value: string) { this.store.set(key, value); },
      removeItem(key: string) { this.store.delete(key); },
      clear() { this.store.clear(); },
      key(index: number) { return Array.from(this.store.keys())[index] ?? null; },
      get length() { return this.store.size; },
    } as Storage;
  });

  test('sanitizes sensitive configuration before storage', () => {
    const payload = {
      settings: {
        ai_provider: 'gemini',
        ai_allow_cloud: false,
        api_key: 'secret-key',
        gemini_api_key: 'g-secret',
        ai_provider_keys: { gemini: 'deep-secret' },
      },
      accounts: [{ id: 'acc-1', bank_api_token: 'token-123' }],
    };

    const sanitized = sanitizeSensitivePayload(payload);

    assert.equal(sanitized.settings.api_key, undefined);
    assert.equal(sanitized.settings.gemini_api_key, undefined);
    assert.deepEqual(sanitized.settings.ai_provider_keys, {});
    assert.equal(sanitized.accounts[0].bank_api_token, undefined);
  });

  test('stores AI credentials in session storage, not localStorage', () => {
    writeAiProviderSettings('gemini', { apiKey: 'keep-me-private', baseUrl: 'https://example.test' });

    assert.equal(localStorage.getItem('custom_api_key_gemini'), null);
    assert.equal(sessionStorage.getItem('custom_api_key_gemini'), JSON.stringify({ apiKey: 'keep-me-private', baseUrl: 'https://example.test' }));

    const settings = readAiProviderSettings('gemini');
    assert.deepEqual(settings, { apiKey: 'keep-me-private', baseUrl: 'https://example.test' });
  });

  test('cloud AI is rejected by policy when ai_allow_cloud is disabled', () => {
    assert.equal(isCloudAiAllowed('gemini', false), false);
    assert.equal(isCloudAiAllowed('openrouter', true), true);
    assert.equal(isCloudAiAllowed('ollama', false), true);
  });
});
