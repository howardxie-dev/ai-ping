import { describe, expect, it } from "vitest";
import {
  collectCompletedResponseTexts,
  collectResponseOutputTexts,
  isResponsesEventType,
  summarizeResponseStreamEvents,
} from "../src/profiles/openai-responses/utils";

describe("OpenAI Responses utils", () => {
  it("collects root output_text", () => {
    expect(collectResponseOutputTexts({ output_text: "pong" })).toEqual(["pong"]);
  });

  it("collects output content text fields", () => {
    expect(
      collectResponseOutputTexts({
        output: [
          {
            content: [
              { type: "output_text", text: "po" },
              { type: "annotation", text: "ng" },
            ],
          },
        ],
      }),
    ).toEqual(["po", "ng"]);
  });

  it("collects output_text content values", () => {
    expect(
      collectResponseOutputTexts({
        output: [
          {
            content: [{ type: "output_text", output_text: "pong" }],
          },
        ],
      }),
    ).toEqual(["pong"]);
  });

  it("summarizes response.output_text.delta events", () => {
    const summary = summarizeResponseStreamEvents([
      { type: "response.created" },
      { type: "response.output_text.delta", delta: "pong" },
      { type: "response.completed" },
    ]);

    expect(summary).toMatchObject({
      eventCount: 3,
      responsesEventCount: 3,
      textDeltaCount: 1,
      totalTextLength: 4,
      hasResponseCreated: true,
      hasResponseCompleted: true,
    });
  });

  it("summarizes completed response output", () => {
    const summary = summarizeResponseStreamEvents([
      {
        type: "response.completed",
        response: { output_text: "pong" },
      },
    ]);

    expect(summary.hasResponseCompleted).toBe(true);
    expect(summary.totalTextLength).toBe(4);
  });

  it("collects response.output_text.done finalized text", () => {
    expect(
      collectCompletedResponseTexts({
        type: "response.output_text.done",
        text: "pong",
      }),
    ).toEqual(["pong"]);
  });

  it("detects failed and unknown response events", () => {
    const summary = summarizeResponseStreamEvents([
      { type: "response.failed" },
      { type: "response.future_event" },
    ]);

    expect(summary.hasResponseFailed).toBe(true);
    expect(summary.responsesEventCount).toBe(2);
    expect(summary.unknownResponseEventTypes).toEqual(["response.future_event"]);
    expect(isResponsesEventType("response.future_event")).toBe(true);
  });
});
