import { describe, expect, it } from "vitest";
import { parseListOption } from "../src/parse-list";

describe("parseListOption", () => {
  it("returns undefined for an omitted option", () => {
    expect(parseListOption(undefined)).toBeUndefined();
  });

  it("splits comma-separated values and trims whitespace", () => {
    expect(parseListOption("chat.basic, chat.stream ,, error.format")).toEqual([
      "chat.basic",
      "chat.stream",
      "error.format",
    ]);
  });

  it("flattens repeated options and preserves first-seen order while deduping", () => {
    expect(
      parseListOption(["chat.basic,error.format", "chat.basic", "chat.stream"]),
    ).toEqual(["chat.basic", "error.format", "chat.stream"]);
  });

  it("returns an empty list when all supplied entries are blank", () => {
    expect(parseListOption([" ", ",", " ,  "])).toEqual([]);
  });
});
