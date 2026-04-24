export interface ParsedJsonLines {
  lines: string[];
  jsonObjects: unknown[];
  invalidLines: string[];
}

export function parseJsonLines(rawText: string): ParsedJsonLines {
  const lines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const jsonObjects: unknown[] = [];
  const invalidLines: string[] = [];

  for (const line of lines) {
    try {
      jsonObjects.push(JSON.parse(line));
    } catch {
      invalidLines.push(line);
    }
  }

  return {
    lines,
    jsonObjects,
    invalidLines,
  };
}
