import type { ProtocolProfile } from "../../types";
import { ollamaChatBasicCheck } from "./checks/chat-basic";
import { ollamaChatStreamCheck } from "./checks/chat-stream";
import { ollamaGenerateBasicCheck } from "./checks/generate-basic";
import { ollamaGenerateStreamCheck } from "./checks/generate-stream";
import { ollamaTagsCheck } from "./checks/tags";

export const ollamaProfile: ProtocolProfile = {
  id: "ollama",
  name: "Ollama API",
  description: "Checks common Ollama local API behaviors.",
  checks: [
    ollamaTagsCheck,
    ollamaGenerateBasicCheck,
    ollamaGenerateStreamCheck,
    ollamaChatBasicCheck,
    ollamaChatStreamCheck,
  ],
};
