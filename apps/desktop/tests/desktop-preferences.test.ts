import { describe, expect, it } from "vitest";
import {
  getNextProfilePreferences,
  loadDesktopPreferences,
  saveDesktopPreferences,
  type DesktopPreferenceStorage,
} from "../src/lib/desktop-preferences";

const availableProfiles = ["openai-chat", "ollama"];

describe("desktop preferences", () => {
  it("restores non-sensitive run configuration from storage", () => {
    const storage = createStorage();
    storage.setItem(
      "ai-ping.desktop.preferences.v1",
      JSON.stringify({
        profile: "ollama",
        baseUrl: "http://localhost:11435",
        model: "qwen2.5",
        timeoutSeconds: 12,
        apiKey: "must-not-be-read",
      }),
    );

    expect(
      loadDesktopPreferences({
        availableProfiles,
        fallbackProfile: "openai-chat",
        storage,
      }),
    ).toMatchObject({
      profile: "ollama",
      baseUrl: "http://localhost:11435",
      model: "qwen2.5",
      timeoutSeconds: 12,
    });
  });

  it("persists only non-sensitive preferences", () => {
    const storage = createStorage();
    const preferences = {
      profile: "openai-chat",
      baseUrl: "https://api.example.com/v1",
      model: "gpt-test",
      timeoutSeconds: 45,
      profiles: {},
      apiKey: "must-not-be-saved",
    };

    saveDesktopPreferences(preferences, storage);

    expect(storage.dump()).toContain("https://api.example.com/v1");
    expect(storage.dump()).toContain("gpt-test");
    expect(storage.dump()).not.toContain("apiKey");
    expect(storage.dump()).not.toContain("must-not-be-saved");
  });

  it("uses profile defaults for a new profile without losing manual profile values", () => {
    const nextPreferences = getNextProfilePreferences(
      {
        profile: "openai-chat",
        baseUrl: "https://proxy.example.com/v1",
        model: "custom-chat-model",
        timeoutSeconds: 30,
        profiles: {},
      },
      "ollama",
    );

    expect(nextPreferences).toMatchObject({
      profile: "ollama",
      baseUrl: "http://localhost:11434",
      model: "llama3.2",
    });
    expect(nextPreferences.profiles["openai-chat"]).toEqual({
      baseUrl: "https://proxy.example.com/v1",
      model: "custom-chat-model",
    });
  });

  it("restores manual values when switching back to a profile", () => {
    const nextPreferences = getNextProfilePreferences(
      {
        profile: "ollama",
        baseUrl: "http://localhost:11434",
        model: "llama3.2",
        timeoutSeconds: 30,
        profiles: {
          "openai-chat": {
            baseUrl: "https://proxy.example.com/v1",
            model: "custom-chat-model",
          },
        },
      },
      "openai-chat",
    );

    expect(nextPreferences).toMatchObject({
      profile: "openai-chat",
      baseUrl: "https://proxy.example.com/v1",
      model: "custom-chat-model",
    });
  });
});

function createStorage(): DesktopPreferenceStorage & { dump(): string } {
  const values = new Map<string, string>();

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    dump() {
      return [...values.values()].join("\n");
    },
  };
}
