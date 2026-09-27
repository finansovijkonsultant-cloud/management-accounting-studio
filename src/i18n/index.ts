import React, { createContext, useContext, useMemo } from 'react';
import { SupportedLocale, TranslationDictionary, TranslationFunction } from './types';
import { enDictionary } from './locales/en';
import { ruDictionary } from './locales/ru';
import { ukDictionary } from './locales/uk';

export * from './types';
export { enDictionary } from './locales/en';
export { ruDictionary } from './locales/ru';
export { ukDictionary } from './locales/uk';

export const LANGUAGE_LABELS: Record<SupportedLocale, { label: string; native: string; flag: string }> = {
  ru: { label: 'Русский', native: 'Русский', flag: '🇷🇺' },
  uk: { label: 'Українська', native: 'Українська', flag: '🇺🇦' },
  en: { label: 'English', native: 'English', flag: '🇬🇧' },
};

const rawDictionaries: Record<SupportedLocale, Partial<TranslationDictionary>> = {
  en: enDictionary,
  ru: ruDictionary,
  uk: ukDictionary,
};

function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T> | undefined): T {
  if (!source) return { ...target };
  const output: any = Array.isArray(target) ? [...target] : { ...target };

  for (const key of Object.keys(source)) {
    const sourceVal = (source as any)[key];
    const targetVal = output[key];

    if (
      sourceVal &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      output[key] = deepMerge(targetVal, sourceVal);
    } else if (sourceVal !== undefined && sourceVal !== null) {
      output[key] = sourceVal;
    }
  }

  return output;
}

function resolvePath(obj: any, path: string): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  if (typeof current === 'string') return current;
  if (typeof current === 'number') return String(current);
  return undefined;
}

/**
 * Creates a reactive, callable translation function that ALSO exposes all dictionary namespace properties.
 * E.g.:
 * t('dashboard.availableCash') -> "Доступные деньги"
 * t('common.units.pcs') -> "шт."
 * t('notifications.cashGapRiskMsg', { days: 5 }) -> "Прогнозируется дефицит..."
 * t.dashboard.availableCash -> "Доступные деньги"
 */
export function createTranslator(locale: SupportedLocale = 'ru'): TranslationFunction {
  const targetDict = rawDictionaries[locale] || rawDictionaries.en;
  const mergedDict = deepMerge(enDictionary, targetDict);

  const t = function (
    key: string,
    paramsOrFallback?: Record<string, any> | string,
    fallback?: string
  ): string {
    let params: Record<string, any> | undefined;
    let fallbackText: string | undefined;

    if (typeof paramsOrFallback === 'string') {
      fallbackText = paramsOrFallback;
    } else if (paramsOrFallback && typeof paramsOrFallback === 'object') {
      params = paramsOrFallback;
      fallbackText = fallback;
    }

    let text = resolvePath(mergedDict, key);
    if (!text) {
      text = resolvePath(enDictionary, key);
    }
    if (!text) {
      text = fallbackText || key.split('.').pop() || key;
    }

    if (params) {
      for (const pKey of Object.keys(params)) {
        text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(params[pKey]));
      }
    }
    return text;
  };

  // Attach all top-level keys to translator so property access (t.nav.dashboard) works
  for (const key of Object.keys(mergedDict)) {
    (t as any)[key] = (mergedDict as any)[key];
  }
  (t as any).locale = locale;
  (t as any).t = t;

  return t as unknown as TranslationFunction;
}

/**
 * Returns a fully hydrated TranslationDictionary (callable as t('key') or t.section.key)
 * for any European language, automatically falling back to English (en) for any missing keys.
 */
export function getTranslation(locale: SupportedLocale): TranslationFunction {
  return createTranslator(locale);
}

/**
 * Resolves localized name for any entity (TransactionCategory, Account, Company, Counterparty).
 *
 * CRITICAL ARCHITECTURAL GUARD:
 * If a translation for the requested locale is missing, it MUST STRICTLY fallback
 * to English ('en'), then Ukrainian/Russian, and NEVER return an empty string or crash.
 */
