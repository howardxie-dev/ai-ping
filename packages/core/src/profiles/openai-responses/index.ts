import type { ProtocolProfile } from "../../types";
import { openaiResponsesErrorFormatCheck } from "./checks/error-format";
import { openaiResponsesModelsListCheck } from "./checks/models-list";
import { openaiResponsesBasicCheck } from "./checks/responses-basic";
import { openaiResponsesStreamCheck } from "./checks/responses-stream";

export const openaiResponsesProfile: ProtocolProfile = {
  id: "openai-responses",
  name: "OpenAI Responses API",
  description: "Checks OpenAI-compatible Responses API behavior.",
  checks: [
    openaiResponsesModelsListCheck,
    openaiResponsesBasicCheck,
    openaiResponsesStreamCheck,
    openaiResponsesErrorFormatCheck,
  ],
};
