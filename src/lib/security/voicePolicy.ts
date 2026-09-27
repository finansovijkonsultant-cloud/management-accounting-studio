export const VOICE_CONFIDENCE_THRESHOLD = 0.7;
export const VOICE_DRAFT_TTL_MS = 15 * 60 * 1000;

export function getVoiceConfidence(draft: any, targetType: string): number {
  const requiredFields = targetType === 'inventory'
    ? ['name', 'quantity', 'cost_price', 'warehouse']
    : targetType === 'calendar'
      ? ['type', 'amount', 'planned_date', 'due_date']
      : ['type', 'amount', 'currency', 'description', 'date'];
  const presentFields = requiredFields.filter(field => {
    const value = draft?.[field];
    return value !== undefined && value !== null && value !== '' && value !== 0;
  });
  return Number((presentFields.length / requiredFields.length).toFixed(2));
}

export function createVoiceDraftResponse(draft: any, rawText: string, provider: string, targetType: string) {
  const confidence = getVoiceConfidence(draft, targetType);
  return {
    success: true,
    draft,
    rawText,
    provider,
    confidence,
    confidenceThreshold: VOICE_CONFIDENCE_THRESHOLD,
    requiresConfirmation: true,
    draftOnly: true,
    expiresAt: new Date(Date.now() + VOICE_DRAFT_TTL_MS).toISOString(),
  };
}