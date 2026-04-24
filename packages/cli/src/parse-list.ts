export function parseListOption(
  value: string | string[] | undefined,
): string[] | undefined {
  if (value === undefined) return undefined;

  const values = Array.isArray(value) ? value : [value];
  const parsed = values
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean);

  return [...new Set(parsed)];
}
