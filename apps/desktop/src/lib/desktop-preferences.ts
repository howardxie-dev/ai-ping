import { getProfileDefaults } from "./profile-metadata";

export interface ProfilePreferenceValues {
  baseUrl: string;
  model: string;
}

export interface DesktopPreferenceState extends ProfilePreferenceValues {
  profile: string;
  timeoutSeconds: number;
  profiles: Record<string, ProfilePreferenceValues>;
}

export interface DesktopPreferenceOptions {
  availableProfiles: readonly string[];
  fallbackProfile: string;
  storage?: DesktopPreferenceStorage | null;
}

export interface DesktopPreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "ai-ping.desktop.preferences.v1";
const DEFAULT_TIMEOUT_SECONDS = 30;

export function loadDesktopPreferences({
  availableProfiles,
  fallbackProfile,
  storage = getLocalStorage(),
}: DesktopPreferenceOptions): DesktopPreferenceState {
  const fallback = buildFallbackState(fallbackProfile);
  const stored = readStoredPreferences(storage);
  if (!stored) return fallback;

  const profile = getStoredProfile(stored.profile, availableProfiles) ?? fallback.profile;
  const defaults = getProfileDefaults(profile);
  const profiles = getStoredProfilePreferences(stored.profiles, availableProfiles);
  const storedForProfile = profiles[profile];
  const baseUrl =
    getStoredString(stored.baseUrl) ?? storedForProfile?.baseUrl ?? defaults.baseUrl;
  const model = getStoredString(stored.model) ?? storedForProfile?.model ?? defaults.model;
  const timeoutSeconds =
    getStoredPositiveNumber(stored.timeoutSeconds) ?? DEFAULT_TIMEOUT_SECONDS;

  return {
    profile,
    baseUrl,
    model,
    timeoutSeconds,
    profiles: rememberProfilePreference(profiles, profile, { baseUrl, model }),
  };
}

export function saveDesktopPreferences(
  preferences: DesktopPreferenceState,
  storage: DesktopPreferenceStorage | null = getLocalStorage(),
): void {
  if (!storage) return;

  const currentProfiles = rememberProfilePreference(preferences.profiles, preferences.profile, {
    baseUrl: preferences.baseUrl,
    model: preferences.model,
  });

  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        profile: preferences.profile,
        baseUrl: preferences.baseUrl,
        model: preferences.model,
        timeoutSeconds: preferences.timeoutSeconds,
        profiles: currentProfiles,
      }),
    );
  } catch {
    // localStorage can be unavailable or full; preferences are best-effort only.
  }
}

export function getNextProfilePreferences(
  preferences: DesktopPreferenceState,
  nextProfile: string,
): DesktopPreferenceState {
  const profiles = rememberProfilePreference(preferences.profiles, preferences.profile, {
    baseUrl: preferences.baseUrl,
    model: preferences.model,
  });
  const nextDefaults = getProfileDefaults(nextProfile);
  const nextStored = profiles[nextProfile];

  return {
    ...preferences,
    profile: nextProfile,
    baseUrl: nextStored?.baseUrl ?? nextDefaults.baseUrl,
    model: nextStored?.model ?? nextDefaults.model,
    profiles,
  };
}

export function rememberProfilePreference(
  profiles: Record<string, ProfilePreferenceValues>,
  profile: string,
  values: ProfilePreferenceValues,
): Record<string, ProfilePreferenceValues> {
  if (!profile) return profiles;

  return {
    ...profiles,
    [profile]: values,
  };
}

function buildFallbackState(profile: string): DesktopPreferenceState {
  const defaults = getProfileDefaults(profile);
  return {
    profile,
    baseUrl: defaults.baseUrl,
    model: defaults.model,
    timeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
    profiles: {
      [profile]: {
        baseUrl: defaults.baseUrl,
        model: defaults.model,
      },
    },
  };
}

function readStoredPreferences(
  storage: DesktopPreferenceStorage | null,
): Record<string, unknown> | null {
  if (!storage) return null;

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getStoredProfile(
  value: unknown,
  availableProfiles: readonly string[],
): string | null {
  if (typeof value !== "string") return null;
  return availableProfiles.includes(value) ? value : null;
}

function getStoredProfilePreferences(
  value: unknown,
  availableProfiles: readonly string[],
): Record<string, ProfilePreferenceValues> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const profiles: Record<string, ProfilePreferenceValues> = {};
  for (const [profile, storedValues] of Object.entries(value)) {
    if (!availableProfiles.includes(profile)) continue;
    if (!storedValues || typeof storedValues !== "object" || Array.isArray(storedValues)) {
      continue;
    }

    const values = storedValues as Record<string, unknown>;
    const baseUrl = getStoredString(values.baseUrl);
    const model = getStoredString(values.model);
    if (baseUrl === null || model === null) continue;
    profiles[profile] = { baseUrl, model };
  }
  return profiles;
}

function getStoredString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function getStoredPositiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function getLocalStorage(): DesktopPreferenceStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