export function getLocalizedName(
  target: any,
  locale: string = 'en',
  fallbackName: string = ''
): string {
  if (!target) return fallbackName || 'Unnamed';

  let dict: Record<string, string> = {};

  if (typeof target === 'string') {
    const trimmed = target.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        dict = JSON.parse(trimmed);
      } catch {
        return trimmed;
      }
    } else {
      return trimmed;
    }
  } else if (typeof target === 'object') {
    if (target.name_json) {
      return getLocalizedName(target.name_json, locale, target.name || fallbackName);
    }
    if (target.name_i18n && typeof target.name_i18n === 'object') {
      dict = target.name_i18n;
    } else if (target.name && typeof target.name === 'string') {
      if (target.name.trim().startsWith('{') && target.name.trim().endsWith('}')) {
        try {
          dict = JSON.parse(target.name.trim());
        } catch {
          return target.name.trim();
        }
      } else {
        dict = target;
      }
    } else {
      dict = target;
    }
  }

  // 1. Requested Locale
  if (dict[locale] && typeof dict[locale] === 'string' && dict[locale].trim()) {
    return dict[locale].trim();
  }

  // 2. CRITICAL DATABASE GUARD: Mandatory fallback to English ('en')
  if (dict['en'] && typeof dict['en'] === 'string' && dict['en'].trim()) {
    return dict['en'].trim();
  }

  // 3. Fallback to Ukrainian or Russian
  if (dict['uk'] && typeof dict['uk'] === 'string' && dict['uk'].trim()) {
    return dict['uk'].trim();
  }
  if (dict['ru'] && typeof dict['ru'] === 'string' && dict['ru'].trim()) {
    return dict['ru'].trim();
  }

  // 4. Any other non-empty localized key
  for (const k of Object.keys(dict)) {
    if (typeof dict[k] === 'string' && dict[k].trim() && k !== 'id' && k !== 'type') {
      return dict[k].trim();
    }
  }

  // 5. Explicit .name property
  if (target.name && typeof target.name === 'string' && target.name.trim()) {
    return target.name.trim();
  }

  return fallbackName || 'Unnamed';
}

export function getIntlLocale(locale: string = 'ru'): string {
  if (locale === 'uk') return 'uk-UA';
  if (locale === 'en') return 'en-US';
  return 'ru-RU';
}

export function formatLocalizedDate(
  date: Date | string | number,
  locale: string = 'ru',
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return d.toLocaleDateString(getIntlLocale(locale), options);
  } catch {
    return String(date);
  }
}

/**
 * Format currency amount with locale-specific formatting.
 */
export function formatLocalizedMoney(
  amount: number,
  currency: string = 'UAH',
  locale: string = 'ru'
): string {
  try {
    const formatted = new Intl.NumberFormat(getIntlLocale(locale), {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    return `${formatted} ${currency}`;
  } catch {
    return `${Math.round(amount).toLocaleString()} ${currency}`;
  }
}

export interface I18nContextValue {
  t: TranslationFunction;
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  getLocalizedName: (target: any, locale?: string, fallbackName?: string) => string;
}

export const I18nContext = createContext<I18nContextValue>({
  t: createTranslator('ru'),
  locale: 'ru',
  setLocale: () => {},
  getLocalizedName: (target, locale, fallback) => getLocalizedName(target, locale || 'ru', fallback),
});

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}

export const useTranslation = useI18n;

export const I18nProvider: React.FC<{
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  children: React.ReactNode;
}> = ({ locale, setLocale, children }) => {
  const t = useMemo(() => createTranslator(locale), [locale]);

  const value = useMemo(
    () => ({
      t,
      locale,
      setLocale,
      getLocalizedName: (target: any, l?: string, fallback?: string) =>
        getLocalizedName(target, l || locale, fallback),
    }),
    [t, locale, setLocale]
  );

  return React.createElement(I18nContext.Provider, { value }, children);
};
