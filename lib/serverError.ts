import "server-only";

export function safeServerError(error: unknown, publicMessage: string) {
  console.error(publicMessage, error);
  if (process.env.NODE_ENV === "development" && error instanceof Error) return error.message;
  return publicMessage;
}
