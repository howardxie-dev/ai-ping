import { describe, expect, it } from "vitest";
import {
  detectSystemLocale,
  resolveLocale,
  resolvePreferredLocale,
  t,
  type LocaleBundle,
} from "../src/lib/i18n";
import { defaultLocale, locales, supportedLocales } from "../src/lib/locales";

describe("desktop i18n", () => {
  it("maps supported system languages to desktop locales", () => {
    expect(resolveLocale("en")).toBe("en");
    expect(resolveLocale("en-US")).toBe("en");
    expect(resolveLocale("zh-CN")).toBe("zh-Hans");
    expect(resolveLocale("zh-SG")).toBe("zh-Hans");
    expect(resolveLocale("zh-Hans-CN")).toBe("zh-Hans");
    expect(resolveLocale("zh-TW")).toBe("zh-Hant");
    expect(resolveLocale("zh-HK")).toBe("zh-Hant");
    expect(resolveLocale("zh-MO")).toBe("zh-Hant");
    expect(resolveLocale("zh-Hant-HK")).toBe("zh-Hant");
    expect(resolveLocale("ja-JP")).toBe(defaultLocale);
    expect(resolveLocale(undefined)).toBe(defaultLocale);
  });

  it("uses the first supported preferred language and falls back to English", () => {
    expect(resolvePreferredLocale(["fr-FR", "zh-TW"])).toBe("zh-Hant");
    expect(resolvePreferredLocale(["fr-FR", "de-DE"])).toBe("en");
    expect(detectSystemLocale({ languages: ["zh-SG", "en-US"] })).toBe("zh-Hans");
    expect(detectSystemLocale({ language: "zh-HK" })).toBe("zh-Hant");
    expect(detectSystemLocale(undefined)).toBe("en");
  });

  it("translates the required desktop UI keys", () => {
    expect(t("zh-Hans", "configuration.title")).toBe("配置");
    expect(t("zh-Hant", "actions.exportHtml")).toBe("匯出 HTML");
    expect(t("en", "profile.description.openai-chat")).toBe(
      "For OpenAI-compatible /chat/completions endpoints.",
    );
    expect(t("zh-Hans", "configuration.apiKeyNote")).toBe(
      "API Key 仅保存在内存中，不会被保存。",
    );
    expect(t("zh-Hant", "advanced.show")).toBe("顯示進階詳情");
    expect(t("zh-Hans", "feedback.savedReport", { kind: "JSON", path: "/tmp/a.json" })).toBe(
      "JSON 报告已保存到 /tmp/a.json",
    );
  });

  it("falls back to English when a localized key is missing", () => {
    const brokenBundle = {
      ...locales,
      "zh-Hans": {
        ...locales["zh-Hans"],
        configuration: {
          ...locales["zh-Hans"].configuration,
          title: undefined,
        },
      },
    } as unknown as LocaleBundle;

    expect(t("zh-Hans", "configuration.title", undefined, brokenBundle)).toBe(
      "Configuration",
    );
  });

  it("keeps zh-Hans and zh-Hant keys aligned with English", () => {
    const englishKeys = flattenKeys(locales.en);

    for (const locale of supportedLocales) {
      expect(flattenKeys(locales[locale])).toEqual(englishKeys);
    }
  });
});

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return [prefix];
  if (!isRecord(value)) return [];

  return Object.keys(value)
    .sort()
    .flatMap((key) => flattenKeys(value[key], prefix ? `${prefix}.${key}` : key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
