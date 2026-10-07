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

export function getMonitors() {
  return apiRequest<Monitor[]>("/api/v1/monitors");
}

export function createMonitor(input: { url: string; intervalSeconds: number }) {
  return apiRequest<Monitor>("/api/v1/monitors", {
    method: "POST",
    data: input,
  });
}

export function updateMonitor(monitorID: string, input: { url: string; intervalSeconds: number }) {
  return apiRequest<Monitor>(`/api/v1/monitors/${monitorID}`, {
    method: "PATCH",
    data: input,
  });
}
