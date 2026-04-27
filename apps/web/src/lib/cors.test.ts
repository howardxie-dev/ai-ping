import { describe, expect, it } from "vitest";
import { getFriendlyNetworkError, isLikelyCorsError } from "./cors";

describe("CORS and network error helpers", () => {
  it("detects browser fetch failures as likely CORS", () => {
    expect(isLikelyCorsError(new TypeError("Failed to fetch"))).toBe(true);
    expect(
      isLikelyCorsError(
        new TypeError("NetworkError when attempting to fetch resource."),
      ),
    ).toBe(true);
  });

  it("does not treat aborts as CORS", () => {
    expect(isLikelyCorsError(new DOMException("Timeout", "AbortError"))).toBe(false);
  });

  it("returns friendly localized copy for likely CORS errors", () => {
    expect(
      getFriendlyNetworkError(new TypeError("Failed to fetch"), {
        likelyCors: "CORS friendly",
        genericNetwork: "Generic network",
      }),
    ).toBe("CORS friendly");
  });
});
