import { messages as en } from "./en";
import { messages as zhHans } from "./zh-Hans";
import { messages as zhHant } from "./zh-Hant";
import { supportedLocales, type Locale, type MessageKey, type Messages } from "./types";

export { supportedLocales, type Locale, type MessageKey, type Messages };

export const defaultLocale: Locale = "en";

const bundles = {
  en,
  "zh-Hans": zhHans,
  "zh-Hant": zhHant,
} satisfies Record<Locale, Messages>;

const supported = new Set<string>(supportedLocales);

export function isSupportedLocale(value: string): value is Locale {
  return supported.has(value);
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

export function detectLocale(source: Pick<Navigator, "language" | "languages"> = navigator): Locale {
  const languages = source.languages?.length ? source.languages : [source.language];
  return resolvePreferredLocale(languages);
}

export const detectBrowserLocale = detectLocale;

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

export function t(locale: Locale, key: MessageKey): string {
  const localized = readMessage(bundles[locale], key);
  const fallback = readMessage(bundles[defaultLocale], key);
  return typeof localized === "string"
    ? localized
    : typeof fallback === "string"
      ? fallback
      : key;
}

export function list(locale: Locale, key: MessageKey): readonly string[] {
  const localized = readMessage(bundles[locale], key);
  const fallback = readMessage(bundles[defaultLocale], key);
  return Array.isArray(localized)
    ? localized
    : Array.isArray(fallback)
      ? fallback
      : [];
}

function readMessage(source: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((current, segment) => {
    if (typeof current !== "object" || current === null) return undefined;
    return (current as Record<string, unknown>)[segment];
  }, source);
}
