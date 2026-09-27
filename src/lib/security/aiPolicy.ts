export interface AiProviderSettings {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

const SENSITIVE_KEY_PATTERN = /(api[_-]?key|secret|token|password|passphrase|private[_-]?key|client[_-]?secret|bank[_-]?api|auth[_-]?credentials|ai_provider_keys)/i;

export function sanitizeSensitivePayload<T>(payload: T): T {
  if (payload === null || payload === undefined) {
    return payload;
  }

  if (typeof payload !== 'object') {
    return payload;
  }

  const clone = JSON.parse(JSON.stringify(payload));

  const walk = (value: any): any => {
    if (Array.isArray(value)) {
      return value.map(item => walk(item));
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    const sanitized: Record<string, any> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      if (key === 'ai_provider_keys') {
        sanitized[key] = {};
        continue;
      }
      if (key === 'custom_api_key') {
        continue;
      }
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        continue;
      }
      sanitized[key] = walk(nestedValue);
    }

    return sanitized;
  };

  return walk(clone);
}

export function readAiProviderSettings(provider: string): AiProviderSettings {
  try {
    const raw = sessionStorage.getItem(`custom_api_key_${provider}`);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as AiProviderSettings;
    }
  } catch {
    // legacy plain-text values are ignored by design; keep secure default
  }

  return {};
}

export function writeAiProviderSettings(provider: string, settings: AiProviderSettings): void {
  sessionStorage.setItem(`custom_api_key_${provider}`, JSON.stringify(settings));
}

export function isCloudAiAllowed(provider: string, aiAllowCloud: boolean): boolean {
  if (provider === 'ollama' || provider === 'mock' || provider === 'disabled') {
    return true;
  }

  return aiAllowCloud;
}
