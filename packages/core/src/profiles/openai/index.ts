import { openaiChatBasicCheck } from "./checks/chat-basic";
import { openaiChatStreamCheck } from "./checks/chat-stream";
import { openaiErrorFormatCheck } from "./checks/error-format";
import { openaiModelsListCheck } from "./checks/models-list";
import { openaiToolCallsBasicCheck } from "./checks/tool-calls-basic";
import { openaiToolCallsStreamCheck } from "./checks/tool-calls-stream";
import type { ProtocolProfile } from "../../types";

export const openaiProfile: ProtocolProfile = {
  id: "openai",
  name: "OpenAI-compatible API",
  description: "Checks common OpenAI-compatible chat completion behaviors.",
  checks: [
    openaiModelsListCheck,
    openaiChatBasicCheck,
    openaiChatStreamCheck,
    openaiToolCallsBasicCheck,
    openaiToolCallsStreamCheck,
    openaiErrorFormatCheck,
  ],
};
