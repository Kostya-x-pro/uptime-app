export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
  }
}

type ApiRequestInit = RequestInit & { accessToken?: string };

export const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");

export async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const { accessToken, headers: suppliedHeaders, ...requestInit } = init;
  const headers = new Headers(suppliedHeaders);
  if (requestInit.body && !(requestInit.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...requestInit,
    credentials: "include",
    headers,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(response.status, body?.error ?? "request_failed");
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
