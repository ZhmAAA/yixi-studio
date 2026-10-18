export function requestErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error && "issues" in error) {
    const issues = (error as { issues?: Array<{ message?: string }> }).issues;
    const message = issues?.find((issue) => issue.message)?.message;
    if (message) return message;
  }
  if (error instanceof Error && !error.message.trim().startsWith("[")) return error.message;
  return fallback;
}
