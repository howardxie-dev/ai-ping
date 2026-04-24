import { openaiChatBasicCheck } from "./checks/chat-basic";
import { openaiChatStreamCheck } from "./checks/chat-stream";
import { openaiErrorFormatCheck } from "./checks/error-format";
import type { ProtocolProfile } from "../../types";

export const openaiProfile: ProtocolProfile = {
  id: "openai",
  name: "OpenAI-compatible API",
  description: "Checks common OpenAI-compatible chat completion behaviors.",
  checks: [
    openaiChatBasicCheck,
    openaiChatStreamCheck,
    openaiErrorFormatCheck,
  ],
};
