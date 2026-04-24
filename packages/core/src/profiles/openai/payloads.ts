export function chatCompletionPayload(model: string, stream: boolean) {
  return {
    model,
    messages: [
      {
        role: "user",
        content: "Reply with exactly: pong",
      },
    ],
    stream,
  };
}

export function invalidChatCompletionPayload() {
  return {
    messages: [
      {
        role: "user",
        content: "This request is intentionally invalid.",
      },
    ],
    stream: false,
  };
}
