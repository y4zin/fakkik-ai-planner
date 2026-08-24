export function userFacingErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message.trim() : "";
  return /[\u0600-\u06FF]/.test(message) ? message : fallback;
}
