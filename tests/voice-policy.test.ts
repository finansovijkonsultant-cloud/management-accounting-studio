import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createVoiceDraftResponse,
  getVoiceConfidence,
  VOICE_CONFIDENCE_THRESHOLD,
  VOICE_DRAFT_TTL_MS,
} from '../src/lib/security/voicePolicy.ts';

describe('voice AI safety policy', () => {
  test('requires confirmation and expires draft responses', () => {
    const response = createVoiceDraftResponse(
      { type: 'purchase', amount: 48000, currency: 'UAH', description: 'Оплата', date: '2026-09-27' },
      'Оплатили поставщику 48 000 гривен',
      'deterministic',
      'transaction',
    );

    assert.equal(response.draftOnly, true);
    assert.equal(response.requiresConfirmation, true);
    assert.equal(response.confidence, 1);
    assert.equal(response.confidenceThreshold, VOICE_CONFIDENCE_THRESHOLD);
    assert.ok(Date.parse(response.expiresAt) > Date.now());
    assert.ok(Date.parse(response.expiresAt) <= Date.now() + VOICE_DRAFT_TTL_MS + 1000);
  });

  test('scores incomplete drafts below the confirmation threshold', () => {
    const confidence = getVoiceConfidence({ type: 'purchase', amount: 0 }, 'transaction');

    assert.ok(confidence < VOICE_CONFIDENCE_THRESHOLD);
  });
});