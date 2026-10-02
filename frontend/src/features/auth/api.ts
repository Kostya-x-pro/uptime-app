export type AuthResponse = {
  accessToken: string;
};

export type UserProfile = {
  id: string;
  email: string;
	name: string;
	avatarUrl: string;
};

export type UploadedFile = {
  name: string;
  url: string;
  contentType: string;
  size: number;
};

export class AuthApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
  }
}

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: (() => {
      const headers = new Headers(init.headers);
      if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
      return headers;
    })(),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new AuthApiError(response.status, body?.error ?? "request_failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function register(input: { email: string; name: string; password: string }) {
  return request<AuthResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function login(input: { email: string; password: string }) {
  return request<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function refresh() {
  return request<AuthResponse>("/api/v1/auth/refresh", { method: "POST" });
}

export function logout() {
  return request<void>("/api/v1/auth/logout", { method: "POST" });
}

export function getProfile(accessToken: string) {
  return request<UserProfile>("/api/v1/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function updateProfile(accessToken: string, input: { name: string }) {
  return request<UserProfile>("/api/v1/profile", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(input),
  });
}

export function uploadAvatar(accessToken: string, avatar: File) {
  const body = new FormData();
  body.append("avatar", avatar);
  return request<UserProfile>("/api/v1/profile/avatar", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body,
  });
}

export function uploadFile(accessToken: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  return request<UploadedFile>("/api/v1/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body,
  });
}

export function avatarSource(avatarUrl: string) {
  return avatarUrl ? `${apiBaseUrl}${avatarUrl}` : "";
}
