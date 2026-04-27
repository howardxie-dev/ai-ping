import { supportedLocales, type Locale } from "../i18n";

const labels: Record<Locale, string> = {
  en: "English",
  "zh-Hans": "简体中文",
  "zh-Hant": "繁體中文",
};

export function LanguageSwitcher({
  label,
  locale,
  onChange,
}: {
  label: string;
  locale: Locale;
  onChange: (locale: Locale) => void;
}) {
  return (
    <label className="language-switcher">
      <span>{label}</span>
      <select value={locale} onChange={(event) => onChange(event.target.value as Locale)}>
        {supportedLocales.map((value) => (
          <option key={value} value={value}>
            {labels[value]}
          </option>
        ))}
      </select>
    </label>
  );
}
