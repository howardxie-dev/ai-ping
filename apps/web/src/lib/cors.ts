export function isLikelyCorsError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    error.name === "TypeError" &&
    (message.includes("failed to fetch") ||
      message.includes("networkerror") ||
      message.includes("load failed") ||
      message.includes("network request failed") ||
      message.includes("cors"))
  );
}

export function getFriendlyNetworkError(
  error: unknown,
  messages: {
    likelyCors: string;
    genericNetwork: string;
  },
): string {
  return isLikelyCorsError(error) ? messages.likelyCors : messages.genericNetwork;
}
