import type { ProtocolProfile } from "../../types";
import { geminiErrorFormatCheck } from "./checks/error-format";
import { geminiGenerateBasicCheck } from "./checks/generate-basic";
import { geminiGenerateStreamCheck } from "./checks/generate-stream";
import { geminiModelsListCheck } from "./checks/models-list";

export const geminiProfile: ProtocolProfile = {
  id: "gemini",
  name: "Gemini API",
  description: "Checks common Gemini Developer API REST behaviors.",
  checks: [
    geminiModelsListCheck,
    geminiGenerateBasicCheck,
    geminiGenerateStreamCheck,
    geminiErrorFormatCheck,
  ],
};
