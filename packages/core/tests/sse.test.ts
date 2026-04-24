import { describe, expect, it } from "vitest";
import { parseSseStream } from "../src/sse";

describe("parseSseStream", () => {
  it("extracts data lines, parses JSON chunks, and detects done markers", () => {
    const parsed = parseSseStream(
      [
        ": keep-alive",
        'data: {"choices":[{"delta":{"content":"po"}}]}',
        "",
        "event: ignored",
        "data: not-json",
        "data: [DONE]",
      ].join("\n"),
    );

    expect(parsed.dataLines).toEqual([
      '{"choices":[{"delta":{"content":"po"}}]}',
      "not-json",
      "[DONE]",
    ]);
    expect(parsed.jsonChunks).toEqual([
      { choices: [{ delta: { content: "po" } }] },
    ]);
    expect(parsed.invalidJsonLines).toEqual(["not-json"]);
    expect(parsed.hasDoneMarker).toBe(true);
  });

  it("ignores blank data lines and supports CRLF", () => {
    const parsed = parseSseStream("data:\r\ndata:  \r\ndata: {\"ok\":true}\r\n");

    expect(parsed.dataLines).toEqual(['{"ok":true}']);
    expect(parsed.jsonChunks).toEqual([{ ok: true }]);
  });
});
