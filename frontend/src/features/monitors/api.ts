import { apiRequest } from "@/shared/api/client";

export type MonitorCheck = {
  id: string;
  status: "up" | "down";
  responseTimeMs: number | null;
  checkedAt: string;
};

export type Monitor = {
  id: string;
  name: string;
  url: string;
  intervalSeconds: number;
  status: "up" | "down";
  lastCheckedAt: string | null;
  lastResponseTimeMs: number | null;
  checks: MonitorCheck[];
};

export type MonitorInput = {
  name: string;
  url: string;
  intervalSeconds: number;
};

export function getMonitors() {
  return apiRequest<Monitor[]>("/api/v1/monitors");
}

export function createMonitor(input: MonitorInput) {
  return apiRequest<Monitor>("/api/v1/monitors", {
    method: "POST",
    data: input,
  });
}

export function updateMonitor(monitorID: string, input: MonitorInput) {
  return apiRequest<Monitor>(`/api/v1/monitors/${monitorID}`, {
    method: "PATCH",
    data: input,
  });
}

export function deleteMonitor(monitorID: string) {
  return apiRequest<void>(`/api/v1/monitors/${monitorID}`, {
    method: "DELETE",
  });
}
