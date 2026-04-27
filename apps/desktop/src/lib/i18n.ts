import {
  defaultLocale,
  locales,
  supportedLocales,
  type I18nKey,
  type Locale,
  type LocaleMessages,
} from "./locales";

export type TranslationParams = Record<string, string | number>;

export interface NavigatorLocaleSource {
  language?: string;
  languages?: readonly string[];
}

export type LocaleBundle = Record<Locale, unknown>;

const supportedLocaleSet = new Set<string>(supportedLocales);

export function isSupportedLocale(value: string): value is Locale {
  return supportedLocaleSet.has(value);
}

export function resolveLocale(language: string | null | undefined): Locale {
  if (!language) return defaultLocale;

  const normalized = language.replace(/_/g, "-");
  if (isSupportedLocale(normalized)) return normalized;

  const [languageCode, regionOrScript] = normalized.split("-");
  const lang = languageCode?.toLowerCase();
  const region = regionOrScript?.toUpperCase();
  const script = regionOrScript?.toLowerCase();

  if (lang === "en") return "en";
  if (lang !== "zh") return defaultLocale;
  if (script === "hans") return "zh-Hans";
  if (script === "hant") return "zh-Hant";
  if (region === "CN" || region === "SG") return "zh-Hans";
  if (region === "TW" || region === "HK" || region === "MO") return "zh-Hant";

  return defaultLocale;
}

export function resolvePreferredLocale(
  languages: readonly (string | null | undefined)[] | null | undefined,
): Locale {
  if (!languages?.length) return defaultLocale;

  for (const language of languages) {
    const locale = resolveLocale(language);
    if (locale !== defaultLocale || language?.toLowerCase().startsWith("en")) {
      return locale;
    }
  }

  return defaultLocale;
}

export function detectSystemLocale(
  navigatorSource: NavigatorLocaleSource | null | undefined = globalThis.navigator,
): Locale {
  if (!navigatorSource) return defaultLocale;
  return resolvePreferredLocale(
    navigatorSource.languages?.length
      ? navigatorSource.languages
      : [navigatorSource.language],
  );
}

export function t(
  locale: Locale,
  key: I18nKey,
  params?: TranslationParams,
  bundle: LocaleBundle = locales,
): string {
  const localized = readMessage(bundle[locale], key);
  const fallback = readMessage(bundle[defaultLocale], key);
  const message = typeof localized === "string" ? localized : fallback;

  return interpolate(typeof message === "string" ? message : key, params);
}

export function getLocalizedProfileLabel(
  locale: Locale,
  profileId: keyof LocaleMessages["profile"]["label"],
): string {
  return t(locale, `profile.label.${profileId}`);
}

export function getLocalizedProfileDescription(
  locale: Locale,
  profileId: keyof LocaleMessages["profile"]["description"],
): string {
  return t(locale, `profile.description.${profileId}`);
}

function readMessage(source: unknown, key: I18nKey): unknown {
  return key.split(".").reduce<unknown>((current, segment) => {
    if (!isRecord(current)) return undefined;
    return current[segment];
  }, source);
}

function interpolate(message: string, params: TranslationParams | undefined): string {
  if (!params) return message;
  return message.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
