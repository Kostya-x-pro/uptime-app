import { apiRequest } from "@/shared/api/client";

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

export function getMonitors(accessToken: string) {
  return apiRequest<Monitor[]>("/api/v1/monitors", { accessToken });
}

export function createMonitor(accessToken: string, input: { url: string; intervalSeconds: number }) {
  return apiRequest<Monitor>("/api/v1/monitors", {
    accessToken,
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateMonitor(accessToken: string, monitorID: string, input: { url: string; intervalSeconds: number }) {
  return apiRequest<Monitor>(`/api/v1/monitors/${monitorID}`, {
    accessToken,
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
