import { AuthApiError } from "@/features/auth/api";

export type MonitorCheck = {
  id: string;
  status: "up" | "down";
  responseTimeMs: number | null;
  checkedAt: string;
};

export type Monitor = {
  id: string;
  url: string;
  intervalSeconds: number;
  status: "up" | "down";
  lastCheckedAt: string | null;
  lastResponseTimeMs: number | null;
  checks: MonitorCheck[];
};

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");

async function request<T>(path: string, accessToken: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new AuthApiError(response.status, body?.error ?? "request_failed");
  }

  return (await response.json()) as T;
}

export function getMonitors(accessToken: string) {
  return request<Monitor[]>("/api/v1/monitors", accessToken);
}

export function createMonitor(accessToken: string, input: { url: string; intervalSeconds: number }) {
  return request<Monitor>("/api/v1/monitors", accessToken, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateMonitor(accessToken: string, monitorID: string, input: { url: string; intervalSeconds: number }) {
  return request<Monitor>(`/api/v1/monitors/${monitorID}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
