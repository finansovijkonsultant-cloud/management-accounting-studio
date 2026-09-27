/**
 * PrivacyFirewall Middleware & Utility
 * 
 * Enforces Zero-Knowledge and Data-Minimization principles (MASVS-STORAGE & MASVS-CRYPTO).
 * Mandate: Before sending any financial data payload to cloud AI providers (Gemini, OpenAI, Claude, OpenRouter),
 * all Personally Identifiable Information (PII), IBANs, cards, phone numbers, and counterparty legal names
 * must be strictly obfuscated. Ollama (local host) can optionally bypass if running strictly offline on-premise.
 */

export interface FirewallSanitizeResult {
  sanitizedText: string;
  maskedCount: number;
  maskingAudit: string[];
  anonymizedEntitiesMap: Record<string, string>;
}

export class PrivacyFirewall {
  private static instance: PrivacyFirewall;

  public static getInstance(): PrivacyFirewall {
    if (!PrivacyFirewall.instance) {
      PrivacyFirewall.instance = new PrivacyFirewall();
    }
    return PrivacyFirewall.instance;
  }

  /**
   * Sanitizes text by masking PII, banking credentials, and sensitive counterparty records.
   */
  public sanitize(rawText: string, options: { maskCounterparties?: boolean } = {}): FirewallSanitizeResult {
    let text = rawText;
    let count = 0;
    const audit: string[] = [];
    const anonymizedMap: Record<string, string> = {};

    // 1. IBAN & Bank Accounts (e.g. UA483052990000026007891234567 -> UA48****4567)
    const ibanRegex = /\b[A-Z]{2}\d{2}[A-Z0-9]{12,30}\b/gi;
    text = text.replace(ibanRegex, match => {
      count++;
      const masked = match.substring(0, 4) + '****' + match.substring(match.length - 4);
      audit.push(`IBAN masked: ${match} -> ${masked}`);
      anonymizedMap[match] = masked;
      return masked;
    });

    // 2. Credit / Debit card PAN (16 digits with optional spaces or dashes)
    const cardRegex = /\b(?:\d{4}[ -]?){3}\d{4}\b/g;
    text = text.replace(cardRegex, match => {
      count++;
      const digitsOnly = match.replace(/\D/g, '');
      const masked = digitsOnly.substring(0, 4) + ' **** **** ' + digitsOnly.substring(12);
      audit.push(`Card masked: ${match} -> ${masked}`);
      anonymizedMap[match] = masked;
      return masked;
    });

    // 3. Tax IDs / EDRPOU / INN (8 to 12 digits preceded by keywords)
    const taxIdRegex = /(?:ЕДРПОУ|ЄДРПОУ|ИНН|ІПН|ОКПО|Tax\s*ID)[:\s#]*(\d{8,12})/gi;
    text = text.replace(taxIdRegex, (match, digits) => {
      count++;
      const masked = '***' + digits.substring(digits.length - 3);
      audit.push(`Tax ID masked: ${digits} -> ${masked}`);
      return match.replace(digits, masked);
    });

    // 4. Email addresses
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
    text = text.replace(emailRegex, match => {
      count++;
      const [user, domain] = match.split('@');
      const masked = (user[0] || 'u') + '***@' + domain;
      audit.push(`Email masked: ${match} -> ${masked}`);
      anonymizedMap[match] = masked;
      return masked;
    });

    // 5. Phone numbers (+380..., +1..., 050..., 067...)
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,3}\)?[-.\s]?\d{3}[-.\s]?\d{2}[-.\s]?\d{2}\b/g;
    text = text.replace(phoneRegex, match => {
      const digits = match.replace(/\D/g, '');
      if (digits.length >= 9 && digits.length <= 13) {
        count++;
        const masked = '+***-**-***' + digits.substring(digits.length - 2);
        audit.push(`Phone masked: ${match} -> ${masked}`);
        anonymizedMap[match] = masked;
        return masked;
      }
      return match;
    });

    // 6. Counterparty Legal Entity Obfuscation (ТОВ, ООО, ФОП, ПП, LLC, Inc., Ltd.)
    if (options.maskCounterparties !== false) {
      const companyRegex = /(?:ТОВ|ООО|ФОП|ЧП|ПП|LLC|Inc\.|Ltd\.)\s*[«"']?([^»"'\n,;]{2,35})[»"']?/gi;
      let counterpartyIdx = 1;
      text = text.replace(companyRegex, (fullMatch, compName) => {
        count++;
        const alias = `[Контрагент-${counterpartyIdx++}]`;
        audit.push(`Counterparty masked: ${fullMatch} -> ${alias}`);
        anonymizedMap[compName] = alias;
        return alias;
      });
    }

    // 7. Personal Names (ФИО) pattern heuristic: "Иванов И.И." or "Петренко Петро"
    const nameInitialRegex = /\b([А-ЯЁІЇЄ][а-яёіїє]+)\s+([А-ЯЁІЇЄ]\.\s*[А-ЯЁІЇЄ]\.)\b/g;
    text = text.replace(nameInitialRegex, (match, lastName) => {
      count++;
      const alias = `[Сотрудник ${lastName[0]}.]`;
      audit.push(`Personal name masked: ${match} -> ${alias}`);
      return alias;
    });

    return {
      sanitizedText: text,
      maskedCount: count,
      maskingAudit: audit,
      anonymizedEntitiesMap: anonymizedMap,
    };
  }
}

export function sanitizeFinancialPrompt(text: string): {
  sanitizedText: string;
  maskedItemsCount: number;
  maskingLog: string[];
} {
  const result = PrivacyFirewall.getInstance().sanitize(text);
  return {
    sanitizedText: result.sanitizedText,
    maskedItemsCount: result.maskedCount,
    maskingLog: result.maskingAudit,
  };
}
