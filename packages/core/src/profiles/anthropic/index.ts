import type { ProtocolProfile } from "../../types";
import { anthropicErrorFormatCheck } from "./checks/error-format";
import { anthropicMessagesBasicCheck } from "./checks/messages-basic";
import { anthropicMessagesStreamCheck } from "./checks/messages-stream";
import { anthropicModelsListCheck } from "./checks/models-list";

export const anthropicProfile: ProtocolProfile = {
  id: "anthropic",
  name: "Anthropic API",
  description: "Checks common Anthropic Claude Messages API behaviors.",
  checks: [
    anthropicModelsListCheck,
    anthropicMessagesBasicCheck,
    anthropicMessagesStreamCheck,
    anthropicErrorFormatCheck,
  ],
};
