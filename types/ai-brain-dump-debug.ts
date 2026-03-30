export type BrainDumpFailureType =
  | "timeout"
  | "provider_error"
  | "missing_structured_output"
  | "invalid_structured_output"
  | "unknown";

export type BrainDumpOpenAiResponseSummary = {
  id: string | null;
  status: string | null;
  incompleteReason: string | null;
  responseTextLength: number;
  outputTextLength: number;
  outputTypes: string[];
  contentTypes: string[];
};

export type BrainDumpFailureDebugInfo = {
  aiSessionId: string;
  model: string;
  timeoutMs: number;
  maxOutputTokens: number;
  sourceLength: number;
  guidanceLength: number;
  purposeLength: number;
  promptLength: number;
  startedAt: string;
  elapsedMs: number;
  failureType: BrainDumpFailureType;
  openAiStatus: number | null;
  openAiRequestId: string | null;
  openAiProcessingMs: string | null;
  responseSummary: BrainDumpOpenAiResponseSummary | null;
  rawResponsePreview: string | null;
  errorName: string | null;
  errorMessage: string;
  fixHints: string[];
};
