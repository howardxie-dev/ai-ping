import { openaiChatBasicCheck } from "./checks/chat-basic";
import { openaiChatStreamCheck } from "./checks/chat-stream";
import { openaiErrorFormatCheck } from "./checks/error-format";
import { openaiModelsListCheck } from "./checks/models-list";
import { openaiToolCallsBasicCheck } from "./checks/tool-calls-basic";
import { openaiToolCallsStreamCheck } from "./checks/tool-calls-stream";
import type { ProtocolProfile } from "../../types";

export const openaiChatProfile: ProtocolProfile = {
  id: "openai-chat",
  aliases: ["openai"],
  name: "OpenAI Chat Completions",
  description: "Checks OpenAI-compatible Chat Completions API behavior.",
  checks: [
    openaiModelsListCheck,
    openaiChatBasicCheck,
    openaiChatStreamCheck,
    openaiToolCallsBasicCheck,
    openaiToolCallsStreamCheck,
    openaiErrorFormatCheck,
  ],
};
