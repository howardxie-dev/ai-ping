export interface DesktopFormValues {
  profile: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

export interface ValidationResult {
  ok: boolean;
  errors: Partial<Record<keyof DesktopFormValues, string>>;
}

export function validateRunForm(values: DesktopFormValues): ValidationResult {
  const errors: ValidationResult["errors"] = {};

  if (!values.profile.trim()) {
    errors.profile = "Choose a profile.";
  }

  if (!values.baseUrl.trim()) {
    errors.baseUrl = "Enter a base URL.";
  } else {
    try {
      new URL(values.baseUrl);
    } catch {
      errors.baseUrl = "Enter a valid absolute URL.";
    }
  }

  if (!values.model.trim()) {
    errors.model = "Enter a model.";
  }

  if (!Number.isFinite(values.timeoutMs) || values.timeoutMs < 1_000) {
    errors.timeoutMs = "Use at least 1000 ms.";
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
  };
}
