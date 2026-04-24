export interface ParsedSseStream {
  dataLines: string[];
  jsonChunks: unknown[];
  invalidJsonLines: string[];
  hasDoneMarker: boolean;
}

export function parseSseStream(rawText: string): ParsedSseStream {
  const dataLines: string[] = [];
  const jsonChunks: unknown[] = [];
  const invalidJsonLines: string[] = [];
  let hasDoneMarker = false;

  for (const line of rawText.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;

    const value = line.slice("data:".length).trim();
    if (!value) continue;

    dataLines.push(value);

    if (value === "[DONE]") {
      hasDoneMarker = true;
      continue;
    }

    try {
      jsonChunks.push(JSON.parse(value) as unknown);
    } catch {
      invalidJsonLines.push(value);
    }
  }

  return {
    dataLines,
    jsonChunks,
    invalidJsonLines,
    hasDoneMarker,
  };
}
