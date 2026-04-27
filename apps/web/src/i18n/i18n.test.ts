import { describe, expect, it } from "vitest";
import { resolveLocale, resolvePreferredLocale } from "./index";

describe("web locale resolution", () => {
  it("maps simplified Chinese regions", () => {
    expect(resolveLocale("zh-CN")).toBe("zh-Hans");
    expect(resolveLocale("zh_SG")).toBe("zh-Hans");
  });

  it("maps traditional Chinese regions", () => {
    expect(resolveLocale("zh-TW")).toBe("zh-Hant");
    expect(resolveLocale("zh-HK")).toBe("zh-Hant");
  });

  it("falls back to English", () => {
    expect(resolvePreferredLocale(["fr-FR", "de-DE"])).toBe("en");
  });
});
