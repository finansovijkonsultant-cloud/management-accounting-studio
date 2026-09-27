/**
 * Privacy Guard and Sensitive Data Sanitizer
 * Re-exports from src/lib/ai_provider_abstraction_layer/privacyFirewall
 */

export { PrivacyFirewall, sanitizeFinancialPrompt } from '../../lib/ai_provider_abstraction_layer/privacyFirewall';
export type { FirewallSanitizeResult } from '../../lib/ai_provider_abstraction_layer/privacyFirewall';

export interface SanitizedPayload {
  sanitizedText: string;
  maskedItemsCount: number;
  maskingLog: string[];
}
