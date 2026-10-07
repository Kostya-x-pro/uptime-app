import axios, { type AxiosRequestConfig } from "axios";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
  }
}

export const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

export function setApiAccessToken(accessToken: string | null) {
  if (accessToken) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    return;
  }
  delete apiClient.defaults.headers.common.Authorization;
}

export async function apiRequest<T>(path: string, config: AxiosRequestConfig = {}): Promise<T> {
  try {
    const response = await apiClient.request<T>({ ...config, url: path });
    return response.data;
  } catch (reason) {
    if (axios.isAxiosError<{ error?: string }>(reason)) {
      throw new ApiError(reason.response?.status ?? 0, reason.response?.data?.error ?? "request_failed");
    }
    throw reason;
  }
}
