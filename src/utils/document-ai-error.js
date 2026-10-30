const ERROR_KEYS = {
  AI_BILLING: "documentAi.errors.billing",
  AI_CONFIG: "documentAi.errors.config",
  AI_FILE: "documentAi.errors.tooLarge",
  AI_MODEL: "documentAi.errors.model",
  AI_PROVIDER: "documentAi.errors.provider",
  AI_QUOTA: "documentAi.errors.quota",
  AI_REQUEST: "documentAi.errors.request",
  AI_RESPONSE: "documentAi.errors.response",
  AI_TIMEOUT: "documentAi.errors.timeout",
  DOCUMENT_NOT_DETECTED: "documentAi.errors.notDetected",
};

export const getDocumentAiErrorKey = (error) => {
  if (error?.response?.status === 413) return "documentAi.errors.tooLarge";
  if (error?.response?.status === 429) return "documentAi.errors.quota";
  if (error?.response?.status === 504) return "documentAi.errors.timeout";
  return ERROR_KEYS[error?.response?.data?.code] || "documentAi.errors.generic";
};
