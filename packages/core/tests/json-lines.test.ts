import { describe, expect, it } from "vitest";
import { parseJsonLines } from "../src/json-lines";

describe("parseJsonLines", () => {
  it("parses multiple JSON lines", () => {
    const parsed = parseJsonLines('{"response":"po"}\n{"done":true}');

    expect(parsed.lines).toEqual(['{"response":"po"}', '{"done":true}']);
    expect(parsed.jsonObjects).toEqual([{ response: "po" }, { done: true }]);
    expect(parsed.invalidLines).toEqual([]);
  });

  it("ignores empty lines", () => {
    const parsed = parseJsonLines('\n{"response":"pong"}\n\n');

    expect(parsed.lines).toEqual(['{"response":"pong"}']);
    expect(parsed.jsonObjects).toEqual([{ response: "pong" }]);
  });

  it("collects invalid lines", () => {
    const parsed = parseJsonLines('{"response":"po"}\nnot-json');

    expect(parsed.jsonObjects).toEqual([{ response: "po" }]);
    expect(parsed.invalidLines).toEqual(["not-json"]);
  });

  it("handles empty strings", () => {
    const parsed = parseJsonLines("");

    expect(parsed.lines).toEqual([]);
    expect(parsed.jsonObjects).toEqual([]);
    expect(parsed.invalidLines).toEqual([]);
  });

  it("parses done true objects", () => {
    const parsed = parseJsonLines('{"done":true,"total_duration":1}');

    expect(parsed.jsonObjects).toEqual([{ done: true, total_duration: 1 }]);
  });
});
